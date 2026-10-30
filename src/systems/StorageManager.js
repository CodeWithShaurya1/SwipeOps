/**
 * StorageManager
 * Handles persistence for Leaderboard & Player Registration.
 * Supports Supabase cloud synchronization with seamless local fallback.
 */

import { createClient } from '@supabase/supabase-js';

const LOCAL_STORAGE_KEY = 'devops_arena_leaderboard_v1';
const SUBMITTED_SESSIONS_KEY = 'devops_arena_submitted_sessions';

export class StorageManager {
  constructor() {
    this.supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    this.supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

    this.supabase = null;
    this.isCloudAvailable = false;

    if (this.supabaseUrl && this.supabaseAnonKey) {
      try {
        this.supabase = createClient(this.supabaseUrl, this.supabaseAnonKey, {
          auth: { persistSession: false }
        });
        this.isCloudAvailable = true;
      } catch (err) {
        console.warn('Failed to initialize Supabase client:', err);
        this.isCloudAvailable = false;
      }
    }
  }

  isCloudConfigured() {
    return this.isCloudAvailable && !!this.supabase;
  }

  async testCloudConnection() {
    if (!this.isCloudConfigured()) {
      return { mode: 'local', isConnected: true, message: 'Local Competition Mode · Ready' };
    }
    try {
      const { data, error } = await this.supabase
        .from('devops_arena_scores')
        .select('id')
        .limit(1);

      if (error) {
        return { mode: 'fallback', isConnected: false, message: 'Local Fallback · Cloud Unreachable' };
      }
      return { mode: 'cloud', isConnected: true, message: 'Supabase Cloud Connected' };
    } catch (err) {
      return { mode: 'fallback', isConnected: false, message: 'Local Fallback · Offline Mode' };
    }
  }

  /**
   * Check if an enrollment number already has a completed run
   * (Enforces one attempt per enrollment number in competitive mode)
   */
  async checkEnrollmentEligibility(enrollment) {
    const cleanEnrollment = String(enrollment).trim().toUpperCase();
    if (!cleanEnrollment) return { eligible: false, message: 'Enrollment number is required' };

    // If cloud is enabled, check remote database
    if (this.isCloudConfigured()) {
      try {
        const { data, error } = await this.supabase
          .from('devops_arena_scores')
          .select('id, player_name, final_score')
          .eq('enrollment_number', cleanEnrollment)
          .limit(1);

        if (!error && data && data.length > 0) {
          return {
            eligible: false,
            message: `Enrollment ${cleanEnrollment} already submitted a score (${data[0].final_score} pts). One attempt allowed.`
          };
        }
      } catch (err) {
        console.warn('Cloud eligibility check failed, falling back to local storage:', err);
      }
    }

    // Local check
    const localScores = this.getLocalScores();
    const existing = localScores.find(s => s.enrollment_number === cleanEnrollment);
    if (existing) {
      return {
        eligible: false,
        message: `Enrollment ${cleanEnrollment} already recorded a score (${existing.final_score} pts).`
      };
    }

    return { eligible: true, message: 'Eligible to enter the mission' };
  }

  /**
   * Save a completed mission score
   */
  async submitScore(scoreRecord) {
    // Prevent duplicate submission of the exact same local run
    const submittedSessions = JSON.parse(localStorage.getItem(SUBMITTED_SESSIONS_KEY) || '[]');
    if (scoreRecord.sessionId && submittedSessions.includes(scoreRecord.sessionId)) {
      console.warn('Session already submitted. Ignoring duplicate submission.');
      return { success: true, duplicated: true };
    }

    const payload = {
      player_name: String(scoreRecord.playerName || 'Anonymous').trim(),
      enrollment_number: String(scoreRecord.enrollment || 'UNKNOWN').trim().toUpperCase(),
      final_score: Number(scoreRecord.finalScore || 0),
      correct_decisions: Number(scoreRecord.correct || 0),
      incorrect_decisions: Number(scoreRecord.incorrect || 0),
      timed_out_decisions: Number(scoreRecord.timeout || 0),
      accuracy: Number(scoreRecord.accuracy || 0),
      max_streak: Number(scoreRecord.maxStreak || 0),
      mission_duration_seconds: Number(scoreRecord.missionDuration || 0),
      scoring_version: '1.0',
      completed_at: new Date().toISOString()
    };

    let cloudSaved = false;
    let cloudError = null;

    if (this.isCloudConfigured()) {
      try {
        const { data, error } = await this.supabase
          .from('devops_arena_scores')
          .insert([payload])
          .select();

        if (!error) {
          cloudSaved = true;
        } else {
          cloudError = error.message;
          console.error('Supabase submission error:', error);
        }
      } catch (err) {
        cloudError = err.message;
        console.error('Network error during Supabase insert:', err);
      }
    }

    // Always persist to local storage as well for backup / offline guarantee
    this.saveLocalScore(payload);

    if (scoreRecord.sessionId) {
      submittedSessions.push(scoreRecord.sessionId);
      localStorage.setItem(SUBMITTED_SESSIONS_KEY, JSON.stringify(submittedSessions));
    }

    return {
      success: true,
      cloudSaved,
      cloudError,
      mode: cloudSaved ? 'cloud' : 'local'
    };
  }

  saveLocalScore(record) {
    const list = this.getLocalScores();
    list.push({ ...record, id: 'local_' + Date.now() });
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  }

  getLocalScores() {
    try {
      const data = localStorage.getItem(LOCAL_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (_) {
      return [];
    }
  }

  /**
   * Retrieve sorted leaderboard records
   * Sort criteria:
   * 1. Final score DESC
   * 2. Accuracy DESC
   * 3. Correct decisions DESC
   * 4. Completion time ASC (earlier is better)
   */
  async getLeaderboard(limit = 50) {
    if (this.isCloudConfigured()) {
      try {
        const { data, error } = await this.supabase
          .from('devops_arena_scores')
          .select('*')
          .order('final_score', { ascending: false })
          .order('accuracy', { ascending: false })
          .order('correct_decisions', { ascending: false })
          .order('completed_at', { ascending: true })
          .limit(limit);

        if (!error && data) {
          return { data, source: 'cloud' };
        }
        console.warn('Failed to load cloud leaderboard, falling back to local:', error);
      } catch (err) {
        console.warn('Network issue fetching cloud leaderboard, falling back:', err);
      }
    }

    // Fallback: sort local scores
    const localData = this.getLocalScores().sort((a, b) => {
      if (b.final_score !== a.final_score) return b.final_score - a.final_score;
      if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
      if (b.correct_decisions !== a.correct_decisions) return b.correct_decisions - a.correct_decisions;
      return new Date(a.completed_at) - new Date(b.completed_at);
    });

    return {
      data: localData.slice(0, limit),
      source: 'local'
    };
  }

  clearLocalData() {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    localStorage.removeItem(SUBMITTED_SESSIONS_KEY);
  }
}

export const storage = new StorageManager();

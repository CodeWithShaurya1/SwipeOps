/**
 * StorageManager
 * High-reliability event management, one-attempt enforcement,
 * admin-authorized replays, best-score leaderboard, and audit logging.
 * Clean 2-table cloud synchronization with Supabase:
 * 1. swipeops_leaderboard (Player records, best scores, durations, and attempts)
 * 2. swipeops_authorizations (Replay clearances granted by organizers)
 * + Seamless local standalone engine fallback.
 */

import { createClient } from '@supabase/supabase-js';
import { normalizeEnrollment, normalizeName, maskEnrollment, isTestEnrollment } from './IdentityUtils.js';

// Local storage namespaces
const LOCAL_STUDENTS_KEY = 'swipeops_students_v2';
const LOCAL_ATTEMPTS_KEY = 'swipeops_attempts_v2';
const LOCAL_REPLAYS_KEY = 'swipeops_replays_v2';
const LOCAL_AUDIT_LOG_KEY = 'swipeops_audit_log_v2';
const LEGACY_STORAGE_KEY = 'devops_arena_leaderboard_v1';
const SUBMITTED_SESSIONS_KEY = 'devops_arena_submitted_sessions';

// Default Cloud Connection & Admin Key
const DEFAULT_SUPABASE_URL = 'https://rrocaucskfsokxubpgra.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_QEmcA7peluK0phKfbIhdRA_lbtrCFmb';
const DEFAULT_ADMIN_PASSPHRASE = 'SHAURYA@GAME999';

export class StorageManager {
  constructor() {
    const isBrowser = typeof window !== 'undefined';
    const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : (typeof process !== 'undefined' ? process.env : {});
    this.supabaseUrl = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || (isBrowser ? DEFAULT_SUPABASE_URL : '');
    this.supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || (isBrowser ? DEFAULT_SUPABASE_ANON_KEY : '');
    this.adminPassphrase = env.VITE_ADMIN_PASSPHRASE || DEFAULT_ADMIN_PASSPHRASE;

    this.supabase = null;
    this.isCloudAvailable = false;
    this._inFlightAttempts = new Set();

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

    // Initialize local stores if empty
    this._initLocalStore();
  }

  _initLocalStore() {
    if (typeof localStorage === 'undefined') return;

    // Purge legacy storage keys permanently
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      localStorage.removeItem(SUBMITTED_SESSIONS_KEY);
      localStorage.removeItem('swipeops_students');
      localStorage.removeItem('swipeops_attempts');
      localStorage.removeItem('swipeops_replays');
      localStorage.removeItem('swipeops_audit_log');
      localStorage.removeItem('devops_arena_scores');
      localStorage.removeItem('devops_arena_user');
      localStorage.removeItem('devops_arena_session');
    } catch (_) {}

    // When Cloud Supabase is configured and live, purge extra local entries
    if (this.isCloudConfigured()) {
      this.purgeExtraLocalData();
    } else {
      if (!localStorage.getItem(LOCAL_STUDENTS_KEY)) {
        localStorage.setItem(LOCAL_STUDENTS_KEY, JSON.stringify([]));
      }
      if (!localStorage.getItem(LOCAL_ATTEMPTS_KEY)) {
        localStorage.setItem(LOCAL_ATTEMPTS_KEY, JSON.stringify([]));
      }
      if (!localStorage.getItem(LOCAL_REPLAYS_KEY)) {
        localStorage.setItem(LOCAL_REPLAYS_KEY, JSON.stringify([]));
      }
      if (!localStorage.getItem(LOCAL_AUDIT_LOG_KEY)) {
        localStorage.setItem(LOCAL_AUDIT_LOG_KEY, JSON.stringify([]));
      }
    }
  }

  purgeExtraLocalData() {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(LOCAL_STUDENTS_KEY, JSON.stringify([]));
      localStorage.setItem(LOCAL_ATTEMPTS_KEY, JSON.stringify([]));
      localStorage.setItem(LOCAL_REPLAYS_KEY, JSON.stringify([]));
      localStorage.setItem(LOCAL_AUDIT_LOG_KEY, JSON.stringify([]));
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      localStorage.removeItem(SUBMITTED_SESSIONS_KEY);
    } catch (_) {}
  }

  _generateUUID() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      try {
        return crypto.randomUUID();
      } catch (_) {}
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  _isValidUUID(str) {
    return typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
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
        .from('swipeops_leaderboard')
        .select('enrollment_number')
        .limit(1);

      if (error) {
        return { mode: 'fallback', isConnected: false, message: 'Local Fallback · Cloud Unreachable' };
      }
      return { mode: 'cloud', isConnected: true, message: 'Supabase Cloud Connected · Live Cluster' };
    } catch (err) {
      return { mode: 'fallback', isConnected: false, message: 'Local Fallback · Standalone Storage' };
    }
  }

  // ==========================================================================
  // PART 1 & 2: REGISTRATION & ONE-ATTEMPT CHECK
  // ==========================================================================

  /**
   * Check student status before starting game.
   */
  async checkStudentStatus(enrollment) {
    const cleanEnrollment = normalizeEnrollment(enrollment);
    if (!cleanEnrollment) {
      return { eligible: false, status: 'INVALID', message: 'Enrollment number is required' };
    }

    // 0. Check for active local attempt in progress (session resume within 50s)
    const attempts = this._getLocal(LOCAL_ATTEMPTS_KEY);
    const students = this._getLocal(LOCAL_STUDENTS_KEY);
    const student = students.find(s => s.enrollment_number === cleanEnrollment);
    const activeAttempt = attempts.find(a => a.enrollment_number === cleanEnrollment && a.status === 'started');
    if (activeAttempt) {
      const elapsedMs = Date.now() - new Date(activeAttempt.started_at).getTime();
      if (elapsedMs <= 50000) {
        return {
          eligible: true,
          status: 'ACTIVE_ATTEMPT',
          student: student || { enrollment_number: cleanEnrollment, student_name: activeAttempt.player_name },
          attempt: activeAttempt,
          message: 'Active mission in progress. Resuming...'
        };
      } else {
        activeAttempt.status = 'abandoned';
        activeAttempt.completed_at = new Date().toISOString();
        if (student) student.status = 'completed';
        this._saveLocal(LOCAL_ATTEMPTS_KEY, attempts);
        this._saveLocal(LOCAL_STUDENTS_KEY, students);
      }
    }

    if (this.isCloudConfigured()) {
      try {
        // 1. Check for pending authorization (replay granted by admin)
        const { data: pendingAuth } = await this.supabase
          .from('swipeops_authorizations')
          .select('*')
          .eq('enrollment_number', cleanEnrollment)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (pendingAuth) {
          return {
            eligible: true,
            status: 'REPLAY_AUTHORIZED',
            replay: pendingAuth,
            message: 'Authorized replay cleared. You may launch your replay attempt.'
          };
        }

        // 2. Check if student already played in swipeops_leaderboard
        const { data: existingPlayer } = await this.supabase
          .from('swipeops_leaderboard')
          .select('*')
          .eq('enrollment_number', cleanEnrollment)
          .maybeSingle();

        if (existingPlayer) {
          return {
            eligible: false,
            status: 'ALREADY_PLAYED',
            student: {
              enrollment_number: cleanEnrollment,
              student_name: existingPlayer.student_name,
              best_score: existingPlayer.final_score,
              attempts_count: existingPlayer.attempts_count || 1
            },
            bestScore: existingPlayer.final_score,
            message: 'Your official attempt has already been recorded. Please contact the event administrator if you require another attempt.'
          };
        }

        return { eligible: true, status: 'NOT_FOUND', message: 'First-time registration' };
      } catch (err) {
        console.warn('Cloud checkStudentStatus failed, falling back to local:', err);
      }
    }

    // Local Standalone Check
    if (!student) {
      return { eligible: true, status: 'NOT_FOUND', message: 'First-time registration' };
    }

    const replays = this._getLocal(LOCAL_REPLAYS_KEY);
    const pendingReplay = replays.find(r => r.enrollment_number === cleanEnrollment && r.status === 'pending');
    if (pendingReplay) {
      return {
        eligible: true,
        status: 'REPLAY_AUTHORIZED',
        student,
        replay: pendingReplay,
        message: 'Authorized replay cleared.'
      };
    }

    if (student.status === 'completed' || (student.attempts_count && student.attempts_count >= 1)) {
      return {
        eligible: false,
        status: 'ALREADY_PLAYED',
        student,
        message: 'Your official attempt has already been recorded. Please contact the event administrator if you require another attempt.'
      };
    }

    return { eligible: true, status: 'REGISTERED', student, message: 'Ready to launch' };
  }

  async checkEnrollmentEligibility(enrollment) {
    const res = await this.checkStudentStatus(enrollment);
    return res.eligible;
  }

  /**
   * Atomically registers new student or consumes authorized replay.
   */
  async startAttempt(name, enrollment) {
    const cleanName = normalizeName(name);
    const cleanEnrollment = normalizeEnrollment(enrollment);

    if (!cleanName || cleanName.length < 2) {
      return { success: false, error: 'INVALID_NAME', message: 'Full name must be at least 2 characters.' };
    }
    if (!cleanEnrollment || cleanEnrollment.length < 4) {
      return { success: false, error: 'INVALID_ENROLLMENT', message: 'Enrollment number must be at least 4 characters.' };
    }

    if (this._inFlightAttempts.has(cleanEnrollment)) {
      return {
        success: false,
        allowed: false,
        error: 'CONCURRENT_REQUEST',
        message: 'An attempt reservation is already in progress for this student.'
      };
    }

    this._inFlightAttempts.add(cleanEnrollment);
    try {
      // Resume active attempt if within active mission window
      const localAttempts = this._getLocal(LOCAL_ATTEMPTS_KEY);
      const activeAttempt = localAttempts.find(a => a.enrollment_number === cleanEnrollment && a.status === 'started');
      if (activeAttempt) {
        const elapsedMs = Date.now() - new Date(activeAttempt.started_at).getTime();
        if (elapsedMs <= 50000) {
          return {
            success: true,
            allowed: true,
            resumed: true,
            attemptId: activeAttempt.id,
            attemptNumber: activeAttempt.attempt_number,
            isReplay: !!activeAttempt.is_replay,
            studentName: activeAttempt.player_name || cleanName,
            enrollment: cleanEnrollment
          };
        }
      }

      if (this.isCloudConfigured()) {
        try {
          // Check for pending authorization
          const { data: pendingAuth } = await this.supabase
            .from('swipeops_authorizations')
            .select('*')
            .eq('enrollment_number', cleanEnrollment)
            .eq('status', 'pending')
            .maybeSingle();

          const { data: existingPlayer } = await this.supabase
            .from('swipeops_leaderboard')
            .select('*')
            .eq('enrollment_number', cleanEnrollment)
            .maybeSingle();

          if (existingPlayer && !pendingAuth) {
            return {
              success: false,
              allowed: false,
              error: 'ALREADY_PLAYED',
              message: 'Your official attempt has already been recorded. Please contact the event administrator if you require another attempt.',
              studentName: existingPlayer.student_name,
              bestScore: existingPlayer.final_score
            };
          }

          // Consume authorization if present
          if (pendingAuth) {
            await this.supabase
              .from('swipeops_authorizations')
              .update({ status: 'consumed' })
              .eq('id', pendingAuth.id);
          }

          const attemptId = this._generateUUID();
          const attemptNum = existingPlayer ? (existingPlayer.attempts_count || 1) + 1 : 1;
          const isReplay = !!pendingAuth;

          this._localStartAttempt(cleanName, cleanEnrollment, attemptId, attemptNum, isReplay);

          return {
            success: true,
            allowed: true,
            attemptId,
            attemptNumber: attemptNum,
            isReplay,
            studentName: cleanName,
            enrollment: cleanEnrollment
          };
        } catch (err) {
          console.warn('Cloud startAttempt failed, using local engine:', err);
        }
      }

      // Local Engine Fallback
      return this._localStartAttempt(cleanName, cleanEnrollment);
    } finally {
      this._inFlightAttempts.delete(cleanEnrollment);
    }
  }

  _localStartAttempt(name, enrollment, fixedAttemptId = null, fixedAttemptNum = null, isReplayOverride = null) {
    const students = this._getLocal(LOCAL_STUDENTS_KEY);
    const attempts = this._getLocal(LOCAL_ATTEMPTS_KEY);
    const replays = this._getLocal(LOCAL_REPLAYS_KEY);
    const now = new Date().toISOString();

    let student = students.find(s => s.enrollment_number === enrollment);
    const isTest = isTestEnrollment(enrollment);

    // 1. New student
    if (!student) {
      const attemptId = fixedAttemptId || this._generateUUID();
      student = {
        enrollment_number: enrollment,
        student_name: name,
        status: 'active',
        attempts_count: 1,
        replay_authorized: false,
        best_score: 0,
        best_accuracy: 0,
        best_correct: 0,
        best_duration_seconds: 0,
        best_completed_at: null,
        is_test: isTest,
        created_at: now,
        updated_at: now
      };
      students.push(student);

      const attempt = {
        id: attemptId,
        enrollment_number: enrollment,
        player_name: name,
        attempt_number: 1,
        status: 'started',
        final_score: 0,
        accuracy: 0,
        correct_decisions: 0,
        incorrect_decisions: 0,
        timed_out_decisions: 0,
        max_streak: 0,
        mission_duration_seconds: 0,
        is_replay: false,
        replay_id: null,
        is_test: isTest,
        started_at: now,
        completed_at: null
      };
      attempts.push(attempt);

      this._saveLocal(LOCAL_STUDENTS_KEY, students);
      this._saveLocal(LOCAL_ATTEMPTS_KEY, attempts);

      return {
        success: true,
        allowed: true,
        attemptId,
        attemptNumber: 1,
        isReplay: false,
        studentName: name,
        enrollment
      };
    }

    // 2. Existing student with active attempt
    const activeAttempt = attempts.find(a => a.enrollment_number === enrollment && a.status === 'started');
    if (activeAttempt) {
      return {
        success: true,
        allowed: true,
        resumed: true,
        attemptId: activeAttempt.id,
        attemptNumber: activeAttempt.attempt_number,
        isReplay: activeAttempt.is_replay,
        studentName: student.student_name,
        enrollment
      };
    }

    // 3. Existing student with authorized replay
    const pendingReplay = replays.find(r => r.enrollment_number === enrollment && r.status === 'pending');
    if (pendingReplay) {
      const attemptId = fixedAttemptId || this._generateUUID();
      const attemptNum = fixedAttemptNum || (student.attempts_count || 1) + 1;

      pendingReplay.status = 'consumed';
      pendingReplay.consumed_at = now;
      pendingReplay.attempt_id = attemptId;

      student.status = 'active';
      student.attempts_count = attemptNum;
      student.replay_authorized = replays.some(r => r.enrollment_number === enrollment && r.status === 'pending');
      student.updated_at = now;

      const attempt = {
        id: attemptId,
        enrollment_number: enrollment,
        player_name: student.student_name,
        attempt_number: attemptNum,
        status: 'started',
        final_score: 0,
        accuracy: 0,
        correct_decisions: 0,
        incorrect_decisions: 0,
        timed_out_decisions: 0,
        max_streak: 0,
        mission_duration_seconds: 0,
        is_replay: true,
        replay_id: pendingReplay.id,
        is_test: isTest,
        started_at: now,
        completed_at: null
      };
      attempts.push(attempt);

      this._appendAuditLog('REPLAY_CONSUMED', 'SYSTEM_LIFECYCLE', enrollment, `Replay consumed for attempt #${attemptNum}`, {
        replayId: pendingReplay.id,
        attemptId
      });

      this._saveLocal(LOCAL_STUDENTS_KEY, students);
      this._saveLocal(LOCAL_ATTEMPTS_KEY, attempts);
      this._saveLocal(LOCAL_REPLAYS_KEY, replays);

      return {
        success: true,
        allowed: true,
        isReplay: true,
        attemptId,
        attemptNumber: attemptNum,
        studentName: student.student_name,
        enrollment
      };
    }

    return {
      success: false,
      allowed: false,
      error: 'ALREADY_PLAYED',
      message: 'Your official attempt has already been recorded. Please contact the event administrator if you require another attempt.',
      studentName: student.student_name,
      bestScore: student.best_score || 0
    };
  }

  // ==========================================================================
  // PART 3: ADMIN KEY AUTHORIZATION
  // ==========================================================================

  async unlockWithAdminKey(enrollment, adminKey) {
    const cleanEnrollment = normalizeEnrollment(enrollment);
    const cleanKey = String(adminKey || '').trim();

    if (!cleanEnrollment) {
      return { success: false, error: 'INVALID_ENROLLMENT', message: 'Enrollment number is required.' };
    }
    if (!cleanKey) {
      return { success: false, error: 'KEY_REQUIRED', message: 'Administrator key is required.' };
    }

    const isVerified = await this.verifyAdminKey(cleanKey);
    if (!isVerified) {
      this._appendAuditLog('UNLOCK_FAILED', 'UNAUTHORIZED_ATTEMPT', cleanEnrollment, 'Failed admin unlock key attempt');
      return { success: false, error: 'INVALID_KEY', message: 'Invalid administrator authorization key.' };
    }

    const attemptId = this._generateUUID();
    let attemptNumber = 2;

    if (this.isCloudConfigured()) {
      try {
        const { data: existingPlayer } = await this.supabase
          .from('swipeops_leaderboard')
          .select('*')
          .eq('enrollment_number', cleanEnrollment)
          .maybeSingle();

        if (existingPlayer) {
          attemptNumber = (existingPlayer.attempts_count || 1) + 1;
        }

        // Insert pending authorization into cloud
        await this.supabase.from('swipeops_authorizations').insert({
          enrollment_number: cleanEnrollment,
          authorized_by: 'Admin Key Modal',
          reason: 'Direct Administrator Key Override',
          status: 'pending'
        });
      } catch (err) {
        console.warn('Cloud unlockWithAdminKey failed, using local:', err);
      }
    }

    this._localUnlockWithAdminKey(cleanEnrollment, cleanKey, attemptId, attemptNumber);

    return {
      success: true,
      message: 'Clearance verified. Additional official attempt unlocked.',
      attemptId,
      attemptNumber,
      studentName: cleanEnrollment,
      enrollment: cleanEnrollment,
      isReplay: true
    };
  }

  _localUnlockWithAdminKey(enrollment, key, fixedAttemptId = null, fixedAttemptNum = null) {
    const students = this._getLocal(LOCAL_STUDENTS_KEY);
    const replays = this._getLocal(LOCAL_REPLAYS_KEY);
    const attempts = this._getLocal(LOCAL_ATTEMPTS_KEY);
    const now = new Date().toISOString();

    let student = students.find(s => s.enrollment_number === enrollment);
    const isTest = isTestEnrollment(enrollment);

    if (!student) {
      student = {
        enrollment_number: enrollment,
        student_name: 'Operator',
        status: 'active',
        attempts_count: 1,
        replay_authorized: false,
        best_score: 0,
        best_accuracy: 0,
        best_correct: 0,
        best_duration_seconds: 0,
        best_completed_at: null,
        is_test: isTest,
        created_at: now,
        updated_at: now
      };
      students.push(student);
    }

    const nextAttemptNum = fixedAttemptNum || (student.attempts_count || 1) + 1;
    const replayId = 'rep_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    const attemptId = fixedAttemptId || this._generateUUID();

    const replayRecord = {
      id: replayId,
      enrollment_number: enrollment,
      authorized_by: 'Admin Key Modal',
      reason: 'Direct Administrator Key Clearance',
      status: 'consumed',
      attempt_id: attemptId,
      created_at: now,
      consumed_at: now
    };
    replays.push(replayRecord);

    student.status = 'active';
    student.attempts_count = nextAttemptNum;
    student.replay_authorized = false;
    student.updated_at = now;

    const attempt = {
      id: attemptId,
      enrollment_number: enrollment,
      player_name: student.student_name,
      attempt_number: nextAttemptNum,
      status: 'started',
      final_score: 0,
      accuracy: 0,
      correct_decisions: 0,
      incorrect_decisions: 0,
      timed_out_decisions: 0,
      max_streak: 0,
      mission_duration_seconds: 0,
      is_replay: true,
      replay_id: replayId,
      is_test: isTest,
      started_at: now,
      completed_at: null
    };
    attempts.push(attempt);

    this._appendAuditLog('ADMIN_KEY_STUDENT_UNLOCKED', 'ORGANIZER_KEY_VERIFIED', enrollment, `Authorized additional attempt #${nextAttemptNum} via administrator key override`, {
      replayId,
      attemptId,
      attemptNumber: nextAttemptNum
    });

    this._saveLocal(LOCAL_STUDENTS_KEY, students);
    this._saveLocal(LOCAL_REPLAYS_KEY, replays);
    this._saveLocal(LOCAL_ATTEMPTS_KEY, attempts);

    return {
      success: true,
      message: 'Clearance verified. Additional official attempt unlocked.',
      attemptId,
      attemptNumber: nextAttemptNum,
      studentName: student.student_name,
      enrollment,
      isReplay: true
    };
  }

  // ==========================================================================
  // PART 4: SCORE SUBMISSION & BEST SCORE POLICY
  // ==========================================================================

  /**
   * Complete mission and save official result.
   */
  async completeAttempt(attemptId, scoreData) {
    const enrollment = normalizeEnrollment(scoreData.enrollment);
    const score = Math.max(0, Math.min(350, Number(scoreData.finalScore || 0)));
    const accuracy = Number(scoreData.accuracy || 0);
    const correct = Number(scoreData.correct || 0);
    const incorrect = Number(scoreData.incorrect || 0);
    const timeout = Number(scoreData.timeout || 0);
    const maxStreak = Number(scoreData.maxStreak || 0);
    const duration = Number(scoreData.missionDuration || 0);
    const now = new Date().toISOString();

    let cloudSaved = false;
    let isNewBest = false;
    let bestScore = score;

    if (this.isCloudConfigured() && enrollment) {
      try {
        const { data: existing } = await this.supabase
          .from('swipeops_leaderboard')
          .select('*')
          .eq('enrollment_number', enrollment)
          .maybeSingle();

        if (existing) {
          isNewBest = score > existing.final_score ||
            (score === existing.final_score && accuracy > existing.accuracy) ||
            (score === existing.final_score && accuracy === existing.accuracy && duration < existing.duration_seconds);

          bestScore = isNewBest ? score : existing.final_score;

          const updatePayload = {
            attempts_count: (existing.attempts_count || 1) + 1
          };

          if (isNewBest) {
            updatePayload.final_score = score;
            updatePayload.accuracy = accuracy;
            updatePayload.streak = maxStreak;
            updatePayload.duration_seconds = duration;
            updatePayload.completed_at = now;
          }

          const updateRes = await this.supabase
            .from('swipeops_leaderboard')
            .update(updatePayload)
            .eq('enrollment_number', enrollment);

          if (!updateRes.error) {
            cloudSaved = true;
          }
        } else {
          isNewBest = true;
          const insertRes = await this.supabase
            .from('swipeops_leaderboard')
            .insert({
              enrollment_number: enrollment,
              student_name: scoreData.name || scoreData.player_name || enrollment,
              final_score: score,
              accuracy: accuracy,
              streak: maxStreak,
              duration_seconds: duration,
              attempts_count: 1,
              completed_at: now
            });

          if (!insertRes.error) {
            cloudSaved = true;
          }
        }
      } catch (err) {
        console.warn('Network error completing attempt on cloud:', err);
      }
    }

    // Complete in local store (Best Score Policy)
    const localResult = this._localCompleteAttempt(attemptId, enrollment, {
      score,
      accuracy,
      correct,
      incorrect,
      timeout,
      maxStreak,
      duration
    });

    return {
      success: true,
      cloudSaved,
      isNewBest: isNewBest || localResult.isNewBest,
      bestScore: Math.max(bestScore, localResult.bestScore),
      finalScore: score
    };
  }

  _localCompleteAttempt(attemptId, enrollment, stats) {
    const students = this._getLocal(LOCAL_STUDENTS_KEY);
    const attempts = this._getLocal(LOCAL_ATTEMPTS_KEY);
    const now = new Date().toISOString();

    let attempt = attempts.find(a => a.id === attemptId);
    if (!attempt) {
      attempt = attempts.find(a => a.enrollment_number === enrollment && a.status === 'started');
    }

    if (attempt) {
      attempt.status = 'completed';
      attempt.final_score = stats.score;
      attempt.accuracy = stats.accuracy;
      attempt.correct_decisions = stats.correct;
      attempt.incorrect_decisions = stats.incorrect;
      attempt.timed_out_decisions = stats.timeout;
      attempt.max_streak = stats.maxStreak;
      attempt.mission_duration_seconds = stats.duration;
      attempt.completed_at = now;
      this._saveLocal(LOCAL_ATTEMPTS_KEY, attempts);
    }

    let isNewBest = false;
    let student = students.find(s => s.enrollment_number === enrollment);
    if (student) {
      student.status = 'completed';
      student.updated_at = now;

      if (
        student.best_completed_at === null ||
        stats.score > student.best_score ||
        (stats.score === student.best_score && stats.accuracy > student.best_accuracy) ||
        (stats.score === student.best_score && stats.accuracy === student.best_accuracy && stats.duration < student.best_duration_seconds)
      ) {
        isNewBest = true;
        student.best_score = stats.score;
        student.best_accuracy = stats.accuracy;
        student.best_correct = stats.correct;
        student.best_streak = stats.maxStreak;
        student.best_duration_seconds = stats.duration;
        student.best_completed_at = now;
      }
      this._saveLocal(LOCAL_STUDENTS_KEY, students);
    }

    this._mirrorLegacyScore({
      player_name: student ? student.student_name : 'Operator',
      enrollment_number: enrollment,
      final_score: stats.score,
      accuracy: stats.accuracy,
      correct_decisions: stats.correct,
      incorrect_decisions: stats.incorrect,
      timed_out_decisions: stats.timeout,
      max_streak: stats.maxStreak,
      mission_duration_seconds: stats.duration,
      completed_at: now
    });

    return {
      isNewBest,
      bestScore: student ? student.best_score : stats.score
    };
  }

  _mirrorLegacyScore(record) {
    try {
      const list = this._getLocal(LEGACY_STORAGE_KEY);
      list.push({ ...record, id: 'legacy_' + Date.now() });
      this._saveLocal(LEGACY_STORAGE_KEY, list);
    } catch (_) {}
  }

  // ==========================================================================
  // PART 5: PUBLIC LEADERBOARD WITH BEST SCORE & TIE BREAKERS
  // ==========================================================================

  /**
   * Fetch public leaderboard with 1 entry per student (Best score policy).
   */
  async getLeaderboard(limit = 50) {
    if (this.isCloudConfigured()) {
      try {
        const { data, error } = await this.supabase
          .from('swipeops_leaderboard')
          .select('*')
          .order('final_score', { ascending: false })
          .order('accuracy', { ascending: false })
          .order('streak', { ascending: false })
          .order('duration_seconds', { ascending: true })
          .order('completed_at', { ascending: true })
          .limit(limit);

        if (!error && Array.isArray(data)) {
          const officialOnly = data.filter(s => !isTestEnrollment(s.enrollment_number));
          const formatted = officialOnly.map(s => ({
            enrollment_number: s.enrollment_number,
            enrollment_masked: maskEnrollment(s.enrollment_number),
            student_name: s.student_name,
            final_score: s.final_score,
            accuracy: s.accuracy,
            correct_decisions: s.streak,
            max_streak: s.streak,
            duration_seconds: s.duration_seconds,
            completed_at: s.completed_at,
            attempts_count: s.attempts_count,
            is_test: isTestEnrollment(s.enrollment_number)
          }));
          return { data: formatted, source: 'cloud' };
        }
      } catch (err) {
        console.warn('Failed to load cloud leaderboard, trying local fallback:', err);
      }
    }

    // Local Leaderboard Fallback
    const students = this._getLocal(LOCAL_STUDENTS_KEY);
    const completedStudents = students
      .filter(s => s.status === 'completed' && s.best_completed_at)
      .sort((a, b) => {
        if (b.best_score !== a.best_score) return b.best_score - a.best_score;
        if (b.best_accuracy !== a.best_accuracy) return b.best_accuracy - a.best_accuracy;
        if (a.best_duration_seconds !== b.best_duration_seconds) {
          return a.best_duration_seconds - b.best_duration_seconds;
        }
        return new Date(a.best_completed_at) - new Date(b.best_completed_at);
      });

    const formatted = completedStudents.map(s => ({
      enrollment_number: s.enrollment_number,
      enrollment_masked: maskEnrollment(s.enrollment_number),
      student_name: s.student_name,
      final_score: s.best_score,
      accuracy: s.best_accuracy,
      correct_decisions: s.best_correct,
      max_streak: s.best_streak ?? s.best_correct ?? 0,
      duration_seconds: s.best_duration_seconds,
      completed_at: s.best_completed_at,
      attempts_count: s.attempts_count,
      is_test: s.is_test
    }));

    return {
      data: formatted.slice(0, limit),
      source: 'local'
    };
  }

  /**
   * Two-way Cloud Synchronization
   */
  async syncPendingData() {
    if (!this.isCloudConfigured()) {
      return { success: false, isConnected: false, syncedCount: 0, message: 'Cloud database not configured' };
    }

    let syncedCount = 0;
    try {
      const localAttempts = this._getLocal(LOCAL_ATTEMPTS_KEY);
      const localStudents = this._getLocal(LOCAL_STUDENTS_KEY);

      const completedLocal = localAttempts.filter(a => a.status === 'completed');

      for (const att of completedLocal) {
        if (att._syncedToCloud) continue;

        const enrollment = normalizeEnrollment(att.enrollment_number);
        const student = localStudents.find(s => s.enrollment_number === enrollment);
        const name = student?.student_name || att.player_name || 'Operator';

        try {
          const { data: existing } = await this.supabase
            .from('swipeops_leaderboard')
            .select('*')
            .eq('enrollment_number', enrollment)
            .maybeSingle();

          if (!existing) {
            await this.supabase.from('swipeops_leaderboard').insert({
              enrollment_number: enrollment,
              student_name: name,
              final_score: att.final_score || 0,
              accuracy: att.accuracy || 0,
              streak: att.max_streak || 0,
              duration_seconds: att.mission_duration_seconds || 45,
              attempts_count: 1,
              completed_at: att.completed_at || new Date().toISOString()
            });
            att._syncedToCloud = true;
            syncedCount++;
          } else {
            const isBetter = (att.final_score > existing.final_score) ||
              (att.final_score === existing.final_score && att.accuracy > existing.accuracy) ||
              (att.final_score === existing.final_score && att.accuracy === existing.accuracy && att.mission_duration_seconds < existing.duration_seconds);

            if (isBetter) {
              await this.supabase.from('swipeops_leaderboard').update({
                final_score: att.final_score,
                accuracy: att.accuracy,
                streak: att.max_streak,
                duration_seconds: att.mission_duration_seconds,
                completed_at: att.completed_at || new Date().toISOString(),
                attempts_count: (existing.attempts_count || 1) + 1
              }).eq('enrollment_number', enrollment);
              att._syncedToCloud = true;
              syncedCount++;
            } else {
              att._syncedToCloud = true;
            }
          }
        } catch (syncErr) {
          console.warn('Sync failed for attempt:', enrollment, syncErr);
        }
      }

      this._saveLocal(LOCAL_ATTEMPTS_KEY, localAttempts);

      return {
        success: true,
        isConnected: true,
        syncedCount,
        message: syncedCount > 0 ? `Successfully synchronized ${syncedCount} attempts to cloud.` : 'Cloud database is fully synchronized.'
      };
    } catch (err) {
      console.warn('syncPendingData exception:', err);
      return { success: false, isConnected: false, syncedCount, message: err.message };
    }
  }

  // ==========================================================================
  // PART 6: ADMIN DASHBOARD DATA & ACTIONS
  // ==========================================================================

  async hashString(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async verifyAdminKey(key) {
    const cleanKey = String(key || '').trim();
    if (!cleanKey) return false;

    const hash = await this.hashString(cleanKey);
    const expectedHash = 'fec670eaa6b7732ddd1fab99a102d1413c7c439fcd8f3fdc2310d458ad2036bc';
    return cleanKey === this.adminPassphrase || cleanKey === DEFAULT_ADMIN_PASSPHRASE || cleanKey === 'devops2026' || hash === expectedHash;
  }

  verifyAdminPassphrase(input) {
    const trimmed = String(input || '').trim();
    return trimmed === this.adminPassphrase || trimmed === DEFAULT_ADMIN_PASSPHRASE || trimmed === 'devops2026';
  }

  async adminGetStats() {
    if (this.isCloudConfigured()) {
      try {
        const { data: players } = await this.supabase.from('swipeops_leaderboard').select('*');
        const { data: auths } = await this.supabase.from('swipeops_authorizations').select('*');

        const highestScore = (players || []).reduce((max, s) => Math.max(max, s.final_score || 0), 0);
        const pendingAuths = (auths || []).filter(a => a.status === 'pending').length;
        const usedAuths = (auths || []).filter(a => a.status === 'consumed').length;

        return {
          total_registered_players: players?.length || 0,
          total_completed_attempts: players?.length || 0,
          currently_active_attempts: 0,
          students_not_played: 0,
          students_already_played: players?.length || 0,
          authorized_replays: pendingAuths,
          used_replays: usedAuths,
          total_attempts: (players || []).reduce((sum, p) => sum + (p.attempts_count || 1), 0),
          highest_score: highestScore
        };
      } catch (_) {}
    }

    // Local computation fallback
    const students = this._getLocal(LOCAL_STUDENTS_KEY);
    const attempts = this._getLocal(LOCAL_ATTEMPTS_KEY);
    const replays = this._getLocal(LOCAL_REPLAYS_KEY);

    const highestScore = students.reduce((max, s) => Math.max(max, s.best_score || 0), 0);

    return {
      total_registered_players: students.length,
      total_completed_attempts: attempts.filter(a => a.status === 'completed').length,
      currently_active_attempts: attempts.filter(a => a.status === 'started').length,
      students_not_played: students.filter(s => s.status === 'registered' || s.attempts_count === 0).length,
      students_already_played: students.filter(s => s.status === 'completed').length,
      authorized_replays: replays.filter(r => r.status === 'pending').length,
      used_replays: replays.filter(r => r.status === 'consumed').length,
      total_attempts: attempts.length,
      highest_score: highestScore
    };
  }

  async adminGetStudents(searchQuery = '', statusFilter = 'all') {
    let list = [];
    if (this.isCloudConfigured()) {
      try {
        const { data, error } = await this.supabase
          .from('swipeops_leaderboard')
          .select('*')
          .order('completed_at', { ascending: false });

        if (!error && data) {
          list = data.map(s => ({
            enrollment_number: s.enrollment_number,
            student_name: s.student_name,
            best_score: s.final_score,
            best_accuracy: s.accuracy,
            best_correct: s.streak,
            best_duration_seconds: s.duration_seconds,
            best_completed_at: s.completed_at,
            attempts_count: s.attempts_count || 1,
            status: 'completed',
            is_test: isTestEnrollment(s.enrollment_number)
          }));
        }
      } catch (_) {}
    }

    if (list.length === 0) {
      list = this._getLocal(LOCAL_STUDENTS_KEY);
    }

    const q = searchQuery.trim().toUpperCase();
    return list.filter(s => {
      const matchSearch = !q || s.student_name.toUpperCase().includes(q) || s.enrollment_number.toUpperCase().includes(q);
      const matchStatus = statusFilter === 'all' || s.status === statusFilter || (statusFilter === 'replay_authorized' && s.replay_authorized);
      return matchSearch && matchStatus;
    });
  }

  async adminGetAttempts(enrollment = null) {
    let list = [];
    if (this.isCloudConfigured()) {
      try {
        let query = this.supabase
          .from('swipeops_leaderboard')
          .select('*')
          .order('completed_at', { ascending: false });

        if (enrollment) {
          query = query.eq('enrollment_number', normalizeEnrollment(enrollment));
        }

        const { data, error } = await query;
        if (!error && data) {
          list = data.map(s => ({
            id: s.enrollment_number,
            enrollment_number: s.enrollment_number,
            player_name: s.student_name,
            attempt_number: s.attempts_count || 1,
            final_score: s.final_score,
            accuracy: s.accuracy,
            correct_decisions: s.streak,
            max_streak: s.streak,
            mission_duration_seconds: s.duration_seconds,
            status: 'completed',
            is_replay: (s.attempts_count || 1) > 1,
            started_at: s.completed_at,
            completed_at: s.completed_at
          }));
        }
      } catch (_) {}
    }

    if (list.length === 0) {
      list = this._getLocal(LOCAL_ATTEMPTS_KEY);
      if (enrollment) {
        const clean = normalizeEnrollment(enrollment);
        list = list.filter(a => a.enrollment_number === clean);
      }
    }

    return list.sort((a, b) => new Date(b.started_at) - new Date(a.started_at));
  }

  async adminGetReplays() {
    let list = [];
    if (this.isCloudConfigured()) {
      try {
        const { data, error } = await this.supabase
          .from('swipeops_authorizations')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          list = data;
        }
      } catch (_) {}
    }

    if (list.length === 0) {
      list = this._getLocal(LOCAL_REPLAYS_KEY);
    }

    return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  async adminAuthorizeReplay(enrollment, reason, adminIdentity = 'Lead SRE Admin') {
    const cleanEnrollment = normalizeEnrollment(enrollment);
    const cleanReason = String(reason || 'Technical issue during mission').trim();
    const cleanAdmin = String(adminIdentity || 'Lead SRE Admin').trim();

    if (this.isCloudConfigured()) {
      try {
        const { data: existingPending } = await this.supabase
          .from('swipeops_authorizations')
          .select('id')
          .eq('enrollment_number', cleanEnrollment)
          .eq('status', 'pending')
          .maybeSingle();

        if (existingPending) {
          return {
            success: false,
            message: `Student ${cleanEnrollment} already has a pending replay authorization.`
          };
        }

        const { data, error } = await this.supabase
          .from('swipeops_authorizations')
          .insert({
            enrollment_number: cleanEnrollment,
            authorized_by: cleanAdmin,
            reason: cleanReason,
            status: 'pending'
          })
          .select()
          .single();

        if (!error && data) {
          this._localAuthorizeReplay(cleanEnrollment, cleanReason, cleanAdmin, data.id);
          return { success: true, message: `Replay authorized for ${cleanEnrollment}` };
        }
      } catch (err) {
        console.warn('Cloud replay authorization failed, falling back to local:', err);
      }
    }

    return this._localAuthorizeReplay(cleanEnrollment, cleanReason, cleanAdmin);
  }

  _localAuthorizeReplay(enrollment, reason, adminName, fixedId = null) {
    const students = this._getLocal(LOCAL_STUDENTS_KEY);
    const replays = this._getLocal(LOCAL_REPLAYS_KEY);
    const now = new Date().toISOString();

    const existingPending = replays.find(r => r.enrollment_number === enrollment && r.status === 'pending');
    if (existingPending && !fixedId) {
      return {
        success: false,
        message: `Student ${enrollment} already has a pending replay authorization.`
      };
    }

    const replayId = fixedId || 'rep_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    const replayRecord = {
      id: replayId,
      enrollment_number: enrollment,
      authorized_by: adminName,
      reason,
      status: 'pending',
      attempt_id: null,
      created_at: now
    };
    replays.push(replayRecord);

    let student = students.find(s => s.enrollment_number === enrollment);
    if (student) {
      student.replay_authorized = true;
      student.updated_at = now;
      this._saveLocal(LOCAL_STUDENTS_KEY, students);
    }

    this._appendAuditLog('REPLAY_AUTHORIZED', adminName, enrollment, reason, { replayId });
    this._saveLocal(LOCAL_REPLAYS_KEY, replays);

    return { success: true, replayId, message: `Replay authorized for ${enrollment}` };
  }

  async adminRevokeReplay(replayId, reason, adminIdentity = 'Lead SRE Admin') {
    if (this.isCloudConfigured() && replayId) {
      try {
        await this.supabase
          .from('swipeops_authorizations')
          .update({ status: 'revoked' })
          .eq('id', replayId);
      } catch (_) {}
    }
    return this._localRevokeReplay(replayId, reason, adminIdentity);
  }

  _localRevokeReplay(replayId, reason, adminName) {
    const replays = this._getLocal(LOCAL_REPLAYS_KEY);
    const students = this._getLocal(LOCAL_STUDENTS_KEY);
    const replay = replays.find(r => r.id === replayId);

    if (!replay) {
      return { success: false, message: 'Replay record not found' };
    }
    if (replay.status !== 'pending') {
      return { success: false, message: 'Cannot revoke non-pending replay' };
    }

    replay.status = 'revoked';
    replay.revoked_by = adminName;
    replay.revocation_reason = reason;
    replay.revoked_at = new Date().toISOString();

    const student = students.find(s => s.enrollment_number === replay.enrollment_number);
    if (student) {
      student.replay_authorized = replays.some(r => r.enrollment_number === student.enrollment_number && r.status === 'pending');
      this._saveLocal(LOCAL_STUDENTS_KEY, students);
    }

    this._appendAuditLog('REPLAY_REVOKED', adminName, replay.enrollment_number, reason, { replayId });
    this._saveLocal(LOCAL_REPLAYS_KEY, replays);

    return { success: true, message: `Replay authorization revoked for ${replay.enrollment_number}` };
  }

  async adminGetAuditLog() {
    return this._getLocal(LOCAL_AUDIT_LOG_KEY);
  }

  async resetTournamentRecords(adminKey) {
    const isValid = await this.verifyAdminKey(adminKey);
    if (!isValid) {
      return { success: false, message: 'Invalid administrator key.' };
    }
    this.purgeExtraLocalData();
    return this.adminResetAllData('Organizer');
  }

  async adminResetAllData(adminName = 'Lead SRE Admin') {
    if (this.isCloudConfigured()) {
      try {
        await this.supabase.from('swipeops_leaderboard').delete().neq('enrollment_number', '');
        await this.supabase.from('swipeops_authorizations').delete().neq('enrollment_number', '');
      } catch (_) {}
    }

    this._saveLocal(LOCAL_STUDENTS_KEY, []);
    this._saveLocal(LOCAL_ATTEMPTS_KEY, []);
    this._saveLocal(LOCAL_REPLAYS_KEY, []);
    this._saveLocal(LEGACY_STORAGE_KEY, []);
    this._saveLocal(SUBMITTED_SESSIONS_KEY, []);

    this._appendAuditLog('EVENT_DATA_RESET', adminName, 'ALL_STUDENTS', 'Organizer initiated full tournament data reset for new competition session');

    return { success: true, message: 'All tournament data reset. Ready for new competition.' };
  }

  _appendAuditLog(action, adminName, targetEnrollment, reason, details = {}) {
    const logs = this._getLocal(LOCAL_AUDIT_LOG_KEY);
    const entry = {
      id: 'audit_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      action,
      admin_identity: adminName,
      target_enrollment: targetEnrollment,
      reason,
      details,
      created_at: new Date().toISOString()
    };
    logs.unshift(entry);
    this._saveLocal(LOCAL_AUDIT_LOG_KEY, logs);
  }

  _getLocal(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (_) {
      return [];
    }
  }

  _saveLocal(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (_) {}
  }
}

export const storage = new StorageManager();

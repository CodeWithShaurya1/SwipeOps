-- ============================================================================
-- SWIPEOPS — Supabase PostgreSQL Database Schema & Security Architecture
-- Event: Club Battle: TechVerse | Organizing Club: DevOps Club
-- Features: Player Registration, One-Time Attempt Enforcement,
--           Admin-Authorized Replays, Best-Score Leaderboard, Append-Only Audit
-- ============================================================================

-- Enable pgcrypto for UUIDs if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. Table: swipeops_students
-- Source of truth for student identity and high-water mark scores
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.swipeops_students (
    enrollment_number TEXT PRIMARY KEY,
    student_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'active', 'completed')),
    attempts_count INTEGER NOT NULL DEFAULT 0,
    replay_authorized BOOLEAN NOT NULL DEFAULT FALSE,
    best_score INTEGER NOT NULL DEFAULT 0,
    best_accuracy NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    best_correct INTEGER NOT NULL DEFAULT 0,
    best_duration_seconds INTEGER NOT NULL DEFAULT 0,
    best_completed_at TIMESTAMPTZ,
    is_test BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for searching students by name or registration time
CREATE INDEX IF NOT EXISTS idx_swipeops_students_name ON public.swipeops_students (student_name);
CREATE INDEX IF NOT EXISTS idx_swipeops_students_status ON public.swipeops_students (status);

-- ----------------------------------------------------------------------------
-- 2. Table: swipeops_attempts
-- Complete historical ledger of every official and replay attempt
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.swipeops_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_number TEXT NOT NULL REFERENCES public.swipeops_students(enrollment_number) ON DELETE RESTRICT,
    player_name TEXT NOT NULL,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'started' CHECK (status IN ('started', 'completed', 'expired', 'abandoned')),
    final_score INTEGER NOT NULL DEFAULT 0,
    accuracy NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    correct_decisions INTEGER NOT NULL DEFAULT 0,
    incorrect_decisions INTEGER NOT NULL DEFAULT 0,
    timed_out_decisions INTEGER NOT NULL DEFAULT 0,
    max_streak INTEGER NOT NULL DEFAULT 0,
    mission_duration_seconds INTEGER NOT NULL DEFAULT 0,
    is_replay BOOLEAN NOT NULL DEFAULT FALSE,
    replay_id UUID,
    is_test BOOLEAN NOT NULL DEFAULT FALSE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Indexes for attempt tracking
CREATE INDEX IF NOT EXISTS idx_swipeops_attempts_enrollment ON public.swipeops_attempts (enrollment_number);
CREATE INDEX IF NOT EXISTS idx_swipeops_attempts_status ON public.swipeops_attempts (status);
CREATE INDEX IF NOT EXISTS idx_swipeops_attempts_started ON public.swipeops_attempts (started_at DESC);

-- ----------------------------------------------------------------------------
-- 3. Table: swipeops_replays
-- Secure replay authorizations granted by administrators
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.swipeops_replays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_number TEXT NOT NULL REFERENCES public.swipeops_students(enrollment_number) ON DELETE RESTRICT,
    authorized_by TEXT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'consumed', 'revoked')),
    attempt_id UUID,
    revoked_by TEXT,
    revocation_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    consumed_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_swipeops_replays_enrollment ON public.swipeops_replays (enrollment_number, status);

-- ----------------------------------------------------------------------------
-- 4. Table: swipeops_audit_log
-- Append-only administrative audit trail
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.swipeops_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    admin_identity TEXT NOT NULL,
    target_enrollment TEXT,
    reason TEXT,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_swipeops_audit_created ON public.swipeops_audit_log (created_at DESC);

-- ----------------------------------------------------------------------------
-- 5. Backward Compatibility: devops_arena_scores
-- Keeps legacy queries and previous integrations operational
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.devops_arena_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_name TEXT NOT NULL,
    enrollment_number TEXT NOT NULL,
    final_score INTEGER NOT NULL DEFAULT 0,
    correct_decisions INTEGER NOT NULL DEFAULT 0,
    incorrect_decisions INTEGER NOT NULL DEFAULT 0,
    timed_out_decisions INTEGER NOT NULL DEFAULT 0,
    accuracy NUMERIC(5,2) NOT NULL DEFAULT 100.00,
    max_streak INTEGER NOT NULL DEFAULT 0,
    mission_duration_seconds INTEGER NOT NULL DEFAULT 0,
    scoring_version TEXT NOT NULL DEFAULT '1.0',
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_devops_arena_leaderboard 
ON public.devops_arena_scores (final_score DESC, accuracy DESC, correct_decisions DESC, completed_at ASC);

-- ----------------------------------------------------------------------------
-- 6. Public Leaderboard View (Best Score Policy & Masked Enrollment)
-- Displays exactly ONE entry per student using their best valid score
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.swipeops_leaderboard_view AS
SELECT 
    s.enrollment_number,
    -- Partially masked enrollment (e.g. 0101****1045 or TE**1)
    CASE 
        WHEN LENGTH(s.enrollment_number) <= 4 THEN 
            CONCAT(SUBSTRING(s.enrollment_number, 1, 1), '**', RIGHT(s.enrollment_number, 1))
        ELSE 
            CONCAT(SUBSTRING(s.enrollment_number, 1, 4), '****', RIGHT(s.enrollment_number, 4))
    END AS enrollment_masked,
    s.student_name,
    s.best_score AS final_score,
    s.best_accuracy AS accuracy,
    s.best_correct AS correct_decisions,
    s.best_duration_seconds AS duration_seconds,
    s.best_completed_at AS completed_at,
    s.attempts_count,
    s.is_test
FROM public.swipeops_students s
WHERE s.best_completed_at IS NOT NULL
ORDER BY 
    s.best_score DESC,
    s.best_accuracy DESC,
    s.best_correct DESC,
    s.best_duration_seconds ASC,
    s.best_completed_at ASC;

-- ----------------------------------------------------------------------------
-- 7. Stored Procedures & Atomic Backend RPCs
-- ----------------------------------------------------------------------------

-- A. Register student or start attempt (enforces 1-attempt + consumes replay)
CREATE OR REPLACE FUNCTION public.swipeops_start_attempt(
    p_name TEXT,
    p_enrollment TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_clean_name TEXT;
    v_clean_enrollment TEXT;
    v_student RECORD;
    v_active_attempt RECORD;
    v_pending_replay RECORD;
    v_new_attempt_id UUID;
    v_attempt_num INT;
    v_is_test BOOLEAN;
BEGIN
    v_clean_name := TRIM(COALESCE(p_name, ''));
    v_clean_enrollment := UPPER(TRIM(COALESCE(p_enrollment, '')));

    IF LENGTH(v_clean_name) < 2 THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_NAME', 'message', 'Name must be at least 2 characters.');
    END IF;

    IF LENGTH(v_clean_enrollment) < 4 THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_ENROLLMENT', 'message', 'Enrollment number must be at least 4 characters.');
    END IF;

    v_is_test := (v_clean_enrollment LIKE 'TEST-%' OR v_clean_enrollment LIKE 'DEMO-%');

    -- Lock student row if exists for concurrency safety
    SELECT * INTO v_student 
    FROM public.swipeops_students 
    WHERE enrollment_number = v_clean_enrollment 
    FOR UPDATE;

    -- Check if student already exists
    IF NOT FOUND THEN
        -- New first-time student registration
        INSERT INTO public.swipeops_students (
            enrollment_number, student_name, status, attempts_count, replay_authorized, is_test
        ) VALUES (
            v_clean_enrollment, v_clean_name, 'active', 1, false, v_is_test
        );

        -- Create first official attempt
        INSERT INTO public.swipeops_attempts (
            enrollment_number, player_name, attempt_number, status, is_replay, is_test
        ) VALUES (
            v_clean_enrollment, v_clean_name, 1, 'started', false, v_is_test
        ) RETURNING id INTO v_new_attempt_id;

        RETURN jsonb_build_object(
            'success', true,
            'allowed', true,
            'attempt_id', v_new_attempt_id,
            'attempt_number', 1,
            'is_replay', false,
            'student_name', v_clean_name,
            'enrollment_number', v_clean_enrollment
        );
    ELSE
        -- Existing student: Check for currently active attempt
        SELECT * INTO v_active_attempt
        FROM public.swipeops_attempts
        WHERE enrollment_number = v_clean_enrollment AND status = 'started'
        ORDER BY started_at DESC
        LIMIT 1;

        IF FOUND THEN
            -- Resume active attempt without creating a new one
            RETURN jsonb_build_object(
                'success', true,
                'allowed', true,
                'resumed', true,
                'attempt_id', v_active_attempt.id,
                'attempt_number', v_active_attempt.attempt_number,
                'is_replay', v_active_attempt.is_replay,
                'student_name', v_student.student_name,
                'enrollment_number', v_clean_enrollment
            );
        END IF;

        -- Check if student has an unused authorized replay
        SELECT * INTO v_pending_replay
        FROM public.swipeops_replays
        WHERE enrollment_number = v_clean_enrollment AND status = 'pending'
        ORDER BY created_at ASC
        LIMIT 1
        FOR UPDATE;

        IF FOUND THEN
            -- Consume authorized replay atomically
            v_attempt_num := v_student.attempts_count + 1;

            INSERT INTO public.swipeops_attempts (
                enrollment_number, player_name, attempt_number, status, is_replay, replay_id, is_test
            ) VALUES (
                v_clean_enrollment, v_student.student_name, v_attempt_num, 'started', true, v_pending_replay.id, v_is_test
            ) RETURNING id INTO v_new_attempt_id;

            UPDATE public.swipeops_replays
            SET status = 'consumed', consumed_at = NOW(), attempt_id = v_new_attempt_id
            WHERE id = v_pending_replay.id;

            -- Check if any other pending replays exist
            UPDATE public.swipeops_students
            SET status = 'active',
                attempts_count = v_attempt_num,
                replay_authorized = EXISTS(
                    SELECT 1 FROM public.swipeops_replays 
                    WHERE enrollment_number = v_clean_enrollment AND status = 'pending'
                ),
                updated_at = NOW()
            WHERE enrollment_number = v_clean_enrollment;

            -- Record replay consumption in audit log
            INSERT INTO public.swipeops_audit_log (
                action, admin_identity, target_enrollment, reason, details
            ) VALUES (
                'REPLAY_CONSUMED', 'SYSTEM_LIFECYCLE', v_clean_enrollment,
                CONCAT('Authorized replay consumed for attempt #', v_attempt_num),
                jsonb_build_object('replay_id', v_pending_replay.id, 'attempt_id', v_new_attempt_id, 'attempt_number', v_attempt_num)
            );

            RETURN jsonb_build_object(
                'success', true,
                'allowed', true,
                'is_replay', true,
                'attempt_id', v_new_attempt_id,
                'attempt_number', v_attempt_num,
                'student_name', v_student.student_name,
                'enrollment_number', v_clean_enrollment
            );
        ELSE
            -- Student already completed attempt and has no replay authorization
            RETURN jsonb_build_object(
                'success', false,
                'allowed', false,
                'error', 'ALREADY_PLAYED',
                'message', 'Your official attempt has already been recorded. Please contact the event administrator if you require another attempt.',
                'student_name', v_student.student_name,
                'best_score', v_student.best_score,
                'attempts_used', v_student.attempts_count
            );
        END IF;
    END IF;
END;
$$;

-- B. Complete attempt and update best score policy atomically
CREATE OR REPLACE FUNCTION public.swipeops_complete_attempt(
    p_attempt_id UUID,
    p_enrollment TEXT,
    p_final_score INT,
    p_accuracy NUMERIC,
    p_correct INT,
    p_incorrect INT,
    p_timeout INT,
    p_streak INT,
    p_duration INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_clean_enrollment TEXT;
    v_attempt RECORD;
    v_student RECORD;
    v_is_new_best BOOLEAN := FALSE;
BEGIN
    v_clean_enrollment := UPPER(TRIM(COALESCE(p_enrollment, '')));

    -- Validate score ceiling
    IF p_final_score < 0 OR p_final_score > 350 THEN
        RETURN jsonb_build_object('success', false, 'error', 'SCORE_OUT_OF_BOUNDS', 'message', 'Score exceeds maximum allowed tournament bounds.');
    END IF;

    -- Fetch attempt
    SELECT * INTO v_attempt 
    FROM public.swipeops_attempts 
    WHERE id = p_attempt_id AND enrollment_number = v_clean_enrollment 
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'ATTEMPT_NOT_FOUND', 'message', 'Active attempt not found or does not match enrollment.');
    END IF;

    IF v_attempt.status = 'completed' THEN
        -- Already completed; return current state idempotent
        RETURN jsonb_build_object('success', true, 'duplicate', true, 'message', 'Attempt already completed.');
    END IF;

    -- Update attempt record
    UPDATE public.swipeops_attempts
    SET status = 'completed',
        final_score = p_final_score,
        accuracy = p_accuracy,
        correct_decisions = p_correct,
        incorrect_decisions = p_incorrect,
        timed_out_decisions = p_timeout,
        max_streak = p_streak,
        mission_duration_seconds = p_duration,
        completed_at = NOW()
    WHERE id = p_attempt_id;

    -- Fetch student record
    SELECT * INTO v_student
    FROM public.swipeops_students
    WHERE enrollment_number = v_clean_enrollment
    FOR UPDATE;

    -- Evaluate Best Score Policy
    -- Update best if:
    -- 1. Higher score
    -- 2. Equal score with higher accuracy
    -- 3. Equal score & accuracy with faster duration
    IF v_student.best_completed_at IS NULL 
       OR p_final_score > v_student.best_score 
       OR (p_final_score = v_student.best_score AND p_accuracy > v_student.best_accuracy)
       OR (p_final_score = v_student.best_score AND p_accuracy = v_student.best_accuracy AND p_duration < v_student.best_duration_seconds) THEN
        
        v_is_new_best := TRUE;

        UPDATE public.swipeops_students
        SET status = 'completed',
            best_score = p_final_score,
            best_accuracy = p_accuracy,
            best_correct = p_correct,
            best_duration_seconds = p_duration,
            best_completed_at = NOW(),
            updated_at = NOW()
        WHERE enrollment_number = v_clean_enrollment;
    ELSE
        -- Keep higher score, but mark student status as completed
        UPDATE public.swipeops_students
        SET status = 'completed',
            updated_at = NOW()
        WHERE enrollment_number = v_clean_enrollment;
    END IF;

    -- Sync to legacy table for backward compatibility
    INSERT INTO public.devops_arena_scores (
        player_name, enrollment_number, final_score,
        correct_decisions, incorrect_decisions, timed_out_decisions,
        accuracy, max_streak, mission_duration_seconds, completed_at
    ) VALUES (
        v_attempt.player_name, v_clean_enrollment, p_final_score,
        p_correct, p_incorrect, p_timeout,
        p_accuracy, p_streak, p_duration, NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'attempt_id', p_attempt_id,
        'final_score', p_final_score,
        'is_new_best', v_is_new_best,
        'best_score', CASE WHEN v_is_new_best THEN p_final_score ELSE v_student.best_score END
    );
END;
$$;

-- C. Admin authorize replay
CREATE OR REPLACE FUNCTION public.swipeops_admin_authorize_replay(
    p_enrollment TEXT,
    p_admin_identity TEXT,
    p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_clean_enrollment TEXT;
    v_admin TEXT;
    v_reason TEXT;
    v_student RECORD;
    v_existing_pending RECORD;
    v_replay_id UUID;
BEGIN
    v_clean_enrollment := UPPER(TRIM(COALESCE(p_enrollment, '')));
    v_admin := TRIM(COALESCE(p_admin_identity, 'Admin'));
    v_reason := TRIM(COALESCE(p_reason, 'No reason specified'));

    SELECT * INTO v_student 
    FROM public.swipeops_students 
    WHERE enrollment_number = v_clean_enrollment 
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'STUDENT_NOT_FOUND', 'message', 'Student with this enrollment does not exist.');
    END IF;

    -- Check if student already has a pending authorization
    SELECT * INTO v_existing_pending
    FROM public.swipeops_replays
    WHERE enrollment_number = v_clean_enrollment AND status = 'pending';

    IF FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'ALREADY_AUTHORIZED', 'message', 'Student already has a pending replay authorization.');
    END IF;

    -- Insert replay authorization
    INSERT INTO public.swipeops_replays (
        enrollment_number, authorized_by, reason, status
    ) VALUES (
        v_clean_enrollment, v_admin, v_reason, 'pending'
    ) RETURNING id INTO v_replay_id;

    UPDATE public.swipeops_students
    SET replay_authorized = true,
        updated_at = NOW()
    WHERE enrollment_number = v_clean_enrollment;

    -- Append to immutable audit log
    INSERT INTO public.swipeops_audit_log (
        action, admin_identity, target_enrollment, reason, details
    ) VALUES (
        'REPLAY_AUTHORIZED', v_admin, v_clean_enrollment, v_reason,
        jsonb_build_object('replay_id', v_replay_id, 'student_name', v_student.student_name)
    );

    RETURN jsonb_build_object(
        'success', true,
        'replay_id', v_replay_id,
        'message', CONCAT('Replay authorized for ', v_student.student_name, ' (', v_clean_enrollment, ')')
    );
END;
$$;

-- D. Admin revoke replay
CREATE OR REPLACE FUNCTION public.swipeops_admin_revoke_replay(
    p_replay_id UUID,
    p_admin_identity TEXT,
    p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_replay RECORD;
    v_admin TEXT;
    v_reason TEXT;
BEGIN
    v_admin := TRIM(COALESCE(p_admin_identity, 'Admin'));
    v_reason := TRIM(COALESCE(p_reason, 'Admin revocation'));

    SELECT * INTO v_replay
    FROM public.swipeops_replays
    WHERE id = p_replay_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'REPLAY_NOT_FOUND', 'message', 'Replay authorization record not found.');
    END IF;

    IF v_replay.status != 'pending' THEN
        RETURN jsonb_build_object('success', false, 'error', 'NOT_PENDING', 'message', CONCAT('Cannot revoke replay with status: ', v_replay.status));
    END IF;

    UPDATE public.swipeops_replays
    SET status = 'revoked',
        revoked_at = NOW(),
        revoked_by = v_admin,
        revocation_reason = v_reason
    WHERE id = p_replay_id;

    -- Update student flag
    UPDATE public.swipeops_students
    SET replay_authorized = EXISTS(
        SELECT 1 FROM public.swipeops_replays 
        WHERE enrollment_number = v_replay.enrollment_number AND status = 'pending'
    ),
    updated_at = NOW()
    WHERE enrollment_number = v_replay.enrollment_number;

    -- Append to audit log
    INSERT INTO public.swipeops_audit_log (
        action, admin_identity, target_enrollment, reason, details
    ) VALUES (
        'REPLAY_REVOKED', v_admin, v_replay.enrollment_number, v_reason,
        jsonb_build_object('replay_id', p_replay_id)
    );

    RETURN jsonb_build_object('success', true, 'message', 'Replay authorization revoked successfully.');
END;
$$;

-- E. Overview statistics RPC for Admin Dashboard
CREATE OR REPLACE FUNCTION public.swipeops_get_overview_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_players INT;
    v_total_completed_attempts INT;
    v_active_attempts INT;
    v_not_played INT;
    v_already_played INT;
    v_authorized_replays INT;
    v_used_replays INT;
    v_total_attempts INT;
    v_highest_score INT;
BEGIN
    SELECT COUNT(*) INTO v_total_players FROM public.swipeops_students;
    SELECT COUNT(*) INTO v_total_completed_attempts FROM public.swipeops_attempts WHERE status = 'completed';
    SELECT COUNT(*) INTO v_active_attempts FROM public.swipeops_attempts WHERE status = 'started';
    SELECT COUNT(*) INTO v_not_played FROM public.swipeops_students WHERE status = 'registered';
    SELECT COUNT(*) INTO v_already_played FROM public.swipeops_students WHERE status = 'completed';
    SELECT COUNT(*) INTO v_authorized_replays FROM public.swipeops_replays WHERE status = 'pending';
    SELECT COUNT(*) INTO v_used_replays FROM public.swipeops_replays WHERE status = 'consumed';
    SELECT COUNT(*) INTO v_total_attempts FROM public.swipeops_attempts;
    SELECT COALESCE(MAX(best_score), 0) INTO v_highest_score FROM public.swipeops_students;

    RETURN jsonb_build_object(
        'total_registered_players', v_total_players,
        'total_completed_attempts', v_total_completed_attempts,
        'currently_active_attempts', v_active_attempts,
        'students_not_played', v_not_played,
        'students_already_played', v_already_played,
        'authorized_replays', v_authorized_replays,
        'used_replays', v_used_replays,
        'total_attempts', v_total_attempts,
        'highest_score', v_highest_score
    );
END;
$$;

-- ----------------------------------------------------------------------------
-- 5B. Table: swipeops_security_config
-- Stores hashed administrative passkeys for server-side verification.
-- Completely denied from public client access.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.swipeops_security_config (
    key TEXT PRIMARY KEY,
    value_hash TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default administrative key hash: sha256('SHAURYA@GAME999')
INSERT INTO public.swipeops_security_config (key, value_hash)
VALUES ('admin_passphrase_hash', encode(digest('SHAURYA@GAME999', 'sha256'), 'hex'))
ON CONFLICT (key) DO UPDATE SET value_hash = EXCLUDED.value_hash, updated_at = NOW();

-- Stored Function: Verify Admin Key
CREATE OR REPLACE FUNCTION public.swipeops_verify_admin_key(
    p_key TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_key_hash TEXT;
    v_expected_hash TEXT;
BEGIN
    v_key_hash := encode(digest(TRIM(COALESCE(p_key, '')), 'sha256'), 'hex');
    
    SELECT value_hash INTO v_expected_hash
    FROM public.swipeops_security_config
    WHERE key = 'admin_passphrase_hash';

    IF v_expected_hash IS NULL THEN
        v_expected_hash := encode(digest('SHAURYA@GAME999', 'sha256'), 'hex');
    END IF;

    RETURN (v_key_hash = v_expected_hash);
END;
$$;

-- F. Secure Admin Key Unlock (Called directly by Mission Locked Modal)
CREATE OR REPLACE FUNCTION public.swipeops_unlock_with_admin_key(
    p_enrollment TEXT,
    p_admin_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_clean_enrollment TEXT;
    v_key_hash TEXT;
    v_expected_hash TEXT;
    v_student RECORD;
    v_replay_id UUID;
    v_new_attempt_id UUID;
    v_attempt_num INT;
BEGIN
    v_clean_enrollment := UPPER(TRIM(COALESCE(p_enrollment, '')));
    v_key_hash := encode(digest(TRIM(COALESCE(p_admin_key, '')), 'sha256'), 'hex');

    -- Fetch expected hash from private security config table
    SELECT value_hash INTO v_expected_hash
    FROM public.swipeops_security_config
    WHERE key = 'admin_passphrase_hash';

    IF v_expected_hash IS NULL THEN
        v_expected_hash := encode(digest('SHAURYA@GAME999', 'sha256'), 'hex');
    END IF;

    -- Verify key hash
    IF v_key_hash != v_expected_hash THEN
        -- Record unauthorized key attempt in audit log
        INSERT INTO public.swipeops_audit_log (
            action, admin_identity, target_enrollment, reason, details
        ) VALUES (
            'UNLOCK_FAILED', 'UNAUTHORIZED_ATTEMPT', v_clean_enrollment,
            'Invalid administrator authorization key entered at locked modal',
            jsonb_build_object('timestamp', NOW())
        );

        RETURN jsonb_build_object('success', false, 'error', 'INVALID_KEY', 'message', 'Invalid administrator authorization key. Authorization denied.');
    END IF;

    -- Retrieve student record
    SELECT * INTO v_student
    FROM public.swipeops_students
    WHERE enrollment_number = v_clean_enrollment
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'STUDENT_NOT_FOUND', 'message', 'Student with this enrollment not found.');
    END IF;

    -- Create authorized replay record marked consumed
    INSERT INTO public.swipeops_replays (
        enrollment_number, authorized_by, reason, status, consumed_at
    ) VALUES (
        v_clean_enrollment, 'Admin Key Modal', 'Direct Administrator Key Clearance', 'consumed', NOW()
    ) RETURNING id INTO v_replay_id;

    -- Increment attempt number and generate attempt
    v_attempt_num := v_student.attempts_count + 1;

    INSERT INTO public.swipeops_attempts (
        enrollment_number, player_name, attempt_number, status, is_replay, replay_id, is_test
    ) VALUES (
        v_clean_enrollment, v_student.student_name, v_attempt_num, 'started', true, v_replay_id, v_student.is_test
    ) RETURNING id INTO v_new_attempt_id;

    -- Link attempt_id
    UPDATE public.swipeops_replays
    SET attempt_id = v_new_attempt_id
    WHERE id = v_replay_id;

    -- Update student status
    UPDATE public.swipeops_students
    SET status = 'active',
        attempts_count = v_attempt_num,
        replay_authorized = false,
        updated_at = NOW()
    WHERE enrollment_number = v_clean_enrollment;

    -- Record in audit log
    INSERT INTO public.swipeops_audit_log (
        action, admin_identity, target_enrollment, reason, details
    ) VALUES (
        'ADMIN_KEY_STUDENT_UNLOCKED', 'ORGANIZER_KEY_VERIFIED', v_clean_enrollment,
        CONCAT('Authorized additional attempt #', v_attempt_num, ' via administrator key override'),
        jsonb_build_object('replay_id', v_replay_id, 'attempt_id', v_new_attempt_id, 'attempt_number', v_attempt_num)
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Clearance verified. Additional official attempt unlocked.',
        'attempt_id', v_new_attempt_id,
        'attempt_number', v_attempt_num,
        'student_name', v_student.student_name,
        'enrollment_number', v_clean_enrollment
    );
END;
$$;

-- ----------------------------------------------------------------------------
-- 8. Row Level Security (RLS) Configuration
-- ----------------------------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE public.swipeops_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swipeops_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swipeops_replays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swipeops_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devops_arena_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swipeops_security_config ENABLE ROW LEVEL SECURITY;

-- Deny public direct access to security config
DROP POLICY IF EXISTS "Deny Public Access Config" ON public.swipeops_security_config;
CREATE POLICY "Deny Public Access Config" 
ON public.swipeops_security_config
FOR ALL 
USING (false);

-- Leaderboard: Public read
DROP POLICY IF EXISTS "Public Read Leaderboard View" ON public.swipeops_students;
CREATE POLICY "Public Read Leaderboard View" 
ON public.swipeops_students
FOR SELECT 
USING (true);

-- Attempts: Read allowed (used by dashboard/client verification)
DROP POLICY IF EXISTS "Public Read Attempts" ON public.swipeops_attempts;
CREATE POLICY "Public Read Attempts" 
ON public.swipeops_attempts
FOR SELECT 
USING (true);

-- Deny direct client inserts/updates on students/attempts (must use secure RPCs)
DROP POLICY IF EXISTS "Deny Direct Insert Students" ON public.swipeops_students;
CREATE POLICY "Deny Direct Insert Students" 
ON public.swipeops_students
FOR INSERT 
WITH CHECK (false);

DROP POLICY IF EXISTS "Deny Direct Update Students" ON public.swipeops_students;
CREATE POLICY "Deny Direct Update Students" 
ON public.swipeops_students
FOR UPDATE 
USING (false);

DROP POLICY IF EXISTS "Deny Direct Delete Students" ON public.swipeops_students;
CREATE POLICY "Deny Direct Delete Students" 
ON public.swipeops_students
FOR DELETE 
USING (false);

DROP POLICY IF EXISTS "Deny Direct Insert Attempts" ON public.swipeops_attempts;
CREATE POLICY "Deny Direct Insert Attempts" 
ON public.swipeops_attempts
FOR INSERT 
WITH CHECK (false);

DROP POLICY IF EXISTS "Deny Direct Update Attempts" ON public.swipeops_attempts;
CREATE POLICY "Deny Direct Update Attempts" 
ON public.swipeops_attempts
FOR UPDATE 
USING (false);

DROP POLICY IF EXISTS "Deny Direct Delete Attempts" ON public.swipeops_attempts;
CREATE POLICY "Deny Direct Delete Attempts" 
ON public.swipeops_attempts
FOR DELETE 
USING (false);

-- Replays: Public read
DROP POLICY IF EXISTS "Public Read Replays" ON public.swipeops_replays;
CREATE POLICY "Public Read Replays" 
ON public.swipeops_replays
FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Deny Direct Insert Replays" ON public.swipeops_replays;
CREATE POLICY "Deny Direct Insert Replays" 
ON public.swipeops_replays
FOR INSERT 
WITH CHECK (false);

DROP POLICY IF EXISTS "Deny Direct Update Replays" ON public.swipeops_replays;
CREATE POLICY "Deny Direct Update Replays" 
ON public.swipeops_replays
FOR UPDATE 
USING (false);

DROP POLICY IF EXISTS "Deny Direct Delete Replays" ON public.swipeops_replays;
CREATE POLICY "Deny Direct Delete Replays" 
ON public.swipeops_replays
FOR DELETE 
USING (false);

-- Audit Log: Append-only for system/admin, strictly read-only for queries
DROP POLICY IF EXISTS "Public Read Audit Log" ON public.swipeops_audit_log;
CREATE POLICY "Public Read Audit Log" 
ON public.swipeops_audit_log
FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Deny Direct Update Audit Log" ON public.swipeops_audit_log;
CREATE POLICY "Deny Direct Update Audit Log" 
ON public.swipeops_audit_log
FOR UPDATE 
USING (false);

DROP POLICY IF EXISTS "Deny Direct Delete Audit Log" ON public.swipeops_audit_log;
CREATE POLICY "Deny Direct Delete Audit Log" 
ON public.swipeops_audit_log
FOR DELETE 
USING (false);

-- Legacy devops_arena_scores policies
DROP POLICY IF EXISTS "Public Read Legacy Scores" ON public.devops_arena_scores;
CREATE POLICY "Public Read Legacy Scores" 
ON public.devops_arena_scores
FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Allow Insert Legacy Scores" ON public.devops_arena_scores;
CREATE POLICY "Allow Insert Legacy Scores" 
ON public.devops_arena_scores
FOR INSERT 
WITH CHECK (final_score >= 0 AND final_score <= 350);

DROP POLICY IF EXISTS "Deny Update Legacy Scores" ON public.devops_arena_scores;
CREATE POLICY "Deny Update Legacy Scores" 
ON public.devops_arena_scores
FOR UPDATE 
USING (false);

DROP POLICY IF EXISTS "Deny Delete Legacy Scores" ON public.devops_arena_scores;
CREATE POLICY "Deny Delete Legacy Scores" 
ON public.devops_arena_scores
FOR DELETE 
USING (false);

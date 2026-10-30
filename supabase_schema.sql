-- ============================================================================
-- DEVOPS ARENA — Supabase PostgreSQL Schema & Security Policies
-- Event: Club Battle: TechVerse | Organizing Club: DevOps Club
-- ============================================================================

-- 1. Create devops_arena_scores table
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

-- 2. Indexes for high-performance ranking queries
CREATE INDEX IF NOT EXISTS idx_devops_arena_leaderboard 
ON public.devops_arena_scores (
    final_score DESC, 
    accuracy DESC, 
    correct_decisions DESC, 
    completed_at ASC
);

CREATE INDEX IF NOT EXISTS idx_devops_arena_enrollment 
ON public.devops_arena_scores (enrollment_number);

-- 3. Row Level Security (RLS) Configuration
ALTER TABLE public.devops_arena_scores ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read the leaderboard
CREATE POLICY "Public Read Leaderboard" 
ON public.devops_arena_scores
FOR SELECT 
USING (true);

-- Allow authenticated or anon clients to insert completed mission scores
CREATE POLICY "Public Insert Completed Score" 
ON public.devops_arena_scores
FOR INSERT 
WITH CHECK (
    final_score >= 0 
    AND accuracy >= 0 
    AND accuracy <= 100
    AND length(player_name) >= 2
    AND length(enrollment_number) >= 4
);

-- Block public updates and deletes to protect tournament integrity
CREATE POLICY "Deny Public Update" 
ON public.devops_arena_scores
FOR UPDATE 
USING (false);

CREATE POLICY "Deny Public Delete" 
ON public.devops_arena_scores
FOR DELETE 
USING (false);

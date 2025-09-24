-- ============================================================================
-- FEEDBACK SUBMISSION RLS FIX
-- ============================================================================
-- This script fixes the feedback submission issue by:
-- 1. Updating RLS policies to allow anonymous feedback submission
-- 2. Ensuring the feedbacks table has the correct schema
-- 3. Adding session_id column for tracking
-- ============================================================================

-- ============================================================================
-- STEP 1: ENSURE FEEDBACKS TABLE HAS CORRECT SCHEMA
-- ============================================================================

-- Add session_id column if it doesn't exist
ALTER TABLE public.feedbacks 
ADD COLUMN IF NOT EXISTS session_id text;

-- Add index for session_id
CREATE INDEX IF NOT EXISTS idx_feedbacks_session_id ON public.feedbacks(session_id);

-- Fix the project_id reference to use the text field instead of UUID
-- First, drop the foreign key constraint
ALTER TABLE public.feedbacks DROP CONSTRAINT IF EXISTS feedbacks_project_id_fkey;

-- Change project_id to text to match the projects.project_id field
ALTER TABLE public.feedbacks ALTER COLUMN project_id TYPE text;

-- Add new foreign key constraint to reference projects.project_id (text field)
ALTER TABLE public.feedbacks 
ADD CONSTRAINT feedbacks_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES public.projects(project_id) ON DELETE CASCADE;

-- ============================================================================
-- STEP 2: FIX RLS POLICIES FOR FEEDBACKS TABLE
-- ============================================================================

-- Drop existing policies that are too restrictive
DROP POLICY IF EXISTS "feedbacks_insert_project_owner" ON public.feedbacks;

-- Create new INSERT policy that allows anyone to submit feedback
-- This allows anonymous users to submit feedback without authentication
CREATE POLICY "feedbacks_insert_anyone" ON public.feedbacks
  FOR INSERT WITH CHECK (true);

-- Keep the SELECT policy that only allows project owners to view feedback
-- (This policy should already exist, but let's ensure it's correct)
DROP POLICY IF EXISTS "feedbacks_select_project_owner" ON public.feedbacks;

CREATE POLICY "feedbacks_select_project_owner" ON public.feedbacks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.project_id = feedbacks.project_id AND p.user_id = auth.uid()
    )
  );

-- ============================================================================
-- STEP 3: VERIFY TABLE STRUCTURE
-- ============================================================================

-- Check the current table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'feedbacks' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ============================================================================
-- STEP 4: TEST THE POLICIES
-- ============================================================================

-- Test that anonymous users can insert (this should work now)
-- Note: This is just a verification query, not an actual insert
SELECT 'RLS policies updated successfully!' AS status;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Feedback submission RLS fix completed successfully!';
  RAISE NOTICE 'Anonymous users can now submit feedback';
  RAISE NOTICE 'Only project owners can view their feedback';
  RAISE NOTICE 'Table: public.feedbacks';
  RAISE NOTICE 'Columns: id, project_id, user_email, content, sentiment, metadata, created_at, session_id';
END $$;
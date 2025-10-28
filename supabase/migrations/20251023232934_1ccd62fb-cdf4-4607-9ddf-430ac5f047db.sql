-- Enable RLS on feature_requests table (if not already enabled)
ALTER TABLE public.feature_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own feature requests" ON public.feature_requests;
DROP POLICY IF EXISTS "Users can create their own feature requests" ON public.feature_requests;
DROP POLICY IF EXISTS "Users can update their own feature requests" ON public.feature_requests;
DROP POLICY IF EXISTS "Users can delete their own feature requests" ON public.feature_requests;

-- Create policy for users to view their own feature requests
CREATE POLICY "Users can view their own feature requests"
ON public.feature_requests
FOR SELECT
USING (auth.uid() = user_id);

-- Create policy for users to insert their own feature requests
CREATE POLICY "Users can create their own feature requests"
ON public.feature_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create policy for users to update their own feature requests
CREATE POLICY "Users can update their own feature requests"
ON public.feature_requests
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create policy for users to delete their own feature requests
CREATE POLICY "Users can delete their own feature requests"
ON public.feature_requests
FOR DELETE
USING (auth.uid() = user_id);
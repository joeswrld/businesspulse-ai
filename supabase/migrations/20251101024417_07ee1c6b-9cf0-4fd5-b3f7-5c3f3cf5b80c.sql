-- Fix Critical Security Issues
-- 1. Create user_roles table with proper security
-- 2. Fix avatar storage RLS policies

-- Step 1: Create role enum
CREATE TYPE public.app_role AS ENUM ('user', 'moderator', 'admin');

-- Step 2: Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Step 3: Create security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Step 4: Create RLS policies for user_roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Step 5: Migrate existing roles from profiles (if any exist and are valid)
INSERT INTO public.user_roles (user_id, role, created_at)
SELECT 
  user_id, 
  CASE 
    WHEN role = 'admin' THEN 'admin'::app_role
    WHEN role = 'moderator' THEN 'moderator'::app_role
    ELSE 'user'::app_role
  END as role,
  created_at
FROM public.profiles
WHERE role IS NOT NULL AND role IN ('user', 'moderator', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 6: Drop role column from profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;

-- Step 7: Fix avatar storage RLS policies to support nested paths
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;

CREATE POLICY "Users can upload avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (
    -- Match: avatars/{user_id}-*.ext
    (storage.foldername(name))[1] || '-' LIKE auth.uid()::text || '-%'
    OR
    -- Match: avatars/avatars/{user_id}-*.ext (nested structure)
    ((storage.foldername(name))[1] = 'avatars' 
     AND (storage.foldername(name))[2] || '-' LIKE auth.uid()::text || '-%')
    OR
    -- Match: {user_id}/filename.ext
    (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- Ensure update and delete policies also support nested paths
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;

CREATE POLICY "Users can update avatars"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    (storage.foldername(name))[1] || '-' LIKE auth.uid()::text || '-%'
    OR
    ((storage.foldername(name))[1] = 'avatars' 
     AND (storage.foldername(name))[2] || '-' LIKE auth.uid()::text || '-%')
    OR
    (storage.foldername(name))[1] = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;

CREATE POLICY "Users can delete avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    (storage.foldername(name))[1] || '-' LIKE auth.uid()::text || '-%'
    OR
    ((storage.foldername(name))[1] = 'avatars' 
     AND (storage.foldername(name))[2] || '-' LIKE auth.uid()::text || '-%')
    OR
    (storage.foldername(name))[1] = auth.uid()::text
  )
);
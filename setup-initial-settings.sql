-- Setup Initial Feedback Settings
-- Run this script to create initial feedback settings for testing
-- Replace 'YOUR_USER_ID' with your actual user ID from Supabase

-- First, get your user ID from the auth.users table
SELECT id, email FROM auth.users LIMIT 5;

-- Then run this with your actual user ID:
-- INSERT INTO feedback_settings (
--   user_id,
--   project_id,
--   project_id_locked,
--   title,
--   show_name,
--   show_email,
--   button_text,
--   theme,
--   brand_color
-- ) VALUES (
--   'YOUR_USER_ID_HERE',
--   'test-project-' || substr(md5(random()::text), 1, 8),
--   false,
--   'Share your thoughts with us',
--   true,
--   true,
--   'Send Feedback',
--   'light',
--   '#2563eb'
-- );

-- Or create settings for all existing users:
INSERT INTO feedback_settings (
  user_id,
  project_id,
  project_id_locked,
  title,
  show_name,
  show_email,
  button_text,
  theme,
  brand_color
)
SELECT 
  id as user_id,
  'project-' || substr(md5(id::text), 1, 12) as project_id,
  false as project_id_locked,
  'Share your thoughts with us' as title,
  true as show_name,
  true as show_email,
  'Send Feedback' as button_text,
  'light' as theme,
  '#2563eb' as brand_color
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM feedback_settings);

-- Verify the settings were created
SELECT 
  fs.user_id,
  u.email,
  fs.project_id,
  fs.project_id_locked,
  fs.title
FROM feedback_settings fs
JOIN auth.users u ON fs.user_id = u.id
ORDER BY fs.created_at DESC;
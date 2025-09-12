-- Feedback and Feedback Settings tables for NoteX

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  emoji text,
  message text not null,
  page_url text,
  browser text,
  created_at timestamptz default now()
);

create table if not exists public.feedback_settings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  brand_color text default '#3B82F6',
  greeting text default 'Share your feedback with us!',
  logo_url text,
  widget_position text default 'right',
  show_emojis boolean default true,
  ask_email boolean default false,
  allow_screenshots boolean default false,
  enable_inline boolean default false,
  enable_chat_style boolean default true,
  created_at timestamptz default now()
);


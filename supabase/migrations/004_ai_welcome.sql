alter table guide_content
  add column if not exists ai_welcome_message text,
  add column if not exists ai_welcome_tone text default 'warm';

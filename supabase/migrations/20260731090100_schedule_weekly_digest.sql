-- Dispara generate-review-digest toda segunda-feira às 12:00 UTC (~09h em
-- Brasília). pg_cron/pg_net já habilitados pela migration do expire-inactive-rooms.
SELECT cron.schedule(
  'weekly-review-digest',
  '0 12 * * 1',
  $$
  SELECT
    net.http_post(
        url:='https://hxfzgjxwozzuzgdsrrpb.supabase.co/functions/v1/generate-review-digest',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4Znpnanh3b3p6dXpnZHNycnBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NjE3NDMsImV4cCI6MjA4NzEzNzc0M30.4eUCTiE53aXptDKpcFJYisI8dwFbeWhPcoixir6bqC0"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);

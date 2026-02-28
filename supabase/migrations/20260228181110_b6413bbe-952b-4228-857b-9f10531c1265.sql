SELECT cron.schedule(
  'expire-inactive-rooms-daily',
  '0 3 * * *',
  $$
  SELECT
    net.http_post(
        url:='https://hxfzgjxwozzuzgdsrrpb.supabase.co/functions/v1/expire-inactive-rooms',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4Znpnanh3b3p6dXpnZHNycnBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NjE3NDMsImV4cCI6MjA4NzEzNzc0M30.4eUCTiE53aXptDKpcFJYisI8dwFbeWhPcoixir6bqC0"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);
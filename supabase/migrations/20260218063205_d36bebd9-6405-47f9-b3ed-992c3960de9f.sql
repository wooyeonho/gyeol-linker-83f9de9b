
-- Enable pg_cron and pg_net extensions for scheduled HTTP calls
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule heartbeat every 5 minutes
SELECT cron.schedule(
  'heartbeat-every-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ambadtjrwwaaobrbzjar.supabase.co/functions/v1/heartbeat',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtYmFkdGpyd3dhYW9icmJ6amFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwNjYwMjMsImV4cCI6MjA4NjY0MjAyM30.iVbn5zt5rWe2UdEsGd11dTX1JxjyWPKt_iPHoWdfhmQ'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

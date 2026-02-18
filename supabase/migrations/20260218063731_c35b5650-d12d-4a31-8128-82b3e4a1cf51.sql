-- Drop old check constraint and add heartbeat to allowed activity types
ALTER TABLE public.gyeol_autonomous_logs DROP CONSTRAINT gyeol_autonomous_logs_activity_type_check;

ALTER TABLE public.gyeol_autonomous_logs ADD CONSTRAINT gyeol_autonomous_logs_activity_type_check 
  CHECK (activity_type = ANY (ARRAY['learning'::text, 'reflection'::text, 'social'::text, 'proactive_message'::text, 'skill_execution'::text, 'error'::text, 'heartbeat'::text]));

-- Create a function to generate unique Korean names for new agents
CREATE OR REPLACE FUNCTION public.generate_agent_name()
RETURNS TRIGGER AS $$
DECLARE
  prefixes TEXT[] := ARRAY['따뜻한', '고요한', '빛나는', '맑은', '포근한', '잔잔한', '새벽', '은빛', '별빛', '하늘', '바람', '노을', '달빛', '이슬', '여울', '솔빛', '봄빛', '가을', '서리', '안개'];
  suffixes TEXT[] := ARRAY['결', '빛', '솔', '별', '달', '숲', '꽃', '이'];
  candidate TEXT;
  attempts INT := 0;
BEGIN
  -- Only generate name if default 'GYEOL' or empty
  IF NEW.name IS NULL OR NEW.name = 'GYEOL' THEN
    LOOP
      candidate := prefixes[1 + floor(random() * array_length(prefixes, 1))::int]
                   || suffixes[1 + floor(random() * array_length(suffixes, 1))::int];
      -- Check uniqueness
      IF NOT EXISTS (SELECT 1 FROM gyeol_agents WHERE name = candidate) THEN
        NEW.name := candidate;
        EXIT;
      END IF;
      attempts := attempts + 1;
      IF attempts > 20 THEN
        -- Fallback: append random number
        NEW.name := candidate || floor(random() * 100)::int::text;
        EXIT;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Attach trigger to gyeol_agents
CREATE TRIGGER trg_generate_agent_name
BEFORE INSERT ON public.gyeol_agents
FOR EACH ROW
EXECUTE FUNCTION public.generate_agent_name();

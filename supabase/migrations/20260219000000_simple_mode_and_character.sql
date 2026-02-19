DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gyeol_conversation_insights'
      AND column_name = 'topics'
      AND data_type = 'ARRAY'
  ) THEN
    ALTER TABLE public.gyeol_conversation_insights
      ALTER COLUMN topics TYPE JSONB
      USING CASE
        WHEN topics IS NULL THEN '[]'::jsonb
        ELSE to_jsonb(topics)
      END;
    ALTER TABLE public.gyeol_conversation_insights
      ALTER COLUMN topics SET DEFAULT '[]'::jsonb;
    RAISE NOTICE 'topics column converted from TEXT[] to JSONB';
  ELSE
    RAISE NOTICE 'topics column already JSONB or does not exist, skipping';
  END IF;
END $$;

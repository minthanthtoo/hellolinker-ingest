-- Optional cleanup: remove gold rows from instrument_price and drop legacy gold entities.
-- Run this only if you have switched to gold_price_base/gold_price_history_base.

DO $$
DECLARE
  gold_type_id integer;
BEGIN
  SELECT id INTO gold_type_id
  FROM public.instrument_type
  WHERE code = 'GOLD'
  LIMIT 1;

  IF gold_type_id IS NULL THEN
    RAISE NOTICE 'No GOLD instrument_type found; skipping cleanup.';
    RETURN;
  END IF;

  DELETE FROM public.instrument_price
  WHERE instrument_id IN (
    SELECT id FROM public.instrument WHERE type_id = gold_type_id
  );

  DELETE FROM public.gold_spec
  WHERE instrument_id IN (
    SELECT id FROM public.instrument WHERE type_id = gold_type_id
  );

  DELETE FROM public.instrument
  WHERE type_id = gold_type_id;

  DELETE FROM public.instrument_type
  WHERE id = gold_type_id
    AND NOT EXISTS (
      SELECT 1 FROM public.instrument WHERE type_id = gold_type_id
    );

  DROP TABLE IF EXISTS public.gold_spec;
END $$;

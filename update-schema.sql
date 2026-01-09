-- Schema updates needed for the crawlers and frontend queries.
-- Safe to run multiple times.

-- Uniqueness for upserts
CREATE UNIQUE INDEX IF NOT EXISTS instrument_price_unique_idx
  ON public.instrument_price (instrument_id, market_id, location_id, ts, price_type);

-- Query performance indexes
CREATE INDEX IF NOT EXISTS idx_price_instrument_ts
  ON public.instrument_price (instrument_id, ts DESC);

CREATE INDEX IF NOT EXISTS idx_price_instrument_market_ts
  ON public.instrument_price (instrument_id, market_id, ts DESC);

CREATE INDEX IF NOT EXISTS idx_price_location_ts
  ON public.instrument_price (location_id, ts DESC);

-- Latest snapshot view
CREATE OR REPLACE VIEW public.instrument_price_latest AS
SELECT DISTINCT ON (instrument_id, market_id, COALESCE(location_id, -1), price_type)
       id,
       instrument_id,
       market_id,
       location_id,
       price_type,
       ts,
       unit_id,
       currency_id,
       value,
       source,
       status,
       change_value,
       metadata
FROM public.instrument_price
ORDER BY instrument_id,
         market_id,
         COALESCE(location_id, -1),
         price_type,
         ts DESC;

-- Gold base tables (lean storage)

CREATE TABLE IF NOT EXISTS public.gold_price_base (
  id bigserial PRIMARY KEY,
  ts timestamptz NOT NULL,
  xau_usd_oz numeric NOT NULL,
  fx_usd_mmk numeric,
  source text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS gold_price_base_ts_unique_idx
  ON public.gold_price_base (ts);

CREATE TABLE IF NOT EXISTS public.gold_price_history_base (
  ts date PRIMARY KEY,
  xau_usd_oz_open numeric NOT NULL,
  xau_usd_oz_high numeric NOT NULL,
  xau_usd_oz_low numeric NOT NULL,
  xau_usd_oz_close numeric NOT NULL,
  fx_usd_mmk_open numeric,
  fx_usd_mmk_high numeric,
  fx_usd_mmk_low numeric,
  fx_usd_mmk_close numeric,
  source text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE VIEW public.gold_price_derived AS
SELECT
  b.ts,
  k.karat,
  u.unit,
  CASE WHEN u.unit = 'USD_OZ' THEN 'USD' ELSE 'MMK' END AS currency,
  CASE
    WHEN u.unit = 'USD_OZ' THEN b.xau_usd_oz * (k.karat / 24.0)
    WHEN u.unit = 'MMK_KYAT_THA' AND b.fx_usd_mmk IS NOT NULL THEN
      (b.xau_usd_oz / 31.1035) * 16.32932532 * b.fx_usd_mmk * (k.karat / 24.0)
  END AS value,
  b.source
FROM public.gold_price_base b
CROSS JOIN (VALUES (24),(23),(22),(21),(20),(18),(16),(14)) AS k(karat)
CROSS JOIN (VALUES ('USD_OZ'),('MMK_KYAT_THA')) AS u(unit);

CREATE OR REPLACE VIEW public.gold_price_history_derived AS
SELECT
  b.ts,
  k.karat,
  u.unit,
  CASE WHEN u.unit = 'USD_OZ' THEN 'USD' ELSE 'MMK' END AS currency,
  p.price_type,
  CASE
    WHEN u.unit = 'USD_OZ' THEN
      CASE p.price_type
        WHEN 'OPEN' THEN b.xau_usd_oz_open
        WHEN 'HIGH' THEN b.xau_usd_oz_high
        WHEN 'LOW' THEN b.xau_usd_oz_low
        WHEN 'CLOSE' THEN b.xau_usd_oz_close
      END * (k.karat / 24.0)
    WHEN u.unit = 'MMK_KYAT_THA' THEN
      CASE p.price_type
        WHEN 'OPEN' THEN
          (b.xau_usd_oz_open / 31.1035) * 16.32932532 * b.fx_usd_mmk_open
        WHEN 'HIGH' THEN
          (b.xau_usd_oz_high / 31.1035) * 16.32932532 * b.fx_usd_mmk_high
        WHEN 'LOW' THEN
          (b.xau_usd_oz_low / 31.1035) * 16.32932532 * b.fx_usd_mmk_low
        WHEN 'CLOSE' THEN
          (b.xau_usd_oz_close / 31.1035) * 16.32932532 * b.fx_usd_mmk_close
      END * (k.karat / 24.0)
  END AS value,
  b.source
FROM public.gold_price_history_base b
CROSS JOIN (VALUES (24),(23),(22),(21),(20),(18),(16),(14)) AS k(karat)
CROSS JOIN (VALUES ('USD_OZ'),('MMK_KYAT_THA')) AS u(unit)
CROSS JOIN (VALUES ('OPEN'),('HIGH'),('LOW'),('CLOSE')) AS p(price_type);

-- Enable RLS if not already enabled
ALTER TABLE public.instrument_type  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.currency         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instrument       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gold_spec        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_spec        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instrument_price ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gold_price_base  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gold_price_history_base ENABLE ROW LEVEL SECURITY;

-- Public read policies (idempotent via checks)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'instrument_type' AND policyname = 'Public read instrument_type'
  ) THEN
    CREATE POLICY "Public read instrument_type" ON public.instrument_type FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'unit' AND policyname = 'Public read unit'
  ) THEN
    CREATE POLICY "Public read unit" ON public.unit FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'currency' AND policyname = 'Public read currency'
  ) THEN
    CREATE POLICY "Public read currency" ON public.currency FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'location' AND policyname = 'Public read location'
  ) THEN
    CREATE POLICY "Public read location" ON public.location FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'market' AND policyname = 'Public read market'
  ) THEN
    CREATE POLICY "Public read market" ON public.market FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'instrument' AND policyname = 'Public read instrument'
  ) THEN
    CREATE POLICY "Public read instrument" ON public.instrument FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'gold_spec' AND policyname = 'Public read gold_spec'
  ) THEN
    CREATE POLICY "Public read gold_spec" ON public.gold_spec FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'fuel_spec' AND policyname = 'Public read fuel_spec'
  ) THEN
    CREATE POLICY "Public read fuel_spec" ON public.fuel_spec FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'instrument_price' AND policyname = 'Public read instrument_price'
  ) THEN
    CREATE POLICY "Public read instrument_price" ON public.instrument_price FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'gold_price_base' AND policyname = 'Public read gold_price_base'
  ) THEN
    CREATE POLICY "Public read gold_price_base" ON public.gold_price_base FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'gold_price_history_base' AND policyname = 'Public read gold_price_history_base'
  ) THEN
    CREATE POLICY "Public read gold_price_history_base" ON public.gold_price_history_base FOR SELECT USING (true);
  END IF;
END $$;

-- Required seed data for hellolinker-ingest jobs

-- Units
INSERT INTO unit (code, name, type, base_unit_id, factor_to_base, description)
VALUES
  ('UNIT_1_BASE', 'Base Unit', 'CURRENCY', NULL, 1, 'Base unit for currency pairs'),
  ('OZ', 'Ounce', 'GOLD', NULL, 1, 'Troy ounce'),
  ('KYAT_THA', 'Kyat Tha', 'GOLD', NULL, 1, 'Myanmar gold unit'),
  ('LITRE', 'Litre', 'VOLUME', NULL, 1, 'Fuel volume unit')
ON CONFLICT (code) DO NOTHING;

-- Currencies
INSERT INTO currency (code, name, symbol, minor_unit) VALUES
  ('MMK', 'Myanmar Kyat', 'Ks', 2),
  ('USD', 'US Dollar', '$', 2),
  ('EUR', 'Euro', 'EUR', 2),
  ('SGD', 'Singapore Dollar', 'SGD', 2),
  ('THB', 'Thai Baht', 'THB', 2),
  ('CNY', 'Chinese Yuan', 'CNY', 2),
  ('MYR', 'Malaysian Ringgit', 'MYR', 2),
  ('JPY', 'Japanese Yen', 'JPY', 2),
  ('WON', 'South Korean Won', 'WON', 2),
  ('GBP', 'British Pound', 'GBP', 2),
  ('AUD', 'Australian Dollar', 'AUD', 2),
  ('CAD', 'Canadian Dollar', 'CAD', 2),
  ('NTD', 'New Taiwan Dollar', 'NTD', 2),
  ('AED', 'UAE Dirham', 'AED', 2),
  ('INR', 'Indian Rupee', 'INR', 2),
  ('HKD', 'Hong Kong Dollar', 'HKD', 2),
  ('MOP', 'Macanese Pataca', 'MOP', 2)
ON CONFLICT (code) DO NOTHING;

-- Markets
INSERT INTO market (code, name, type, website) VALUES
  ('MARKET_FX', 'FX Market', 'AGGREGATOR', NULL),
  ('AYA', 'AYA Bank', 'BANK', NULL),
  ('KBZ', 'KBZ Bank', 'BANK', NULL),
  ('YOMA', 'Yoma Bank', 'BANK', NULL),
  ('WORLD_GOLD', 'World Gold', 'GOLD_FEED', NULL),
  ('MM_GOLD', 'Myanmar Gold', 'GOLD_FEED', NULL),
  ('MM_FUEL', 'Myanmar Fuel', 'FUEL_FEED', NULL),
  ('CB', 'CB Bank', 'BANK', NULL),
  ('MCB', 'MCB Bank', 'BANK', NULL)
ON CONFLICT (code) DO NOTHING;

-- Instruments: FX pairs
INSERT INTO instrument (type_id, code, name, base_currency_id, quote_currency_id, metadata)
VALUES
  (
    (SELECT id FROM instrument_type WHERE code = 'FX_PAIR'),
    'USDMMK',
    'USD/MMK',
    (SELECT id FROM currency WHERE code = 'USD'),
    (SELECT id FROM currency WHERE code = 'MMK'),
    NULL
  ),
  (
    (SELECT id FROM instrument_type WHERE code = 'FX_PAIR'),
    'EURMMK',
    'EUR/MMK',
    (SELECT id FROM currency WHERE code = 'EUR'),
    (SELECT id FROM currency WHERE code = 'MMK'),
    NULL
  ),
  (
    (SELECT id FROM instrument_type WHERE code = 'FX_PAIR'),
    'SGDMMK',
    'SGD/MMK',
    (SELECT id FROM currency WHERE code = 'SGD'),
    (SELECT id FROM currency WHERE code = 'MMK'),
    NULL
  ),
  (
    (SELECT id FROM instrument_type WHERE code = 'FX_PAIR'),
    'THBMMK',
    'THB/MMK',
    (SELECT id FROM currency WHERE code = 'THB'),
    (SELECT id FROM currency WHERE code = 'MMK'),
    NULL
  ),
  (
    (SELECT id FROM instrument_type WHERE code = 'FX_PAIR'),
    'CNYMMK',
    'CNY/MMK',
    (SELECT id FROM currency WHERE code = 'CNY'),
    (SELECT id FROM currency WHERE code = 'MMK'),
    NULL
  ),
  (
    (SELECT id FROM instrument_type WHERE code = 'FX_PAIR'),
    'MYRMMK',
    'MYR/MMK',
    (SELECT id FROM currency WHERE code = 'MYR'),
    (SELECT id FROM currency WHERE code = 'MMK'),
    NULL
  ),
  (
    (SELECT id FROM instrument_type WHERE code = 'FX_PAIR'),
    'JPYMMK',
    'JPY/MMK',
    (SELECT id FROM currency WHERE code = 'JPY'),
    (SELECT id FROM currency WHERE code = 'MMK'),
    NULL
  ),
  (
    (SELECT id FROM instrument_type WHERE code = 'FX_PAIR'),
    'WONMMK',
    'WON/MMK',
    (SELECT id FROM currency WHERE code = 'WON'),
    (SELECT id FROM currency WHERE code = 'MMK'),
    NULL
  ),
  (
    (SELECT id FROM instrument_type WHERE code = 'FX_PAIR'),
    'GBPMMK',
    'GBP/MMK',
    (SELECT id FROM currency WHERE code = 'GBP'),
    (SELECT id FROM currency WHERE code = 'MMK'),
    NULL
  ),
  (
    (SELECT id FROM instrument_type WHERE code = 'FX_PAIR'),
    'AUDMMK',
    'AUD/MMK',
    (SELECT id FROM currency WHERE code = 'AUD'),
    (SELECT id FROM currency WHERE code = 'MMK'),
    NULL
  ),
  (
    (SELECT id FROM instrument_type WHERE code = 'FX_PAIR'),
    'CADMMK',
    'CAD/MMK',
    (SELECT id FROM currency WHERE code = 'CAD'),
    (SELECT id FROM currency WHERE code = 'MMK'),
    NULL
  ),
  (
    (SELECT id FROM instrument_type WHERE code = 'FX_PAIR'),
    'NTDMMK',
    'NTD/MMK',
    (SELECT id FROM currency WHERE code = 'NTD'),
    (SELECT id FROM currency WHERE code = 'MMK'),
    NULL
  ),
  (
    (SELECT id FROM instrument_type WHERE code = 'FX_PAIR'),
    'AEDMMK',
    'AED/MMK',
    (SELECT id FROM currency WHERE code = 'AED'),
    (SELECT id FROM currency WHERE code = 'MMK'),
    NULL
  ),
  (
    (SELECT id FROM instrument_type WHERE code = 'FX_PAIR'),
    'INRMMK',
    'INR/MMK',
    (SELECT id FROM currency WHERE code = 'INR'),
    (SELECT id FROM currency WHERE code = 'MMK'),
    NULL
  ),
  (
    (SELECT id FROM instrument_type WHERE code = 'FX_PAIR'),
    'HKDMMK',
    'HKD/MMK',
    (SELECT id FROM currency WHERE code = 'HKD'),
    (SELECT id FROM currency WHERE code = 'MMK'),
    NULL
  ),
  (
    (SELECT id FROM instrument_type WHERE code = 'FX_PAIR'),
    'MOPMMK',
    'MOP/MMK',
    (SELECT id FROM currency WHERE code = 'MOP'),
    (SELECT id FROM currency WHERE code = 'MMK'),
    NULL
  )
ON CONFLICT (code) DO NOTHING;

-- Instruments: Fuel
INSERT INTO instrument (type_id, code, name, metadata)
VALUES
  (
    (SELECT id FROM instrument_type WHERE code = 'FUEL'),
    'FUEL_DIESEL',
    'Diesel',
    '{"type":"diesel"}'
  ),
  (
    (SELECT id FROM instrument_type WHERE code = 'FUEL'),
    'FUEL_PREMIUM_DIESEL',
    'Premium Diesel',
    '{"type":"diesel","grade":"premium"}'
  ),
  (
    (SELECT id FROM instrument_type WHERE code = 'FUEL'),
    'FUEL_OCTANE_92',
    'Octane 92',
    '{"octane":92}'
  ),
  (
    (SELECT id FROM instrument_type WHERE code = 'FUEL'),
    'FUEL_OCTANE_95',
    'Octane 95',
    '{"octane":95}'
  )
ON CONFLICT (code) DO NOTHING;
-- Instruments: World gold
INSERT INTO instrument (type_id, code, name, metadata)
VALUES
  (
    (SELECT id FROM instrument_type WHERE code = 'GOLD'),
    'GOLD_24K',
    'Gold 24K',
    '{"karat":24}'
  ),
  (
    (SELECT id FROM instrument_type WHERE code = 'GOLD'),
    'GOLD_22K',
    'Gold 22K',
    '{"karat":22}'
  ),
  (
    (SELECT id FROM instrument_type WHERE code = 'GOLD'),
    'GOLD_21K',
    'Gold 21K',
    '{"karat":21}'
  ),
  (
    (SELECT id FROM instrument_type WHERE code = 'GOLD'),
    'GOLD_18K',
    'Gold 18K',
    '{"karat":18}'
  )
ON CONFLICT (code) DO NOTHING;

-- Instruments: Myanmar gold (Kyat Tha)
INSERT INTO instrument (type_id, code, name, metadata)
VALUES
  (
    (SELECT id FROM instrument_type WHERE code = 'GOLD'),
    'MM_GOLD_24K',
    '16 Pae Yae (24K)',
    '{"karat":24,"pae":16}'
  ),
  (
    (SELECT id FROM instrument_type WHERE code = 'GOLD'),
    'MM_GOLD_23K',
    '15 Pae Yae (23K)',
    '{"karat":23,"pae":15}'
  ),
  (
    (SELECT id FROM instrument_type WHERE code = 'GOLD'),
    'MM_GOLD_22K',
    '14 Pae 2 Pya Yae (22K)',
    '{"karat":22,"pae":14,"pya":2}'
  ),
  (
    (SELECT id FROM instrument_type WHERE code = 'GOLD'),
    'MM_GOLD_21K',
    '14 Pae Yae (21K)',
    '{"karat":21,"pae":14}'
  ),
  (
    (SELECT id FROM instrument_type WHERE code = 'GOLD'),
    'MM_GOLD_20K',
    '13 Pae Yae (20K)',
    '{"karat":20,"pae":13}'
  ),
  (
    (SELECT id FROM instrument_type WHERE code = 'GOLD'),
    'MM_GOLD_18K',
    '12 Pae 2 Pya Yae (18K)',
    '{"karat":18,"pae":12,"pya":2}'
  ),
  (
    (SELECT id FROM instrument_type WHERE code = 'GOLD'),
    'MM_GOLD_16K',
    '11 Pae Yae (16K)',
    '{"karat":16,"pae":11}'
  ),
  (
    (SELECT id FROM instrument_type WHERE code = 'GOLD'),
    'MM_GOLD_14K',
    '9 Pae Yae (14K)',
    '{"karat":14,"pae":9}'
  )
ON CONFLICT (code) DO NOTHING;

export const FX_MARKET_CODE = 'MARKET_FX';

export const BANK_MARKET_CODES = ['AYA', 'KBZ', 'YOMA', 'CB', 'MCB'];

export const FX_HISTORY_CURRENCIES = [
  { code: 'USD', slugs: ['usd'] },
  { code: 'EUR', slugs: ['eur'] },
  { code: 'SGD', slugs: ['sgd'] },
  { code: 'THB', slugs: ['thb'] },
  { code: 'MYR', slugs: ['myr'] },
  { code: 'JPY', slugs: ['jpy'] },
  { code: 'CNY', slugs: ['cny'] },
  { code: 'WON', slugs: ['won', 'krw'] },
  { code: 'GBP', slugs: ['gbp'] },
  { code: 'AUD', slugs: ['aud'] },
  { code: 'CAD', slugs: ['cad'] },
  { code: 'NTD', slugs: ['ntd', 'twd'] },
  { code: 'AED', slugs: ['aed'] },
  { code: 'INR', slugs: ['inr'] },
  { code: 'HKD', slugs: ['hkd'] },
  { code: 'MOP', slugs: ['mop'] }
];

export const FX_PAIR_CODES = FX_HISTORY_CURRENCIES.map(({ code }) => `${code}MMK`);

export const WORLD_GOLD_MARKET_CODE = 'WORLD_GOLD';
export const WORLD_GOLD_INSTRUMENTS = ['GOLD_24K', 'GOLD_22K', 'GOLD_21K', 'GOLD_18K'];

export const MM_GOLD_MARKET_CODE = 'MM_GOLD';
export const MM_GOLD_INSTRUMENTS = [
  'MM_GOLD_24K',
  'MM_GOLD_23K',
  'MM_GOLD_22K',
  'MM_GOLD_21K',
  'MM_GOLD_20K',
  'MM_GOLD_18K',
  'MM_GOLD_16K',
  'MM_GOLD_14K'
];

export const FUEL_MARKET_CODE = 'MM_FUEL';
export const FUEL_INSTRUMENTS = [
  'FUEL_DIESEL',
  'FUEL_PREMIUM_DIESEL',
  'FUEL_OCTANE_92',
  'FUEL_OCTANE_95'
];

// Units & currencies
export const MMK_CODE = 'MMK';
export const USD_CODE = 'USD';
export const UNIT_BASE_CURRENCY = 'UNIT_1_BASE'; // define this in unit table once
export const UNIT_OUNCE = 'OZ';
export const UNIT_KYAT_THA = 'KYAT_THA';
export const UNIT_LITRE = 'LITRE';

// Townships you'll ingest fuel for – must match `location.slug`
export const FUEL_TOWNSHIP_SLUGS = ['yangon', 'mandalay', 'paung']; // extend as needed

import { supabase } from './supabase.js';
import {
  BANK_MARKET_CODES,
  FX_MARKET_CODE,
  FX_HISTORY_CURRENCIES,
  FX_PAIR_CODES,
  FUEL_INSTRUMENTS,
  FUEL_MARKET_CODE,
  MM_GOLD_INSTRUMENTS,
  MM_GOLD_MARKET_CODE,
  MMK_CODE,
  UNIT_BASE_CURRENCY,
  UNIT_KYAT_THA,
  UNIT_LITRE,
  UNIT_OUNCE,
  USD_CODE,
  WORLD_GOLD_INSTRUMENTS,
  WORLD_GOLD_MARKET_CODE
} from './config.js';
import { log, logError } from './utils/logger.js';

type TableName = 'market' | 'instrument' | 'unit' | 'currency';

async function fetchExistingCodes(
  table: TableName,
  column: 'code',
  codes: string[]
): Promise<Set<string>> {
  if (codes.length === 0) return new Set();

  const { data, error } = await supabase
    .from(table)
    .select(column)
    .in(column, codes);

  if (error) {
    throw new Error(`Failed to read ${table}: ${error.message}`);
  }

  return new Set((data ?? []).map((row: { code: string }) => row.code));
}

function missingFrom(existing: Set<string>, required: string[]): string[] {
  return required.filter(code => !existing.has(code));
}

export async function validateRequiredSeeds() {
  const requiredMarkets = [
    FX_MARKET_CODE,
    ...BANK_MARKET_CODES,
    WORLD_GOLD_MARKET_CODE,
    MM_GOLD_MARKET_CODE,
    FUEL_MARKET_CODE
  ];
  const requiredInstruments = [
    ...FX_PAIR_CODES,
    ...WORLD_GOLD_INSTRUMENTS,
    ...MM_GOLD_INSTRUMENTS,
    ...FUEL_INSTRUMENTS
  ];
  const requiredUnits = [UNIT_BASE_CURRENCY, UNIT_OUNCE, UNIT_KYAT_THA, UNIT_LITRE];
  const fxCurrencies = FX_HISTORY_CURRENCIES.map(entry => entry.code);
  const requiredCurrencies = [MMK_CODE, USD_CODE, ...fxCurrencies];

  const [markets, instruments, units, currencies] = await Promise.all([
    fetchExistingCodes('market', 'code', requiredMarkets),
    fetchExistingCodes('instrument', 'code', requiredInstruments),
    fetchExistingCodes('unit', 'code', requiredUnits),
    fetchExistingCodes('currency', 'code', requiredCurrencies)
  ]);

  const missingMarkets = missingFrom(markets, requiredMarkets);
  const missingInstruments = missingFrom(instruments, requiredInstruments);
  const missingUnits = missingFrom(units, requiredUnits);
  const missingCurrencies = missingFrom(currencies, requiredCurrencies);

  if (
    missingMarkets.length ||
    missingInstruments.length ||
    missingUnits.length ||
    missingCurrencies.length
  ) {
    logError('Missing required seed data', {
      markets: missingMarkets,
      instruments: missingInstruments,
      units: missingUnits,
      currencies: missingCurrencies
    });
    throw new Error('Missing required seed data. See logs for details.');
  }

  log('Seed validation OK');
}

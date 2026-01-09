import { supabase } from '../supabase.js';
import {
  WORLD_GOLD_MARKET_CODE,
  WORLD_GOLD_INSTRUMENTS,
  USD_CODE,
  UNIT_OUNCE
} from '../config.js';
import { idByCode } from '../utils/ids.js';
import { log, logError } from '../utils/logger.js';
import { fetchGoldPricesFromHellolinker } from './goldHellolinker.js';
import { withChangeDetection } from '../utils/priceChange.js';

const marketIdByCode = idByCode('market');
const instrumentIdByCode = idByCode('instrument');
const currencyIdByCode = idByCode('currency');
const unitIdByCode = idByCode('unit');

export async function runGoldWorldJob() {
  log('[GOLD_WORLD] Job start');

  const [marketId, usdId, unitId] = await Promise.all([
    marketIdByCode(WORLD_GOLD_MARKET_CODE),
    currencyIdByCode(USD_CODE),
    unitIdByCode(UNIT_OUNCE)
  ]);

  const { world } = await fetchGoldPricesFromHellolinker();
  const now = new Date().toISOString();
  const rows: any[] = [];

  for (const code of WORLD_GOLD_INSTRUMENTS) {
    const match = code.match(/GOLD_(\d+)K/);
    const karat = match ? Number(match[1]) : NaN;
    const value = Number.isNaN(karat) ? undefined : world[karat];
    if (!value) {
      logError('[GOLD_WORLD] No data for code', code);
      continue;
    }
    const instrumentId = await instrumentIdByCode(code);

    const row = await withChangeDetection({
      instrument_id: instrumentId,
      market_id: marketId,
      location_id: null,
      ts: now,
      price_type: 'MID',
      unit_id: unitId,
      currency_id: usdId,
      value,
      source: 'HELLOLINKER_GOLD_SCRAPE'
    });

    if (row) rows.push(row);
  }

  if (!rows.length) {
    log('[GOLD_WORLD] No rows to insert');
    return;
  }

  const { error } = await supabase.from('instrument_price').insert(rows);
  if (error) {
    logError('[GOLD_WORLD] Insert error', error.message);
    throw error;
  }

  log(`[GOLD_WORLD] Inserted ${rows.length} rows`);
}

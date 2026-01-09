import { supabase } from '../supabase.js';
import {
  MM_GOLD_INSTRUMENTS,
  MM_GOLD_MARKET_CODE,
  MMK_CODE,
  UNIT_KYAT_THA
} from '../config.js';
import { idByCode } from '../utils/ids.js';
import { log, logError } from '../utils/logger.js';
import { fetchGoldPricesFromHellolinker } from './goldHellolinker.js';
import { withChangeDetection } from '../utils/priceChange.js';

const marketIdByCode = idByCode('market');
const instrumentIdByCode = idByCode('instrument');
const currencyIdByCode = idByCode('currency');
const unitIdByCode = idByCode('unit');

export async function runGoldMyanmarJob() {
  log('[GOLD_MM] Job start');

  const [marketId, mmkId, unitId] = await Promise.all([
    marketIdByCode(MM_GOLD_MARKET_CODE),
    currencyIdByCode(MMK_CODE),
    unitIdByCode(UNIT_KYAT_THA)
  ]);

  const { mm } = await fetchGoldPricesFromHellolinker();
  const now = new Date().toISOString();
  const rows: any[] = [];

  for (const code of MM_GOLD_INSTRUMENTS) {
    const match = code.match(/MM_GOLD_(\d+)K/);
    const karat = match ? Number(match[1]) : NaN;
    const value = Number.isNaN(karat) ? undefined : mm[karat];
    if (!value) {
      logError('[GOLD_MM] No data for code', code);
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
      currency_id: mmkId,
      value,
      source: 'HELLOLINKER_GOLD_SCRAPE'
    });

    if (row) rows.push(row);
  }

  if (!rows.length) {
    log('[GOLD_MM] No rows to insert');
    return;
  }

  const { error } = await supabase.from('instrument_price').insert(rows);
  if (error) {
    logError('[GOLD_MM] Insert error', error.message);
    throw error;
  }

  log(`[GOLD_MM] Inserted ${rows.length} rows`);
}

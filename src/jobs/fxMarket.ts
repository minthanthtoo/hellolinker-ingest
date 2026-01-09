import { supabase } from '../supabase.js';
import { FX_HISTORY_CURRENCIES, FX_MARKET_CODE, MMK_CODE, UNIT_BASE_CURRENCY } from '../config.js';
import { idByCode } from '../utils/ids.js';
import { log, logError } from '../utils/logger.js';
import { fetchFxLatestFromHellolinker } from './fxHellolinker.js';
import { withChangeDetection } from '../utils/priceChange.js';

const marketIdByCode = idByCode('market');
const instrumentIdByCode = idByCode('instrument');
const currencyIdByCode = idByCode('currency');
const unitIdByCode = idByCode('unit');

export async function runFxMarketJob() {
  log('[FX_MARKET] Job start');

  const [marketId, mmkId, unitId] = await Promise.all([
    marketIdByCode(FX_MARKET_CODE),
    currencyIdByCode(MMK_CODE),
    unitIdByCode(UNIT_BASE_CURRENCY)
  ]);

  const now = new Date().toISOString();
  const rows: any[] = [];

  for (const currency of FX_HISTORY_CURRENCIES) {
    const latest = await fetchFxLatestFromHellolinker(currency.slugs);
    if (!latest) {
      logError('[FX_MARKET] No data for currency', currency.code);
      continue;
    }
    const pairCode = `${currency.code}MMK`;
    const instrumentId = await instrumentIdByCode(pairCode);

    const buyRow = await withChangeDetection({
      instrument_id: instrumentId,
      market_id: marketId,
      location_id: null,
      ts: now,
      price_type: 'BUY',
      unit_id: unitId,
      currency_id: mmkId,
      value: latest.buy,
      source: 'HELLOLINKER_FX_HISTORY'
    });

    if (buyRow) rows.push(buyRow);

    const sellRow = await withChangeDetection({
      instrument_id: instrumentId,
      market_id: marketId,
      location_id: null,
      ts: now,
      price_type: 'SELL',
      unit_id: unitId,
      currency_id: mmkId,
      value: latest.sell,
      source: 'HELLOLINKER_FX_HISTORY'
    });

    if (sellRow) rows.push(sellRow);
  }

  if (rows.length === 0) {
    log('[FX_MARKET] No rows to insert');
    return;
  }

  const { error } = await supabase.from('instrument_price').insert(rows);
  if (error) {
    logError('[FX_MARKET] Insert error', error.message);
    throw error;
  }

  log(`[FX_MARKET] Inserted ${rows.length} rows`);
}

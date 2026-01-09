import { supabase } from '../supabase.js';
import { log, logError } from '../utils/logger.js';
import { fetchGoldHistoryFromHellolinker } from './goldHellolinker.js';

const TROY_OUNCE_GRAMS = 31.1035;
const KYAT_THA_GRAMS = 16.32932532;

function computeFxUsdMmk(usdValue: number, mmValue: number): number | null {
  if (!usdValue || !mmValue) return null;
  const usdPerGram = usdValue / TROY_OUNCE_GRAMS;
  const usdPerKyat = usdPerGram * KYAT_THA_GRAMS;
  if (usdPerKyat <= 0) return null;
  return mmValue / usdPerKyat;
}

export async function runGoldHistoryJob() {
  log('[GOLD_HISTORY] Job start');

  let usdHistory;
  let mmHistory;

  try {
    usdHistory = await fetchGoldHistoryFromHellolinker(24, 'USD');
  } catch (err) {
    logError('[GOLD_HISTORY] USD history fetch failed', err);
    return;
  }

  try {
    mmHistory = await fetchGoldHistoryFromHellolinker(24, 'MMK');
  } catch (err) {
    logError('[GOLD_HISTORY] MMK history fetch failed', err);
    mmHistory = [];
  }

  if (!usdHistory.length) {
    logError('[GOLD_HISTORY] Empty USD history');
    return;
  }

  const mmByDate = new Map(mmHistory.map(point => [point.date, point]));
  const rows = usdHistory.map(point => {
    const mmPoint = mmByDate.get(point.date);
    return {
      ts: point.date,
      xau_usd_oz_open: point.open,
      xau_usd_oz_high: point.high,
      xau_usd_oz_low: point.low,
      xau_usd_oz_close: point.close,
      fx_usd_mmk_open: mmPoint ? computeFxUsdMmk(point.open, mmPoint.open) : null,
      fx_usd_mmk_high: mmPoint ? computeFxUsdMmk(point.high, mmPoint.high) : null,
      fx_usd_mmk_low: mmPoint ? computeFxUsdMmk(point.low, mmPoint.low) : null,
      fx_usd_mmk_close: mmPoint ? computeFxUsdMmk(point.close, mmPoint.close) : null,
      source: 'HELLOLINKER_GOLD_HISTORY'
    };
  });

  const { error } = await supabase
    .from('gold_price_history_base')
    .upsert(rows, { onConflict: 'ts' });

  if (error) {
    logError('[GOLD_HISTORY] Insert error', error.message);
    return;
  }

  log(`[GOLD_HISTORY] Upserted ${rows.length} rows`);
}

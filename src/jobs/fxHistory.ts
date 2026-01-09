import { supabase } from '../supabase.js';
import { FX_HISTORY_CURRENCIES, FX_MARKET_CODE, MMK_CODE, UNIT_BASE_CURRENCY } from '../config.js';
import { idByCode } from '../utils/ids.js';
import { log, logError } from '../utils/logger.js';
import { fetchFxHistoryFromHellolinker } from './fxHellolinker.js';

const marketIdByCode = idByCode('market');
const instrumentIdByCode = idByCode('instrument');
const currencyIdByCode = idByCode('currency');
const unitIdByCode = idByCode('unit');

export async function runFxHistoryJob() {
  log('[FX_HISTORY] Job start');

  const [marketId, mmkId, unitId] = await Promise.all([
    marketIdByCode(FX_MARKET_CODE),
    currencyIdByCode(MMK_CODE),
    unitIdByCode(UNIT_BASE_CURRENCY)
  ]);

  for (const currency of FX_HISTORY_CURRENCIES) {
    let history;
    try {
      history = await fetchFxHistoryFromHellolinker(currency.slugs);
    } catch (err) {
      logError('[FX_HISTORY] Fetch failed', currency.code, err);
      continue;
    }

    if (!history.length) {
      logError('[FX_HISTORY] No history rows', currency.code);
      continue;
    }

    const instrumentId = await instrumentIdByCode(`${currency.code}MMK`);
    const rows = history.flatMap(point => {
      const ts = new Date(`${point.date}T00:00:00Z`).toISOString();
      return [
        {
          instrument_id: instrumentId,
          market_id: marketId,
          location_id: null,
          ts,
          price_type: 'BUY',
          unit_id: unitId,
          currency_id: mmkId,
          value: point.buy,
          source: 'HELLOLINKER_FX_HISTORY'
        },
        {
          instrument_id: instrumentId,
          market_id: marketId,
          location_id: null,
          ts,
          price_type: 'SELL',
          unit_id: unitId,
          currency_id: mmkId,
          value: point.sell,
          source: 'HELLOLINKER_FX_HISTORY'
        }
      ];
    });

    const { error } = await supabase
      .from('instrument_price')
      .upsert(rows, {
        onConflict: 'instrument_id,market_id,location_id,ts,price_type',
        ignoreDuplicates: false
      });

    if (error) {
      logError('[FX_HISTORY] Upsert error', currency.code, error.message);
      continue;
    }

    log(`[FX_HISTORY] Upserted ${rows.length} rows for ${currency.code}`);
  }
}

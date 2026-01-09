import { supabase } from '../supabase.js';
import {
  MM_GOLD_INSTRUMENTS,
  MM_GOLD_MARKET_CODE,
  MMK_CODE,
  UNIT_KYAT_THA,
  UNIT_OUNCE,
  USD_CODE,
  WORLD_GOLD_INSTRUMENTS,
  WORLD_GOLD_MARKET_CODE
} from '../config.js';
import { idByCode } from '../utils/ids.js';
import { log, logError } from '../utils/logger.js';
import { fetchGoldHistoryFromHellolinker } from './goldHellolinker.js';

const marketIdByCode = idByCode('market');
const instrumentIdByCode = idByCode('instrument');
const currencyIdByCode = idByCode('currency');
const unitIdByCode = idByCode('unit');

function parseKaratFromCode(code: string): number | null {
  const match = code.match(/(\d+)K/);
  return match ? Number(match[1]) : null;
}

export async function runGoldHistoryJob() {
  log('[GOLD_HISTORY] Job start');

  const [
    worldMarketId,
    mmMarketId,
    usdId,
    mmkId,
    unitOzId,
    unitKyatId
  ] = await Promise.all([
    marketIdByCode(WORLD_GOLD_MARKET_CODE),
    marketIdByCode(MM_GOLD_MARKET_CODE),
    currencyIdByCode(USD_CODE),
    currencyIdByCode(MMK_CODE),
    unitIdByCode(UNIT_OUNCE),
    unitIdByCode(UNIT_KYAT_THA)
  ]);

  const tasks = [
    {
      instruments: WORLD_GOLD_INSTRUMENTS,
      marketId: worldMarketId,
      currencyId: usdId,
      unitId: unitOzId,
      currency: 'USD' as const
    },
    {
      instruments: MM_GOLD_INSTRUMENTS,
      marketId: mmMarketId,
      currencyId: mmkId,
      unitId: unitKyatId,
      currency: 'MMK' as const
    }
  ];

  for (const task of tasks) {
    for (const code of task.instruments) {
      const karat = parseKaratFromCode(code);
      if (!karat) {
        logError('[GOLD_HISTORY] Cannot parse karat', code);
        continue;
      }

      let history;
      try {
        history = await fetchGoldHistoryFromHellolinker(karat, task.currency);
      } catch (err) {
        logError('[GOLD_HISTORY] History fetch failed', code, err);
        continue;
      }

      if (!history.length) {
        logError('[GOLD_HISTORY] Empty history', code);
        continue;
      }

      const instrumentId = await instrumentIdByCode(code);
      const rows = history.flatMap(point => {
        const ts = new Date(`${point.date}T00:00:00Z`).toISOString();
        return [
          {
            instrument_id: instrumentId,
            market_id: task.marketId,
            location_id: null,
            ts,
            price_type: 'OPEN',
            unit_id: task.unitId,
            currency_id: task.currencyId,
            value: point.open,
            source: 'HELLOLINKER_GOLD_HISTORY'
          },
          {
            instrument_id: instrumentId,
            market_id: task.marketId,
            location_id: null,
            ts,
            price_type: 'HIGH',
            unit_id: task.unitId,
            currency_id: task.currencyId,
            value: point.high,
            source: 'HELLOLINKER_GOLD_HISTORY'
          },
          {
            instrument_id: instrumentId,
            market_id: task.marketId,
            location_id: null,
            ts,
            price_type: 'LOW',
            unit_id: task.unitId,
            currency_id: task.currencyId,
            value: point.low,
            source: 'HELLOLINKER_GOLD_HISTORY'
          },
          {
            instrument_id: instrumentId,
            market_id: task.marketId,
            location_id: null,
            ts,
            price_type: 'CLOSE',
            unit_id: task.unitId,
            currency_id: task.currencyId,
            value: point.close,
            source: 'HELLOLINKER_GOLD_HISTORY'
          }
        ];
      });

      const { error } = await supabase
        .from('instrument_price')
        .upsert(rows, {
          onConflict: 'instrument_id,market_id,location_id,ts,price_type',
          ignoreDuplicates: true
        });

      if (error) {
        logError('[GOLD_HISTORY] Insert error', code, error.message);
        continue;
      }

      log(`[GOLD_HISTORY] Upserted ${rows.length} rows for ${code}`);
    }
  }
}

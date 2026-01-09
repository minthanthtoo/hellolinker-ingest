import { supabase } from '../supabase.js';
import { BANK_MARKET_CODES, MMK_CODE, UNIT_BASE_CURRENCY } from '../config.js';
import { idByCode } from '../utils/ids.js';
import { log, logError } from '../utils/logger.js';
import { fetchBankRatesFromHellolinker } from './bankHellolinker.js';
import { withChangeDetection } from '../utils/priceChange.js';

const marketIdByCode = idByCode('market');
const instrumentIdByCode = idByCode('instrument');
const currencyIdByCode = idByCode('currency');
const unitIdByCode = idByCode('unit');

export async function runFxBanksJob() {
  log('[FX_BANK] Job start');
  const [mmkId, unitId] = await Promise.all([
    currencyIdByCode(MMK_CODE),
    unitIdByCode(UNIT_BASE_CURRENCY)
  ]);

  const now = new Date().toISOString();
  const bankData = await fetchBankRatesFromHellolinker();

  for (const bankCode of BANK_MARKET_CODES) {
    const marketId = await marketIdByCode(bankCode);
    const rows: any[] = [];

    const rates = bankData[bankCode];
    if (!rates) {
      logError('[FX_BANK] No data for bank', bankCode);
      continue;
    }

    for (const [currency, pair] of Object.entries(rates)) {
      const pairCode = `${currency}MMK`;
      let instrumentId: number;
      try {
        instrumentId = await instrumentIdByCode(pairCode);
      } catch (err) {
        logError('[FX_BANK] Missing instrument', pairCode);
        continue;
      }

      if (pair.buy !== undefined) {
        const buyRow = await withChangeDetection({
          instrument_id: instrumentId,
          market_id: marketId,
          location_id: null,
          ts: now,
          price_type: 'BUY',
          unit_id: unitId,
          currency_id: mmkId,
          value: pair.buy,
          source: 'HELLOLINKER_BANK_SCRAPE'
        });
        if (buyRow) rows.push(buyRow);
      }

      if (pair.sell !== undefined) {
        const sellRow = await withChangeDetection({
          instrument_id: instrumentId,
          market_id: marketId,
          location_id: null,
          ts: now,
          price_type: 'SELL',
          unit_id: unitId,
          currency_id: mmkId,
          value: pair.sell,
          source: 'HELLOLINKER_BANK_SCRAPE'
        });
        if (sellRow) rows.push(sellRow);
      }

    }

    if (rows.length === 0) {
      log('[FX_BANK] No rows for bank', bankCode);
      continue;
    }

    const { error } = await supabase.from('instrument_price').insert(rows);
    if (error) {
      logError('[FX_BANK] Insert error for bank', bankCode, error.message);
      continue;
    }

    log(`[FX_BANK] Inserted ${rows.length} rows for bank ${bankCode}`);
  }
}

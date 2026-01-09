import { supabase } from '../supabase.js';
import { FUEL_INSTRUMENTS, FUEL_MARKET_CODE, MMK_CODE, UNIT_LITRE } from '../config.js';
import { idByCode, idBySlug } from '../utils/ids.js';
import { log, logError } from '../utils/logger.js';
import { withChangeDetection } from '../utils/priceChange.js';
import {
  fetchFuelPrices,
  fetchFuelTownshipList,
  mapFuelInstrument,
  townshipSlugFromFilter
} from './fuelHellolinker.js';

const marketIdByCode = idByCode('market');
const instrumentIdByCode = idByCode('instrument');
const currencyIdByCode = idByCode('currency');
const unitIdByCode = idByCode('unit');

export async function runFuelPricesJob() {
  log('[FUEL] Job start');

  const [marketId, mmkId, unitId] = await Promise.all([
    marketIdByCode(FUEL_MARKET_CODE),
    currencyIdByCode(MMK_CODE),
    unitIdByCode(UNIT_LITRE)
  ]);

  const townships = await fetchFuelTownshipList();
  if (!townships.length) {
    logError('[FUEL] No townships found');
    return;
  }

  for (const filterCity of townships) {
    const data = await fetchFuelPrices(filterCity);
    const ts = data.lastUpdatedIso ?? new Date().toISOString();
    let locationId: number | null = null;
    const townshipSlug = townshipSlugFromFilter(filterCity);

    try {
      locationId = await idBySlug(townshipSlug);
    } catch (err) {
      logError('[FUEL] Unknown township slug', townshipSlug);
      continue;
    }

    const rows: any[] = [];
    for (const [fuelName, price] of Object.entries(data.prices)) {
      const instrumentCode = mapFuelInstrument(fuelName);
      if (!instrumentCode || !FUEL_INSTRUMENTS.includes(instrumentCode)) continue;
      const instrumentId = await instrumentIdByCode(instrumentCode);

      const row = await withChangeDetection({
        instrument_id: instrumentId,
        market_id: marketId,
        location_id: locationId,
        ts,
        price_type: 'RETAIL',
        unit_id: unitId,
        currency_id: mmkId,
        value: price,
        source: 'HELLOLINKER_FUEL_SCRAPE',
        metadata: {
          filterCity: data.filterCity,
          region: data.region,
          township: data.township,
          source_last_updated: data.lastUpdatedText
        }
      });

      if (row) rows.push(row);
    }

    if (!rows.length) continue;
    const { error } = await supabase.from('instrument_price').insert(rows);
    if (error) {
      logError('[FUEL] Insert error', error.message);
    } else {
      log(`[FUEL] Inserted ${rows.length} rows for ${filterCity}`);
    }
  }
}

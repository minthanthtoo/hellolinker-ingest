import { supabase } from '../supabase.js';
import { log, logError } from '../utils/logger.js';
import { fetchGoldPricesFromHellolinker } from './goldHellolinker.js';

const TROY_OUNCE_GRAMS = 31.1035;
const KYAT_THA_GRAMS = 16.32932532;
const VALUE_EPSILON = 1e-6;

function isSameValue(a: number | null, b: number | null): boolean {
  if (a === null || b === null) return false;
  return Math.abs(a - b) <= VALUE_EPSILON;
}

function computeFxUsdMmk(world24: number, mm24: number): number | null {
  if (!world24 || !mm24) return null;
  const usdPerGram = world24 / TROY_OUNCE_GRAMS;
  const usdPerKyat = usdPerGram * KYAT_THA_GRAMS;
  if (usdPerKyat <= 0) return null;
  return mm24 / usdPerKyat;
}

export async function runGoldWorldJob() {
  log('[GOLD_BASE] Job start');

  const { world, mm } = await fetchGoldPricesFromHellolinker();
  const world24 = world[24];
  const mm24 = mm[24];

  if (!world24) {
    logError('[GOLD_BASE] Missing 24K world price');
    return;
  }

  if (!mm24) {
    logError('[GOLD_BASE] Missing 24K MMK price');
    return;
  }

  const fxUsdMmk = computeFxUsdMmk(world24, mm24);
  if (!fxUsdMmk) {
    logError('[GOLD_BASE] Failed to compute FX rate');
    return;
  }

  const latest = await supabase
    .from('gold_price_base')
    .select('xau_usd_oz, fx_usd_mmk')
    .order('ts', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (
    latest.data &&
    isSameValue(Number(latest.data.xau_usd_oz), world24) &&
    isSameValue(Number(latest.data.fx_usd_mmk), fxUsdMmk)
  ) {
    log('[GOLD_BASE] No changes detected');
    return;
  }

  const { error } = await supabase.from('gold_price_base').insert({
    ts: new Date().toISOString(),
    xau_usd_oz: world24,
    fx_usd_mmk: fxUsdMmk,
    source: 'HELLOLINKER_GOLD_SCRAPE'
  });

  if (error) {
    logError('[GOLD_BASE] Insert error', error.message);
    throw error;
  }

  log('[GOLD_BASE] Inserted base gold price');
}

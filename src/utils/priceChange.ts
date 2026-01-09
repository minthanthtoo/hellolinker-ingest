import { supabase } from '../supabase.js';
import { logError } from './logger.js';

const VALUE_EPSILON = 1e-6;

function isSameValue(a: number, b: number): boolean {
  return Math.abs(a - b) <= VALUE_EPSILON;
}

type PriceRow = {
  instrument_id: number;
  market_id: number;
  location_id: number | null;
  ts: string;
  price_type: string;
  unit_id: number;
  currency_id: number;
  value: number;
  source: string;
  change_value?: number | null;
  status?: string | null;
  metadata?: Record<string, unknown> | null;
};

export async function withChangeDetection(row: PriceRow): Promise<PriceRow | null> {
  const { data, error } = await supabase
    .from('instrument_price_latest')
    .select('value, ts')
    .eq('instrument_id', row.instrument_id)
    .eq('market_id', row.market_id)
    .eq('price_type', row.price_type)
    .is('location_id', row.location_id)
    .maybeSingle();

  if (error) {
    logError('[PRICE] Latest fetch failed', error.message);
    return row;
  }

  if (!data || data.value === null || data.value === undefined) {
    return row;
  }

  const prev = Number(data.value);
  if (Number.isNaN(prev)) {
    return row;
  }

  if (isSameValue(prev, row.value)) {
    return null;
  }

  return {
    ...row,
    change_value: row.value - prev
  };
}

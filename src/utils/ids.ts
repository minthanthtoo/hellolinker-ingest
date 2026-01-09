import { supabase } from '../supabase.js';
import { logError } from './logger.js';

const cache = new Map<string, number>();

async function idByCodeRaw(
  table: 'instrument' | 'market' | 'currency' | 'unit' | 'location',
  codeOrSlug: string,
  by: 'code' | 'slug'
): Promise<number> {
  const key = `${table}:${by}:${codeOrSlug}`;
  if (cache.has(key)) return cache.get(key)!;

  const { data, error } = await supabase
    .from(table)
    .select('id')
    .eq(by, codeOrSlug)
    .single();

  if (error || !data) {
    logError(`idBy${by} failed`, { table, codeOrSlug, error: error?.message });
    throw new Error(`Cannot find ${table}.${by} = ${codeOrSlug}`);
  }

  cache.set(key, data.id);
  return data.id;
}

export function idByCode(
  table: 'instrument' | 'market' | 'currency' | 'unit'
): (code: string) => Promise<number> {
  return (code: string) => idByCodeRaw(table, code, 'code');
}

export function idBySlug(slug: string) {
  return idByCodeRaw('location', slug, 'slug');
}

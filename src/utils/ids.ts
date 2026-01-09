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

  const { data, error, count } = await supabase
    .from(table)
    .select('id', { count: 'exact' })
    .eq(by, codeOrSlug)
    .order('id', { ascending: true })
    .limit(1);

  if (error || !data?.length) {
    logError(`idBy${by} failed`, { table, codeOrSlug, error: error?.message });
    throw new Error(`Cannot find ${table}.${by} = ${codeOrSlug}`);
  }

  if (count && count > 1) {
    logError(`idBy${by} multiple matches`, { table, codeOrSlug, count });
  }

  const id = data[0].id;
  cache.set(key, id);
  return id;
}

export function idByCode(
  table: 'instrument' | 'market' | 'currency' | 'unit'
): (code: string) => Promise<number> {
  return (code: string) => idByCodeRaw(table, code, 'code');
}

export function idBySlug(slug: string) {
  return idByCodeRaw('location', slug, 'slug');
}

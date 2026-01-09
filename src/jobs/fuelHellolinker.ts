import fetch from 'node-fetch';
import { log, logError } from '../utils/logger.js';

type FuelPrices = {
  filterCity: string;
  region: string;
  township: string;
  lastUpdatedText: string | null;
  lastUpdatedIso: string | null;
  prices: Record<string, number>;
};

const monthMap: Record<string, number> = {
  Jan: 1,
  Feb: 2,
  Mar: 3,
  Apr: 4,
  May: 5,
  Jun: 6,
  Jul: 7,
  Aug: 8,
  Sep: 9,
  Oct: 10,
  Nov: 11,
  Dec: 12
};

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseLastUpdated(text: string | null): string | null {
  if (!text) return null;
  // Example: "09 Jan 2026, 08:29 PM"
  const match = text.trim().match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4}),\s+(\d{1,2}):(\d{2})\s+(AM|PM)$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = monthMap[match[2]];
  const year = Number(match[3]);
  let hour = Number(match[4]);
  const minute = Number(match[5]);
  const period = match[6];
  if (!month || Number.isNaN(day) || Number.isNaN(year)) return null;
  if (period === 'PM' && hour < 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  const hh = String(hour).padStart(2, '0');
  const min = String(minute).padStart(2, '0');
  return `${year}-${mm}-${dd}T${hh}:${min}:00Z`;
}

async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  const res = await fetch(url, { signal: controller.signal });
  clearTimeout(timeoutId);
  if (!res.ok) {
    throw new Error(`[FUEL] Fetch failed: ${res.status} ${res.statusText}`);
  }
  return res.text();
}

export async function fetchFuelTownshipList(): Promise<string[]> {
  const url = 'https://hellolinker.net/rates/petro-price';
  log('[FUEL] Fetching township list');
  const html = await fetchHtml(url);
  const optionRegex = /<option[^>]*value="([^"]+)"[^>]*>/g;
  const values = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = optionRegex.exec(html)) !== null) {
    values.add(match[1]);
  }
  return Array.from(values);
}

export async function fetchFuelPrices(filterCity: string): Promise<FuelPrices> {
  const url = `https://hellolinker.net/rates/petro-price?filterCity=${encodeURIComponent(filterCity)}`;
  log(`[FUEL] Fetching fuel prices for ${filterCity}`);
  const html = await fetchHtml(url);

  const [regionRaw, townshipRaw] = filterCity.split('/');
  const region = regionRaw?.trim() || '';
  const township = townshipRaw?.trim() || '';

  const lastUpdatedMatch = html.match(
    /Last Updated:[\s\S]*?<span[^>]*>\s*([^<]+)\s*<\/span>/
  );
  const lastUpdatedText = lastUpdatedMatch ? lastUpdatedMatch[1].trim() : null;
  const lastUpdatedIso = parseLastUpdated(lastUpdatedText);

  const prices: Record<string, number> = {};
  const cardRegex =
    /<h3[^>]*>\s*([^<]+)\s*<\/h3>[\s\S]*?<span class="text-xl[^"]*">\s*([0-9,\\.]+)\s*<\/span>/g;
  let match: RegExpExecArray | null;
  while ((match = cardRegex.exec(html)) !== null) {
    const name = match[1].trim().toLowerCase();
    const value = Number(match[2].replace(/,/g, ''));
    if (Number.isNaN(value)) continue;
    prices[name] = value;
  }

  return {
    filterCity,
    region,
    township,
    lastUpdatedText,
    lastUpdatedIso,
    prices
  };
}

export function mapFuelInstrument(name: string): string | null {
  switch (name) {
    case 'diesel':
      return 'FUEL_DIESEL';
    case 'premium diesel':
      return 'FUEL_PREMIUM_DIESEL';
    case 'octane 92':
      return 'FUEL_OCTANE_92';
    case 'octane 95':
      return 'FUEL_OCTANE_95';
    default:
      logError('[FUEL] Unknown fuel name', name);
      return null;
  }
}

export function townshipSlugFromFilter(filterCity: string): string {
  const parts = filterCity.split('/');
  const township = parts[1] ? parts[1].trim() : filterCity.trim();
  return toSlug(township);
}

import fetch from 'node-fetch';
import { log } from '../utils/logger.js';

type BankRates = Record<string, { buy?: number; sell?: number }>;

type BankRatesByCode = Record<string, BankRates>;

function parseNumber(raw: string): number {
  return Number(raw.replace(/,/g, ''));
}

function normalizeBankCode(name: string): string | null {
  const upper = name.toUpperCase();
  if (upper.includes('AYA')) return 'AYA';
  if (upper.includes('KBZ')) return 'KBZ';
  if (upper.includes('YOMA')) return 'YOMA';
  if (upper.includes('CB BANK')) return 'CB';
  if (upper.includes('MCB')) return 'MCB';
  return null;
}

function extractRowValues(rowHtml: string): { currency?: string; buy?: number; sell?: number } {
  const currencyMatch = rowHtml.match(/>\s*([A-Z]{3})\s*<\/div>/);
  const values = [...rowHtml.matchAll(/<span class="block[^"]*">\s*([0-9.,]+)\s*<\/span>/g)];
  const currency = currencyMatch ? currencyMatch[1] : undefined;
  const buy = values[0] ? parseNumber(values[0][1]) : undefined;
  const sell = values[1] ? parseNumber(values[1][1]) : undefined;
  return { currency, buy, sell };
}

export async function fetchBankRatesFromHellolinker(): Promise<BankRatesByCode> {
  const url = 'https://hellolinker.net/rates/bank-exchange-rates';
  log('[BANK] Fetching bank exchange rates');
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  const res = await fetch(url, { signal: controller.signal });
  clearTimeout(timeoutId);
  if (!res.ok) {
    throw new Error(`[BANK] Fetch failed: ${res.status} ${res.statusText}`);
  }

  const html = await res.text();
  const bankBlocks = [...html.matchAll(/<div class="premium-card[\s\S]*?<\/div>\s*<\/div>/g)];
  const result: BankRatesByCode = {};

  for (const block of bankBlocks) {
    const chunk = block[0];
    const altMatch = chunk.match(/<img[^>]*alt="([^"]+)"[^>]*>/);
    const bankCode = altMatch ? normalizeBankCode(altMatch[1]) : null;
    if (!bankCode) continue;

    const rows = [...chunk.matchAll(/<tr[\s\S]*?<\/tr>/g)];
    const rates: BankRates = {};

    for (const row of rows) {
      const { currency, buy, sell } = extractRowValues(row[0]);
      if (!currency) continue;
      if (buy === undefined && sell === undefined) continue;
      rates[currency] = { buy, sell };
    }

    if (Object.keys(rates).length) {
      result[bankCode] = rates;
    }
  }

  return result;
}

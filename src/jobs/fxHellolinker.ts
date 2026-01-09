import fetch from 'node-fetch';
import { log } from '../utils/logger.js';

type FxHistoryPoint = {
  date: string;
  buy: number;
  sell: number;
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

function parseDateRangeYear(html: string): { start?: Date; end?: Date } {
  const startMatch = html.match(/startDate:\s*moment\("([0-9-]+)\s/);
  const endMatch = html.match(/endDate:\s*moment\("([0-9-]+)\s/);
  const start = startMatch ? new Date(`${startMatch[1]}T00:00:00Z`) : undefined;
  const end = endMatch ? new Date(`${endMatch[1]}T00:00:00Z`) : undefined;
  return { start, end };
}

function parseLabelsToDates(labels: string[], start?: Date): string[] {
  if (!labels.length) return [];
  const startYear = start ? start.getUTCFullYear() : new Date().getUTCFullYear();
  let currentYear = startYear;
  let prevMonth = start ? start.getUTCMonth() + 1 : monthMap[labels[0].split(' ')[1]] || 1;

  return labels.map(label => {
    const [dayStr, monthStr] = label.trim().split(' ');
    const day = Number(dayStr);
    const month = monthMap[monthStr];
    if (!month || Number.isNaN(day)) return '';

    if (month < prevMonth) {
      currentYear += 1;
    }
    prevMonth = month;

    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${currentYear}-${mm}-${dd}`;
  });
}

function extractJsonArray(html: string, key: 'labels' | 'buy' | 'sell'): string[] | number[] {
  let regex: RegExp;
  if (key === 'labels') {
    regex = /labels:\s*JSON\.parse\("([^"]+)"\)/;
  } else if (key === 'buy') {
    regex = /label:\s*'Buying'[\s\S]*?data:\s*JSON\.parse\("([^"]+)"\)/;
  } else {
    regex = /label:\s*'Selling'[\s\S]*?data:\s*JSON\.parse\("([^"]+)"\)/;
  }

  const match = html.match(regex);
  if (!match) return [];
  const json = JSON.parse(`"${match[1]}"`);
  return JSON.parse(json);
}

async function fetchExchangePage(slug: string): Promise<string> {
  const url = `https://hellolinker.net/rates/exchange-price/${slug}`;
  log(`[FX] Fetching exchange page ${url}`);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  const res = await fetch(url, { signal: controller.signal });
  clearTimeout(timeoutId);
  if (!res.ok) {
    throw new Error(`[FX] Fetch failed: ${res.status} ${res.statusText}`);
  }
  return res.text();
}

export async function fetchFxHistoryFromHellolinker(slugs: string[]): Promise<FxHistoryPoint[]> {
  let html = '';
  let lastError: unknown;
  for (const slug of slugs) {
    try {
      html = await fetchExchangePage(slug);
      break;
    } catch (err) {
      lastError = err;
    }
  }

  if (!html) {
    throw lastError ?? new Error('[FX] Failed to fetch exchange page');
  }

  const labels = extractJsonArray(html, 'labels') as string[];
  const buy = extractJsonArray(html, 'buy') as number[];
  const sell = extractJsonArray(html, 'sell') as number[];
  const { start } = parseDateRangeYear(html);
  const dates = parseLabelsToDates(labels, start);

  const length = Math.min(dates.length, buy.length, sell.length);
  const out: FxHistoryPoint[] = [];
  for (let i = 0; i < length; i += 1) {
    if (!dates[i]) continue;
    out.push({
      date: dates[i],
      buy: Number(buy[i]),
      sell: Number(sell[i])
    });
  }

  return out;
}

export async function fetchFxLatestFromHellolinker(slugs: string[]) {
  const history = await fetchFxHistoryFromHellolinker(slugs);
  return history[history.length - 1];
}

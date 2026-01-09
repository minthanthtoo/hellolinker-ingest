import fetch from 'node-fetch';
import { log } from '../utils/logger.js';

type GoldPrices = {
  world: Record<number, number>;
  mm: Record<number, number>;
};

function parseNumber(raw: string): number {
  return Number(raw.replace(/,/g, ''));
}

export async function fetchGoldPricesFromHellolinker(): Promise<GoldPrices> {
  const url = 'https://hellolinker.net/rates/gold-price';
  log('[GOLD] Fetching gold prices from hellolinker');
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  const res = await fetch(url, { signal: controller.signal });
  clearTimeout(timeoutId);
  if (!res.ok) {
    throw new Error(`[GOLD] Fetch failed: ${res.status} ${res.statusText}`);
  }

  const html = await res.text();

  // Match cards like: /rates/gold-price/k_24/USD ... price ... $ or Ks
  const cardRegex =
    /<a href="https:\/\/hellolinker\.net\/rates\/gold-price\/k_(\d+)\/(USD|MMK)"[\s\S]*?<span class="text-base[^"]*">\s*([0-9,\\.]+)\s*<\/span>[\s\S]*?<span class="text-\[10px][^"]*">\s*(\$|Ks)\s*<\/span>/g;

  const world: Record<number, number> = {};
  const mm: Record<number, number> = {};

  let match: RegExpExecArray | null;
  while ((match = cardRegex.exec(html)) !== null) {
    const karat = Number(match[1]);
    const currency = match[2];
    const price = parseNumber(match[3]);

    if (Number.isNaN(karat) || Number.isNaN(price)) continue;

    if (currency === 'USD') {
      world[karat] = price;
    } else {
      mm[karat] = price;
    }
  }

  return { world, mm };
}

type GoldHistoryPoint = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
};

export async function fetchGoldHistoryFromHellolinker(
  karat: number,
  currency: 'USD' | 'MMK'
): Promise<GoldHistoryPoint[]> {
  const url = `https://hellolinker.net/rates/gold-price/k_${karat}/${currency}`;
  log(`[GOLD] Fetching gold history from ${url}`);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  const res = await fetch(url, { signal: controller.signal });
  clearTimeout(timeoutId);
  if (!res.ok) {
    throw new Error(`[GOLD] History fetch failed: ${res.status} ${res.statusText}`);
  }

  const html = await res.text();
  const lineMatch = html.match(/const goldLineChartData = JSON\.parse\("([^"]+)"\);/);
  const candleMatch = html.match(/const candleChartData = JSON\.parse\("([^"]+)"\);/);

  if (!lineMatch || !candleMatch) {
    throw new Error('[GOLD] History parse failed: data blobs not found');
  }

  const lineJson = JSON.parse(`"${lineMatch[1]}"`);
  const candleJson = JSON.parse(`"${candleMatch[1]}"`);
  const lineData = JSON.parse(lineJson) as { labels: string[]; values: number[] };
  const candleData = JSON.parse(candleJson) as Array<{ x: string; y: number[] }>;

  const candleByDate = new Map<string, GoldHistoryPoint>();
  for (const candle of candleData) {
    if (!candle?.x || !Array.isArray(candle.y) || candle.y.length < 4) continue;
    const [open, high, low, close] = candle.y.map(val => Number(val));
    if ([open, high, low, close].some(val => Number.isNaN(val))) continue;
    candleByDate.set(candle.x, { date: candle.x, open, high, low, close });
  }

  const out: GoldHistoryPoint[] = [];
  for (let i = 0; i < lineData.labels.length; i += 1) {
    const date = lineData.labels[i];
    const lineValue = Number(lineData.values[i]);
    if (!date || Number.isNaN(lineValue)) continue;

    const candle = candleByDate.get(date);
    if (candle) {
      out.push(candle);
    } else {
      out.push({ date, open: lineValue, high: lineValue, low: lineValue, close: lineValue });
    }
  }

  return out;
}

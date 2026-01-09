import express from 'express';
import type { Request, Response } from 'express';
import cron from 'node-cron';
import { log, logError } from './utils/logger.js';
import { runFxMarketJob } from './jobs/fxMarket.js';
import { runFxBanksJob } from './jobs/fxBanks.js';
import { runGoldWorldJob } from './jobs/goldWorld.js';
import { runGoldMyanmarJob } from './jobs/goldMyanmar.js';
import { runGoldHistoryJob } from './jobs/goldHistory.js';
import { runFxHistoryJob } from './jobs/fxHistory.js';
import { runFuelPricesJob } from './jobs/fuelPrices.js';
import { validateRequiredSeeds } from './validate.js';
// import { runGoldMyanmarJob } from './jobs/goldMyanmar.js';
// import { runFuelPricesJob } from './jobs/fuelPrices.js';

const app = express();
const PORT = process.env.PORT || 3000;

async function runAllJobs() {
  log('=== Running all jobs ===');

  try {
    await runFxMarketJob();
  } catch (err) {
    logError('FX market job failed', err);
  }

  try {
    await runFxHistoryJob();
  } catch (err) {
    logError('FX history job failed', err);
  }

  try {
    await runFxBanksJob();
  } catch (err) {
    logError('FX banks job failed', err);
  }

  try {
    await runGoldWorldJob();
  } catch (err) {
    logError('World gold job failed', err);
  }

  try {
    await runGoldMyanmarJob();
  } catch (err) {
    logError('Myanmar gold job failed', err);
  }

  try {
    await runFuelPricesJob();
  } catch (err) {
    logError('Fuel prices job failed', err);
  }

  try {
    await runGoldHistoryJob();
  } catch (err) {
    logError('Gold history job failed', err);
  }

  // Add other jobs when implemented
  // try { await runGoldMyanmarJob(); } catch (e) { ... }
  // try { await runFuelPricesJob(); } catch (e) { ... }

  log('=== All jobs finished ===');
}

// health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// manual trigger if you want
app.post('/run-now', async (_req: Request, res: Response) => {
  try {
    await runAllJobs();
    res.json({ ok: true });
  } catch (err: any) {
    logError('Manual run error', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

async function startServer() {
  await validateRequiredSeeds();

  app.listen(PORT, () => {
    log(`Backend server listening on port ${PORT}`);
    // Run once on startup
    runAllJobs().catch(err => logError('Startup jobs failed', err));

    // Every 5 minutes
    cron.schedule('*/5 * * * *', () => {
      log('CRON tick (every 5 minutes)');
      runAllJobs().catch(err => logError('Cron jobs failed', err));
    });
  });
}

startServer().catch(err => {
  logError('Startup failed', err);
  process.exit(1);
});

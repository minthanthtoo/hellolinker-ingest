import { log } from '../utils/logger.js';
import { runGoldWorldJob } from './goldWorld.js';

export async function runGoldMyanmarJob() {
  log('[GOLD_MM] Deprecated: using base gold job');
  await runGoldWorldJob();
}

import { createApp } from './app.js';
import { env } from './config/env.js';
import { checkDbHealth, dbPool } from './db/pool.js';
import { runFullIngestionPipeline } from './ingestion/ingestionOrchestrator.js';

const FIVE_MINUTES_MS = 5 * 60 * 1000;

async function startServer() {
  try {
    const dbHealth = await checkDbHealth();
    console.log(
      `[@hanoi-pm25/api] PostGIS Connected (v${dbHealth.postgisVersion}) — Active stations: ${dbHealth.activeStationsCount}, Valid observations: ${dbHealth.totalObservationsCount}`
    );
  } catch (err) {
    console.error(
      '[@hanoi-pm25/api] Warning: Initial database check failed:',
      err instanceof Error ? err.message : err
    );
  }

  let isRunningScheduledIngestion = false;

  const executeScheduledDatabaseIngestion = async () => {
    if (isRunningScheduledIngestion) return;
    isRunningScheduledIngestion = true;
    try {
      console.log(
        `[@hanoi-pm25/api] [Auto-Reload 5m] Running scheduled data ingestion into PostGIS...`
      );
      const report = await runFullIngestionPipeline('SCHEDULER');
      console.log(
        `[@hanoi-pm25/api] [Auto-Reload 5m] Completed in ${report.totalDurationMs} ms`
      );
    } catch (err) {
      console.error(
        '[@hanoi-pm25/api] [Auto-Reload 5m] Ingestion error:',
        err instanceof Error ? err.message : err
      );
    } finally {
      isRunningScheduledIngestion = false;
    }
  };

  // Run an initial database reload on startup and repeat automatically every 5 minutes
  void executeScheduledDatabaseIngestion();
  const ingestionInterval = setInterval(() => {
    void executeScheduledDatabaseIngestion();
  }, FIVE_MINUTES_MS);

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.log(
      `[@hanoi-pm25/api] Server listening on http://localhost:${env.PORT} (Auto-reloading PostGIS DB every 5 minutes)`
    );
  });

  const shutdown = async () => {
    clearInterval(ingestionInterval);
    server.close();
    await dbPool.end();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startServer();

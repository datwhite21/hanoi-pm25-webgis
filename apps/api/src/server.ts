import { createApp } from './app.js';
import { env } from './config/env.js';
import { checkDbHealth, dbPool } from './db/pool.js';

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

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.log(
      `[@hanoi-pm25/api] Server listening on http://localhost:${env.PORT}`
    );
  });

  const shutdown = async () => {
    server.close();
    await dbPool.end();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startServer();

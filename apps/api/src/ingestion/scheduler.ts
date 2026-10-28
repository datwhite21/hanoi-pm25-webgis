import { runFullIngestionPipeline } from './ingestionOrchestrator.js';

let intervalHandle: ReturnType<typeof setInterval> | null = null;

export function startIngestionScheduler(intervalMinutes = 15): void {
  if (intervalHandle) return;
  const intervalMs = intervalMinutes * 60 * 1000;
  console.log(
    `[@hanoi-pm25/api] Background Ingestion Scheduler enabled (every ${intervalMinutes} minutes)`
  );

  intervalHandle = setInterval(() => {
    runFullIngestionPipeline('SCHEDULER').catch((err) => {
      console.error(
        '[@hanoi-pm25/api] Scheduled ingestion error:',
        err instanceof Error ? err.message : err
      );
    });
  }, intervalMs);
}

export function stopIngestionScheduler(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}

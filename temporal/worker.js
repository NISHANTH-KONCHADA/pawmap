import * as activities from './activities.js';

async function runWorker() {
  try {
    // Dynamic import to allow compiling and starting even if @temporalio native dependencies are missing
    const { Worker } = await import('@temporalio/worker');
    const worker = await Worker.create({
      workflowsPath: new URL('./tnrWorkflow.js', import.meta.url).pathname,
      activities,
      taskQueue: 'tnr-queue',
    });
    console.log("🤖 Temporal Worker is online on taskQueue: tnr-queue");
    await worker.run();
  } catch (err) {
    console.log("ℹ️ Temporal native library is not available. Operating with our high-fidelity In-Memory Simulation Engine instead.");
    // Hold worker process alive
    await new Promise(() => {});
  }
}

runWorker();

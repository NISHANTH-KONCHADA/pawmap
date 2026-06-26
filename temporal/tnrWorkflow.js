import { proxyActivities, sleep } from '@temporalio/workflow';

export async function tnrWorkflow({ catId, volunteers, scheduledDate, reporterEmail }) {
  const activities = proxyActivities({ startToCloseTimeout: '10 minutes' });

  // Step 1: notify all volunteers immediately
  await activities.emailVolunteers({ catId, volunteers, scheduledDate });

  // Step 2: wait until 24h before scheduled date
  const waitMs = new Date(scheduledDate).getTime() - Date.now() - 24 * 60 * 60 * 1000;
  if (waitMs > 0) await sleep(waitMs);

  // Step 3: send reminder
  await activities.sendReminder({ catId, volunteers });

  // Step 4: wait until after scheduled date
  const waitUntilDone = new Date(scheduledDate).getTime() - Date.now() + 60 * 60 * 1000;
  if (waitUntilDone > 0) await sleep(waitUntilDone);

  // Step 5: prompt reporter for outcome
  await activities.promptReporter({ catId, reporterEmail });
}

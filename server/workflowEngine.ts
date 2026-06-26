import * as activities from "../temporal/activities.js";
import { DB } from "./db.js";

interface ActiveWorkflow {
  workflowId: string;
  catId: string;
  scheduledDate: Date;
  reporterEmail: string;
  status: "running" | "completed" | "cancelled";
}

export const activeWorkflows: ActiveWorkflow[] = [];

export async function startTnrWorkflowSimulated(
  catId: string,
  scheduledDate: Date,
  reporterEmail: string
) {
  const workflowId = `wf_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  
  const wf: ActiveWorkflow = {
    workflowId,
    catId,
    scheduledDate,
    reporterEmail,
    status: "running"
  };
  activeWorkflows.push(wf);

  console.log(`[Workflow Engine] Initiating simulated TNR workflow ${workflowId} for cat ${catId}`);

  // Fetch cat
  const cat = await DB.findById(catId);
  const volunteers = cat?.volunteers || [];

  // Update cat history with scheduling event
  if (cat) {
    const history = [...cat.history, {
      action: `TNR Scheduled for ${new Date(scheduledDate).toLocaleDateString()} by ${reporterEmail}. Temporal workflow ID: ${workflowId}`,
      by: reporterEmail,
      at: new Date()
    }];
    await DB.update(catId, {
      status: "tnr",
      history,
      tnrEvent: {
        scheduledDate,
        status: "scheduled",
        temporalWorkflowId: workflowId
      }
    });
  }

  // Step 1: Notify volunteers immediately
  try {
    await activities.emailVolunteers({ catId, volunteers, scheduledDate });
  } catch (err) {
    console.error("[Workflow Simulation Error] Step 1 failed:", err);
  }

  // Step 2 & 3: Fast-forwarded reminder (simulating 24h before event)
  setTimeout(async () => {
    try {
      console.log(`[Workflow Sim] 24-Hour Reminder check triggered for workflow ${workflowId}`);
      const freshCat = await DB.findById(catId);
      if (freshCat && freshCat.tnrEvent?.status === "scheduled") {
        await activities.sendReminder({ catId, volunteers: freshCat.volunteers });
      }
    } catch (err) {
      console.error("[Workflow Simulation Error] Step 3 failed:", err);
    }
  }, 10000); // 10 seconds in demo

  // Step 4 & 5: Prompt reporter for outcome after scheduled time passes
  setTimeout(async () => {
    try {
      console.log(`[Workflow Sim] Prompt Reporter check triggered for workflow ${workflowId}`);
      const freshCat = await DB.findById(catId);
      if (freshCat && freshCat.tnrEvent?.status === "scheduled") {
        await activities.promptReporter({ catId, reporterEmail });
        
        // Add note from system asking for updates
        const updatedNotes = [...freshCat.notes, {
          text: `[System Update Request] Sent email to ${reporterEmail} to verify the trapping outcome.`,
          by: "TNR Coordinator Bot",
          at: new Date()
        }];
        await DB.update(catId, { notes: updatedNotes });
      }
      wf.status = "completed";
    } catch (err) {
      console.error("[Workflow Simulation Error] Step 5 failed:", err);
    }
  }, 25000); // 25 seconds in demo

  return workflowId;
}

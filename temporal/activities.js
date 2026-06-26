import nodemailer from "nodemailer";
import { DB } from "../server/db.js";

// Setup mailer transporter
function getTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT) {
    return null;
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT),
    auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined
  });
}

export async function emailVolunteers({ catId, volunteers, scheduledDate }) {
  const cat = await DB.findById(catId);
  const nickname = cat?.nickname || "a stray cat";
  const dateStr = new Date(scheduledDate).toLocaleString();

  console.log(`[TNR Workflow Activity] Notify volunteers for ${nickname} scheduling on ${dateStr}`);
  
  const recipientEmails = volunteers.map(v => v.email).join(", ");
  if (!recipientEmails) {
    console.log("No volunteers to email yet.");
    return;
  }

  const subject = `🐾 TNR Mission Scheduled for ${nickname}!`;
  const htmlContent = `
    <div style="font-family: sans-serif; padding: 20px; max-width: 600px; border: 1px solid #f0ebe1; border-radius: 12px; background-color: #faf6f0;">
      <h2 style="color: #0d5c4a; font-family: 'Space Grotesk', sans-serif;">TNR Mission Scheduled! 🐱</h2>
      <p>Hello Volunteers,</p>
      <p>A new Trap-Neuter-Return mission has been scheduled for <strong>${nickname}</strong>.</p>
      <div style="background-color: #fff; padding: 15px; border-radius: 8px; border-left: 4px solid #1d9e75; margin: 15px 0;">
        <strong>Date & Time:</strong> ${dateStr}<br/>
        <strong>Status:</strong> Scheduled
      </div>
      <p>Please prepare your traps and coordinate via the PawMap dashboard.</p>
      <hr style="border: none; border-top: 1px solid #f0ebe1; margin: 20px 0;" />
      <p style="font-size: 12px; color: #6b6b68;">PawMap Care System Team</p>
    </div>
  `;

  const transporter = getTransporter();
  if (transporter) {
    try {
      await transporter.sendMail({
        from: '"PawMap Team" <noreply@pawmap.org>',
        to: recipientEmails,
        subject,
        html: htmlContent
      });
      console.log(`[SMTP] Successfully sent TNR schedule emails to ${recipientEmails}`);
    } catch (err) {
      console.error("[SMTP ERROR] Failed to send email via SMTP, falling back to console:", err);
    }
  } else {
    console.log(`\n=================== [MOCK EMAIL] ===================`);
    console.log(`TO: ${recipientEmails}`);
    console.log(`SUBJECT: ${subject}`);
    console.log(`BODY:\n${htmlContent.replace(/<[^>]*>/g, '').trim()}`);
    console.log(`====================================================\n`);
  }
}

export async function sendReminder({ catId, volunteers }) {
  const cat = await DB.findById(catId);
  const nickname = cat?.nickname || "a stray cat";

  console.log(`[TNR Workflow Activity] Send 24h Reminder for ${nickname}`);

  const recipientEmails = volunteers.map(v => v.email).join(", ");
  if (!recipientEmails) return;

  const subject = `⚠️ 24h Reminder: TNR Mission for ${nickname}`;
  const htmlContent = `
    <div style="font-family: sans-serif; padding: 20px; max-width: 600px; border: 1px solid #f0ebe1; border-radius: 12px; background-color: #faf6f0;">
      <h2 style="color: #d85a30;">24h Reminder! ⏱️</h2>
      <p>TNR trap-out is scheduled in less than 24 hours for <strong>${nickname}</strong>.</p>
      <p>Make sure traps are sterilized and holding recovery cages are ready. Thank you for your dedication!</p>
      <hr style="border: none; border-top: 1px solid #f0ebe1; margin: 20px 0;" />
      <p style="font-size: 12px; color: #6b6b68;">PawMap Team</p>
    </div>
  `;

  const transporter = getTransporter();
  if (transporter) {
    try {
      await transporter.sendMail({
        from: '"PawMap Team" <noreply@pawmap.org>',
        to: recipientEmails,
        subject,
        html: htmlContent
      });
    } catch (err) {
      console.error("[SMTP ERROR] Reminder email send failed, logged to console instead.");
    }
  } else {
    console.log(`\n=================== [MOCK EMAIL REMINDER] ===================`);
    console.log(`TO: ${recipientEmails}`);
    console.log(`SUBJECT: ${subject}`);
    console.log(`BODY:\n${htmlContent.replace(/<[^>]*>/g, '').trim()}`);
    console.log(`=============================================================\n`);
  }
}

export async function promptReporter({ catId, reporterEmail }) {
  const cat = await DB.findById(catId);
  const nickname = cat?.nickname || "a stray cat";

  console.log(`[TNR Workflow Activity] Prompt reporter ${reporterEmail} for outcome of ${nickname}`);

  const subject = `🐾 How did ${nickname}'s TNR go?`;
  const htmlContent = `
    <div style="font-family: sans-serif; padding: 20px; max-width: 600px; border: 1px solid #f0ebe1; border-radius: 12px; background-color: #faf6f0;">
      <h2 style="color: #0d5c4a;">Mission Completed? 🏁</h2>
      <p>Hi there,</p>
      <p>The TNR scheduled date for <strong>${nickname}</strong> has passed. Could you please update us on the outcome?</p>
      <p>Did you catch them? Are they at the vet, or successfully returned?</p>
      <a href="${process.env.APP_URL || 'http://localhost:3000'}/cat/${catId}" style="display: inline-block; background-color: #1d9e75; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 10px;">Update Cat Status</a>
      <hr style="border: none; border-top: 1px solid #f0ebe1; margin: 20px 0;" />
      <p style="font-size: 12px; color: #6b6b68;">PawMap Workflow Engine</p>
    </div>
  `;

  const transporter = getTransporter();
  if (transporter && reporterEmail) {
    try {
      await transporter.sendMail({
        from: '"PawMap Workflows" <noreply@pawmap.org>',
        to: reporterEmail,
        subject,
        html: htmlContent
      });
    } catch (err) {
      console.error("[SMTP ERROR] Prompt email send failed.");
    }
  } else if (reporterEmail) {
    console.log(`\n=================== [MOCK EMAIL PROMPT] ===================`);
    console.log(`TO: ${reporterEmail}`);
    console.log(`SUBJECT: ${subject}`);
    console.log(`BODY:\n${htmlContent.replace(/<[^>]*>/g, '').trim()}`);
    console.log(`============================================================\n`);
  }
}

export async function updateCatStatus({ catId, status, outcome }) {
  console.log(`[TNR Workflow Activity] Updating Cat ${catId} status to ${status} (Outcome: ${outcome})`);
  const cat = await DB.findById(catId);
  if (cat) {
    const history = [...cat.history, {
      action: `TNR Workflow update: Marked as ${status}. Outcome: ${outcome}`,
      by: "TNR Workflow engine",
      at: new Date()
    }];
    await DB.update(catId, {
      status: status,
      history
    });
  }
}

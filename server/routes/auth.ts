import express, { Request, Response } from "express";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

const router = express.Router();

if (!process.env.JWT_SECRET) {
  throw new Error("FATAL: JWT_SECRET environment variable is not set. Server cannot start securely.");
}
const JWT_SECRET = process.env.JWT_SECRET;

// Helper for Nodemailer
function getTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT),
    auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined
  });
}

// 1. POST /api/auth/magic-link
router.post("/magic-link", async (req: Request, res: Response): Promise<any> => {
  const { email } = req.body;
  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "A valid email address is required" });
  }

  try {
    // Generate JWT token with email
    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: "7d" });
    
    // Construct magic link redirecting back to our site with the token
    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const magicLink = `${appUrl}?token=${token}`;

    const subject = "🐾 Your PawMap Magic Login Link";
    const htmlContent = `
      <div style="font-family: sans-serif; padding: 25px; max-width: 600px; border: 1px solid #f0ebe1; border-radius: 12px; background-color: #faf6f0;">
        <h2 style="color: #0d5c4a; font-family: 'Space Grotesk', sans-serif;">Welcome to PawMap! 🐾</h2>
        <p>Click the link below to securely sign in to your stray cat care dashboard:</p>
        <p style="margin: 24px 0;">
          <a href="${magicLink}" style="background-color: #1d9e75; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
            Sign In to PawMap
          </a>
        </p>
        <p style="font-size: 13px; color: #6b6b68;">Or copy and paste this URL into your browser:</p>
        <p style="font-size: 13px; font-family: monospace; word-break: break-all; background: white; padding: 10px; border-radius: 6px; border: 1px solid #f0ebe1;">
          ${magicLink}
        </p>
        <hr style="border: none; border-top: 1px solid #f0ebe1; margin: 20px 0;" />
        <p style="font-size: 12px; color: #6b6b68;">PawMap Care Network. This link is valid for 7 days.</p>
      </div>
    `;

    const transporter = getTransporter();
    if (transporter) {
      await transporter.sendMail({
        from: '"PawMap Team" <auth@pawmap.org>',
        to: email,
        subject,
        html: htmlContent
      });
      console.log(`[SMTP] Sent magic link to ${email}`);
    } else {
      console.log(`\n=================== [MAGIC LINK GENERATED] ===================`);
      console.log(`TO: ${email}`);
      console.log(`SUBJECT: ${subject}`);
      console.log(`LINK: ${magicLink}`);
      console.log(`==============================================================\n`);
    }

    res.json({
      success: true,
      message: "Magic link sent! Please check your email inbox (or check terminal logs in development).",
      // Include token in response in dev mode so the client can login immediately without configuring SMTP!
      token: process.env.NODE_ENV !== "production" || !transporter ? token : undefined
    });
  } catch (err) {
    console.error("Magic link generation failed:", err);
    res.status(500).json({ error: "Internal server error occurred while sending magic link" });
  }
});

// 2. POST /api/auth/verify
router.post("/verify", (req: Request, res: Response): any => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: "Token is required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { email: string };
    res.json({
      success: true,
      user: {
        email: decoded.email
      }
    });
  } catch (err) {
    console.error("Token verification failed:", err);
    res.status(401).json({ error: "Invalid or expired magic link token" });
  }
});

export default router;

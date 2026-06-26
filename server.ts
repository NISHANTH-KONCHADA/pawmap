import express from "express";
import path from "path";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import { rateLimit } from "express-rate-limit";
import { Server as SocketIOServer } from "socket.io";
import dotenv from "dotenv";

// ─── Load Environment Variables ────────────────────────────────────────────────
dotenv.config();

import { connectDB } from "./server/db.js";
import authRouter from "./server/routes/auth.js";
import catsRouter from "./server/routes/cats.js";
import { startTnrWorkflowSimulated } from "./server/workflowEngine.js";

// ─── Constants ─────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || "3000", 10);
const CLIENT_URL = process.env.CLIENT_URL || "*";
const IS_PRODUCTION = process.env.NODE_ENV === "production";

// ─── Bootstrap Server ──────────────────────────────────────────────────────────
async function startServer() {
  // Connect to MongoDB Atlas (with automatic JSON fallback)
  await connectDB();

  const app = express();
  const server = http.createServer(app);

  // ─── Socket.io ─────────────────────────────────────────────────────────────
  const io = new SocketIOServer(server, {
    cors: {
      origin: CLIENT_URL,
      methods: ["GET", "POST", "PUT"],
    },
  });

  // Attach io instance to Express so route handlers can emit events
  app.set("io", io);

  io.on("connection", (socket) => {
    console.log(`🔌 Client connected:    ${socket.id}`);

    socket.on("pin:new", (cat) => {
      console.log(`[Socket] Broadcasting new pin: ${cat.nickname}`);
      io.emit("pin:new", cat);
    });

    socket.on("pin:updated", (cat) => {
      console.log(`[Socket] Broadcasting pin update: ${cat.nickname}`);
      io.emit("pin:updated", cat);
    });

    socket.on("disconnect", () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });

  // ─── Security Middleware ────────────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: false,    // Allow Leaflet map tile assets
      crossOriginEmbedderPolicy: false,
    })
  );

  app.use(
    cors({
      origin: CLIENT_URL,
      credentials: true,
    })
  );

  app.use(express.json({ limit: "10mb" })); // Support base64 image payloads
  app.use(mongoSanitize());

  // ─── Rate Limiting ──────────────────────────────────────────────────────────
  // 20 requests per 15 minutes per IP on all write endpoints
  const postLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: "Too many requests. Please wait 15 minutes before trying again.",
    },
  });

  app.use("/api/cats", postLimiter);
  app.use("/api/auth", postLimiter);

  // ─── Routes ────────────────────────────────────────────────────────────────
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/cats", catsRouter);

  // POST /api/tnr/schedule — Trigger TNR workflow simulation
  app.post("/api/tnr/schedule", postLimiter, async (req, res): Promise<any> => {
    const { catId, scheduledDate, reporterEmail } = req.body;

    if (!catId || !scheduledDate || !reporterEmail) {
      return res.status(400).json({
        error: "Missing required fields: catId, scheduledDate, and reporterEmail are all required.",
      });
    }

    try {
      const workflowId = await startTnrWorkflowSimulated(
        catId,
        new Date(scheduledDate),
        reporterEmail
      );
      res.json({
        success: true,
        message: "TNR workflow successfully registered and scheduled!",
        workflowId,
      });
    } catch (err) {
      console.error("[TNR] Workflow scheduling failed:", err);
      res.status(500).json({ error: "TNR workflow scheduling failed" });
    }
  });

  // ─── Static / SPA Serving ──────────────────────────────────────────────────
  if (IS_PRODUCTION) {
    // In production (GCP Cloud Run), serve the pre-built Vite bundle
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("📦 Serving compiled static bundle for production.");
  } else {
    // In development, mount Vite's dev server as middleware (HMR, fast refresh)
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("🛠️  Vite dev server mounted as Express middleware.");
  }

  // ─── Listen ─────────────────────────────────────────────────────────────────
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`🌍 PawMap server running on http://localhost:${PORT}`);
    console.log(`   Mode:        ${IS_PRODUCTION ? "production" : "development"}`);
    console.log(`   Client URL:  ${CLIENT_URL}`);
  });
}

startServer();

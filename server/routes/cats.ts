import express, { Request, Response } from "express";
import { DB, ICat } from "../db.js";
import Groq from "groq-sdk";
import { GoogleGenAI } from "@google/genai";

const router = express.Router();

// Helper to extract base64 components
function parseBase64Image(dataUrl: string) {
  const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    return null;
  }
  return {
    mimeType: matches[1],
    base64Data: matches[2]
  };
}

// 1. GET /api/cats - Geolocational near query (5km limit)
router.get("/", async (req: Request, res: Response) => {
  const latStr = req.query.lat as string;
  const lngStr = req.query.lng as string;

  try {
    if (latStr && lngStr) {
      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);
      if (!isNaN(lat) && !isNaN(lng)) {
        // Return cats within 5km (5000m)
        const cats = await DB.findNear(lng, lat, 5000);
        return res.json(cats);
      }
    }
    // Fallback: return all cats
    const cats = await DB.findAll();
    res.json(cats);
  } catch (err) {
    console.error("Error retrieving cats:", err);
    res.status(500).json({ error: "Failed to fetch cats" });
  }
});

// 2. GET /api/cats/:id - Return a single cat with full history
router.get("/:id", async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
  try {
    const cat = await DB.findById(id);
    if (!cat) {
      return res.status(404).json({ error: "Cat profile not found" });
    }
    res.json(cat);
  } catch (err) {
    console.error(`Error retrieving cat ${id}:`, err);
    res.status(500).json({ error: "Failed to fetch cat profile" });
  }
});

// 3. POST /api/cats - Create cat and check for colony alert
router.post("/", async (req: Request, res: Response): Promise<any> => {
  const { lat, lng, count, condition, status, nickname, photoUrl } = req.body;

  if (lat === undefined || lng === undefined) {
    return res.status(400).json({ error: "Location coordinates (lat, lng) are required" });
  }

  try {
    const reporter = req.body.reporterEmail || "Anonymous Caregiver";
    
    // Setup initial history
    const initialHistory = [{
      action: `Initial sighting logged by ${reporter}. Condition: ${condition || 'unknown'}`,
      by: reporter,
      at: new Date()
    }];

    const catData: Partial<ICat> = {
      nickname: nickname || `Stray #${Math.floor(Math.random() * 9000 + 1000)}`,
      status: status || "sighting",
      count: parseInt(count) || 1,
      condition: condition || "unknown",
      photoUrl: photoUrl || "",
      location: {
        type: "Point",
        coordinates: [parseFloat(lng), parseFloat(lat)]
      },
      history: initialHistory,
      notes: [],
      volunteers: []
    };

    const newCat = await DB.create(catData);

    // Emit live Socket.io event for real-time map updates
    const io = req.app.get("io");
    if (io) {
      io.emit("pin:new", newCat);
    }

    // Colony Alert Check: Find within 200m in the last 7 days (including fallback checks)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const nearby = await DB.findNear(parseFloat(lng), parseFloat(lat), 200);
    
    // Filter nearby that were created in the last 7 days
    const recentNearby = nearby.filter(c => new Date(c.createdAt) >= sevenDaysAgo);

    if (recentNearby.length >= 3) {
      console.log(`[ALERT] Colony detected at [${lng}, ${lat}]! ${recentNearby.length} recent cats within 200m.`);
      return res.json({ ...newCat, colonyAlert: true });
    }

    res.json(newCat);
  } catch (err) {
    console.error("Error creating cat:", err);
    res.status(500).json({ error: "Failed to save cat profile" });
  }
});

// 4. PUT /api/cats/:id - Update status, notes, or volunteers
router.put("/:id", async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
  const { status, note, volunteer, tnrEvent } = req.body;

  try {
    const cat = await DB.findById(id);
    if (!cat) {
      return res.status(404).json({ error: "Cat profile not found" });
    }

    const updates: Partial<ICat> = {};
    const history = [...cat.history];

    // If updating status
    if (status && status !== cat.status) {
      updates.status = status;
      history.push({
        action: `Status updated from "${cat.status}" to "${status}"`,
        by: req.body.updatedBy || "Community Volunteer",
        at: new Date()
      });
    }

    // If adding a note
    if (note && note.text) {
      updates.notes = [...cat.notes, {
        text: note.text,
        by: note.by || "Anonymous Caregiver",
        at: new Date()
      }];
      history.push({
        action: `Added a new operational note`,
        by: note.by || "Anonymous Caregiver",
        at: new Date()
      });
    }

    // If registering a volunteer
    if (volunteer && volunteer.email) {
      // Check if already registered
      const exists = cat.volunteers.some(v => v.email.toLowerCase() === volunteer.email.toLowerCase());
      if (!exists) {
        updates.volunteers = [...cat.volunteers, {
          email: volunteer.email,
          role: volunteer.role || "feeder",
          joinedAt: new Date()
        }];
        history.push({
          action: `Registered volunteer ${volunteer.email} as ${volunteer.role || "feeder"}`,
          by: volunteer.email,
          at: new Date()
        });
      }
    }

    // If updating TNR event status
    if (tnrEvent) {
      updates.tnrEvent = {
        ...cat.tnrEvent,
        ...tnrEvent
      };
      history.push({
        action: `TNR Event updated: Status marked as ${tnrEvent.status}`,
        by: req.body.updatedBy || "System Engine",
        at: new Date()
      });
    }

    updates.history = history;

    const updatedCat = await DB.update(id, updates);

    // Emit live Socket.io event
    const io = req.app.get("io");
    if (io && updatedCat) {
      io.emit("pin:updated", updatedCat);
    }

    res.json(updatedCat);
  } catch (err) {
    console.error(`Error updating cat ${id}:`, err);
    res.status(500).json({ error: "Failed to update cat profile" });
  }
});

// 5. POST /api/cats/analyze-photo - Vision AI auto-tagging
router.post("/analyze-photo", async (req: Request, res: Response): Promise<any> => {
  const { imageBase64 } = req.body; // base64 data URL
  
  if (!imageBase64) {
    return res.status(400).json({ error: "Image base64 is required" });
  }

  const promptText = "Analyze this cat photo and return JSON only with these fields: age (kitten/young/adult/senior), coatPattern (tabby/calico/solid/tuxedo/other), visibleInjuries (yes/no/unsure), earTip (yes/no/unsure). No explanation, JSON only.";

  // Method A: Try Groq Vision API
  if (process.env.GROQ_API_KEY) {
    try {
      console.log("[AI Vision] Attempting analysis using Groq llama-3.2-90b-vision-preview...");
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      
      const response = await groq.chat.completions.create({
        model: 'llama-3.2-90b-vision-preview',
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: imageBase64 }
            },
            {
              type: 'text',
              text: promptText
            }
          ]
        }],
        max_tokens: 200
      });

      const text = response.choices[0]?.message?.content || "{}";
      const cleanedJson = text.substring(text.indexOf("{"), text.lastIndexOf("}") + 1);
      const result = JSON.parse(cleanedJson);
      console.log("[AI Vision] Groq analysis successful:", result);
      return res.json(result);
    } catch (err) {
      console.error("[AI Vision] Groq API encountered an error, trying Gemini fallback:", err);
    }
  }

  // Method B: Fallback to Google's built-in Gemini API on server side
  if (process.env.GEMINI_API_KEY) {
    try {
      console.log("[AI Vision] Utilizing Google Gemini 3.5 Fallback for zero-config analysis...");
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const base64Data = parseBase64Image(imageBase64);
      if (!base64Data) {
        return res.status(400).json({ error: "Invalid base64 image encoding" });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: [
          {
            inlineData: {
              mimeType: base64Data.mimeType,
              data: base64Data.base64Data
            }
          },
          promptText
        ],
        config: {
          responseMimeType: "application/json"
        }
      });

      const text = response.text || "{}";
      const result = JSON.parse(text);
      console.log("[AI Vision] Gemini fallback analysis successful:", result);
      return res.json(result);
    } catch (err) {
      console.error("[AI Vision] Gemini fallback also failed:", err);
    }
  }

  // Silent fallback: If both APIs fail/are missing, fail gracefully and return empty object
  console.log("[AI Vision] No Groq or Gemini API keys configured or both failed. Returning default empty metadata.");
  res.json({});
});

export default router;

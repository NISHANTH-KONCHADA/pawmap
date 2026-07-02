import mongoose from "mongoose";
import fs from "fs";
import path from "path";

// Haversine formula to compute distance in meters
export function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // meters
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const deltaPhi = (lat2 - lat1) * Math.PI / 180;
  const deltaLambda = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in meters
}

// Interfaces
export interface ICat {
  _id: string;
  location: {
    type: string;
    coordinates: [number, number]; // [lng, lat]
  };
  status: "sighting" | "colony" | "tnr" | "adopted";
  count: number;
  nickname: string;
  condition: "healthy" | "injured" | "kitten" | "unknown";
  photoUrl: string;
  history: Array<{
    action: string;
    by: string;
    at: Date;
  }>;
  notes: Array<{
    text: string;
    by: string;
    at: Date;
  }>;
  volunteers: Array<{
    email: string;
    role: "feeder" | "tnr" | "foster";
    joinedAt: Date;
  }>;
  tnrEvent?: {
    scheduledDate: Date;
    status: "scheduled" | "completed" | "rescheduled" | "cancelled";
    temporalWorkflowId: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// 1. Mongoose Schema Setup
const catSchema = new mongoose.Schema({
  location: {
    type: { type: String, default: 'Point' },
    coordinates: { type: [Number], required: true } // [lng, lat]
  },
  status: {
    type: String,
    enum: ['sighting', 'colony', 'tnr', 'adopted'],
    default: 'sighting'
  },
  count: { type: Number, default: 1 },
  nickname: { type: String, maxlength: 60 },
  condition: {
    type: String,
    enum: ['healthy', 'injured', 'kitten', 'unknown']
  },
  photoUrl: String,
  history: [{
    action: { type: String, required: true },
    by: { type: String, required: true },
    at: { type: Date, default: Date.now }
  }],
  notes: [{
    text: { type: String, maxlength: 500 },
    by: { type: String, required: true },
    at: { type: Date, default: Date.now }
  }],
  volunteers: [{
    email: { type: String, required: true },
    role: { type: String, enum: ['feeder', 'tnr', 'foster'] },
    joinedAt: { type: Date, default: Date.now }
  }],
  tnrEvent: {
    scheduledDate: Date,
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'rescheduled', 'cancelled']
    },
    temporalWorkflowId: String
  }
}, { timestamps: true });

catSchema.index({ location: '2dsphere' });

export const MongooseCatModel = mongoose.models.Cat || mongoose.model('Cat', catSchema);

// 2. JSON/In-memory Fallback Database Engine
const DB_FILE_PATH = path.join(process.cwd(), "db.json");

// Default fallback coordinates (central London) when no location is provided
const DEFAULT_LAT = 51.505;
const DEFAULT_LNG = -0.09;

class JSONDatabase {
  private cats: ICat[] = [];
  private isLoaded = false;

  constructor() {
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(DB_FILE_PATH)) {
        const raw = fs.readFileSync(DB_FILE_PATH, "utf8");
        this.cats = JSON.parse(raw);
        // Parse dates
        this.cats.forEach(cat => {
          if (cat.createdAt) cat.createdAt = new Date(cat.createdAt);
          if (cat.updatedAt) cat.updatedAt = new Date(cat.updatedAt);
          cat.history.forEach(h => h.at = new Date(h.at));
          cat.notes.forEach(n => n.at = new Date(n.at));
          cat.volunteers.forEach(v => v.joinedAt = new Date(v.joinedAt));
          if (cat.tnrEvent?.scheduledDate) {
            cat.tnrEvent.scheduledDate = new Date(cat.tnrEvent.scheduledDate);
          }
        });
        console.log(`[JSON DB] Loaded ${this.cats.length} cats from ${DB_FILE_PATH}`);
      } else {
        console.log("[JSON DB] No db file found. Starting with empty database.");
        this.seed();
      }
      this.isLoaded = true;
    } catch (e) {
      console.error("[JSON DB] Error loading db file:", e);
      this.seed();
    }
  }

  private seed() {
    // Start with a clean empty database — no fake/hardcoded data.
    // Real cat sightings come from user reports.
    this.cats = [];
    this.save();
  }

  private save() {
    try {
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(this.cats, null, 2), "utf8");
    } catch (e) {
      console.error("[JSON DB] Error writing db file:", e);
    }
  }

  public async findNear(lng: number, lat: number, maxDistanceMeters: number): Promise<ICat[]> {
    return this.cats
      .map(cat => {
        const [catLng, catLat] = cat.location.coordinates;
        const dist = getDistance(lat, lng, catLat, catLng);
        return { cat, dist };
      })
      .filter(item => item.dist <= maxDistanceMeters)
      // Sort by proximity
      .sort((a, b) => a.dist - b.dist)
      .map(item => item.cat);
  }

  public async findAll(): Promise<ICat[]> {
    return this.cats;
  }

  public async findById(id: string): Promise<ICat | null> {
    const cat = this.cats.find(c => c._id === id);
    return cat ? { ...cat } : null;
  }

  public async create(data: Partial<ICat>): Promise<ICat> {
    const newCat: ICat = {
      _id: `cat_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      location: {
        type: data.location?.type || 'Point',
        coordinates: data.location?.coordinates || [DEFAULT_LNG, DEFAULT_LAT]
      },
      status: data.status || 'sighting',
      count: data.count || 1,
      nickname: data.nickname || 'Unknown Cat',
      condition: data.condition || 'unknown',
      photoUrl: data.photoUrl || '',
      history: data.history || [],
      notes: data.notes || [],
      volunteers: data.volunteers || [],
      tnrEvent: data.tnrEvent,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.cats.push(newCat);
    this.save();
    return newCat;
  }

  public async update(id: string, data: Partial<ICat>): Promise<ICat | null> {
    const idx = this.cats.findIndex(c => c._id === id);
    if (idx === -1) return null;

    const current = this.cats[idx];
    const updated: ICat = {
      ...current,
      ...data,
      // Deep merge nested items if necessary, or let assignment handle it
      history: data.history || current.history,
      notes: data.notes || current.notes,
      volunteers: data.volunteers || current.volunteers,
      tnrEvent: data.tnrEvent || current.tnrEvent,
      updatedAt: new Date()
    };
    this.cats[idx] = updated;
    this.save();
    return updated;
  }
}

export const jsonDb = new JSONDatabase();

// 3. Unified DB Handler
let useMongoDB = false;

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log("⚠️ MONGODB_URI is not defined. Falling back to robust JSON-file database.");
    useMongoDB = false;
    return;
  }

  try {
    // Add brief timeout for quick failover
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000
    });
    console.log("🚀 Connected to MongoDB Atlas successfully!");
    useMongoDB = true;
  } catch (error) {
    console.error("⚠️ Failed to connect to MongoDB Atlas. Falling back to local JSON-file database.", error);
    useMongoDB = false;
  }
}

// Unified db operations
export const DB = {
  isMongo: () => useMongoDB,

  findNear: async (lng: number, lat: number, maxDistanceMeters: number): Promise<ICat[]> => {
    if (useMongoDB) {
      try {
        const results = await (MongooseCatModel as any).find({
          location: {
            $near: {
              $geometry: { type: 'Point', coordinates: [lng, lat] },
              $maxDistance: maxDistanceMeters
            }
          }
        }).lean();
        return results as unknown as ICat[];
      } catch (err) {
        console.error("MongoDB near query failed. Falling back to JSON DB.", err);
        return jsonDb.findNear(lng, lat, maxDistanceMeters);
      }
    }
    return jsonDb.findNear(lng, lat, maxDistanceMeters);
  },

  findAll: async (): Promise<ICat[]> => {
    if (useMongoDB) {
      try {
        return await (MongooseCatModel as any).find({}).lean() as unknown as ICat[];
      } catch (err) {
        console.error("MongoDB findAll failed. Falling back.", err);
        return jsonDb.findAll();
      }
    }
    return jsonDb.findAll();
  },

  findById: async (id: string): Promise<ICat | null> => {
    if (useMongoDB && !id.startsWith("cat_")) {
      try {
        return await (MongooseCatModel as any).findById(id).lean() as unknown as ICat;
      } catch (err) {
        console.error("MongoDB findById failed, falling back.", err);
        return jsonDb.findById(id);
      }
    }
    return jsonDb.findById(id);
  },

  create: async (data: Partial<ICat>): Promise<ICat> => {
    if (useMongoDB) {
      try {
        const doc = await (MongooseCatModel as any).create(data);
        return doc.toObject() as unknown as ICat;
      } catch (err) {
        console.error("MongoDB create failed, falling back.", err);
        return jsonDb.create(data);
      }
    }
    return jsonDb.create(data);
  },

  update: async (id: string, data: Partial<ICat>): Promise<ICat | null> => {
    if (useMongoDB && !id.startsWith("cat_")) {
      try {
        const doc = await (MongooseCatModel as any).findByIdAndUpdate(id, data, { new: true }).lean();
        return doc as unknown as ICat;
      } catch (err) {
        console.error("MongoDB update failed, falling back.", err);
        return jsonDb.update(id, data);
      }
    }
    return jsonDb.update(id, data);
  }
};

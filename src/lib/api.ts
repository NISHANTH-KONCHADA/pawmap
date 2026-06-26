import { ICat } from "../../server/db.js";

const API_BASE = "/api";

export const API = {
  // 1. Fetch cats (optionally near coordinates)
  getCats: async (lat?: number, lng?: number): Promise<ICat[]> => {
    let url = `${API_BASE}/cats`;
    if (lat !== undefined && lng !== undefined) {
      url += `?lat=${lat}&lng=${lng}`;
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch cats");
    return res.json();
  },

  // 2. Fetch a single cat profile with full history
  getCat: async (id: string): Promise<ICat> => {
    const res = await fetch(`${API_BASE}/cats/${id}`);
    if (!res.ok) throw new Error("Failed to fetch cat details");
    return res.json();
  },

  // 3. Create a new cat sighting / colony
  createCat: async (data: {
    lat: number;
    lng: number;
    count: number;
    condition: string;
    status: string;
    nickname: string;
    photoUrl?: string;
    reporterEmail: string;
  }): Promise<ICat & { colonyAlert?: boolean }> => {
    const res = await fetch(`${API_BASE}/cats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to log cat sighting");
    }
    return res.json();
  },

  // 4. Update cat status / add note / join as volunteer
  updateCat: async (
    id: string,
    updates: {
      status?: string;
      note?: { text: string; by: string };
      volunteer?: { email: string; role: "feeder" | "tnr" | "foster" };
      updatedBy?: string;
    }
  ): Promise<ICat> => {
    const res = await fetch(`${API_BASE}/cats/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to update cat profile");
    }
    return res.json();
  },

  // 5. Submit photo for vision AI analysis
  analyzePhoto: async (imageBase64: string): Promise<{
    age?: "kitten" | "young" | "adult" | "senior";
    coatPattern?: "tabby" | "calico" | "solid" | "tuxedo" | "other";
    visibleInjuries?: "yes" | "no" | "unsure";
    earTip?: "yes" | "no" | "unsure";
  }> => {
    const res = await fetch(`${API_BASE}/cats/analyze-photo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64 }),
    });
    if (!res.ok) throw new Error("Failed to analyze photo");
    return res.json();
  },

  // 6. Request magic login email
  requestMagicLink: async (email: string): Promise<{ success: boolean; message: string; token?: string }> => {
    const res = await fetch(`${API_BASE}/auth/magic-link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to request login link");
    }
    return res.json();
  },

  // 7. Verify magic token
  verifyMagicLink: async (token: string): Promise<{ success: boolean; user: { email: string } }> => {
    const res = await fetch(`${API_BASE}/auth/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Login link is invalid or expired");
    }
    return res.json();
  },

  // 8. Schedule Temporal TNR Workflow
  scheduleTnr: async (
    catId: string,
    scheduledDate: Date | string,
    reporterEmail: string
  ): Promise<{ success: boolean; workflowId: string }> => {
    const res = await fetch(`${API_BASE}/tnr/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ catId, scheduledDate, reporterEmail }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to schedule TNR workflow");
    }
    return res.json();
  }
};

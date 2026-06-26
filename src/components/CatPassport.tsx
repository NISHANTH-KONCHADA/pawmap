import React, { useEffect, useState } from "react";
import { ICat } from "../../server/db.js";
import { API } from "../lib/api.js";
import { MapPin, Calendar, Heart, ShieldAlert, Share2, Clipboard, ChevronLeft, Activity, Info } from "lucide-react";

interface CatPassportProps {
  catId: string;
  onBack: () => void;
}

export default function CatPassport({ catId, onBack }: CatPassportProps) {
  const [cat, setCat] = useState<ICat | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Fetch Cat Profile
  useEffect(() => {
    const fetchCat = async () => {
      try {
        setLoading(true);
        const data = await API.getCat(catId);
        setCat(data);
      } catch (err) {
        console.error("Failed to load cat details:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCat();
  }, [catId]);

  // Inject Open Graph tags for WhatsApp/Twitter dynamic previews
  useEffect(() => {
    if (cat) {
      document.title = `${cat.nickname}'s Journey 🐾 — PawMap Paw-sport`;

      const updateMetaTag = (property: string, content: string) => {
        let meta = document.querySelector(`meta[property="${property}"]`);
        if (!meta) {
          meta = document.createElement("meta");
          meta.setAttribute("property", property);
          document.head.appendChild(meta);
        }
        meta.setAttribute("content", content);
      };

      updateMetaTag("og:title", `${cat.nickname}'s Journey 🐾`);
      updateMetaTag("og:description", `Follow ${cat.nickname}'s recovery and community care timeline on PawMap.`);
      if (cat.photoUrl) {
        updateMetaTag("og:image", cat.photoUrl);
      }
    }
  }, [cat]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF6F0] flex flex-col items-center justify-center p-6 text-center" id="passport-loading">
        <div className="w-10 h-10 border-4 border-forest border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-mist font-semibold mt-3 animate-pulse">Consulting digital feline archives...</p>
      </div>
    );
  }

  if (!cat) {
    return (
      <div className="min-h-screen bg-[#FAF6F0] flex flex-col items-center justify-center p-6 text-center" id="passport-error">
        <span className="text-4xl mb-2">😿</span>
        <h2 className="text-lg font-display font-bold text-ink">Cat Paw-sport Not Found</h2>
        <p className="text-xs text-mist max-w-xs mt-1">This ID may be invalid, or the profile has been merged into a colony.</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-forest text-white text-xs font-display font-bold rounded-lg hover:bg-forest/90 transition-all cursor-pointer"
        >
          Return to Hub Map
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF6F0] py-8 px-4" id={`cat-passport-${cat._id}`}>
      <div className="max-w-md mx-auto space-y-6">
        {/* Navigation / Header */}
        <div className="flex justify-between items-center bg-white p-3 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-parchment">
          <button
            id="passport-btn-back"
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-display font-bold text-forest hover:text-moss cursor-pointer"
          >
            <ChevronLeft className="w-4.5 h-4.5" /> Back to Map
          </button>
          <span className="text-xs font-mono font-bold text-clay tracking-wide">PAWMAP CARE SYSTEM</span>
        </div>

        {/* Hero Card */}
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-parchment p-5 space-y-4 relative overflow-hidden">
          {cat.photoUrl ? (
            <img
              src={cat.photoUrl}
              alt={cat.nickname}
              className="w-full h-48 object-cover rounded-xl border border-parchment shadow-xs"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=600";
              }}
            />
          ) : (
            <div className="w-full h-36 bg-dusk flex flex-col items-center justify-center rounded-xl border border-dashed border-parchment p-4">
              <span className="text-4xl">🐱</span>
              <p className="text-[10px] text-mist font-semibold mt-1">Sighted without photo reference</p>
            </div>
          )}

          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-xl font-display font-bold text-forest tracking-tight">
                {cat.nickname}
              </h1>
              <p className="text-xs text-mist font-medium mt-1 flex items-center gap-1">
                <MapPin className="w-4 h-4 text-clay" /> Sighting coordinates: [{cat.location.coordinates[1].toFixed(5)}, {cat.location.coordinates[0].toFixed(5)}]
              </p>
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
              cat.status === "adopted"
                ? "bg-sage/10 text-sage border-sage/20 font-bold"
                : cat.status === "tnr"
                ? "bg-sky/10 text-sky border-sky/20"
                : cat.status === "colony"
                ? "bg-lavender/10 text-lavender border-lavender/20"
                : "bg-clay/10 text-clay border-clay/20"
            }`}>
              {cat.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-parchment text-xs font-medium text-mist">
            <div className="bg-dusk/50 p-2 rounded-lg border border-parchment/30 text-left">
              Medical Condition:
              <strong className="text-ink block capitalize">{cat.condition}</strong>
            </div>
            <div className="bg-dusk/50 p-2 rounded-lg border border-parchment/30 text-left">
              Stray Headcount:
              <strong className="text-ink block">{cat.count || 1} cats</strong>
            </div>
          </div>
        </div>

        {/* History Audit Log */}
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-parchment p-5 text-left space-y-4">
          <h2 className="text-sm font-display font-bold text-ink flex items-center gap-1.5 uppercase tracking-wider">
            <Activity className="w-4.5 h-4.5 text-clay" /> Journey Sighting Timeline
          </h2>
          
          <div className="border-l border-parchment pl-4 ml-2 space-y-4 relative">
            {cat.history.map((h, i) => (
              <div key={i} className="relative">
                {/* Timeline node */}
                <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-clay border border-white" />
                <p className="text-xs text-ink/90 font-medium leading-relaxed">{h.action}</p>
                <div className="flex justify-between items-center text-[9px] text-mist font-mono mt-0.5">
                  <span>Logged by @{h.by.split("@")[0]}</span>
                  <span>{new Date(h.at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Share Button Drawer */}
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-parchment p-4 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="text-center sm:text-left">
            <h3 className="text-xs font-display font-bold text-ink">Help Spread Stray Awareness</h3>
            <p className="text-[10px] text-mist mt-0.5">Share this Paw-sport link to coordinate care or search for adoptable homes.</p>
          </div>
          <button
            id="passport-btn-share"
            onClick={handleShare}
            className={`py-2 px-4 rounded-lg text-xs font-display font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
              copied
                ? "bg-sage text-white"
                : "bg-forest hover:bg-forest/90 text-white"
            }`}
          >
            {copied ? (
              <>
                <Clipboard className="w-4 h-4" /> Copied Link!
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" /> Share Paw-sport
              </>
            )}
          </button>
        </div>

        {/* Standalone footer */}
        <div className="text-center text-[10px] text-mist flex items-center justify-center gap-2">
          <Info className="w-3.5 h-3.5 shrink-0 text-moss" />
          <span>PawMap community network. Keeping urban felines safe, sterilized, and fed.</span>
        </div>
      </div>
    </div>
  );
}

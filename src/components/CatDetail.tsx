import React, { useState } from "react";
import { ICat } from "../../server/db.js";
import { API } from "../lib/api.js";
import { motion } from "motion/react";
import confetti from "canvas-confetti";
import { X, Calendar, MapPin, Sparkles, Send, ShieldCheck, Heart, UserPlus, FileText, CheckCircle, Clock } from "lucide-react";

interface CatDetailProps {
  catId: string;
  onClose: () => void;
  userEmail: string | null;
  onCatUpdated: (cat: ICat) => void;
}

export default function CatDetail({ catId, onClose, userEmail, onCatUpdated }: CatDetailProps) {
  const [cat, setCat] = useState<ICat | null>(null);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);
  const [joiningVolunteer, setJoiningVolunteer] = useState(false);
  const [schedulingTnr, setSchedulingTnr] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // TNR Sched Form
  const [tnrDate, setTnrDate] = useState("");
  const [showTnrForm, setShowTnrForm] = useState(false);

  // Fetch Cat Profile
  React.useEffect(() => {
    let active = true;
    const fetchCat = async () => {
      try {
        setLoading(true);
        const data = await API.getCat(catId);
        if (active) {
          setCat(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchCat();
    return () => { active = false; };
  }, [catId]);

  if (loading) {
    return (
      <div className="absolute right-0 top-0 h-full w-full md:w-96 bg-white border-l border-parchment shadow-xl flex items-center justify-center p-6 z-[450]" id="cat-detail-loading">
        <div className="text-center space-y-2">
          <Clock className="w-8 h-8 text-forest animate-spin mx-auto" />
          <p className="text-xs text-mist font-medium">Retrieving cat paw-sport details...</p>
        </div>
      </div>
    );
  }

  if (!cat) {
    return (
      <div className="absolute right-0 top-0 h-full w-full md:w-96 bg-white border-l border-parchment shadow-xl p-6 z-[450]" id="cat-detail-error">
        <button onClick={onClose} className="absolute top-4 left-4 text-mist hover:text-ink">
          <X className="w-5 h-5" />
        </button>
        <div className="text-center mt-20 space-y-2">
          <p className="text-sm font-semibold text-ink">Cat paw-sport not found</p>
          <p className="text-xs text-mist">It may have been merged or removed.</p>
        </div>
      </div>
    );
  }

  // Handle Note Submission
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    setSubmittingNote(true);
    try {
      const updated = await API.updateCat(cat._id, {
        note: {
          text: noteText,
          by: userEmail || "Anonymous Caregiver"
        },
        updatedBy: userEmail || "Anonymous Caregiver"
      });
      setCat(updated);
      onCatUpdated(updated);
      setNoteText("");
    } catch (err) {
      console.error(err);
      alert("Failed to submit note");
    } finally {
      setSubmittingNote(false);
    }
  };

  // Handle Joining as Volunteer
  const handleJoinVolunteer = async (role: "feeder" | "tnr" | "foster") => {
    if (!userEmail) {
      alert("Please join the portal using your email first to volunteer!");
      return;
    }

    setJoiningVolunteer(true);
    try {
      const updated = await API.updateCat(cat._id, {
        volunteer: {
          email: userEmail,
          role
        },
        updatedBy: userEmail
      });
      setCat(updated);
      onCatUpdated(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setJoiningVolunteer(false);
    }
  };

  // Trigger TNR Schedule Workflow via simulated Temporal
  const handleScheduleTnr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tnrDate) return;

    setSchedulingTnr(true);
    try {
      await API.scheduleTnr(cat._id, tnrDate, userEmail || "coordinator@pawmap.org");
      
      // Fetch fresh details from DB after workflow triggers updates
      const updated = await API.getCat(cat._id);
      setCat(updated);
      onCatUpdated(updated);
      setShowTnrForm(false);
      alert("🎉 TNR Workflow Triggered! Local trapping volunteers have been emailed.");
    } catch (err) {
      console.error(err);
      alert("Failed to trigger TNR scheduling");
    } finally {
      setSchedulingTnr(false);
    }
  };

  // Mark Cat as Adopted
  const handleAdopt = async () => {
    try {
      const updated = await API.updateCat(cat._id, {
        status: "adopted",
        updatedBy: userEmail || "Loving Adoptive Home"
      });
      setCat(updated);
      onCatUpdated(updated);

      // Canvas Confetti Celebration!
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#0D5C4A', '#D85A30', '#7F77DD', '#639922'],
        scalar: 1.2
      });

      // Show native alert / toast
      setTimeout(() => {
        alert(`${cat.nickname} found a home! 🐾`);
      }, 300);
    } catch (err) {
      console.error(err);
    }
  };

  const alreadyVolunteered = userEmail && cat.volunteers.some(v => v.email.toLowerCase() === userEmail.toLowerCase());

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="absolute right-0 top-0 h-full w-full md:w-96 bg-[#FAF6F0] border-l border-parchment shadow-2xl flex flex-col z-[450]"
      id={`cat-detail-${cat._id}`}
    >
      {/* Detail Header */}
      <div className="p-4 bg-white border-b border-parchment flex justify-between items-center shrink-0">
        <button
          id="cat-detail-close"
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-dusk text-mist hover:text-ink transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
        <span className="font-display font-bold text-xs text-mist">CAT CARE PAW-SPORT</span>
        <button
          id="btn-share-cat"
          onClick={() => {
            const shareUrl = `${window.location.origin}/cat/${cat._id}`;
            navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="text-xs text-forest hover:text-moss font-semibold transition-all cursor-pointer min-w-[70px] text-right"
        >
          {copied ? "Copied! 🐾" : "Share"}
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 pb-12 space-y-6">
        {/* Cat Card Meta */}
        <div className="p-4 bg-white border border-parchment rounded-2xl shadow-sm space-y-3 relative overflow-hidden">
          {cat.photoUrl ? (
            <img
              src={cat.photoUrl}
              alt={cat.nickname}
              className="w-full h-40 object-cover rounded-xl border border-parchment"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=600";
              }}
            />
          ) : (
            <div className="w-full h-32 bg-dusk/60 rounded-xl border border-dashed border-parchment flex flex-col items-center justify-center p-4">
              <span className="text-3xl">🐱</span>
              <p className="text-[10px] text-mist font-medium mt-1">No photo uploaded yet</p>
            </div>
          )}

          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-display font-bold text-forest leading-tight truncate max-w-[200px]" title={cat.nickname}>
                {cat.nickname}
              </h2>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-mist font-medium">
                <MapPin className="w-3.5 h-3.5 text-clay" /> Lat: {cat.location.coordinates[1].toFixed(4)}, Lng: {cat.location.coordinates[0].toFixed(4)}
              </div>
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border shrink-0 ${
              cat.status === "adopted"
                ? "bg-sage/10 text-sage border-sage/20 animate-bounce"
                : cat.status === "tnr"
                ? "bg-sky/10 text-sky border-sky/20"
                : cat.status === "colony"
                ? "bg-lavender/10 text-lavender border-lavender/20"
                : "bg-clay/10 text-clay border-clay/20"
            }`}>
              {cat.status.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-parchment/60 text-xs font-medium text-mist">
            <div className="bg-dusk/50 p-2 rounded-lg border border-parchment/30">
              Condition: <strong className="text-ink block capitalize">{cat.condition}</strong>
            </div>
            <div className="bg-dusk/50 p-2 rounded-lg border border-parchment/30">
              Census count: <strong className="text-ink block">{cat.count || 1} cats</strong>
            </div>
          </div>
        </div>

        {/* Action Buttons Hub */}
        <div className="space-y-2">
          {cat.status !== "adopted" && (
            <button
              id="btn-adopt-trigger"
              onClick={handleAdopt}
              className="w-full py-2.5 bg-sage hover:bg-sage/90 text-white text-xs font-display font-bold rounded-lg flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-all"
            >
              <Heart className="w-4 h-4 fill-current" /> Mark as Adopted! 🏡
            </button>
          )}

          <div className="grid grid-cols-2 gap-2">
            {!alreadyVolunteered && cat.status !== "adopted" ? (
              <button
                id="btn-volunteer-feed"
                onClick={() => handleJoinVolunteer("feeder")}
                className="py-2 px-3 bg-white hover:bg-parchment text-forest border border-forest/20 text-xs font-display font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <UserPlus className="w-4 h-4" /> Feed Here
              </button>
            ) : (
              <div className="py-2 px-3 bg-forest/10 border border-forest/20 rounded-lg text-forest text-xs font-display font-bold text-center flex items-center justify-center gap-1">
                <ShieldCheck className="w-4 h-4" /> Feeder
              </div>
            )}

            {cat.status !== "adopted" && cat.status !== "tnr" && (
              <button
                id="btn-tnr-trigger"
                onClick={() => setShowTnrForm(!showTnrForm)}
                className="py-2 px-3 bg-white hover:bg-parchment text-sky border border-sky/20 text-xs font-display font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <Calendar className="w-4 h-4" /> Setup TNR
              </button>
            )}
          </div>
        </div>

        {/* TNR Scheduling Sheet (Temporal Trigger) */}
        {showTnrForm && (
          <form onSubmit={handleScheduleTnr} className="p-4 bg-white border border-sky/20 rounded-2xl shadow-md space-y-3">
            <h4 className="text-xs font-display font-bold text-sky uppercase tracking-wider flex items-center gap-1">
              🚀 Schedule Temporal TNR
            </h4>
            <p className="text-[10px] text-mist leading-relaxed">
              We boot a localized Temporal Workflow tracking trapping, pre-surgery reminders, outcome checklists, and automated notification dispatches to trapping volunteers.
            </p>
            <div>
              <label className="text-[9px] font-mono text-mist uppercase block mb-1">Target Trapping Date</label>
              <input
                type="datetime-local"
                required
                value={tnrDate}
                onChange={(e) => setTnrDate(e.target.value)}
                className="w-full p-2 bg-dusk/30 border border-parchment rounded-lg text-xs font-medium focus:outline-none focus:border-sky focus:bg-white"
              />
            </div>
            <button
              id="btn-tnr-submit"
              type="submit"
              disabled={schedulingTnr}
              className="w-full py-2 bg-sky hover:bg-sky/90 text-white text-xs font-display font-bold rounded-lg flex items-center justify-center gap-1 cursor-pointer"
            >
              Launch Workflow 🏥
            </button>
          </form>
        )}

        {/* Volunteers Circle */}
        <div>
          <h3 className="text-xs font-display font-bold text-ink uppercase tracking-wider mb-2 flex items-center gap-1">
            👥 Volunteers Registered ({cat.volunteers.length})
          </h3>
          {cat.volunteers.length === 0 ? (
            <p className="text-[11px] text-mist italic bg-white p-2 rounded-xl border border-parchment">No caregivers registered here yet. Click 'Feed Here' to join!</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {cat.volunteers.map((v, i) => (
                <span key={i} className="text-[10px] font-medium bg-parchment text-ink px-2 py-1 rounded-lg border border-parchment flex items-center gap-1">
                  🐾 {v.email.split("@")[0]} ({v.role})
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Operational Care Notes Thread */}
        <div className="space-y-3">
          <h3 className="text-xs font-display font-bold text-ink uppercase tracking-wider flex items-center gap-1">
            <FileText className="w-4 h-4 text-forest" /> Operational Care Logs
          </h3>

          {/* Notes list */}
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {cat.notes.length === 0 ? (
              <p className="text-[11px] text-mist italic bg-white p-2.5 rounded-xl border border-parchment">No operational logs added yet.</p>
            ) : (
              cat.notes.map((n, idx) => (
                <div key={idx} className="p-2.5 bg-white border border-parchment rounded-xl shadow-xs text-left">
                  <p className="text-xs text-ink leading-relaxed">{n.text}</p>
                  <div className="mt-1 flex justify-between items-center text-[9px] text-mist font-mono">
                    <span>@{n.by.split("@")[0]}</span>
                    <span>{new Date(n.at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Add note input */}
          <form onSubmit={handleAddNote} className="flex gap-2">
            <input
              id="input-add-note"
              type="text"
              maxLength={500}
              placeholder="Add care/feeding log notes..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="flex-1 p-2 bg-white border border-parchment rounded-lg text-xs font-medium focus:outline-none focus:border-forest"
            />
            <button
              id="btn-add-note"
              type="submit"
              disabled={submittingNote}
              className="p-2 bg-forest hover:bg-forest/90 disabled:bg-forest/50 text-white rounded-lg transition-all cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* History / Audit Log */}
        <div>
          <h3 className="text-xs font-display font-bold text-ink uppercase tracking-wider mb-3 flex items-center gap-1">
            <Sparkles className="w-4 h-4 text-clay" /> Sighting Timeline History
          </h3>
          <div className="border-l border-parchment pl-4 ml-2 space-y-4 text-left relative">
            {cat.history.map((h, i) => (
              <div key={i} className="relative">
                {/* Timeline node */}
                <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-clay border border-white" />
                <p className="text-xs text-ink/90 font-medium">{h.action}</p>
                <div className="flex justify-between items-center text-[9px] text-mist font-mono mt-0.5">
                  <span>Logged by @{h.by.split("@")[0]}</span>
                  <span>{new Date(h.at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

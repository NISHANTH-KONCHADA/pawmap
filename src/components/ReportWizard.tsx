import React, { useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { motion, AnimatePresence } from "motion/react";
import { API } from "../lib/api.js";
import { Camera, MapPin, Sparkles, Loader2, ArrowRight, ArrowLeft, Send, CheckCircle, ShieldAlert } from "lucide-react";

// Default Leaflet icon setup
const defaultIcon = L.icon({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

// Fixed LocationPicker — do not change this
function LocationPicker({ position, setPosition }: { position: any, setPosition: any }) {
  useMapEvents({
    click(e) {
      setPosition({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });

  if (!position) return null;

  return (
    <Marker
      draggable={true}
      position={[position.lat, position.lng]}
      eventHandlers={{
        dragend(e) {
          setPosition({
            lat: e.target.getLatLng().lat,
            lng: e.target.getLatLng().lng,
          });
        },
      }}
      icon={defaultIcon}
    />
  );
}

interface ReportWizardProps {
  onClose: () => void;
  userLocation: [number, number] | null;
  onSightingCreated: (cat: any) => void;
}

export default function ReportWizard({ onClose, userLocation, onSightingCreated }: ReportWizardProps) {
  const [step, setStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiFilled, setAiFilled] = useState(false);
  const [colonyAlertCat, setColonyAlertCat] = useState<any | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    location: userLocation ? { lat: userLocation[0], lng: userLocation[1] } : { lat: 51.505, lng: -0.09 },
    photoBase64: "",
    condition: "unknown", // 'healthy' | 'injured' | 'kitten' | 'unknown'
    needs: "sighting",    // 'sighting' | 'colony' | 'tnr'
    nickname: "",
    count: 1,
    email: localStorage.getItem("pawmap_user_email") || "",
    aiMetadata: null as any
  });

  // Fixed MapContainer center ref — never changes during state update
  const initialCenter = useRef<[number, number]>(
    formData.location
      ? [formData.location.lat, formData.location.lng]
      : [51.505, -0.09]
  );

  // File Upload Handler with AI trigger
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      setFormData(prev => ({ ...prev, photoBase64: base64String }));
      
      // Fire AI Analysis
      setIsAnalyzing(true);
      try {
        const aiResult = await API.analyzePhoto(base64String);
        if (aiResult && Object.keys(aiResult).length > 0) {
          let conditionToSet = "unknown";
          if (aiResult.visibleInjuries === "yes") {
            conditionToSet = "injured";
          } else if (aiResult.age === "kitten") {
            conditionToSet = "kitten";
          } else if (aiResult.visibleInjuries === "no") {
            conditionToSet = "healthy";
          }

          setFormData(prev => ({
            ...prev,
            condition: conditionToSet,
            aiMetadata: aiResult
          }));
          setAiFilled(true);
        }
      } catch (err) {
        console.error("AI photo analysis failed", err);
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleNext = () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(25); // Subtle tap feedback
    }
    if (step < 4) setStep(prev => prev + 1);
  };

  const handleBack = () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(15); // Shorter tap feedback
    }
    if (step > 1) setStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (!formData.email) {
      alert("Please provide an email to submit a sighting.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        lat: formData.location.lat,
        lng: formData.location.lng,
        count: formData.needs === "colony" ? formData.count || 5 : 1,
        condition: formData.condition,
        status: formData.needs === "tnr" ? "tnr" : formData.needs === "colony" ? "colony" : "sighting",
        nickname: formData.nickname || `Stray #${Math.floor(Math.random() * 9000 + 1000)}`,
        photoUrl: formData.photoBase64 || "",
        reporterEmail: formData.email
      };

      // Save email to local storage
      localStorage.setItem("pawmap_user_email", formData.email);

      const response = await API.createCat(payload);

      if (response.colonyAlert) {
        // Show Colony Alert Dialog!
        setColonyAlertCat(response);
      } else {
        onSightingCreated(response);
        onClose();
      }
    } catch (err) {
      console.error(err);
      alert("Error submitting cat log. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm colony conversion
  const handleConfirmColony = async (convertToColony: boolean) => {
    if (!colonyAlertCat) return;

    if (convertToColony) {
      try {
        const updated = await API.updateCat(colonyAlertCat._id, {
          status: "colony",
          updatedBy: formData.email
        });
        onSightingCreated(updated);
      } catch (err) {
        console.error("Colony conversion failed", err);
        onSightingCreated(colonyAlertCat);
      }
    } else {
      onSightingCreated(colonyAlertCat);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center" id="wizard-portal">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-[#1A1A18]/40 backdrop-blur-xs cursor-pointer"
        id="wizard-backdrop"
      />

      {/* Main Bottom Sheet Panel */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="w-full max-w-lg bg-white rounded-t-2xl shadow-xl flex flex-col max-h-[85vh] z-10 border-t border-parchment"
        id="wizard-sheet"
      >
        {/* Header Handle */}
        <div className="w-12 h-1 bg-parchment rounded-full mx-auto my-3 shrink-0" />

        <div className="px-5 pb-3 flex justify-between items-center border-b border-parchment">
          <div>
            <h2 className="text-base font-display font-bold text-forest">Report Stray Sighting</h2>
            <p className="text-[10px] text-mist">Step {step} of 4: Fill required care parameters</p>
          </div>
          <button
            onClick={onClose}
            className="text-xs font-semibold text-mist hover:text-ink cursor-pointer"
          >
            Cancel
          </button>
        </div>

        {/* Steps Content Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-5 relative">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="text-sm font-display font-bold text-ink flex items-center gap-1.5">
                    <MapPin className="w-4.5 h-4.5 text-clay" /> Pin Sighting Location
                  </h3>
                  <p className="text-xs text-mist mt-1">Tap the map to position the pin exactly where you spotted the cat.</p>
                </div>
                <div className="w-full h-64 rounded-xl overflow-hidden border border-parchment shadow-sm z-0">
                  <MapContainer
                    center={initialCenter.current}
                    zoom={16}
                    style={{ height: "100%", width: "100%" }}
                    dragging={true}
                    scrollWheelZoom={true}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <LocationPicker
                      position={formData.location}
                      setPosition={(pos: any) => setFormData(prev => ({
                        ...prev,
                        location: { lat: pos.lat, lng: pos.lng }
                      }))}
                    />
                  </MapContainer>
                </div>
                <div className="p-3 bg-dusk rounded-lg text-[11px] text-mist flex items-center justify-between border border-parchment">
                  <span>Latitude: {formData.location.lat.toFixed(5)}</span>
                  <span>Longitude: {formData.location.lng.toFixed(5)}</span>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="text-sm font-display font-bold text-ink flex items-center gap-1.5">
                    <Camera className="w-4.5 h-4.5 text-forest" /> Upload Photo & AI Tagger
                  </h3>
                  <p className="text-xs text-mist mt-1">Our embedded Groq Vision AI scans the photo for age, pattern, and injury tags.</p>
                </div>

                {/* Photo Drag/Click Uploader */}
                <div className="border-2 border-dashed border-parchment hover:border-forest rounded-xl p-4 text-center cursor-pointer transition-all bg-dusk/30 relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  {formData.photoBase64 ? (
                    <div className="space-y-2">
                      <img
                        src={formData.photoBase64}
                        alt="Cat uploaded"
                        className="w-24 h-24 object-cover mx-auto rounded-lg shadow-sm border border-parchment"
                      />
                      <p className="text-[11px] text-forest font-semibold">Click or drag to change image</p>
                    </div>
                  ) : (
                    <div className="py-4 space-y-2">
                      <Camera className="w-8 h-8 text-mist mx-auto" />
                      <p className="text-xs font-semibold text-ink">Select photo from device</p>
                      <p className="text-[10px] text-mist">Supports PNG, JPG (Max 5MB)</p>
                    </div>
                  )}
                </div>

                {/* AI loading status */}
                {isAnalyzing && (
                  <div className="p-3 bg-lavender/5 border border-lavender/10 rounded-xl flex items-center justify-center gap-2">
                    <Loader2 className="w-4.5 h-4.5 text-lavender animate-spin" />
                    <span className="text-xs font-display text-lavender font-semibold animate-pulse">Groq Vision AI scanning cat features...</span>
                  </div>
                )}

                {/* AI Tag indicator */}
                {aiFilled && formData.aiMetadata && (
                  <div className="p-3 bg-lavender/10 border border-lavender/20 rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono font-bold text-lavender uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="w-3 h-3 animate-spin" /> AI Detected Traits
                      </span>
                      <span className="text-[9px] bg-lavender/20 text-lavender px-1.5 py-0.5 rounded-full font-bold">
                        ✨ Auto-filled by AI
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-mist font-medium">
                      <div className="bg-white/80 p-1.5 rounded border border-parchment">
                        Age: <strong className="text-ink capitalize">{formData.aiMetadata.age}</strong>
                      </div>
                      <div className="bg-white/80 p-1.5 rounded border border-parchment">
                        Pattern: <strong className="text-ink capitalize">{formData.aiMetadata.coatPattern}</strong>
                      </div>
                      <div className="bg-white/80 p-1.5 rounded border border-parchment">
                        Injuries: <strong className="text-ink capitalize">{formData.aiMetadata.visibleInjuries}</strong>
                      </div>
                      <div className="bg-white/80 p-1.5 rounded border border-parchment">
                        Ear-Tip: <strong className="text-ink capitalize">{formData.aiMetadata.earTip}</strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* Condition Selector Tap Cards */}
                <div>
                  <label className="text-xs font-display font-bold text-ink block mb-2">Select Condition Category</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: "healthy", label: "🟢 Healthy", desc: "Clean ears, active" },
                      { value: "injured", label: "🔴 Injured / Sick", desc: "Limp, scars, bleeding" },
                      { value: "kitten", label: "🟡 Kitten", desc: "Very young/small size" },
                      { value: "unknown", label: "⚪ Unknown", desc: "Distant spotting" }
                    ].map(card => (
                      <button
                        key={card.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, condition: card.value }))}
                        className={`p-3 text-left border rounded-xl transition-all duration-200 cursor-pointer ${
                          formData.condition === card.value
                            ? "bg-forest/5 border-forest ring-1 ring-forest shadow-sm"
                            : "bg-white border-parchment hover:bg-dusk/50"
                        }`}
                      >
                        <span className="block text-xs font-semibold text-ink">{card.label}</span>
                        <span className="block text-[10px] text-mist mt-0.5">{card.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="text-sm font-display font-bold text-ink flex items-center gap-1.5">
                    <CheckCircle className="w-4.5 h-4.5 text-moss" /> Choose Care Sighting Priority
                  </h3>
                  <p className="text-xs text-mist mt-1">Categorizing the sighting correctly routes notifications to appropriate localized volunteer circles.</p>
                </div>

                {/* Needs selector Tap Cards */}
                <div className="space-y-2">
                  {[
                    {
                      value: "sighting",
                      label: "👀 Logging a Sighting Only",
                      desc: "I just saw a stray cat here and want to log it so other volunteers are aware of local activity."
                    },
                    {
                      value: "colony",
                      label: "🥫 This is a Fed Colony",
                      desc: "I feed or have spotted a clustered group of stray cats here on a recurring schedule."
                    },
                    {
                      value: "tnr",
                      label: "🏥 Urgent: Needs TNR Coordination",
                      desc: "The stray cats spotted here require prompt Trap-Neuter-Return trap deployments."
                    }
                  ].map(card => (
                    <button
                      key={card.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, needs: card.value }))}
                      className={`w-full p-4 text-left border rounded-xl transition-all duration-200 flex items-start gap-3 cursor-pointer ${
                        formData.needs === card.value
                          ? "bg-forest/5 border-forest ring-1 ring-forest shadow-sm"
                          : "bg-white border-parchment hover:bg-dusk/50"
                      }`}
                    >
                      <div className="flex-1">
                        <span className="block text-xs font-semibold text-ink">{card.label}</span>
                        <span className="block text-[10px] text-mist mt-1 leading-normal">{card.desc}</span>
                      </div>
                    </button>
                  ))}
                </div>

                {formData.needs === "colony" && (
                  <div className="p-3 bg-lavender/5 rounded-xl border border-lavender/10 flex items-center justify-between">
                    <span className="text-xs font-semibold text-ink">Estimated Colony Size</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, count: Math.max(2, prev.count - 1) }))}
                        className="w-7 h-7 bg-white rounded border border-parchment text-xs font-bold text-center"
                      >
                        -
                      </button>
                      <span className="text-xs font-bold w-6 text-center">{formData.count}</span>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, count: prev.count + 1 }))}
                        className="w-7 h-7 bg-white rounded border border-parchment text-xs font-bold text-center"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="text-sm font-display font-bold text-ink flex items-center gap-1.5">
                    <Send className="w-4.5 h-4.5 text-clay" /> Nickname & Caregiver Contact
                  </h3>
                  <p className="text-xs text-mist mt-1">Almost done! Give the cat a friendly nickname and enter your email address to submit.</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-mono text-mist uppercase tracking-wide block mb-1">Cat Nickname / Colony Title</label>
                    <input
                      type="text"
                      maxLength={60}
                      placeholder="e.g. Ginger, Library Colony, Shadow"
                      value={formData.nickname}
                      onChange={(e) => setFormData(prev => ({ ...prev, nickname: e.target.value }))}
                      className="w-full p-2.5 bg-dusk/30 border border-parchment rounded-lg text-xs font-medium focus:outline-none focus:border-forest focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-mono text-mist uppercase tracking-wide block mb-1">Your Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. caregiver@domain.com"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full p-2.5 bg-dusk/30 border border-parchment rounded-lg text-xs font-medium focus:outline-none focus:border-forest focus:bg-white"
                    />
                  </div>
                </div>

                <div className="p-3 bg-forest/5 rounded-xl border border-forest/10 text-[11px] text-mist flex items-start gap-2 leading-relaxed">
                  <span className="text-forest mt-0.5">🐾</span>
                  <span>
                    By logging this stray, you agree to coordinate with localized caretakers and help build historical mapping logs.
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Actions Footer */}
        <div className="p-4 pb-6 border-t border-parchment flex justify-between gap-3 shrink-0 bg-white sticky bottom-0">
          {step > 1 ? (
            <button
              onClick={handleBack}
              className="py-2.5 px-4 bg-parchment hover:bg-parchment/80 text-ink text-xs font-display font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              onClick={handleNext}
              className="py-2.5 px-4 bg-forest hover:bg-forest/95 text-white text-xs font-display font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ml-auto"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="py-2.5 px-5 bg-forest hover:bg-forest/95 disabled:bg-forest/50 text-white text-xs font-display font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ml-auto shadow-md"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4.5 h-4.5 animate-spin" /> Submitting...
                </>
              ) : (
                <>
                  Submit Log 🐾
                </>
              )}
            </button>
          )}
        </div>
      </motion.div>

      {/* Colony Detection Modal Alert */}
      <AnimatePresence>
        {colonyAlertCat && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#1A1A18]/60 backdrop-blur-xs"
            />
            {/* Card alert */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-white rounded-2xl max-w-sm w-full p-6 text-center border border-parchment shadow-2xl relative z-10"
              id="colony-alert-modal"
            >
              <div className="text-4xl mb-3">🐱🐱🐱</div>
              <h2 className="text-lg font-display font-bold text-forest tracking-tight">Colony Detected?</h2>
              <p className="text-xs text-mist mt-2 leading-relaxed">
                We detected <strong>3 or more</strong> active cat sightings within 200 meters of this location in the last 7 days!
              </p>
              <p className="text-xs text-lavender font-semibold mt-3 bg-lavender/5 p-2 rounded-lg border border-lavender/10">
                This area may be a feline nesting site. Would you like to merge these sightings into a managed <strong>Cat Colony Profile</strong>?
              </p>
              
              <div className="mt-5 flex gap-3">
                <button
                  id="btn-colony-skip"
                  onClick={() => handleConfirmColony(false)}
                  className="flex-1 py-2 px-3 bg-parchment hover:bg-parchment/80 text-ink text-xs font-display font-bold rounded-lg transition-all cursor-pointer"
                >
                  Skip
                </button>
                <button
                  id="btn-colony-yes"
                  onClick={() => handleConfirmColony(true)}
                  className="flex-1 py-2 px-3 bg-forest hover:bg-forest/90 text-white text-xs font-display font-bold rounded-lg transition-all shadow-md cursor-pointer"
                >
                  Yes, Group!
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

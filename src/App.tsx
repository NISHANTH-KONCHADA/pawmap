import React, { useEffect, useState, useRef } from "react";
import { ICat } from "../server/db.js";
import { API } from "./lib/api.js";
import socket from "./lib/socket.js";
import Sidebar from "./components/Sidebar.js";
import Map from "./components/Map.js";
import FilterBar from "./components/FilterBar.js";
import ReportWizard from "./components/ReportWizard.js";
import CatDetail from "./components/CatDetail.js";
import CatPassport from "./components/CatPassport.js";
import { Plus, Map as MapIcon, Library, Smile, Loader2, Info, Mail, LogOut, CheckCircle, Navigation, User, Phone, Calendar, Instagram, Camera, Save, X, Edit3, Award, Upload } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

export default function App() {
  // Global States
  const [cats, setCats] = useState<ICat[]>([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [showReportWizard, setShowReportWizard] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(localStorage.getItem("pawmap_user_email"));
  
  // Profile settings state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [userName, setUserName] = useState<string>(() => localStorage.getItem("pawmap_user_name") || "Cat Guardian");
  const [userPhone, setUserPhone] = useState<string>(() => localStorage.getItem("pawmap_user_phone") || "");
  const [userDob, setUserDob] = useState<string>(() => localStorage.getItem("pawmap_user_dob") || "");
  const [userInstagram, setUserInstagram] = useState<string>(() => localStorage.getItem("pawmap_user_instagram") || "");
  const [userAvatar, setUserAvatar] = useState<string>(() => localStorage.getItem("pawmap_user_avatar") || "🐱");

  // Profile form temp states
  const [tempName, setTempName] = useState("");
  const [tempPhone, setTempPhone] = useState("");
  const [tempDob, setTempDob] = useState("");
  const [tempInstagram, setTempInstagram] = useState("");
   const [tempAvatar, setTempAvatar] = useState("");
  const [customAvatarUrl, setCustomAvatarUrl] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Custom Pocket Purr Synthesizer State & References
  const [isPurring, setIsPurring] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const purrOscsRef = useRef<OscillatorNode[]>([]);
  const purrGainRef = useRef<GainNode | null>(null);
  const purrVibeIntervalRef = useRef<any>(null);

  const startPurring = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;

      // Primary low-frequency rumble
      const osc1 = ctx.createOscillator();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(28, ctx.currentTime);

      // Secondary motor hum
      const osc2 = ctx.createOscillator();
      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(56, ctx.currentTime);

      // High-cut filter to keep the purring warm and smooth
      const biquadFilter = ctx.createBiquadFilter();
      biquadFilter.type = "lowpass";
      biquadFilter.frequency.setValueAtTime(90, ctx.currentTime);

      // Amplitude Modulator (fluttering throat chords effect)
      const modulator = ctx.createOscillator();
      modulator.type = "sine";
      modulator.frequency.setValueAtTime(25, ctx.currentTime); // 25 cycles per second

      const modulatorGain = ctx.createGain();
      modulatorGain.gain.setValueAtTime(0.35, ctx.currentTime);

      // Master volume
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.08, ctx.currentTime);

      // Breath cycles (inhale/exhale modulation)
      const breathMod = ctx.createOscillator();
      breathMod.type = "sine";
      breathMod.frequency.setValueAtTime(0.4, ctx.currentTime);

      const breathGain = ctx.createGain();
      breathGain.gain.setValueAtTime(0.04, ctx.currentTime);

      // Connections
      osc1.connect(biquadFilter);
      osc2.connect(biquadFilter);

      modulator.connect(modulatorGain);
      modulatorGain.connect(masterGain.gain);

      breathMod.connect(breathGain);
      breathGain.connect(masterGain.gain);

      biquadFilter.connect(masterGain);
      masterGain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      modulator.start();
      breathMod.start();

      purrOscsRef.current = [osc1, osc2, modulator, breathMod];
      purrGainRef.current = masterGain;
      setIsPurring(true);

      // Tactile Haptic Vibration loop matching the flutter
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([100, 80, 100, 80, 120, 150, 120, 80]);
        purrVibeIntervalRef.current = setInterval(() => {
          navigator.vibrate([80, 60, 80, 60, 100, 120, 100, 60]);
        }, 1600);
      }
    } catch (err) {
      console.error("Failed to play purr synthesizer:", err);
    }
  };

  const stopPurring = () => {
    try {
      purrOscsRef.current.forEach(osc => {
        try { osc.stop(); } catch {}
      });
      purrOscsRef.current = [];
      if (purrGainRef.current) {
        purrGainRef.current.disconnect();
        purrGainRef.current = null;
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close();
      }
      if (purrVibeIntervalRef.current) {
        clearInterval(purrVibeIntervalRef.current);
        purrVibeIntervalRef.current = null;
      }
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(0);
      }
    } catch (err) {
      console.error("Failed to stop purring gracefully:", err);
    } finally {
      setIsPurring(false);
    }
  };

  // Stop purring instantly if profile modal is closed
  useEffect(() => {
    if (!showProfileModal) {
      stopPurring();
    }
  }, [showProfileModal]);

  // Synchronize temp state when profile modal opens
  useEffect(() => {
    if (showProfileModal) {
      setTempName(userName);
      setTempPhone(userPhone);
      setTempDob(userDob);
      setTempInstagram(userInstagram);
      setTempAvatar(userAvatar);
      setCustomAvatarUrl(userAvatar.startsWith("http") || userAvatar.startsWith("data:") ? userAvatar : "");
      setSaveSuccess(false);
    }
  }, [showProfileModal, userName, userPhone, userDob, userInstagram, userAvatar]);
  const [collapsedSidebar, setCollapsedSidebar] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [nearbyLocation, setNearbyLocation] = useState<string>("Hackney, London");

  useEffect(() => {
    if (userLocation) {
      const [lat, lng] = userLocation;
      fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.address) {
            const city = data.address.city || data.address.town || data.address.village || data.address.suburb || data.address.county;
            const country = data.address.country;
            if (city) {
              setNearbyLocation(`${city}${country ? `, ${country}` : ""}`);
            } else {
              setNearbyLocation(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
            }
          }
        })
        .catch((err) => {
          console.warn("Failed to reverse geocode location:", err);
          setNearbyLocation(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        });
    }
  }, [userLocation]);
  
  // Mobile Layout Tab ('map' | 'feed')
  const [activeTab, setActiveTab] = useState<"map" | "feed">("map");

  // Router / Passport View State
  const [passportId, setPassportId] = useState<string | null>(null);

  // Auth modal
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginSuccessMessage, setLoginSuccessMessage] = useState("");

  // 1. Check URL parameters for Magic Link Tokens or Direct Passport IDs
  useEffect(() => {
    // A. Parse Magic Link token
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      const verifyToken = async () => {
        try {
          const res = await API.verifyMagicLink(token);
          if (res.success) {
            setUserEmail(res.user.email);
            localStorage.setItem("pawmap_user_email", res.user.email);
            alert(`👋 Welcome back! Authenticated successfully as ${res.user.email}`);
            
            // Clear token query parameter from URL
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } catch (err: any) {
          alert(err.message || "Authentication link invalid or expired.");
        }
      };
      verifyToken();
    }

    // B. Check for direct Passport path /cat/:id
    const path = window.location.pathname;
    if (path.startsWith("/cat/")) {
      const id = path.split("/cat/")[1];
      if (id) {
        setPassportId(id);
      }
    } else {
      // Check search param fallback ?catId=...
      const catParam = params.get("catId");
      if (catParam) {
        setPassportId(catParam);
      }
    }
  }, []);

  // 2. Load Cats Sighting Records on Mount
  const loadCats = async () => {
    try {
      const data = await API.getCats();
      setCats(data);
    } catch (err) {
      console.error("Failed to load cats data", err);
    }
  };

  useEffect(() => {
    loadCats();
  }, []);

  // 3. Coordinate Live Socket.io updates for real-time multiplayer pins
  useEffect(() => {
    socket.on("pin:new", (newCat: ICat) => {
      console.log("[Client Socket] Received new live pin:", newCat);
      setCats((prev) => {
        // Prevent duplicate loads
        if (prev.some((c) => c._id === newCat._id)) return prev;
        return [newCat, ...prev];
      });
    });

    socket.on("pin:updated", (updatedCat: ICat) => {
      console.log("[Client Socket] Received live pin update:", updatedCat);
      setCats((prev) =>
        prev.map((c) => (c._id === updatedCat._id ? updatedCat : c))
      );
    });

    return () => {
      socket.off("pin:new");
      socket.off("pin:updated");
    };
  }, []);

  // Handle Magic Link Submission
  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginEmail.includes("@")) {
      alert("A valid email is required.");
      return;
    }

    setLoginLoading(true);
    setLoginSuccessMessage("");
    try {
      const response = await API.requestMagicLink(loginEmail);
      if (response.success) {
        setLoginSuccessMessage(response.message);
        
        // In dev mode / fallback, the token is returned directly so we can auto-login immediately!
        if (response.token) {
          setTimeout(async () => {
            try {
              const verifyRes = await API.verifyMagicLink(response.token!);
              setUserEmail(verifyRes.user.email);
              localStorage.setItem("pawmap_user_email", verifyRes.user.email);
              setLoginSuccessMessage("✨ Logged in automatically via development bypass!");
              setTimeout(() => {
                setShowLoginModal(false);
                setLoginSuccessMessage("");
              }, 1500);
            } catch (err) {
              console.error(err);
            }
          }, 1000);
        }
      }
    } catch (err: any) {
      alert(err.message || "Failed to trigger magic link email.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setUserEmail(null);
    localStorage.removeItem("pawmap_user_email");
    localStorage.removeItem("pawmap_user_name");
    localStorage.removeItem("pawmap_user_phone");
    localStorage.removeItem("pawmap_user_dob");
    localStorage.removeItem("pawmap_user_instagram");
    localStorage.removeItem("pawmap_user_avatar");
    setUserName("Cat Guardian");
    setUserPhone("");
    setUserDob("");
    setUserInstagram("");
    setUserAvatar("🐱");
    setShowProfileModal(false);
    alert("👋 Signed out successfully.");
  };

  // If viewing standalone Cat Passport Page
  if (passportId) {
    return (
      <CatPassport
        catId={passportId}
        onBack={() => {
          setPassportId(null);
          // Restore path
          window.history.replaceState({}, document.title, "/");
          loadCats();
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-dusk relative" id="app-workspace">
      
      {/* 0. Top Header */}
      <header className="glass-header text-white shrink-0 z-20 pt-safe">
        <div className="h-16 flex items-center justify-between px-4 sm:px-6">
          <motion.div 
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer select-none group"
            whileHover="hover"
            initial="initial"
          >
            <motion.div 
              variants={{
                initial: { scale: 1, rotate: 0 },
                hover: { scale: 1.08, rotate: [0, -8, 8, -5, 5, 0], transition: { duration: 0.5 } }
              }}
              className="w-9 h-9 sm:w-10 sm:h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.12)] border border-white/20 relative overflow-visible"
            >
              {/* Custom High-Fidelity Vector Logo blending Map Pin & Paw print */}
              <svg viewBox="0 0 100 100" className="w-6 h-6 sm:w-7 sm:h-7 drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FBBF24" /> {/* Amber 400 */}
                    <stop offset="100%" stopColor="#D97706" /> {/* Amber 600 */}
                  </linearGradient>
                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>
                {/* Sleek Pin Base with gradient fill */}
                <path 
                  d="M50 10C30.7 10 15 25.7 15 45C15 71.2 50 90 50 90C50 90 85 71.2 85 45C85 25.7 69.3 10 50 10Z" 
                  fill="url(#logoGrad)" 
                />
                {/* Highlight ring */}
                <path 
                  d="M50 14C32.9 14 19 27.9 19 45C19 67.2 50 84.8 50 84.8C50 84.8 81 67.2 81 45C81 27.9 67.1 14 50 14Z" 
                  stroke="white" 
                  strokeOpacity="0.25" 
                  strokeWidth="2" 
                />
                {/* Beautiful custom Paw Print cutout inside the map pin */}
                {/* Main Pad */}
                <path 
                  d="M50 63C44.2 63 39.5 58.2 39.5 52.5C39.5 48.8 43.8 46 50 46C56.2 46 60.5 48.8 60.5 52.5C60.5 58.2 55.8 63 50 63Z" 
                  fill="white" 
                />
                {/* Inner small toes */}
                <circle cx="34" cy="41" r="5" fill="white" />
                <circle cx="44" cy="32" r="5.5" fill="white" />
                <circle cx="56" cy="32" r="5.5" fill="white" />
                <circle cx="66" cy="41" r="5" fill="white" />
              </svg>

              {/* Animated Floating Meow Balloon */}
              <motion.span 
                variants={{
                  initial: { opacity: 0, y: 0, scale: 0.5 },
                  hover: { opacity: [0, 1, 1, 0], y: -22, x: [0, 6, -6, 0], scale: [0.5, 1, 1, 0.8], transition: { duration: 1.2, repeat: Infinity } }
                }}
                className="absolute -top-3 -right-2 text-[8px] bg-clay text-white px-1.5 py-0.5 rounded-full font-mono font-bold tracking-wider pointer-events-none shadow-xs"
              >
                MEOW!
              </motion.span>
            </motion.div>
            
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <h1 className="text-base sm:text-lg md:text-xl font-display font-bold tracking-tight group-hover:text-amber-200 transition-colors">
                  PawMap
                </h1>
                
                {/* Embedded Animated Little Whisker Cat with Custom Twitching Whiskers (shifted left margin for clearance) */}
                <div className="relative flex items-center justify-center ml-2.5">
                  <motion.div
                    variants={{
                      initial: { rotate: 0, y: 0 },
                      hover: { 
                        rotate: [0, -8, 8, -8, 0],
                        y: [0, -3, 0, -2, 0],
                        transition: { duration: 0.8, repeat: Infinity, repeatType: "reverse" }
                      }
                    }}
                    className="text-lg sm:text-xl z-10"
                    title="Whiskers loves your help!"
                  >
                    🐈
                  </motion.div>
                  {/* Subtle Graphical Twitching Whiskers Overlay */}
                  <div className="absolute -left-3.5 -right-3.5 inset-y-0 flex items-center justify-between pointer-events-none select-none z-0">
                    {/* Left Twitching Whiskers */}
                    <svg width="12" height="10" viewBox="0 0 12 10" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-amber-200/90 animate-whisker-left">
                      <path d="M11 2C8 3 4 2 1 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                      <path d="M11 5C7 5.5 4 5 1 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                      <path d="M11 8C7 8 4 9 1 9.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                    {/* Spacer for the cat emoji */}
                    <div className="w-5" />
                    {/* Right Twitching Whiskers */}
                    <svg width="12" height="10" viewBox="0 0 12 10" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-amber-200/90 animate-whisker-right">
                      <path d="M1 2C4 3 8 2 11 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                      <path d="M1 5C5 5.5 8 5 11 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                      <path d="M1 8C5 8 8 9 11 9.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
              </div>
              <span className="text-[8px] text-[#A3E2D4] font-mono leading-none font-bold tracking-widest mt-0.5 uppercase">
                Care Network
              </span>
            </div>
          </motion.div>
          <div className="flex gap-2 sm:gap-4 items-center">
            <div className="hidden sm:block bg-white/10 px-3 py-1.5 rounded-lg text-xs md:text-sm border border-white/20 font-medium">
              Nearby: <strong>{nearbyLocation}</strong>
            </div>
            {userEmail ? (
              <div className="flex items-center gap-2">
                <span className="hidden md:inline text-xs text-white/80 font-medium truncate max-w-[150px]" title={userEmail}>{userName}</span>
                <button
                  onClick={() => {
                    if (typeof navigator !== "undefined" && navigator.vibrate) {
                      navigator.vibrate(35);
                    }
                    setShowProfileModal(true);
                  }}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-amber-500 border-2 border-white overflow-hidden flex items-center justify-center font-bold text-white uppercase hover:bg-amber-600 transition-all cursor-pointer text-xs sm:text-sm shadow-md"
                  title="My Volunteer Pawsport"
                >
                  {userAvatar.startsWith("http") || userAvatar.startsWith("data:") ? (
                    <img src={userAvatar} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-sm sm:text-base">{userAvatar}</span>
                  )}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-white text-forest text-xs font-display font-bold rounded-lg hover:bg-white/90 transition-all cursor-pointer shadow-sm"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* 1. Collapsible Sidebar (Left) */}
        <div className={`${activeTab === "feed" ? "flex w-full md:w-auto" : "hidden"} md:flex h-full shrink-0 z-10`}>
          <Sidebar
            cats={cats}
            onSelectCat={(id) => {
              setSelectedCatId(id);
              setActiveTab("map"); // Center map view when picking item
            }}
            userEmail={userEmail}
            onLogout={handleLogout}
            onOpenLogin={() => setShowLoginModal(true)}
            collapsed={collapsedSidebar}
            setCollapsed={setCollapsedSidebar}
          />
        </div>

        {/* 2. Main Workspace Layout */}
        <main className={`${activeTab === "map" ? "flex" : "hidden md:flex"} flex-1 flex flex-col h-full relative overflow-hidden`} id="main-view">
        
        {/* Floating Top Header (Filters and Quick Auth) - DESKTOP ONLY */}
        <div className="hidden md:flex absolute top-4 left-4 right-4 z-[400] justify-between items-center gap-3 pointer-events-none">
          {/* Status Filter pill group */}
          <div className="pointer-events-auto shrink-0">
            <FilterBar activeFilter={activeFilter} onChange={setActiveFilter} />
          </div>

          {/* Quick Add FAB (Desktop Only) */}
          <button
            id="btn-report-desktop"
            onClick={() => {
              if (typeof navigator !== "undefined" && navigator.vibrate) {
                navigator.vibrate(40);
              }
              setShowReportWizard(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-forest hover:bg-forest/95 text-white font-display font-semibold rounded-xl shadow-[0_4px_2px_rgba(13,92,74,0.15)] pointer-events-auto transition-all scale-100 hover:scale-[1.03] cursor-pointer"
          >
            <Plus className="w-5 h-5 text-white" /> Sighting Log 🐾
          </button>
        </div>

        {/* Floating Bottom Header (Filters) - MOBILE ONLY */}
        <div className="md:hidden absolute bottom-4 left-4 right-4 z-[400] pointer-events-none">
          <div className="pointer-events-auto w-full">
            <FilterBar activeFilter={activeFilter} onChange={setActiveFilter} />
          </div>
        </div>

        {/* Map Container View (Active by default) */}
        <div className={`flex-1 h-full w-full ${activeTab === "map" ? "block" : "hidden md:block"}`}>
          <Map
            cats={cats}
            activeFilter={activeFilter}
            onSelectCat={setSelectedCatId}
            selectedCatId={selectedCatId}
            userLocation={userLocation}
            setUserLocation={setUserLocation}
          />
        </div>

        {/* Empty State Fallback (If no cats present at all) */}
        {cats.length === 0 && (
          <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center p-6 text-center z-20 space-y-4" id="empty-state">
            <div className="w-16 h-16 bg-parchment rounded-full flex items-center justify-center text-3xl shadow-sm text-center">
              🐾
            </div>
            <div className="max-w-xs space-y-1">
              <h2 className="text-lg font-display font-bold text-forest">No cats spotted nearby yet</h2>
              <p className="text-xs text-mist leading-relaxed">Be the first to report local stray felines, catalog feeding coordinates, or schedule a TNR coordinate event.</p>
            </div>
            <button
              id="empty-state-report-btn"
              onClick={() => {
                if (typeof navigator !== "undefined" && navigator.vibrate) {
                  navigator.vibrate(40);
                }
                setShowReportWizard(true);
              }}
              className="py-2 px-5 bg-forest text-white text-xs font-display font-bold rounded-lg hover:bg-forest/90 transition-all shadow-md cursor-pointer"
            >
              Report Sighting
            </button>
          </div>
        )}
      </main>

      {/* 4. Right slide-in Drawer Details panel */}
      <AnimatePresence>
        {selectedCatId && (
          <CatDetail
            catId={selectedCatId}
            onClose={() => setSelectedCatId(null)}
            userEmail={userEmail}
            onCatUpdated={(updatedCat) => {
              setCats((prev) =>
                prev.map((c) => (c._id === updatedCat._id ? updatedCat : c))
              );
            }}
          />
        )}
      </AnimatePresence>

      {/* 5. bottom-sheet wizard */}
      <AnimatePresence>
        {showReportWizard && (
          <ReportWizard
            onClose={() => setShowReportWizard(false)}
            userLocation={userLocation}
            onSightingCreated={(newCat) => {
              setCats(prev => [newCat, ...prev]);
              setSelectedCatId(newCat._id); // Open profile instantly
            }}
          />
        )}
      </AnimatePresence>

      {/* Profile Settings & Customization Modal */}
      <AnimatePresence>
        {showProfileModal && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 overflow-y-auto" id="profile-modal-portal">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowProfileModal(false)}
              className="absolute inset-0 bg-[#1A1A18]/65 backdrop-blur-sm cursor-pointer"
            />
            
            {/* Modal Card */}
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="bg-white rounded-3xl max-w-md w-full overflow-hidden border border-white/20 shadow-2xl relative z-10 font-sans"
              id="profile-card"
            >
              {/* Profile Top Banner & Close Icon */}
              <div className="relative h-24 bg-gradient-to-r from-forest to-moss flex items-end px-6 pb-3 overflow-visible">
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/35 hover:bg-black/55 flex items-center justify-center text-white transition-all cursor-pointer"
                  title="Close Pawsport"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute top-4 left-6">
                  <span className="text-[9px] font-mono uppercase tracking-widest text-amber-200 bg-white/10 px-2.5 py-0.5 rounded-full border border-white/10 flex items-center gap-1">
                    🐾 Official Human Pawsport
                  </span>
                </div>
              </div>

              {/* Floating Avatar Area */}
              <div className="px-6 relative -mt-10 flex justify-between items-end">
                <div className="relative group">
                  <div className="w-20 h-20 rounded-2xl bg-white border-4 border-white shadow-md overflow-hidden flex items-center justify-center font-bold text-white text-4xl">
                    {tempAvatar.startsWith("http") || tempAvatar.startsWith("data:") ? (
                      <img src={tempAvatar} alt="Volunteer Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span>{tempAvatar}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const fileInput = document.getElementById("profile-image-upload-input");
                      if (fileInput) fileInput.click();
                    }}
                    className="absolute -bottom-1 -right-1 bg-amber-500 hover:bg-amber-600 text-white p-1.5 rounded-lg border-2 border-white shadow-sm transition-colors cursor-pointer"
                    title="Change Avatar"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="text-right pb-1">
                  <h3 className="text-base font-display font-bold text-ink leading-tight flex items-center gap-1 justify-end">
                    {tempName || "Cat Guardian"} <Award className="w-4 h-4 text-amber-500 shrink-0" />
                  </h3>
                  <p className="text-[10px] font-mono text-mist uppercase tracking-wider">
                    {cats.filter(cat => cat.history?.some(h => h.by?.toLowerCase() === userEmail?.toLowerCase())).length >= 3 ? "🏆 Senior Cat Watcher" : "🌱 Sighting Scout"}
                  </p>
                </div>
              </div>

              {/* Scrollable Form Content */}
              <div className="p-6 space-y-4 max-h-[55vh] overflow-y-auto custom-scrollbar">
                
                {/* 🌟 Interactive Feature 1: Pocket Purr Simulator */}
                <div className="bg-amber-50 rounded-2xl p-3.5 border border-amber-200/60 shadow-sm space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl animate-bounce">💖</span>
                      <div>
                        <h4 className="text-xs font-bold text-amber-900">Pocket Purr & Vibe Synthesizer</h4>
                        <p className="text-[10px] text-amber-700/80">Pure Web Audio throat rumble & haptic simulator</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (isPurring) {
                          stopPurring();
                        } else {
                          startPurring();
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1 ${
                        isPurring 
                          ? "bg-rose-500 text-white animate-pulse" 
                          : "bg-amber-500 hover:bg-amber-600 text-white"
                      }`}
                    >
                      {isPurring ? "Stop Purr" : "Play Purr"}
                    </button>
                  </div>
                  {isPurring && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-[9.5px] text-amber-800 leading-relaxed bg-white/70 p-2 rounded-lg border border-amber-200/50 flex items-center gap-2"
                    >
                      <span className="flex space-x-0.5 items-center shrink-0">
                        <span className="w-1 h-3 bg-rose-400 rounded-full animate-bounce" />
                        <span className="w-1 h-2 bg-rose-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                        <span className="w-1 h-4 bg-rose-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                      </span>
                      <span>The gentle throat rumble is running synthetically. Hold your device to feel the therapeutic heartbeat vibration!</span>
                    </motion.div>
                  )}
                </div>

                {/* 1. Profile Picture Choice presets / Direct Upload */}
                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-mist uppercase tracking-wider block">Customize Avatar</label>
                  
                  {/* Preset Emojis Grid */}
                  <div className="grid grid-cols-6 gap-2 bg-dusk/50 p-2 rounded-xl border border-parchment/60">
                    {["🐱", "🐯", "🦁", "🦊", "🐼", "🐨", "🦉", "🦄", "🌟", "🐾"].map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          setTempAvatar(emoji);
                        }}
                        className={`text-2xl p-1.5 rounded-lg transition-all hover:scale-110 cursor-pointer ${
                          tempAvatar === emoji ? "bg-white border-2 border-amber-500 shadow-sm" : "hover:bg-white/50"
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                    
                    {/* Custom Image Upload Button */}
                    <button
                      type="button"
                      onClick={() => {
                        const fileInput = document.getElementById("profile-image-upload-input");
                        if (fileInput) {
                          fileInput.click();
                        }
                      }}
                      className={`text-xs font-semibold p-1.5 rounded-lg transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                        tempAvatar.startsWith("data:") || tempAvatar.startsWith("http") ? "bg-white border-2 border-amber-500 shadow-sm text-amber-500" : "hover:bg-white/50 text-mist"
                      }`}
                      title="Upload Custom Image File"
                    >
                      <Upload className="w-4 h-4" />
                      <span className="text-[9px]">Photo</span>
                    </button>
                  </div>

                  {/* Hidden Input for File Upload */}
                  <input
                    type="file"
                    id="profile-image-upload-input"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          const base64String = reader.result as string;
                          setTempAvatar(base64String);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />

                  {/* Clear custom photo or instructions if custom photo is active */}
                  {(tempAvatar.startsWith("data:") || tempAvatar.startsWith("http")) && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between bg-amber-500/10 border border-amber-500/15 p-2 rounded-xl text-[10px] text-amber-800 font-medium"
                    >
                      <span className="truncate max-w-[220px]">✨ Custom photo loaded successfully!</span>
                      <button
                        type="button"
                        onClick={() => setTempAvatar("🐱")}
                        className="text-amber-600 hover:text-amber-900 font-bold underline cursor-pointer"
                      >
                        Reset to 🐱
                      </button>
                    </motion.div>
                  )}
                </div>

                {/* Form fields */}
                <div className="space-y-3.5">
                  {/* Full Name - NO REQUIRED tag as requested */}
                  <div>
                    <label className="text-[10px] font-mono text-mist uppercase tracking-wider flex items-center gap-1.5 mb-1">
                      <User className="w-3.5 h-3.5 text-moss" /> Full Name (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Alex Whiskers"
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      className="w-full p-2.5 bg-dusk/30 border border-parchment rounded-xl text-xs font-medium focus:outline-none focus:border-forest focus:bg-white transition-all"
                    />
                  </div>

                  {/* Email Address */}
                  <div>
                    <label className="text-[10px] font-mono text-mist uppercase tracking-wider flex items-center gap-1.5 mb-1">
                      <Mail className="w-3.5 h-3.5 text-moss" /> Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. volunteer@pawmap.org"
                      value={userEmail || ""}
                      disabled
                      className="w-full p-2.5 bg-dusk/50 border border-parchment rounded-xl text-xs font-medium text-mist cursor-not-allowed"
                    />
                    <span className="text-[9px] text-mist/80 block mt-0.5">Your email is managed securely via credentials link.</span>
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label className="text-[10px] font-mono text-mist uppercase tracking-wider flex items-center gap-1.5 mb-1">
                      <Phone className="w-3.5 h-3.5 text-moss" /> Phone Number (Optional)
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. +44 7911 123456"
                      value={tempPhone}
                      onChange={(e) => setTempPhone(e.target.value)}
                      className="w-full p-2.5 bg-dusk/30 border border-parchment rounded-xl text-xs font-medium focus:outline-none focus:border-forest focus:bg-white transition-all"
                    />
                  </div>

                  {/* Date of Birth */}
                  <div>
                    <label className="text-[10px] font-mono text-mist uppercase tracking-wider flex items-center gap-1.5 mb-1">
                      <Calendar className="w-3.5 h-3.5 text-moss" /> Date of Birth (Optional)
                    </label>
                    <input
                      type="date"
                      value={tempDob}
                      onChange={(e) => setTempDob(e.target.value)}
                      className="w-full p-2.5 bg-dusk/30 border border-parchment rounded-xl text-xs font-medium focus:outline-none focus:border-forest focus:bg-white transition-all"
                    />
                  </div>

                  {/* Instagram Handle */}
                  <div>
                    <label className="text-[10px] font-mono text-mist uppercase tracking-wider flex items-center gap-1.5 mb-1">
                      <Instagram className="w-3.5 h-3.5 text-moss" /> Instagram Handle (Optional)
                    </label>
                    <div className="flex rounded-xl overflow-hidden border border-parchment focus-within:border-forest transition-all">
                      <span className="bg-dusk/60 px-3 flex items-center text-xs text-mist font-semibold select-none border-r border-parchment">
                        @
                      </span>
                      <input
                        type="text"
                        placeholder="username"
                        value={tempInstagram}
                        onChange={(e) => setTempInstagram(e.target.value.replace("@", ""))}
                        className="w-full p-2.5 bg-dusk/30 text-xs font-medium focus:outline-none focus:bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* 🏆 Unique Stamp Achievements Panel (Real ink stamps!) */}
                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-mist uppercase tracking-wider block">Pawsport Entry Stamps</label>
                  <div className="grid grid-cols-2 gap-2 bg-dusk p-3.5 rounded-2xl border border-parchment">
                    
                    {/* Stamp 1: Registered Sighter */}
                    <div className="bg-white border border-[#E5E0D5] p-2.5 rounded-xl flex flex-col items-center justify-center text-center relative overflow-hidden h-24 shadow-2xs">
                      <div className="text-xl">🗺️</div>
                      <span className="text-[9px] font-bold text-ink leading-tight mt-1">Sighter Scout</span>
                      <span className="text-[8px] text-mist font-mono">Status: Locked</span>
                      {cats.filter(cat => cat.history?.some(h => h.by?.toLowerCase() === userEmail?.toLowerCase())).length > 0 && (
                        <div className="absolute inset-0 bg-emerald-500/10 flex flex-col items-center justify-center rotate-6 border-2 border-dashed border-emerald-600/60 rounded-xl transition-transform">
                          <span className="text-emerald-700 text-[10px] uppercase font-mono font-black tracking-wider leading-none">PASSED</span>
                          <span className="text-emerald-600 text-[7px] font-mono">SCOUT STAMP</span>
                        </div>
                      )}
                    </div>

                    {/* Stamp 2: High-Fi Avatar */}
                    <div className="bg-white border border-[#E5E0D5] p-2.5 rounded-xl flex flex-col items-center justify-center text-center relative overflow-hidden h-24 shadow-2xs">
                      <div className="text-xl">📸</div>
                      <span className="text-[9px] font-bold text-ink leading-tight mt-1">Lens Master</span>
                      <span className="text-[8px] text-mist font-mono">Status: Locked</span>
                      {(tempAvatar.startsWith("data:") || tempAvatar.startsWith("http")) && (
                        <div className="absolute inset-0 bg-amber-500/10 flex flex-col items-center justify-center -rotate-12 border-2 border-dashed border-amber-600/60 rounded-xl transition-transform">
                          <span className="text-amber-700 text-[10px] uppercase font-mono font-black tracking-wider leading-none">APPROVED</span>
                          <span className="text-amber-600 text-[7px] font-mono">AVATAR CAP</span>
                        </div>
                      )}
                    </div>

                    {/* Stamp 3: Purr Master */}
                    <div className="bg-white border border-[#E5E0D5] p-2.5 rounded-xl flex flex-col items-center justify-center text-center relative overflow-hidden h-24 shadow-2xs">
                      <div className="text-xl">🎵</div>
                      <span className="text-[9px] font-bold text-ink leading-tight mt-1">Purr Wizard</span>
                      <span className="text-[8px] text-mist font-mono">Status: Locked</span>
                      {isPurring && (
                        <div className="absolute inset-0 bg-indigo-500/10 flex flex-col items-center justify-center rotate-3 border-2 border-dashed border-indigo-600/60 rounded-xl transition-transform">
                          <span className="text-indigo-700 text-[10px] uppercase font-mono font-black tracking-wider leading-none">SINGING</span>
                          <span className="text-indigo-600 text-[7px] font-mono">AUDIO ACTIVE</span>
                        </div>
                      )}
                    </div>

                    {/* Stamp 4: Official Member */}
                    <div className="bg-white border border-[#E5E0D5] p-2.5 rounded-xl flex flex-col items-center justify-center text-center relative overflow-hidden h-24 shadow-2xs">
                      <div className="text-xl">🏰</div>
                      <span className="text-[9px] font-bold text-ink leading-tight mt-1">Paw Protector</span>
                      <span className="text-[8px] text-mist font-mono">Status: Active</span>
                      <div className="absolute inset-0 bg-[#0D5C4A]/10 flex flex-col items-center justify-center -rotate-6 border-2 border-dashed border-[#0D5C4A]/60 rounded-xl">
                        <span className="text-[#0D5C4A] text-[10px] uppercase font-mono font-black tracking-wider leading-none">MEMBER</span>
                        <span className="text-[#0D5C4A] text-[7px] font-mono">PAWMAP HQ</span>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Local Stats overview */}
                <div className="bg-[#0D5C4A]/5 rounded-2xl p-3.5 border border-[#0D5C4A]/15 flex items-center justify-between text-xs font-medium text-forest">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📊</span>
                    <div>
                      <p className="font-semibold">My Sighting Logs</p>
                      <p className="text-[10px] text-mist/90">Verified community reports</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold bg-white text-forest px-3 py-1 rounded-xl shadow-xs border border-forest/10">
                    {cats.filter(cat => cat.history?.some(h => h.by?.toLowerCase() === userEmail?.toLowerCase())).length}
                  </span>
                </div>

                {/* Save Confirmation Toast inline */}
                {saveSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 text-xs font-medium flex items-center gap-2 justify-center"
                  >
                    <CheckCircle className="w-4 h-4" /> Pawsport updated & saved successfully! ✨
                  </motion.div>
                )}

              </div>

              {/* Profile Card Action Bottom Bar */}
              <div className="p-6 bg-dusk/40 border-t border-parchment/60 flex gap-3">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    if (typeof navigator !== "undefined" && navigator.vibrate) {
                      navigator.vibrate([20, 50, 20]);
                    }
                    // Persist to localStorage
                    localStorage.setItem("pawmap_user_name", tempName);
                    localStorage.setItem("pawmap_user_phone", tempPhone);
                    localStorage.setItem("pawmap_user_dob", tempDob);
                    localStorage.setItem("pawmap_user_instagram", tempInstagram);
                    localStorage.setItem("pawmap_user_avatar", tempAvatar);

                    // Update parent app states
                    setUserName(tempName);
                    setUserPhone(tempPhone);
                    setUserDob(tempDob);
                    setUserInstagram(tempInstagram);
                    setUserAvatar(tempAvatar);

                    setSaveSuccess(true);
                    setTimeout(() => {
                      setSaveSuccess(false);
                      setShowProfileModal(false);
                    }, 1200);
                  }}
                  className="flex-1 py-2.5 bg-forest hover:bg-forest/95 text-white text-xs font-display font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" /> Save My Pawsport
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. Passwordless JWT Authentication Modal */}
      <AnimatePresence>
        {showLoginModal && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4" id="login-modal-portal">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLoginModal(false)}
              className="absolute inset-0 bg-[#1A1A18]/60 backdrop-blur-xs cursor-pointer"
            />
            {/* Login form card */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-sm w-full p-6 text-left border border-parchment shadow-2xl relative z-10"
              id="login-card"
            >
              <div className="flex justify-between items-start">
                <div className="text-3xl">🔑</div>
                <button
                  onClick={() => {
                    setShowLoginModal(false);
                    setLoginSuccessMessage("");
                  }}
                  className="text-mist hover:text-ink font-semibold text-xs"
                >
                  Close
                </button>
              </div>

              <h2 className="text-lg font-display font-bold text-forest mt-3 tracking-tight">Caregiver Community Portal</h2>
              <p className="text-xs text-mist mt-1 leading-relaxed">
                Enter your email address. We'll send a passwordless login Magic Link directly to your inbox to establish your session securely.
              </p>

              {loginSuccessMessage ? (
                <div className="mt-4 p-3.5 bg-forest/5 border border-forest/20 text-forest text-xs font-medium rounded-xl space-y-2 text-center">
                  <CheckCircle className="w-6 h-6 text-forest mx-auto" />
                  <p className="leading-snug">{loginSuccessMessage}</p>
                </div>
              ) : (
                <form onSubmit={handleSendMagicLink} className="mt-4 space-y-3">
                  <div>
                    <label className="text-[10px] font-mono text-mist uppercase tracking-wider block mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. volunteer@pawmap.org"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full p-2.5 bg-dusk/30 border border-parchment rounded-lg text-xs font-medium focus:outline-none focus:border-forest focus:bg-white"
                    />
                  </div>

                  <button
                    id="btn-login-submit"
                    type="submit"
                    disabled={loginLoading}
                    className="w-full py-2.5 bg-forest hover:bg-forest/90 disabled:bg-forest/50 text-white text-xs font-display font-bold rounded-lg transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {loginLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Issuing link...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" /> Send Magic Link
                      </>
                    )}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      </div> {/* Main Content Area wrapper */}

      {/* 3. Mobile Responsive Navigation Bar (Bottom) */}
      <div className="md:hidden glass-nav w-full shrink-0 z-30 relative pb-4 pt-1" id="mobile-navigation">
        <div className="h-16 flex justify-around items-center px-6">
          {/* Map Tab Button */}
          <button
            id="mobile-tab-map"
            onClick={() => setActiveTab("map")}
            className={`flex flex-col items-center gap-0.5 cursor-pointer transition-all ${
              activeTab === "map" ? "text-moss font-bold scale-105" : "text-mist hover:text-ink"
            }`}
          >
            <MapIcon className="w-5 h-5" />
            <span className="text-[10px] font-display font-medium">Community Map</span>
          </button>

          {/* Centered FAB Button (Sighting Log Squeezed Center) */}
          <div className="relative -top-5">
            <button
              id="mobile-fab-report"
              onClick={() => {
                if (typeof navigator !== "undefined" && navigator.vibrate) {
                  navigator.vibrate(60); // Highlight haptic tap for main FAB
                }
                setShowReportWizard(true);
              }}
              style={{ boxShadow: "0 4px 20px rgba(13,92,74,0.4)" }}
              className="w-14 h-14 bg-forest hover:bg-forest/95 text-white rounded-full flex items-center justify-center transition-all scale-100 active:scale-95 shadow-lg cursor-pointer hover:scale-105"
            >
              <Plus className="w-7 h-7 text-white" />
            </button>
          </div>

          {/* Activities Feed Tab Button */}
          <button
            id="mobile-tab-feed"
            onClick={() => setActiveTab("feed")}
            className={`flex flex-col items-center gap-0.5 cursor-pointer transition-all ${
              activeTab === "feed" ? "text-moss font-bold scale-105" : "text-mist hover:text-ink"
            }`}
          >
            <Library className="w-5 h-5" />
            <span className="text-[10px] font-display font-medium">Activity Logs</span>
          </button>
        </div>
      </div>
    </div>
  );
}

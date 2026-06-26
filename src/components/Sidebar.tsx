import React, { useState } from "react";
import { ICat } from "../../server/db.js";
import { BarChart3, ListCollapse, MessageSquare, Shield, Smile, Sparkles, MapPin, ClipboardList, Info } from "lucide-react";

interface SidebarProps {
  cats: ICat[];
  onSelectCat: (id: string) => void;
  userEmail: string | null;
  onLogout: () => void;
  onOpenLogin: () => void;
  collapsed: boolean;
  setCollapsed: (c: boolean) => void;
}

export default function Sidebar({
  cats,
  onSelectCat,
  userEmail,
  onLogout,
  onOpenLogin,
  collapsed,
  setCollapsed
}: SidebarProps) {
  // Generate mock activity feed based on current seed cats history to make it look active
  const activityList = React.useMemo(() => {
    const list: Array<{
      id: string;
      nickname: string;
      catId: string;
      message: string;
      by: string;
      timeAgo: string;
      status: string;
    }> = [];

    cats.forEach(c => {
      c.history.forEach((h, i) => {
        list.push({
          id: `${c._id}_h_${i}`,
          nickname: c.nickname,
          catId: c._id,
          message: h.action,
          by: h.by.split("@")[0], // Keep it clean/friendly
          timeAgo: new Date(h.at).toLocaleDateString(),
          status: c.status
        });
      });
    });

    // Sort by Date
    return list.sort((a, b) => b.id.localeCompare(a.id)).slice(0, 8);
  }, [cats]);

  // Statistics
  const totalTracked = cats.reduce((acc, c) => acc + (c.count || 1), 0);
  const activeTnr = cats.filter(c => c.status === "tnr").length;
  const totalAdopted = cats.filter(c => c.status === "adopted").length;

  return (
    <aside
      id="sidebar"
      className={`bg-parchment border-r border-[#E5E0D5] h-full flex flex-col transition-all duration-300 shadow-sm ${
        collapsed ? "w-0 md:w-16 overflow-hidden" : "w-full md:w-80"
      }`}
    >
      {/* Sidebar Header */}
      <div className="p-4 border-b border-[#E5E0D5] flex justify-between items-center bg-transparent sticky top-0 z-10">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <span className="text-xl">📊</span>
            <h2 className="text-sm font-display font-bold text-ink uppercase tracking-wider">Meow Dashboard</h2>
          </div>
        )}
        {collapsed && (
          <span className="text-xl mx-auto block text-center" title="Dashboard">📊</span>
        )}
        <button
          id="toggle-sidebar"
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-white text-mist hover:text-ink transition-colors cursor-pointer hidden md:block"
        >
          <ListCollapse className="w-5 h-5" />
        </button>
      </div>

      {!collapsed ? (
        <div className="flex-1 overflow-y-auto p-4 pb-12 space-y-5 flex flex-col h-full min-h-0">
          {/* Stats Dashboard Section */}
          <div>
            <h3 className="text-xs font-display font-bold text-ink uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <BarChart3 className="w-4.5 h-4.5 text-moss" /> Pawsome Stats
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 bg-white rounded-xl border border-black/5 text-center shadow-xs">
                <span className="block text-xl font-bold font-display text-forest">{totalTracked}</span>
                <span className="text-[9px] text-mist font-medium leading-none">Paws Logged</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-black/5 text-center shadow-xs">
                <span className="block text-xl font-bold font-display text-clay">{activeTnr}</span>
                <span className="text-[9px] text-clay font-medium leading-none">TNR Quests</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-black/5 text-center shadow-xs">
                <span className="block text-xl font-bold font-display text-sage">{totalAdopted}</span>
                <span className="text-[9px] text-sage font-medium leading-none">Warm Beds 🏡</span>
              </div>
            </div>
          </div>

          {/* Live Activity Feed */}
          <div>
            <h3 className="text-xs font-display font-bold text-ink uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Sparkles className="w-4.5 h-4.5 text-clay" /> Whisker Activity Feed 📢
            </h3>
            <div className="space-y-2 pr-1">
              {activityList.length === 0 ? (
                <div className="text-center py-6 bg-white/50 rounded-xl border border-dashed border-[#E5E0D5] p-3">
                  <p className="text-xs text-mist">No recent meows. Be the first to spot a kitty! 🐾</p>
                </div>
              ) : (
                activityList.map((act) => {
                  let statusColor = "#378ADD"; // Sighting Blue
                  if (act.status === "tnr") statusColor = "#D85A30";
                  else if (act.status === "colony") statusColor = "#1D9E75";
                  else if (act.status === "adopted") statusColor = "#639922";

                  return (
                    <div
                      key={act.id}
                      id={`activity-item-${act.id}`}
                      onClick={() => onSelectCat(act.catId)}
                      className="flex gap-3 items-start p-2.5 hover:bg-white rounded-xl transition-all duration-200 cursor-pointer text-left group"
                    >
                      <div
                        className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs text-white font-bold shadow-xs transition-transform group-hover:scale-105"
                        style={{ backgroundColor: statusColor }}
                      >
                        🐱
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-ink truncate flex justify-between items-center gap-1">
                          <span className="group-hover:text-forest transition-colors">{act.nickname}</span>
                          <span className="text-[9px] text-mist font-normal font-mono shrink-0">{act.timeAgo}</span>
                        </p>
                        <p className="text-xs text-mist leading-snug line-clamp-2 mt-0.5">
                          {act.message} <span className="text-ink/80 font-medium font-mono text-[10px]">@{act.by}</span>
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Want to Help Banner */}
          <div className="p-4 bg-forest rounded-xl text-white shadow-xs shrink-0">
            <p className="text-xs font-semibold uppercase tracking-wider mb-1">Want to help? 🐾</p>
            <p className="text-[11px] opacity-90 leading-relaxed">
              There are {cats.filter(c => c.status === "colony").length || 3} colonies nearby needing food donations or caregiver volunteers. Join in!
            </p>
          </div>
        </div>
      ) : (
        /* Collapsed minimal rail view */
        <div className="flex-1 flex flex-col items-center py-6 gap-6 text-mist font-medium">
          <button onClick={onOpenLogin} className="p-2 bg-white rounded-xl border border-[#E5E0D5] hover:bg-white text-forest" title="Account">
            <Smile className="w-5 h-5" />
          </button>
          <div className="w-8 h-px bg-[#E5E0D5]" />
          <div className="flex flex-col items-center gap-1" title={`${totalTracked} tracked`}>
            <MapPin className="w-5 h-5 text-forest" />
            <span className="text-xs font-bold text-ink">{totalTracked}</span>
          </div>
          <div className="flex flex-col items-center gap-1" title={`${activeTnr} TNR active`}>
            <Shield className="w-5 h-5 text-clay" />
            <span className="text-xs font-bold text-clay">{activeTnr}</span>
          </div>
          <div className="flex flex-col items-center gap-1" title={`${totalAdopted} adopted`}>
            <Smile className="w-5 h-5 text-sage" />
            <span className="text-xs font-bold text-sage">{totalAdopted}</span>
          </div>
        </div>
      )}

      {/* Sidebar Footer info */}
      {!collapsed && (
        <div className="p-4 border-t border-[#E5E0D5] bg-white/30 text-[10px] text-mist flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-moss shrink-0" />
          <span>
            Help map stray colonies, trapping history, and medical records to support local shelters.
          </span>
        </div>
      )}
    </aside>
  );
}

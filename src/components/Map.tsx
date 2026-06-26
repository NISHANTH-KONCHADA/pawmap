import React, { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from "react-leaflet";
import L from "leaflet";
import { ICat } from "../../server/db.js";
import socket from "../lib/socket.js";
import { MapPin, ShieldAlert, Heart, Calendar } from "lucide-react";

// Custom Leaflet DivIcon drop shape matching the Vibrant Palette!
const createCustomIcon = (status: string, count: number, isSelected: boolean) => {
  let bgColor = "#378ADD"; // Sighting Blue
  if (status === "tnr") bgColor = "#D85A30"; // TNR Clay/Orange
  else if (status === "colony") bgColor = "#1D9E75"; // Colony Moss Green
  else if (status === "adopted") bgColor = "#639922"; // Adopted Sage Green

  const sizeValue = status === "colony" ? 38 : 32;
  const countMarkup = status === "colony" 
    ? `<span class="text-white font-bold text-xs shrink-0">${count}</span>` 
    : `<span class="text-xs shrink-0">🐱</span>`;

  const selectedBorder = isSelected 
    ? "border-[#FAF6F0] ring-4 ring-[#0D5C4A]/40 scale-110" 
    : "border-white";

  return L.divIcon({
    className: "custom-div-icon",
    html: `
      <div class="relative flex items-center justify-center transition-all duration-300">
        <div class="rounded-full rounded-bl-none border-2 shadow-[0_4px_10px_rgba(0,0,0,0.15)] flex items-center justify-center ${selectedBorder}" 
             style="background-color: ${bgColor}; width: ${sizeValue}px; height: ${sizeValue}px; transform: rotate(45deg); transform-origin: center;">
          <div class="flex items-center justify-center" style="transform: rotate(-45deg); width: 100%; height: 100%;">
            ${countMarkup}
          </div>
        </div>
      </div>
    `,
    iconSize: [sizeValue, sizeValue],
    iconAnchor: [sizeValue / 2, sizeValue],
    popupAnchor: [0, -sizeValue]
  });
};

interface MapProps {
  cats: ICat[];
  activeFilter: string;
  onSelectCat: (id: string) => void;
  selectedCatId: string | null;
  onMapClick?: (lat: number, lng: number) => void;
  userLocation: [number, number] | null;
  setUserLocation: (loc: [number, number]) => void;
}

// Controller to handle map ref centering once geolocation loads
function MapController({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom(), { animate: true });
    }
  }, [center, map]);
  return null;
}

export default function Map({
  cats,
  activeFilter,
  onSelectCat,
  selectedCatId,
  onMapClick,
  userLocation,
  setUserLocation
}: MapProps) {
  const [mapCenter, setMapCenter] = useState<[number, number]>([51.505, -0.09]);
  const isGeoLoaded = useRef(false);

  // Get user geolocation on mount
  useEffect(() => {
    if (navigator.geolocation && !isGeoLoaded.current) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc: [number, number] = [position.coords.latitude, position.coords.longitude];
          setMapCenter(loc);
          setUserLocation(loc);
          isGeoLoaded.current = true;
          console.log("[Geolocation] Centered map at user location:", loc);
        },
        (error) => {
          console.warn("[Geolocation] User geolocation denied or failed. Defaulting to London:", error);
          setUserLocation([51.505, -0.09]);
          isGeoLoaded.current = true;
        }
      );
    }
  }, [setUserLocation]);

  // Filter cats based on status
  const filteredCats = cats.filter((cat) => {
    if (activeFilter === "all") return true;
    return cat.status === activeFilter;
  });

  return (
    <div className="w-full h-full relative" id="map-container-wrapper">
      <MapContainer
        center={mapCenter}
        zoom={14}
        className="w-full h-full z-0"
        dragging={true}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
        attributionControl={false}
        zoomControl={false}
      >
        <ZoomControl position="topright" />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {/* Dynamic Map centering */}
        {userLocation && <MapController center={userLocation} />}

        {/* Render Cat Pins */}
        {filteredCats.map((cat) => {
          const [lng, lat] = cat.location.coordinates;
          const isSelected = selectedCatId === cat._id;

          return (
            <Marker
              key={cat._id}
              position={[lat, lng]}
              icon={createCustomIcon(cat.status, cat.count || 1, isSelected)}
              eventHandlers={{
                click: () => {
                  onSelectCat(cat._id);
                }
              }}
            >
              <Popup closeButton={false}>
                <div className="p-2 min-w-[160px] text-left font-sans">
                  <div className="flex justify-between items-center gap-1.5 mb-1">
                    <span className="font-display font-bold text-sm text-forest truncate block">
                      {cat.nickname}
                    </span>
                    <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${
                      cat.status === "adopted"
                        ? "bg-sage/10 text-sage border-sage/20"
                        : cat.status === "tnr"
                        ? "bg-sky/10 text-sky border-sky/20"
                        : cat.status === "colony"
                        ? "bg-lavender/10 text-lavender border-lavender/20"
                        : "bg-clay/10 text-clay border-clay/20"
                    }`}>
                      {cat.status}
                    </span>
                  </div>

                  <p className="text-xs text-mist font-medium flex items-center gap-1 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-clay shrink-0" /> Condition: {cat.condition}
                  </p>

                  {cat.status === "colony" && (
                    <p className="text-[10px] text-lavender font-semibold flex items-center gap-1 mt-1">
                      <ShieldAlert className="w-3.5 h-3.5 shrink-0" /> Est. Count: {cat.count} cats
                    </p>
                  )}

                  {cat.tnrEvent && cat.status === "tnr" && (
                    <p className="text-[10px] text-sky font-semibold flex items-center gap-1 mt-1">
                      <Calendar className="w-3.5 h-3.5 shrink-0" /> TNR: {new Date(cat.tnrEvent.scheduledDate).toLocaleDateString()}
                    </p>
                  )}

                  <button
                    id={`popup-view-btn-${cat._id}`}
                    onClick={() => onSelectCat(cat._id)}
                    className="mt-2 w-full py-1.5 text-center text-[10px] font-display font-semibold bg-forest hover:bg-forest/90 text-white rounded-lg transition-all shadow-sm cursor-pointer"
                  >
                    Open Paw-sport 🐾
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>


    </div>
  );
}

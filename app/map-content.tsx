"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import hospitalsData from "../data/allergy-hospitals.json";

interface Hospital {
  name: string;
  region: string;
  district: string;
  address: string;
  depts: string[];
  doctors: Record<string, string[]>;
  tel: string;
  lat: number;
  lng: number;
  jext: boolean;
  firazyr?: boolean;
}

const HOSPITALS = hospitalsData as Hospital[];

const DEPT_COLORS: Record<string, string> = {
  내과: "#16a34a",
  소아청소년과: "#9333ea",
  피부과: "#ea580c",
  이비인후과: "#0891b2",
};

const DEPT_ORDER = ["내과", "소아청소년과", "피부과", "이비인후과"];

function regionLabel(r: string) {
  return r.replace("특별시", "").replace("광역시", "").replace("도", "");
}

function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const NEARBY_RADIUS_KM = 20;

export default function AllergyMapContent() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const listRef = useRef<HTMLDivElement>(null);

  const [searchText, setSearchText] = useState("");
  const [activeRegions, setActiveRegions] = useState<Set<string>>(new Set());
  const [activeDepts, setActiveDepts] = useState<Set<string>>(new Set());
  const [jextOnly, setJextOnly] = useState(false);
  const [firazyrOnly, setFirazyrOnly] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const [panelOpen, setPanelOpen] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [nearbyMode, setNearbyMode] = useState(false);
  const userMarkerRef = useRef<L.Marker | null>(null);

  const regions = useMemo(
    () => [...new Set(HOSPITALS.map((h) => h.region))].sort(),
    []
  );

  const filtered = useMemo(() => {
    let results = HOSPITALS.filter((h) => {
      if (activeRegions.size && !activeRegions.has(h.region)) return false;
      if (activeDepts.size && !h.depts.some((d) => activeDepts.has(d)))
        return false;
      if (jextOnly && !h.jext) return false;
      if (firazyrOnly && !h.firazyr) return false;
      if (searchText) {
        const s = searchText.toLowerCase();
        const allDocs = Object.values(h.doctors).flat().join(" ").toLowerCase();
        const searchable =
          `${h.name} ${h.region} ${h.district} ${h.address} ${h.tel} ${allDocs}`.toLowerCase();
        if (!searchable.includes(s)) return false;
      }
      if (nearbyMode && userLocation) {
        const dist = getDistanceKm(userLocation.lat, userLocation.lng, h.lat, h.lng);
        if (dist > NEARBY_RADIUS_KM) return false;
      }
      return true;
    });
    if (nearbyMode && userLocation) {
      results.sort((a, b) =>
        getDistanceKm(userLocation.lat, userLocation.lng, a.lat, a.lng) -
        getDistanceKm(userLocation.lat, userLocation.lng, b.lat, b.lng)
      );
    }
    return results;
  }, [searchText, activeRegions, activeDepts, jextOnly, firazyrOnly, nearbyMode, userLocation]);

  const stats = useMemo(() => {
    const totalDocs = filtered.reduce(
      (s, h) => s + Object.values(h.doctors).flat().length,
      0
    );
    const jextCount = filtered.filter((h) => h.jext).length;
    const firazyrCount = filtered.filter((h) => h.firazyr).length;
    return {
      totalDocs,
      jextCount,
      firazyrCount,
      shown: filtered.length,
      total: HOSPITALS.length,
    };
  }, [filtered]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, { zoomControl: true }).setView(
      [36.5, 127.5],
      7
    );
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 18,
    }).addTo(map);

    mapInstanceRef.current = map;
    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update markers when filtered changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];

    filtered.forEach((h) => {
      const primaryDept = h.depts[0];
      const color = DEPT_COLORS[primaryDept] || "#6b7280";
      const icon = L.divIcon({
        className: "custom-marker",
        html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      const marker = L.marker([h.lat, h.lng], { icon }).addTo(map);

      let popupHtml = `<div style="font-family:system-ui,sans-serif;min-width:180px;max-width:260px">`;
      popupHtml += `<div style="font-weight:700;font-size:14px;margin-bottom:4px;word-break:keep-all">${h.name}</div>`;
      popupHtml += `<div style="font-size:11px;color:#64748b;margin-bottom:3px">${h.address}</div>`;
      if (h.tel)
        popupHtml += `<div style="font-size:11px;color:#64748b;margin-bottom:6px">📞 ${h.tel}</div>`;
      DEPT_ORDER.forEach((d) => {
        if (h.doctors[d]) {
          popupHtml += `<div style="margin-bottom:3px"><span style="display:inline-block;padding:1px 6px;border-radius:8px;background:${DEPT_COLORS[d]};color:white;font-size:10px;font-weight:500">${d}</span> <span style="font-size:11px">${h.doctors[d].join(", ")}</span></div>`;
        }
      });
      if (h.jext)
        popupHtml += `<div style="margin-top:4px"><span style="background:#fef3c7;color:#92400e;padding:1px 6px;border-radius:8px;font-size:10px;font-weight:600">💉 Jext® 처방</span></div>`;
      if (h.firazyr)
        popupHtml += `<div style="margin-top:4px"><span style="background:#ecfeff;color:#155e75;padding:1px 6px;border-radius:8px;font-size:10px;font-weight:600">💊 Firazyr® 처방</span></div>`;
      popupHtml += `</div>`;

      const isMobile = window.innerWidth < 768;
      marker.bindPopup(popupHtml, { maxWidth: isMobile ? 260 : 300 });

      const globalIdx = HOSPITALS.indexOf(h);
      marker.on("click", () => setSelectedIdx(globalIdx));

      markersRef.current.push(marker);
    });

    if (filtered.length > 0 && filtered.length < HOSPITALS.length) {
      const bounds = L.latLngBounds(
        filtered.map((h) => [h.lat, h.lng] as [number, number])
      );
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 13 });
    }
  }, [filtered]);

  // Invalidate map size when panel toggles
  useEffect(() => {
    const timer = setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 300);
    return () => clearTimeout(timer);
  }, [panelOpen]);

  const selectHospital = useCallback((idx: number) => {
    setSelectedIdx(idx);
    const h = HOSPITALS[idx];
    const map = mapInstanceRef.current;
    if (!map) return;

    map.setView([h.lat, h.lng], 14);
    markersRef.current.forEach((m) => {
      const ll = m.getLatLng();
      if (
        Math.abs(ll.lat - h.lat) < 0.0001 &&
        Math.abs(ll.lng - h.lng) < 0.0001
      ) {
        m.openPopup();
      }
    });

    // On mobile, switch to map view
    setPanelOpen(false);
  }, []);

  const toggleRegion = useCallback((region: string) => {
    setActiveRegions((prev) => {
      const next = new Set(prev);
      if (next.has(region)) next.delete(region);
      else next.add(region);
      return next;
    });
  }, []);

  const toggleDept = useCallback((dept: string) => {
    setActiveDepts((prev) => {
      const next = new Set(prev);
      if (next.has(dept)) next.delete(dept);
      else next.add(dept);
      return next;
    });
  }, []);

  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) {
      alert("이 브라우저에서는 위치 서비스를 지원하지 않습니다.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setUserLocation({ lat, lng });
        setNearbyMode(true);
        setLocating(false);

        const map = mapInstanceRef.current;
        if (map) {
          // Remove old user marker
          if (userMarkerRef.current) {
            map.removeLayer(userMarkerRef.current);
          }
          const userIcon = L.divIcon({
            className: "custom-marker",
            html: `<div style="width:18px;height:18px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 0 2px #3b82f6,0 2px 6px rgba(0,0,0,0.3)"></div>`,
            iconSize: [18, 18],
            iconAnchor: [9, 9],
          });
          userMarkerRef.current = L.marker([lat, lng], { icon: userIcon })
            .addTo(map)
            .bindPopup(`<div style="font-family:system-ui,sans-serif;font-size:13px;font-weight:600">📍 현재 위치</div>`);
          map.setView([lat, lng], 12);
        }
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          alert("위치 권한이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해 주세요.");
        } else {
          alert("현재 위치를 가져올 수 없습니다. 다시 시도해 주세요.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const clearNearbyMode = useCallback(() => {
    setNearbyMode(false);
    setUserLocation(null);
    const map = mapInstanceRef.current;
    if (map && userMarkerRef.current) {
      map.removeLayer(userMarkerRef.current);
      userMarkerRef.current = null;
    }
  }, []);

  // Scroll selected card into view
  useEffect(() => {
    if (selectedIdx < 0 || !listRef.current) return;
    const card = listRef.current.querySelector(
      `[data-idx="${selectedIdx}"]`
    );
    if (card) {
      card.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selectedIdx]);

  return (
    <>
      {/* Leaflet + Tailwind CSS fix */}
      <style>{`
        .leaflet-container img { max-width: none !important; max-height: none !important; }
        .leaflet-container { font-family: system-ui, sans-serif; font-size: 13px; }
        .custom-marker { background: transparent !important; border: none !important; }
        .leaflet-popup-content-wrapper { border-radius: 10px; }
        .allergy-map-scroll { -webkit-overflow-scrolling: touch; overscroll-behavior: contain; }
      `}</style>

      <div className="fixed inset-0 z-10 flex flex-col md:flex-row bg-background">
        {/* Mobile toggle */}
        <button
          className="absolute left-1/2 -translate-x-1/2 md:hidden z-[1000] rounded-full bg-white px-4 py-2 text-xs font-semibold shadow-lg border dark:bg-gray-800 dark:border-gray-600"
          style={{ top: "max(0.75rem, env(safe-area-inset-top, 0.75rem))" }}
          onClick={() => setPanelOpen(!panelOpen)}
        >
          {panelOpen ? "🗺️ 지도 보기" : "📋 목록 보기"}
        </button>

        {/* Side Panel */}
        <div
          className={`${
            panelOpen ? "flex" : "hidden md:flex"
          } flex-col w-full h-full md:w-[400px] md:shrink-0 border-r border-border bg-card overflow-hidden`}
        >
          {/* Header - extra top space on mobile for hamburger button */}
          <div className="bg-gradient-to-br from-blue-900 to-blue-600 text-white px-5 pt-12 pb-4 md:py-4 standalone-safe-top">
            <h1 className="text-base font-bold flex items-center gap-2">
              🏥 대한천식알레르기학회 전문의 병원
            </h1>
            <p className="text-xs opacity-85 mt-0.5">
              KAAACI Allergy Specialist Hospital Map
            </p>
          </div>

          {/* Stats Bar */}
          <div className="flex flex-wrap gap-x-2 gap-y-0.5 px-5 py-2 bg-blue-50 dark:bg-blue-950/30 border-b border-border text-xs text-muted-foreground">
            전체{" "}
            <span className="font-semibold text-blue-600">{stats.total}</span>
            개 병원 ·{" "}
            <span className="font-semibold text-blue-600">{stats.shown}</span>
            개 표시 · 의사{" "}
            <span className="font-semibold text-blue-600">
              {stats.totalDocs}
            </span>
            명 · Jext®{" "}
            <span className="font-semibold text-blue-600">
              {stats.jextCount}
            </span>
            개 · Firazyr®{" "}
            <span className="font-semibold text-blue-600">
              {stats.firazyrCount}
            </span>
            개
          </div>

          {/* Search & Filters */}
          <div className="px-4 py-3 border-b border-border space-y-2.5">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="병원명, 의사명, 지역, 주소 검색..."
                className="w-full py-2 pl-9 pr-3 border border-border rounded-lg text-sm bg-muted/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>

            {/* Region Filter */}
            <div>
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                지역 필터
              </div>
              <div className="flex flex-wrap gap-1.5">
                {regions.map((r) => (
                  <button
                    key={r}
                    onClick={() => toggleRegion(r)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                      activeRegions.has(r)
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-card border-border hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                    }`}
                  >
                    {regionLabel(r)}
                  </button>
                ))}
              </div>
            </div>

            {/* Dept Filter */}
            <div>
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                진료과 필터
              </div>
              <div className="flex flex-wrap gap-1.5">
                {DEPT_ORDER.map((d) => (
                  <button
                    key={d}
                    onClick={() => toggleDept(d)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                      activeDepts.has(d)
                        ? "text-white border-transparent"
                        : "bg-card border-border hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                    }`}
                    style={
                      activeDepts.has(d)
                        ? {
                            backgroundColor: DEPT_COLORS[d],
                            borderColor: DEPT_COLORS[d],
                          }
                        : undefined
                    }
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Jext Toggle */}
            <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
              <input
                type="checkbox"
                checked={jextOnly}
                onChange={(e) => setJextOnly(e.target.checked)}
                className="accent-blue-600"
              />
              젝스트(Jext®) 처방 가능 병원만 보기
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
              <input
                type="checkbox"
                checked={firazyrOnly}
                onChange={(e) => setFirazyrOnly(e.target.checked)}
                className="accent-cyan-700"
              />
              파라지르(Firazyr®) 처방 가능 병원만 보기
            </label>

            {/* Nearby location button */}
            <div className="pt-1">
              {nearbyMode ? (
                <button
                  onClick={clearNearbyMode}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  📍 내 주변 {NEARBY_RADIUS_KM}km 검색 중 — 해제
                </button>
              ) : (
                <button
                  onClick={handleLocateMe}
                  disabled={locating}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800 transition-colors disabled:opacity-50"
                >
                  {locating ? "위치 확인 중..." : "📍 내 주변 병원 찾기"}
                </button>
              )}
            </div>
          </div>

          {/* Result Count */}
          <div className="px-4 py-1.5 text-[11px] text-muted-foreground bg-muted/50 border-b border-border">
            검색 결과: {filtered.length}개 병원
          </div>

          {/* Hospital List */}
          <div ref={listRef} className="allergy-map-scroll flex-1 min-h-0 overflow-y-auto">
            {filtered.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                검색 결과가 없습니다.
              </div>
            )}
            {filtered.map((h) => {
              const idx = HOSPITALS.indexOf(h);
              return (
                <div
                  key={`${h.name}-${h.address}`}
                  data-idx={idx}
                  onClick={() => selectHospital(idx)}
                  className={`px-4 py-3 border-b border-border cursor-pointer transition-colors hover:bg-blue-50 dark:hover:bg-blue-950/20 ${
                    idx === selectedIdx
                      ? "bg-blue-100 dark:bg-blue-950/40 border-l-[3px] border-l-blue-600"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-sm font-semibold">{h.name}</span>
                    {h.jext && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded text-[10px] font-semibold">
                        💉 Jext®
                      </span>
                    )}
                    {h.firazyr && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-300 rounded text-[10px] font-semibold">
                        💊 Firazyr®
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground mb-1 flex items-center gap-1.5">
                    <span>{h.region} {h.district}</span>
                    {nearbyMode && userLocation && (
                      <span className="text-blue-600 font-semibold">
                        {getDistanceKm(userLocation.lat, userLocation.lng, h.lat, h.lng).toFixed(1)}km
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground mb-1.5">
                    📍 {h.address}
                  </div>
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    {DEPT_ORDER.map((d) =>
                      h.doctors[d] ? (
                        <span
                          key={d}
                          className="px-2 py-0.5 rounded-full text-[10px] font-medium text-white"
                          style={{ backgroundColor: DEPT_COLORS[d] }}
                        >
                          {d} ({h.doctors[d].length})
                        </span>
                      ) : null
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground leading-relaxed">
                    {DEPT_ORDER.map((d) =>
                      h.doctors[d] ? (
                        <div key={d}>
                          <span
                            className="font-medium"
                            style={{ color: DEPT_COLORS[d] }}
                          >
                            {d}:
                          </span>{" "}
                          {h.doctors[d].join(", ")}
                        </div>
                      ) : null
                    )}
                  </div>
                  {h.tel && (
                    <div className="text-[11px] text-muted-foreground mt-1">
                      📞 {h.tel}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Map */}
        <div
          className={`flex-1 relative ${
            panelOpen ? "hidden md:block" : "block"
          }`}
        >
          <div ref={mapRef} className="w-full h-full" />

          {/* Locate me button */}
          <button
            onClick={handleLocateMe}
            disabled={locating}
            className="absolute top-20 right-3 z-[1000] w-10 h-10 bg-white rounded-lg shadow-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 dark:bg-gray-800 dark:border-gray-600"
            title="현재 위치로 이동"
          >
            {locating ? (
              <svg className="animate-spin h-5 w-5 text-blue-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="h-5 w-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v4m0 12v4m10-10h-4M6 12H2" />
              </svg>
            )}
          </button>

          {/* Nearby mode indicator */}
          {nearbyMode && (
            <div className="absolute top-20 left-3 z-[1000] bg-blue-600 text-white px-3 py-1.5 rounded-full shadow-lg text-xs font-medium flex items-center gap-2">
              📍 반경 {NEARBY_RADIUS_KM}km 내 병원
              <button
                onClick={clearNearbyMode}
                className="ml-1 w-5 h-5 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 text-[10px]"
              >
                ✕
              </button>
            </div>
          )}

          {/* Legend */}
          <div className="absolute bottom-6 right-3 z-[1000] bg-card p-3 rounded-lg shadow-lg text-[11px] border border-border">
            <div className="font-semibold mb-1.5">진료과 구분</div>
            {DEPT_ORDER.map((d) => (
              <div key={d} className="flex items-center gap-2 mb-0.5">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: DEPT_COLORS[d] }}
                />
                <span>{d === "내과" ? "내과 (알레르기내과)" : d}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

/**
 * Free interactive map: MapLibre GL JS (open source) + OpenFreeMap vector tiles.
 * No API key, no registration, no usage limits, commercial use allowed.
 * Map data © OpenStreetMap contributors (attribution is shown automatically).
 * https://openfreemap.org
 */
const STYLE_LIGHT = 'https://tiles.openfreemap.org/styles/liberty';
const STYLE_DARK = 'https://tiles.openfreemap.org/styles/dark';

export interface FreeMapMarker {
  id: string;
  lat: number;
  lng: number;
  label?: string;
}

interface Props {
  center: { lat: number; lng: number };
  zoom?: number;
  markers: FreeMapMarker[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  /** Blue dot for the user's own position. */
  userLocation?: { lat: number; lng: number } | null;
  dark?: boolean;
  /** Fit the view so every marker is visible. */
  fitToMarkers?: boolean;
  className?: string;
  interactive?: boolean;
}

function pinElement(selected: boolean, label?: string) {
  const el = document.createElement('button');
  el.type = 'button';
  el.setAttribute('aria-label', label || 'Quán');
  el.title = label || '';
  el.style.cssText = `width:${selected ? 34 : 28}px;height:${selected ? 34 : 28}px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);` +
    `background:${selected ? '#D4AF37' : '#800020'};border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);cursor:pointer;padding:0;`;
  const dot = document.createElement('span');
  dot.style.cssText = 'display:block;width:8px;height:8px;margin:auto;border-radius:50%;background:#fff;';
  el.appendChild(dot);
  el.style.display = 'flex';
  el.style.alignItems = 'center';
  el.style.justifyContent = 'center';
  return el;
}

function userDot() {
  const el = document.createElement('div');
  el.setAttribute('aria-label', 'Vị trí của bạn');
  el.style.cssText = 'width:16px;height:16px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 6px rgba(37,99,235,.25);';
  return el;
}

export default function FreeMap({
  center, zoom = 14, markers, selectedId, onSelect, userLocation, dark, fitToMarkers, className, interactive = true
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRefs = useRef<maplibregl.Marker[]>([]);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const [failed, setFailed] = useState(false);

  // Create the map once.
  useEffect(() => {
    if (!containerRef.current) return;
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: dark ? STYLE_DARK : STYLE_LIGHT,
        center: [center.lng, center.lat],
        zoom,
        interactive,
        attributionControl: { compact: true }
      });
    } catch {
      setFailed(true); // WebGL not available on this device
      return;
    }
    if (interactive) map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left');
    // If the dark style is unavailable, fall back to the standard style.
    map.on('error', e => {
      const msg = String((e as any)?.error?.message || '');
      if (dark && /style/i.test(msg)) map.setStyle(STYLE_LIGHT);
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [dark, interactive]);

  // Keep the camera on the requested center.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || fitToMarkers) return;
    map.easeTo({ center: [center.lng, center.lat], duration: 400 });
  }, [center.lat, center.lng, fitToMarkers]);

  // Shop markers.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markerRefs.current.forEach(m => m.remove());
    markerRefs.current = markers
      .filter(m => Number.isFinite(m.lat) && Number.isFinite(m.lng))
      .map(m => {
        const el = pinElement(m.id === selectedId, m.label);
        el.addEventListener('click', ev => {
          ev.stopPropagation();
          onSelect?.(m.id);
        });
        return new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([m.lng, m.lat]).addTo(map);
      });
    if (fitToMarkers && markers.length > 0) {
      const b = new maplibregl.LngLatBounds();
      markers.forEach(m => b.extend([m.lng, m.lat]));
      if (userLocation) b.extend([userLocation.lng, userLocation.lat]);
      map.fitBounds(b, { padding: 48, maxZoom: 15, duration: 0 });
    }
  }, [markers, selectedId, fitToMarkers]);

  // User location dot.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    userMarkerRef.current?.remove();
    userMarkerRef.current = userLocation
      ? new maplibregl.Marker({ element: userDot() }).setLngLat([userLocation.lng, userLocation.lat]).addTo(map)
      : null;
  }, [userLocation?.lat, userLocation?.lng]);

  if (failed) {
    return (
      <div className={`flex items-center justify-center text-xs text-slate-500 bg-slate-100 ${className || ''}`}>
        Thiết bị không hỗ trợ hiển thị bản đồ (WebGL).
      </div>
    );
  }
  return <div ref={containerRef} className={className} style={{ width: '100%', height: '100%' }} />;
}

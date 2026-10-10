/**
 * Universal Google Maps URL & Deep Linking Utility
 * 
 * Complies with official Google Maps URLs API:
 * https://developers.google.com/maps/documentation/urls/get-started#search-action
 * 
 * Standard Format:
 * https://www.google.com/maps/search/?api=1&query=PLACE_NAME&query_place_id=PLACE_ID
 */

import type React from 'react';

export interface PlaceLocationSource {
  place_id?: string;
  placeId?: string;
  id?: string;
  name?: string;
  displayName?: string | { text?: string };
  address?: string;
  formattedAddress?: string;
  fullAddress?: string;
  location?: { lat?: number; lng?: number; latitude?: number; longitude?: number };
  latitude?: number;
  longitude?: number;
  googleMapsUrl?: string;
  googleMapsUri?: string;
}

/**
 * Extracts and sanitizes the Google Place ID from various object representations.
 * Rejects undefined, null, placeholders, or dummy ids.
 */
export function extractCleanPlaceId(place: PlaceLocationSource | null | undefined): string | null {
  if (!place) return null;

  let rawId: string | null = null;

  if (typeof place.place_id === 'string' && place.place_id.trim()) {
    rawId = place.place_id.trim();
  } else if (typeof place.placeId === 'string' && place.placeId.trim()) {
    rawId = place.placeId.trim();
  } else if (typeof place.id === 'string' && place.id.trim()) {
    const id = place.id.trim();
    if (id.startsWith('gplace_')) {
      rawId = id.replace('gplace_', '');
    } else if (id.startsWith('prog_')) {
      rawId = id.replace('prog_', '');
    } else if (id.startsWith('ChIJ') || id.length > 20) {
      rawId = id;
    }
  }

  if (!rawId) return null;

  // Filter out invalid/placeholder IDs
  const invalidPatterns = [
    'undefined',
    'null',
    'chij_google_place_id',
    'gplace_verified',
    'place_0',
    'place_1',
    'place_2',
    'placeholder',
    'mock',
    'demo'
  ];

  const lower = rawId.toLowerCase();
  for (const pattern of invalidPatterns) {
    if (lower === pattern || (lower.startsWith('place_') && !lower.startsWith('place_id'))) {
      return null;
    }
  }

  // Ensure it doesn't have "place_id:" or "Google Place ID:" prefix inside the string
  rawId = rawId.replace(/^place_id:/i, '').replace(/^google\s*place\s*id:\s*/i, '').trim();

  return rawId.length > 0 ? rawId : null;
}

/**
 * Extracts a clean place name for display and query label fallback.
 */
export function extractPlaceName(place: PlaceLocationSource | null | undefined): string {
  if (!place) return 'Coffee Shop';

  if (typeof place.name === 'string' && place.name.trim()) {
    return place.name.trim();
  }
  if (typeof place.displayName === 'string' && place.displayName.trim()) {
    return place.displayName.trim();
  }
  if (place.displayName && typeof place.displayName === 'object' && typeof place.displayName.text === 'string') {
    return place.displayName.text.trim();
  }

  return 'Coffee Shop';
}

/**
 * Extracts valid latitude and longitude coordinates if present.
 */
export function extractCoordinates(place: PlaceLocationSource | null | undefined): { lat: number; lng: number } | null {
  if (!place) return null;

  let lat: number | undefined;
  let lng: number | undefined;

  if (place.location) {
    lat = typeof place.location.lat === 'number' ? place.location.lat : (typeof place.location.latitude === 'number' ? place.location.latitude : undefined);
    lng = typeof place.location.lng === 'number' ? place.location.lng : (typeof place.location.longitude === 'number' ? place.location.longitude : undefined);
  }

  if (lat === undefined && typeof place.latitude === 'number') {
    lat = place.latitude;
  }
  if (lng === undefined && typeof place.longitude === 'number') {
    lng = place.longitude;
  }

  if (typeof lat === 'number' && !isNaN(lat) && typeof lng === 'number' && !isNaN(lng) && lat !== 0 && lng !== 0) {
    return { lat, lng };
  }

  return null;
}

/**
 * Extracts formatted address string if available.
 */
export function extractAddress(place: PlaceLocationSource | null | undefined): string | null {
  if (!place) return null;

  const addr = place.formattedAddress || place.address || place.fullAddress;
  if (typeof addr === 'string' && addr.trim() && addr.trim() !== 'undefined' && addr.trim() !== 'null') {
    return addr.trim();
  }

  return null;
}

/**
 * Construct universal Google Maps URL following strict fallback priority:
 * 1. Google Place ID: `https://www.google.com/maps/search/?api=1&query=PLACE_NAME&query_place_id=PLACE_ID`
 * 2. Google Coordinates: `https://www.google.com/maps/search/?api=1&query=lat,lng`
 * 3. Formatted Address: `https://www.google.com/maps/search/?api=1&query=NAME_AND_ADDRESS`
 * 4. Place Name: `https://www.google.com/maps/search/?api=1&query=PLACE_NAME`
 */
export function getGoogleMapsUrl(place: PlaceLocationSource | null | undefined): string {
  if (!place) {
    return 'https://www.google.com/maps';
  }

  const placeId = extractCleanPlaceId(place);
  const placeName = extractPlaceName(place);
  const coords = extractCoordinates(place);
  const address = extractAddress(place);

  // 1. Primary: Google Place ID (Standard Google Maps URLs API)
  if (placeId) {
    const encodedName = encodeURIComponent(placeName);
    const encodedPlaceId = encodeURIComponent(placeId);
    return `https://www.google.com/maps/search/?api=1&query=${encodedName}&query_place_id=${encodedPlaceId}`;
  }

  // 2. Fallback: Google Coordinates
  if (coords) {
    return `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`;
  }

  // 3. Fallback: Formatted Address (+ Place Name)
  if (address) {
    const query = placeName && !address.includes(placeName) ? `${placeName}, ${address}` : address;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }

  // 4. Fallback: Place Name
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeName)}`;
}

/**
 * Detects if the current user agent is a mobile or tablet device.
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
  const isSmallScreen = window.matchMedia && window.matchMedia('(max-width: 820px)').matches;
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  return isMobileUA || (isSmallScreen && hasTouch);
}

/**
 * Universal handler to open Google Maps on Mobile and Desktop.
 * 
 * - Mobile: Uses official Universal Link / App Link URL which opens the Google Maps app directly if installed,
 *   with zero text query mangling, and falls back to mobile web seamlessly.
 * - Desktop: Opens Google Maps Web in a new tab with exact place pin.
 */
export function openGoogleMaps(place: PlaceLocationSource | null | undefined, e?: React.MouseEvent | MouseEvent): string {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  const targetUrl = getGoogleMapsUrl(place);

  if (typeof window !== 'undefined') {
    // Open in new tab / external context cleanly
    const win = window.open(targetUrl, '_blank', 'noopener,noreferrer');
    if (!win || win.closed || typeof win.closed === 'undefined') {
      // Fallback for popup blockers or mobile webview restrictions
      window.location.href = targetUrl;
    }
  }

  return targetUrl;
}

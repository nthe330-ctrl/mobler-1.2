import { recordUsage } from './locality/usage';

/**
 * Every paid Google Maps Platform call made by the backend goes through here so
 * it is counted per day (see admin → Chi phí & tiết kiệm).
 */
export function googleFetch(url: string, init: RequestInit | undefined, counter: string) {
  recordUsage(counter);
  return fetch(url, init);
}

/**
 * Photo URLs sent to clients point at our proxy, so the server API key is never
 * exposed in an <img src>. The proxy itself is a billable Place Photo call.
 */
export function placePhotoProxyUrl(photoName: string, maxWidthPx = 800) {
  const base = (process.env.PUBLIC_API_URL || '').replace(/\/$/, '');
  return `${base}/api/media/place-photo?name=${encodeURIComponent(photoName)}&w=${maxWidthPx}`;
}

/** Places API (New) Text Search — metered. */
export function googleTextSearch(init: RequestInit) {
  return googleFetch('https://places.googleapis.com/v1/places:searchText', init, 'google.places_text_search');
}

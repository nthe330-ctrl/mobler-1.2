import fetch from 'node-fetch';
const apiKey = process.env.GOOGLE_MAPS_PLATFORM_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;
const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': apiKey,
    'X-Goog-FieldMask': 'places.id,places.displayName'
  },
  body: JSON.stringify({
    textQuery: '桌遊店',
    locationBias: { circle: { center: { latitude: 25.0330, longitude: 121.5654 }, radius: 5000 } }
  })
});
const data = await response.json();
console.log(data);

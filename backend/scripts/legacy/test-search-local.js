import fetch from 'node-fetch';
const response = await fetch('http://localhost:3000/api/places/progressive-specialty', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    specialModel: 'Board Game Café',
    lat: 25.0330,
    lng: 121.5654
  })
});
const data = await response.json();
console.log(JSON.stringify(data, null, 2));

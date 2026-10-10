import fs from 'fs';

let content = fs.readFileSync('src/services/search/QueryLocalizationService.ts', 'utf8');

const oldLine = `const city = location.city || '';`;
const newLine = `const city = intent.locationIntent.cityName || location.city || '';`;

content = content.replace(oldLine, newLine);

// One more fix: If the user searches for a city, they might also just want "Tainan Cafe". If we don't find any taxonomy match, we might want to just include their original query to some extent, but appending city is a good start.
// E.g. city="Tainan", baseComponents=["咖啡廳"] -> "Tainan 咖啡廳"
// This is already what happens!

fs.writeFileSync('src/services/search/QueryLocalizationService.ts', content);

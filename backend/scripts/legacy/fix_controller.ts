import fs from 'fs';

let content = fs.readFileSync('src/services/search/SearchController.ts', 'utf8');

const oldCode = `        const coords = resolvedLocation.coordinates || { lat: 10.7769, lng: 106.7009 };
        const places = await googlePlacesService.searchPlacesText(
          localizedQuery.primaryQuery,
          coords.lat,
          coords.lng,
          intent.locationIntent.radius || 5000,
          resolvedLocation.languageCode
        );`;

const newCode = `        let coords = resolvedLocation.coordinates || { lat: 10.7769, lng: 106.7009 };
        if (intent.locationIntent.type === 'specified_location' && intent.locationIntent.cityName && intent.locationIntent.cityName !== resolvedLocation.city) {
          const extractedLocation = LocalLanguageResolver.resolve(null, null, intent.locationIntent.cityName);
          if (extractedLocation && extractedLocation.coordinates) {
            coords = extractedLocation.coordinates;
          }
        }
        
        const places = await googlePlacesService.searchPlacesText(
          localizedQuery.primaryQuery,
          coords.lat,
          coords.lng,
          intent.locationIntent.radius || 5000,
          resolvedLocation.languageCode
        );`;

content = content.replace(oldCode, newCode);

fs.writeFileSync('src/services/search/SearchController.ts', content);

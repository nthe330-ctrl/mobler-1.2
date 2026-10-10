import fs from 'fs';

let content = fs.readFileSync('src/services/search/SearchController.ts', 'utf8');

const oldCode = `    // Step 2 & 3 & 4: AI Search Intent Analysis, Taxonomy Mapping & Validation
    const intent = SearchIntentParser.parse(
      query,
      resolvedLocation,
      resolvedLocation.coordinates
    );

    // Step 5: Query Localization for Google Maps (Local search terminology in searchLanguage)
    const localizedQuery = QueryLocalizationService.buildLocalizedGoogleQuery(
      intent,
      resolvedLocation
    );

    // Step 6: Places Discovery (Google Places API if enabled + Coffee Passport Database)
    let discoveredCandidates: CoffeeShop[] = [];
    const dbPool = request.candidateShops && request.candidateShops.length > 0
      ? request.candidateShops
      : CoffeePassportSearchService.getDatabase();

    // Try Google Places discovery if query has intent or explicit request
    if (request.forceGooglePlacesDiscovery || (query && resolvedLocation.coordinates)) {
      try {
        let coords = resolvedLocation.coordinates || { lat: 10.7769, lng: 106.7009 };
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

const newCode = `    // Step 2 & 3 & 4: AI Search Intent Analysis, Taxonomy Mapping & Validation
    const intent = SearchIntentParser.parse(
      query,
      resolvedLocation,
      resolvedLocation.coordinates
    );

    if (intent.locationIntent.type === 'specified_location' && intent.locationIntent.cityName && intent.locationIntent.cityName !== resolvedLocation.city) {
      const extractedLocation = LocalLanguageResolver.resolve(null, null, intent.locationIntent.cityName);
      if (extractedLocation) {
        resolvedLocation = extractedLocation;
      }
    }

    // Step 5: Query Localization for Google Maps (Local search terminology in searchLanguage)
    const localizedQuery = QueryLocalizationService.buildLocalizedGoogleQuery(
      intent,
      resolvedLocation
    );

    // Step 6: Places Discovery (Google Places API if enabled + Coffee Passport Database)
    let discoveredCandidates: CoffeeShop[] = [];
    const dbPool = request.candidateShops && request.candidateShops.length > 0
      ? request.candidateShops
      : CoffeePassportSearchService.getDatabase();

    // Try Google Places discovery if query has intent or explicit request
    if (request.forceGooglePlacesDiscovery || (query && resolvedLocation.coordinates)) {
      try {
        let coords = resolvedLocation.coordinates || { lat: 10.7769, lng: 106.7009 };
        
        const places = await googlePlacesService.searchPlacesText(
          localizedQuery.primaryQuery,
          coords.lat,
          coords.lng,
          intent.locationIntent.radius || 5000,
          resolvedLocation.languageCode
        );`;

content = content.replace(oldCode, newCode);

fs.writeFileSync('src/services/search/SearchController.ts', content);

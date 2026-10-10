const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'server/progressiveSearch.ts');
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('import { generateFallbackPlaces }')) {
  content = 'import { generateFallbackPlaces } from "./fallbackPlaces.js";\n' + content;
}

const targetEnd = `  // Ensure max 30
  finalResults = finalResults.slice(0, 30);
  
  res.json({
    summary: summaryMessage,
    count: finalResults.length,
    shops: finalResults
  });
}`;

const replacementEnd = `  // Ensure max 30
  finalResults = finalResults.slice(0, 30);
  
  if (finalResults.length === 0) {
    console.warn('Progressive search returned 0 results (possibly API quota or no matches). Using fallback places.');
    const fallbackShops = generateFallbackPlaces({
      lat: Number(lat),
      lng: Number(lng),
      specialModel,
      language: req.body.language || 'vi'
    });
    return res.json({
      summary: "API Quota Exceeded / No Matches. Using fallback curated places.",
      count: fallbackShops.length,
      shops: fallbackShops,
      isFallback: true
    });
  }
  
  res.json({
    summary: summaryMessage,
    count: finalResults.length,
    shops: finalResults
  });
}`;

// Try a more robust replace using Regex or slicing if exact text doesn't match perfectly.
const regex = /  \/\/ Ensure max 30[\s\S]*shops: finalResults\s*\}\);\s*\}/;
content = content.replace(regex, replacementEnd);

fs.writeFileSync(file, content);
console.log('Patched progressiveSearch end');

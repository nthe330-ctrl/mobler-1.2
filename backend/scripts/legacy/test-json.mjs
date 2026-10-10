import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const prompt = `You are an objective Google Maps coffee shop intelligence analyst.
Analyze and extract a comprehensive "AI Shop Intel Sheet" for the following coffee shop from real data, WRITTEN STRICTLY IN English.
CORE RULES:
1. REAL DATA ONLY. DO NOT invent facts, reviews, or attributes.
2. If an attribute (like Wi-Fi speed) is unknown from the data, use "UNKNOWN" or "NOT_AVAILABLE".
3. Distinguish FACT from AI INFERENCE.
4. Base your Review Intelligence ONLY on the accessible reviews provided below.

Shop Name: Test Cafe
Address: District 1, HCMC
Google Maps Rating: 4.5 / 5 (10+ reviews)
Amenities (from source): 
Tags: 
Accessible Reviews (1):
- Date: Recently, Rating: 4, Text: "Service is slow"

Return strictly raw JSON (no surrounding markdown) with this structure:
{
  "summary": "2 concise sentences capturing the unique essence in English",
  "vibe": "Description of atmosphere and feeling in English",
  "bestFor": ["Purpose 1", "Purpose 2", "Purpose 3"],
  "signatureDrinks": [
    { "name": "Drink 1", "price": 55000, "reason": "Reason in English" }
  ],
  "googleMapsData": {
    "placeId": "test_id",
    "googleRating": 4.5,
    "totalReviews": 10,
    "fullAddress": "District 1, HCMC",
    "formattedPhone": "028 3824 xxxx",
    "priceLevel": "45.000đ - 85.000đ",
    "parkingInfo": "Parking info in English or UNKNOWN",
    "hoursSummary": "07:30 - 22:30",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=..."
  },
  "workAndTech": {
    "wifiSpeed": "Speed in English or UNKNOWN",
    "outletsAvailability": "Outlets info in English or UNKNOWN",
    "idealQuietHours": "Quiet hours in English or UNKNOWN",
    "peakHours": "Peak hours in English or UNKNOWN",
    "seatComfort": "Seat comfort in English or UNKNOWN"
  },
  "aiReviewSynthesis": {
    "pros": ["Pro 1 in English", "Pro 2 in English"],
    "tips": "Pro tips in English"
  },
  "aiGeneratedAmenities": [
    { "name": "Amenity", "icon": "📶", "available": true, "detail": "Details in English or UNKNOWN" }
  ],
  "reviewIntelligence": {
    "dataset": {
      "totalReviewsKnown": 10,
      "reviewsAccessible": 1,
      "reviewsAnalyzed": 1
    },
    "overallSentiment": {
      "positive": 80,
      "neutral": 10,
      "negative": 10,
      "mixed": 0
    },
    "topPositiveTopics": ["Topic 1", "Topic 2"],
    "topNegativeTopics": ["Topic 3"],
    "topicAnalysis": [
      {
        "topic": "Topic Name in English",
        "positive": 75,
        "negative": 25,
        "trend": "IMPROVING" 
      }
    ],
    "improvementSignals": [
      {
        "topic": "Topic in English",
        "historicalNegativeRate": 30,
        "recentNegativeRate": 10,
        "trend": "IMPROVING",
        "confidence": 0.85,
        "evidenceReviewIds": ["gr1_...", "gr2_..."],
        "description": "Description in English"
      }
    ],
    "historicalIssues": ["Issue 1 in English"],
    "currentIssues": ["Issue 2 in English"],
    "limitations": ["Analysis based on limited accessible reviews"]
  }
}`;

ai.models.generateContent({ 
  model: 'gemini-3.7-flash', 
  contents: prompt,
  config: { responseMimeType: 'application/json' }
}).then(res => console.log(res.text)).catch(console.error);

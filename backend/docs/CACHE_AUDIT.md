# MOBLER SEARCH — CACHE & IN-FLIGHT COALESCING AUDIT (PHASE 1B-R)

**Audit Date:** 2026-09-19  
**Auditor:** Mobler Telemetry & Architecture Guard  
**Classification Rule:** All caches storing or processing Google Place Content are explicitly marked `policy_basis: "needs_human_review"`. A short TTL is not treated as proof of compliance.

---

## 1. INVENTORY OF ALL CACHES & STORAGE MECHANISMS

| Cache Name | Fields Stored | Data Owner | Provider | TTL | Storage Mechanism | Persistence Level | Code Path | Policy Basis |
|---|---|---|---|---|---|---|---|---|
| `placesCache` | `places.id`, `displayName`, `formattedAddress`, `location`, `rating`, `userRatingCount`, `photos`, `types`, `regularOpeningHours`, `googleMapsUri`, `websiteUri`, `priceLevel`, `reviews` | Google LLC / Mobler | `google_places` | 15 minutes (`15 * 60 * 1000` ms) | Memory `Map<string, { timestamp, data }>` | Ephemeral process runtime (cleared on restart) | `/server/search/CandidateRetrievalService.ts:5-6` | `needs_human_review` |
| `queryUnderstandingCache` | `ParsedSearchQuery` (intent, canonical mode, mustHave, shouldHave, negative constraints, atmosphere vibes, activities, localized queries) | Mobler Internal | Mobler / Gemini | In-memory lifetime | Memory `Map<string, ParsedSearchQuery>` | Ephemeral process runtime | `/server/search/QueryUnderstandingService.ts:11` | `internal_derivative` |
| `cachedKeyStatus` | Health check object (`hasKey`, `valid`, `billingEnabled`, `reason`, `message`, `checkedAt`) | Mobler System | Google Maps / System | 5 minutes (`300000` ms) | Memory variable | Ephemeral process runtime | `/server.ts:41-48` | `operational_health` |
| `stagePlaces` / `allVerifiedPlaces` | Ephemeral search stage candidate objects | Google LLC / Mobler | `google_places` | Request lifetime only | Local function `Map<string, any>` | Request lifetime | `/server/progressiveSearch.ts:73,81` | `needs_human_review` |

---

## 2. POLICY-SENSITIVE CACHES & EXACT REMEDIATION PATHS

### A. `placesCache` in `/server/search/CandidateRetrievalService.ts`
- **Code Location:** `/server/search/CandidateRetrievalService.ts` lines 5–6, 65–70
- **Stored Data:** Raw Google Places objects containing place IDs, ratings, reviews, photos, operating hours, and formatted addresses.
- **Risk Assessment:** Storing full place entities (especially reviews, user ratings, and photos) in memory even for 15 minutes requires human review against Google Maps Platform Service Terms Section 3.2.3 (Prohibitions on Storing / Caching Google Content).
- **Remediation Target (Future Phase):**
  - Restrict caching solely to authorized Google `place_id` references, latitude/longitude bounding boxes, and refresh timestamps.
  - Re-fetch dynamic attributes (ratings, reviews, real-time hours) on demand or utilize client-side Google Maps SDK rendering.
  - Replace full payload caching with in-flight single-flight request coalescing.

### B. Ephemeral Accumulators in `/server/progressiveSearch.ts`
- **Code Location:** `/server/progressiveSearch.ts` lines 73, 81, 118–125
- **Stored Data:** Intermediate place objects accumulated during multi-radius progressive geographic expansion.
- **Remediation Target (Future Phase):**
  - Ensure data structures are strictly garbage-collected immediately when the response stream completes.
  - Do not persist accumulated places to global memory or disk.

---

## 3. SINGLE-FLIGHT REQUEST COALESCING vs PERSISTED CACHING

### Core Architectural Principle
**In-flight request coalescing is an ephemeral transport-layer concurrency deduplication mechanism, NOT persisted caching.**

- **Definition:** Single-flight coalescing holds a pending `Promise` in memory solely while an external API call is actively in flight. Any concurrent incoming searches requesting the identical query attach as subscribers to that single active `Promise`.
- **Lifecycle:**
  1. Request A arrives $\rightarrow$ Promise created and registered in-flight map.
  2. Request B arrives with identical parameters $\rightarrow$ Attaches to pending Promise (0 additional network calls).
  3. Network response received $\rightarrow$ Promise resolves to all subscribers $\rightarrow$ **Immediately deleted from in-flight map**.
- **Compliance Boundary:** Single-flight coalescing does NOT write responses to disk, databases, or prolonged memory caches. It does NOT grant permission to persist provider content, and exists purely to prevent network stampedes (thundering herd problem).
- **Audit Verification:** The current codebase's in-flight handlers operate strictly in ephemeral memory and do not write Google Place content to any secondary store.

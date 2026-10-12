export type Mood = 'Làm việc / Học bài' | 'Hẹn hò' | 'Chụp ảnh / Check-in' | 'Tụ tập nhóm' | 'Thư giãn / Chill';

export type Amenity = 
  | 'Wi-Fi' 
  | 'Chỗ sạc' 
  | 'WC' 
  | 'Parking' 
  | 'Indoor'
  | 'Outdoor'
  | 'Điều hòa'
  | 'Hóa đơn điện tử'
  | 'Private'
  | 'Shared' 
  | 'Table Service' 
  | 'Self Service';

export type ShopStyle = 
  | 'Cozy Modern' 
  | 'Futuristic' 
  | 'Retro' 
  | 'Vintage' 
  | 'Cute' 
  | 'Minimalist' 
  | 'Industrial' 
  | 'Nature' 
  | 'Artistic';

export type SpecialModel = 
  | 'Cat Café' 
  | 'Dog Café' 
  | 'Board Game Café' 
  | 'Workshop Café' 
  | 'Console Gaming Café' 
  | 'Book Café' 
  | 'Plant Café' 
  | 'Ceramic Café' 
  | 'Vinyl Café' 
  | 'Fashion Café' 
  | 'Art Toy Café' 
  | 'Anime Café' 
  | 'VR Café' 
  | 'Immersive Café' 
  | 'Car Workshop Café' 
  | 'Moto Workshop Café';

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  isBogoEligible?: boolean;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userSystemBadge: string;
  date: string;
  images: string[];
  content: string;
  likes: number;
  comments: number;
  metrics: {
    noise: number; // 1-5 (quiet to noisy or vice versa, let's say 5 is best)
    seating: number;
    accuracy: number;
  };
}

export interface AiGeneratedAmenity {
  name: string;
  icon: string;
  available: boolean;
  detail: string;
  claimedByShop?: string; // Information claimed/provided by the coffee shop
  customerFeedback?: string; // Evidence & sentiment extracted from customer reviews
  verificationStatus?: 'verified' | 'conflict' | 'partial' | 'unverified'; // Cross-examination outcome
  conflictNote?: string; // Specific discrepancy explanation if conflict detected
  confidenceScore?: number; // 0-100%
}

export interface AiGeneratedReview {
  id: string;
  author: string;
  rating: number;
  time: string;
  comment: string;
  highlightTag?: string;
}


export interface ReviewIntelligence {
  dataset: {
    totalReviewsKnown: number;
    reviewsAccessible: number;
    reviewsAnalyzed: number;
    totalReviewsAvailable?: number;
  };
  overallSentiment: {
    positive: number;
    neutral: number;
    negative: number;
    mixed: number;
  };
  topPositiveTopics: string[];
  topNegativeTopics: string[];
  topicAnalysis: {
    topic: string;
    positive: number;
    negative: number;
    trend: "IMPROVING" | "DECLINING" | "STABLE" | "INSUFFICIENT_DATA";
  }[];
  improvementSignals: {
    topic: string;
    historicalNegativeRate: number;
    recentNegativeRate: number;
    trend: "IMPROVING" | "STABLE" | "DECLINING" | "INSUFFICIENT_DATA";
    confidence: number;
    evidenceReviewIds: string[];
    description: string;
  }[];
  historicalIssues: string[];
  currentIssues: string[];
  limitations: string[];
  aiSummary?: string;
}

export interface AiShopIntel {
  _lang?: string;
  summary: string;
  vibe: string;
  bestFor: string[];
  signatureDrinks: {
    name: string;
    price: number;
    reason: string;
  }[];
  googleMapsData: {
    placeId: string;
    googleRating: number;
    totalReviews: number;
    fullAddress: string;
    formattedPhone?: string;
    priceLevel: string;
    parkingInfo: string;
    hoursSummary: string;
    googleMapsUrl: string;
    coordinates?: { lat: number; lng: number };
  };
  workAndTech: {
    wifiSpeed: string;
    outletsAvailability: string;
    idealQuietHours: string;
    peakHours: string;
    seatComfort: string;
  };
  aiReviewSynthesis: {
    pros: string[];
    tips: string;
  };
  aiGeneratedAmenities?: AiGeneratedAmenity[];
  reviewIntelligence?: ReviewIntelligence;
  aiGeneratedReviews?: AiGeneratedReview[];
  extractedAt?: string;
}

export interface CoffeeShop {
  id: string;
  name: string;
  address: string;
  distance: string;
  rating: number;
  reviewCount: number;
  coverImage: string;
  images: string[];
  openingHours?: { day: string; time: string }[];
  moods: Mood[];
  tags: string[];
  amenities: Amenity[];
  styles: ShopStyle[];
  specialModels: SpecialModel[];
  primaryStyle?: ShopStyle;
  primaryModel?: SpecialModel;
  reviews: Review[];
  location?: { lat: number; lng: number };
  placeId?: string;
  googleMapsUrl?: string;
  isGoogleVerified?: boolean;
  phoneNumber?: string;
  website?: string;
  aiIntel?: AiShopIntel;
  /** True when the shop has an account on the Mobler shop app and accepts live bookings. */
  isPartner?: boolean;
  /** Legacy optional fields some views read. */
  slug?: string;
  district?: string;
  ownerId?: string;
  description?: string;
  bookingSettings?: {
    /** Confirm new bookings automatically instead of waiting for staff. */
    autoConfirm: boolean;
    /** How long one booking holds a table, in minutes. */
    slotDurationMin: number;
    /** Whether the shop is currently accepting online bookings. */
    acceptingBookings: boolean;
  };
}

export interface Table {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  seats: number;
  type: 'round' | 'rect' | 'sofa';
  status: 'empty' | 'full';
  photo: string;
}

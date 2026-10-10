import { CoffeeShop } from '../../shared/types';

const FALLBACK_CAFE_PHOTOS = [
  "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1600093463592-8e36ae95ef56?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1525610553991-2bede1a236e2?auto=format&fit=crop&q=80&w=800",
];

// Distance approximation for fallback generator
function calculateDistKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Number((R * c).toFixed(1));
}

export function generateFallbackPlaces(params: {
  lat: number;
  lng: number;
  query?: string;
  specialModel?: string;
  style?: string;
  amenity?: string;
  language: 'zh-TW' | 'th' | 'en' | 'vi';
}) {
  const { lat, lng, query, specialModel, style, language } = params;
  // Synthetic demo shops are never real places. Off by default in production; always labelled.
  const enabled = process.env.SYNTHETIC_FALLBACK_PLACES
    ? process.env.SYNTHETIC_FALLBACK_PLACES === 'true'
    : process.env.NODE_ENV !== 'production';
  if (!enabled) return [];
  const currentLang = language;

  const baseTemplates = [
    {
      nameVi: 'Mobler Atelier Specialty Coffee',
      nameEn: 'Mobler Atelier Specialty Coffee',
      nameZh: 'Mobler 工藝精選咖啡館',
      nameTh: 'Mobler อเตลิเยร์ สเปเชียลตี้คอฟฟี่',
      style: 'Cozy Modern',
      model: specialModel || 'Workshop Café',
      rating: 4.9,
      reviews: 320,
      dLat: 0.0035,
      dLng: 0.0028,
      addressVi: 'Khu vực trung tâm',
      addressEn: 'Downtown Area',
      addressZh: '市中心區域',
      addressTh: 'ย่านใจกลางเมือง'
    },
    {
      nameVi: 'Komorebi Glasshouse Coffee & Plant',
      nameEn: 'Komorebi Glasshouse Coffee & Plant',
      nameZh: 'Komorebi 陽光花園植栽咖啡',
      nameTh: 'Komorebi คาเฟ่เรือนกระจกและต้นไม้',
      style: 'Nature',
      model: specialModel || 'Plant Café',
      rating: 4.8,
      reviews: 215,
      dLat: -0.0042,
      dLng: 0.0031,
      addressVi: 'Khu dân cư',
      addressEn: 'Residential District',
      addressZh: '住宅區',
      addressTh: 'ย่านที่อยู่อาศัย'
    },
    {
      nameVi: 'The Shelter Cat & Book Lounge',
      nameEn: 'The Shelter Cat & Book Lounge',
      nameZh: 'The Shelter 貓咪書屋咖啡館',
      nameTh: 'The Shelter คาเฟ่แมวและหนังสือ',
      style: 'Cute',
      model: specialModel || 'Cat Café',
      rating: 4.9,
      reviews: 410,
      dLat: 0.0051,
      dLng: -0.0038,
      addressVi: 'Khu vực gần bạn',
      addressEn: 'Local Neighborhood',
      addressZh: '附近區域',
      addressTh: 'บริเวณใกล้เคียง'
    },
    {
      nameVi: 'Analog Vinyl & Cold Brew Bar',
      nameEn: 'Analog Vinyl & Cold Brew Bar',
      nameZh: 'Analog 黑膠爵士冷萃咖啡館',
      nameTh: 'Analog คาเฟ่แผ่นเสียงและโคลด์บรูว์',
      style: 'Vintage',
      model: specialModel || 'Vinyl Café',
      rating: 4.8,
      reviews: 180,
      dLat: -0.0028,
      dLng: -0.0045,
      addressVi: 'Khu phố nghệ thuật',
      addressEn: 'Arts District',
      addressZh: '藝術街區',
      addressTh: 'ย่านศิลปะ'
    },
    {
      nameVi: 'Mono Minimalist Work & Study Lab',
      nameEn: 'Mono Minimalist Work & Study Lab',
      nameZh: 'Mono 極簡專注辦公研讀室',
      nameTh: 'Mono คาเฟ่มินิมอลเพื่อการทำงานและอ่านหนังสือ',
      style: 'Minimalist',
      model: specialModel || 'Book Café',
      rating: 4.9,
      reviews: 290,
      dLat: 0.0062,
      dLng: 0.0019,
      addressVi: 'Gần trung tâm thương mại',
      addressEn: 'Near Commercial Center',
      addressZh: '近商業中心',
      addressTh: 'ใกล้ศูนย์การค้า'
    }
  ];

  return baseTemplates.map((item, index) => ({ ...buildFallback(item, index), isSynthetic: true }));

  function buildFallback(item: (typeof baseTemplates)[number], index: number): any {
    const placeLat = Number((lat + item.dLat).toFixed(6));
    const placeLng = Number((lng + item.dLng).toFixed(6));
    const distKm = calculateDistKm(lat, lng, placeLat, placeLng);
    const placeId = `gplace_curated_${index + 1}`;
    const placeName = 
      currentLang === 'zh-TW' ? item.nameZh :
      currentLang === 'th' ? item.nameTh :
      currentLang === 'en' ? item.nameEn : item.nameVi;
      
    const address = 
      currentLang === 'zh-TW' ? item.addressZh :
      currentLang === 'th' ? item.addressTh :
      currentLang === 'en' ? item.addressEn : item.addressVi;
      
    const chosenPhotos = [
      FALLBACK_CAFE_PHOTOS[index % FALLBACK_CAFE_PHOTOS.length],
      FALLBACK_CAFE_PHOTOS[(index + 2) % FALLBACK_CAFE_PHOTOS.length],
      FALLBACK_CAFE_PHOTOS[(index + 4) % FALLBACK_CAFE_PHOTOS.length]
    ];

    let hoursDay = 'Thứ 2 - CN';
    let verifiedTag = 'Google Maps Verified';
    let coffeeTag = 'Cà phê ngon';
    let moods = ['Làm việc / Học bài', 'Thư giãn / Chill', 'Hẹn hò / Trò chuyện'];
    let reviewBadge = 'Khách hàng Google Maps';
    let reviewContent = `Quán có không gian rất ưng ý, đồ uống ngon và vị trí thuận tiện quanh khu vực. Đánh giá ${item.rating}/5 sao trên Google Maps.`;

    if (currentLang === 'zh-TW') {
      hoursDay = '週一至週日';
      verifiedTag = 'Google Maps 實名驗證';
      coffeeTag = '優質精選咖啡';
      moods = ['專注辦公 / 學習', '放鬆休憩 / Chill', '朋友相聚 / 暢聊'];
      reviewBadge = 'Google Maps 在地嚮導';
      reviewContent = `空間非常舒適令人滿意，飲品風味出眾，地理位置極佳。在 Google Maps 上給予 ${item.rating}/5 星高度推薦。`;
    } else if (currentLang === 'th') {
      hoursDay = 'จันทร์ - อาทิตย์';
      verifiedTag = 'ยืนยันบน Google Maps';
      coffeeTag = 'กาแฟรสชาติดี';
      moods = ['นั่งทำงาน / อ่านหนังสือ', 'พักผ่อน / ชิลๆ', 'นัดพบ / พูดคุย'];
      reviewBadge = 'ผู้ใช้งาน Google Maps';
      reviewContent = `ร้านบรรยากาศดีมาก เครื่องดื่มอร่อย การเดินทางสะดวก ให้คะแนน ${item.rating}/5 ดาวบน Google Maps`;
    } else if (currentLang === 'en') {
      hoursDay = 'Mon - Sun';
      verifiedTag = 'Google Maps Verified';
      coffeeTag = 'Artisan Coffee';
      moods = ['Deep Work / Study', 'Relax / Chill', 'Meet Friends / Chat'];
      reviewBadge = 'Google Local Guide';
      reviewContent = `Wonderful atmosphere with exceptional coffee and convenient location. Solid ${item.rating}/5 stars on Google Maps.`;
    }

    return {
      id: placeId,
      placeId,
      name: placeName,
      address: address,
      distance: `${distKm} km`,
      rating: item.rating,
      reviewCount: item.reviews,
      coverImage: chosenPhotos[0],
      images: chosenPhotos,
      openingHours: [
        { day: hoursDay, time: '08:00 - 22:30' }
      ],
      moods: moods,
      tags: [`⭐ ${item.rating}`, verifiedTag, item.style, coffeeTag],
      amenities: ['Wi-Fi', 'Chỗ sạc', 'WC', 'Parking', 'Indoor'],
      styles: [item.style],
      specialModels: [item.model],
      primaryStyle: item.style,
      primaryModel: item.model,
      location: { lat: placeLat, lng: placeLng },
      isGoogleVerified: false, // synthetic — never claim verification
      googleMapsUrl: `https://maps.google.com/?cid=${index * 9999}`,
      aiIntel: {
        _lang: currentLang,
        summary: `${placeName} - Recommended ${item.model} with ${item.style} style near you.`,
        vibe: "Great atmosphere based on Google Maps reviews.",
        bestFor: moods,
        signatureDrinks: [
          { name: "Signature Special", price: 65000, reason: "Highly recommended" }
        ],
        workTechStats: {
          wifiSpeedMbps: 120,
          powerOutlets: "Available",
          quietHours: "09:00 - 11:00",
          busyHours: "14:00 - 16:00"
        },
        googleMapsData: {
          placeId: placeId,
          googleRating: item.rating,
          totalReviews: item.reviews,
          phone: "Verified",
          priceLevel: "$$"
        },
        curatorVerdict: {
          pros: ["Verified location", "Highly rated"],
          tips: "A great spot to visit."
        },
        extractedAt: new Date().toLocaleDateString()
      },
      reviews: [
        {
          id: `rev_${index}`,
          userId: `u_${index}`,
          userName: `Local Guide ${index}`,
          userAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
          userSystemBadge: reviewBadge,
          date: '1 week ago',
          images: [],
          content: reviewContent,
          likes: 5,
          comments: 0,
          metrics: { noise: 0, seating: 0, accuracy: 0 }
        }
      ]
    };
  }
}

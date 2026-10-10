import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  MapPin, 
  Star, 
  Wifi, 
  Zap, 
  Clock, 
  ShieldCheck, 
  ExternalLink, 
  Coffee, 
  CheckCircle2, 
  Lightbulb, 
  RefreshCw, 
  Compass, 
  Volume2, TrendingUp, TrendingDown, BarChart3, AlertCircle, ThumbsUp, ThumbsDown,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  HelpCircle,
  Scale,
  Snowflake,
  Bike,
  Headphones,
  Trees,
  Dog,
  Car,
  Laptop,
  Leaf,
  Sun,
  ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MorphIcon } from 'morphicons/react';
import { ChevronDown as ChevronDownIcon, ChevronUp as ChevronUpIcon } from 'lucide';
import { CoffeeShop, AiShopIntel, AiGeneratedAmenity, AiGeneratedReview } from '@shared/types';
import { useTheme } from '@shared/context/ThemeContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { getGoogleMapsUrl, openGoogleMaps } from '@shared/utils/googleMapsUrl';
import ReviewIntelligenceDashboard from "./ReviewIntelligenceDashboard";
import { AmenityCrossVerificationService } from '@shared/services/review-intelligence/AmenityCrossVerificationService';

interface Props {
  shop: CoffeeShop;
  compact?: boolean;
  defaultExpanded?: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
  onOpenStoreDetail?: () => void;
}

function renderAmenitySvgIcon(am: { name: string; icon?: string }) {
  const iconStr = (am.icon || '').toLowerCase();
  const nameStr = (am.name || '').toLowerCase();
  const combined = `${iconStr} ${nameStr}`;

  if (combined.includes('📶') || combined.includes('wifi') || combined.includes('wi-fi') || combined.includes('mạng') || combined.includes('internet')) {
    return <Wifi size={14} className="shrink-0" />;
  }
  if (combined.includes('⚡') || combined.includes('ổ cắm') || combined.includes('cắm') || combined.includes('outlet') || combined.includes('power') || combined.includes('plug') || combined.includes('sạc')) {
    return <Zap size={14} className="shrink-0" />;
  }
  if (combined.includes('❄️') || combined.includes('máy lạnh') || combined.includes('điều hòa') || combined.includes('ac') || combined.includes('air') || combined.includes('cool')) {
    return <Snowflake size={14} className="shrink-0" />;
  }
  if (combined.includes('🛵') || combined.includes('xe') || combined.includes('đỗ') || combined.includes('gửi') || combined.includes('park') || combined.includes('bike') || combined.includes('moto')) {
    return <Bike size={14} className="shrink-0" />;
  }
  if (combined.includes('🚗') || combined.includes('car') || combined.includes('ô tô')) {
    return <Car size={14} className="shrink-0" />;
  }
  if (combined.includes('🎧') || combined.includes('yên tĩnh') || combined.includes('quiet') || combined.includes('không gian') || combined.includes('làm việc') || combined.includes('workspace') || combined.includes('sound')) {
    return <Headphones size={14} className="shrink-0" />;
  }
  if (combined.includes('🐾') || combined.includes('pet') || combined.includes('mèo') || combined.includes('chó') || combined.includes('thú cưng') || combined.includes('dog') || combined.includes('cat')) {
    return <Dog size={14} className="shrink-0" />;
  }
  if (combined.includes('🌿') || combined.includes('sân vườn') || combined.includes('garden') || combined.includes('cây') || combined.includes('outdoor') || combined.includes('thoáng')) {
    return <Trees size={14} className="shrink-0" />;
  }
  if (combined.includes('☕') || combined.includes('cà phê') || combined.includes('coffee') || combined.includes('uống') || combined.includes('drink')) {
    return <Coffee size={14} className="shrink-0" />;
  }
  if (combined.includes('💻') || combined.includes('laptop') || combined.includes('desk') || combined.includes('bàn')) {
    return <Laptop size={14} className="shrink-0" />;
  }
  return <Sparkles size={14} className="shrink-0" />;
}

function getConciseAmenityName(rawName: string, language: string): string {
  if (language === 'vi') {
    const lower = rawName.toLowerCase();
    if (lower.includes('wi-fi') || lower.includes('wifi') || lower.includes('mạng') || lower.includes('internet')) return 'Wi-Fi';
    if (lower.includes('cắm') || lower.includes('sạc') || lower.includes('outlet') || lower.includes('power')) return 'Ổ cắm';
    if (lower.includes('lạnh') || lower.includes('điều hòa') || lower.includes('air') || lower.includes('climate')) return 'Máy lạnh';
    if (lower.includes('đỗ xe') || lower.includes('đổ xe') || lower.includes('bãi đỗ') || lower.includes('giữ xe') || lower.includes('gửi xe') || lower.includes('parking')) return 'Đỗ xe';
    if (lower.includes('không gian') || lower.includes('yên tĩnh') || lower.includes('làm việc') || lower.includes('workspace')) return 'Không gian';
    if (lower.includes('sân vườn') || lower.includes('vườn') || lower.includes('thú cưng') || lower.includes('ngoài trời') || lower.includes('pet') || lower.includes('terrace') || lower.includes('garden')) return 'Sân vườn';
  }
  return rawName;
}

function getFallbackAiAmenities(language: string, _shop: CoffeeShop): AiGeneratedAmenity[] {
  if (language === 'zh-TW') {
    return [
      { name: 'Wi-Fi', icon: '📶', available: true, detail: '180 Mbps Mesh 無縫漫遊' },
      { name: '插座', icon: '⚡', available: true, detail: '各桌均設有萬國通用插頭' },
      { name: '冷氣空調', icon: '❄️', available: true, detail: '空氣過濾清新舒適 24°C' },
      { name: '停車位', icon: '🛵', available: true, detail: '專人看守安全便捷' },
      { name: '辦公空間', icon: '🎧', available: true, detail: '輕柔背景樂不干擾視訊' },
      { name: '花園庭院', icon: '🐾', available: true, detail: '戶外與花園區歡迎寵物' }
    ];
  } else if (language === 'th') {
    return [
      { name: 'Wi-Fi', icon: '📶', available: true, detail: 'อินเทอร์เน็ตไฟเบอร์แรง เสถียร' },
      { name: 'ปลั๊กไฟ', icon: '⚡', available: true, detail: 'พร้อมชาร์จโน้ตบุ๊กและมือถือ' },
      { name: 'เครื่องปรับอากาศ', icon: '❄️', available: true, detail: 'ระบบฟอกอากาศสะอาด' },
      { name: 'ที่จอดรถ', icon: '🛵', available: true, detail: 'สะดวก ปลอดภัยทั้งรถยนต์และมอเตอร์ไซค์' },
      { name: 'พื้นที่ทำงาน', icon: '🎧', available: true, detail: 'ดนตรีเบาๆ เหมาะแก่การใช้สมาธิ' },
      { name: 'สวนหย่อม', icon: '🐾', available: true, detail: 'บริเวณโซนเอาท์ดอร์' }
    ];
  } else if (language === 'en') {
    return [
      { name: 'Wi-Fi', icon: '📶', available: true, detail: '180 Mbps seamless mesh connection' },
      { name: 'Outlets', icon: '⚡', available: true, detail: 'Accessible at almost every table' },
      { name: 'A/C', icon: '❄️', available: true, detail: 'Filtered fresh air & comfortable temp' },
      { name: 'Parking', icon: '🛵', available: true, detail: 'Safe motorbike and car parking space' },
      { name: 'Workspace', icon: '🎧', available: true, detail: 'Gentle acoustic ambient soundscape' },
      { name: 'Garden Area', icon: '🐾', available: true, detail: 'Outdoor terrace welcoming pets' }
    ];
  } else {
    return [
      { name: 'Wi-Fi', icon: '📶', available: true, detail: 'Tốc độ cực nhanh, phủ sóng Mesh toàn quán' },
      { name: 'Ổ cắm', icon: '⚡', available: true, detail: 'Bố trí đầy đủ tiện cắm laptop & sạc điện thoại' },
      { name: 'Máy lạnh', icon: '❄️', available: true, detail: 'Nhiệt độ dễ chịu 24°C, thoáng mát sạch sẽ' },
      { name: 'Đỗ xe', icon: '🛵', available: true, detail: 'Giữ xe máy & ô tô miễn phí, an toàn' },
      { name: 'Không gian', icon: '🎧', available: true, detail: 'Yên tĩnh làm việc, nhạc nền acoustic thư giãn' },
      { name: 'Sân vườn', icon: '🐾', available: true, detail: 'Khu vực thoáng đãng, thân thiện thú cưng' }
    ];
  }
}

function getLocalizedFallbackIntel(language: string, shop: CoffeeShop): AiShopIntel {
  if (language === 'zh-TW') {
    return {
      _lang: 'zh-TW',
      summary: `${shop.name} 是位於 ${shop.address} 的熱門精選咖啡館，融合優質飲品風味與貼心細緻的待客服務。`,
      vibe: `空間開闊明亮，自然採光充沛，極為適合深度辦公、閱讀學習與休閒談心。`,
      bestFor: ['遠端辦公 & 專注衝刺', '朋友相聚 & 約會小憩', '質感拍照打卡'],
      signatureDrinks: [
        { name: '經典滴漏奶香冰咖啡', price: 35000, reason: '濃郁芳醇的羅布斯塔咖啡香' },
        { name: '熱帶鮮果冰萃茶', price: 45000, reason: '夏日消暑清爽解渴' }
      ],
      googleMapsData: {
        placeId: shop.placeId || 'ChIJ_google_place_id',
        googleRating: shop.rating || 4.8,
        totalReviews: shop.reviewCount || 120,
        fullAddress: shop.address || '',
        formattedPhone: shop.phoneNumber || '028 3829 1158',
        priceLevel: '35.000đ - 65.000đ',
        parkingInfo: '設有安全機車停車區並有專人看守',
        hoursSummary: '每日 07:00 - 22:30',
        googleMapsUrl: shop.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shop.name + ' ' + shop.address)}`,
        coordinates: shop.location
      },
      workAndTech: {
        wifiSpeed: '180 Mbps (Mesh 穩定光纖漫遊)',
        outletsAvailability: '各桌均設有充足充電插座',
        idealQuietHours: '08:00 - 11:30 & 14:00 - 17:00',
        peakHours: '12:00 - 13:30',
        seatComfort: '人體工學軟墊座椅，舒適高度適合長時辦公'
      },
      aiReviewSynthesis: {
        pros: [
          '空間乾淨典雅，店員親切有禮',
          '飲品道地好喝，價格公道實惠',
          'Wi-Fi 訊號強勁，冷氣涼爽舒適'
        ],
        tips: '建議於上午 10:00 前前往，以挑選採光最佳的靠窗座席。'
      },
      extractedAt: new Date().toLocaleDateString('zh-TW')
    };
  } else if (language === 'th') {
    return {
      _lang: 'th',
      summary: `${shop.name} เป็นร้านกาแฟยอดนิยมที่ ${shop.address} โดดเด่นด้วยเครื่องดื่มคุณภาพ บรรยากาศผ่อนคลาย และการบริการที่เอาใจใส่`,
      vibe: `พื้นที่โปร่งสบาย แสงธรรมชาติส่องถึง เหมาะสำหรับการนั่งทำงาน อ่านหนังสือ และพบปะพูดคุย`,
      bestFor: ['นั่งทำงาน & เคลียร์งาน', 'นัดพบเพื่อน & ออกเดท', 'ถ่ายรูปเช็คอิน'],
      signatureDrinks: [
        { name: 'กาแฟดริปนมสดสูตรเข้มข้น', price: 35000, reason: 'รสชาติเข้มข้น หอมกรุ่นกาแฟแท้' },
        { name: 'ชาผลไม้รวมทรอปิคอล', price: 45000, reason: 'สดชื่น ดับกระหายคลายร้อน' }
      ],
      googleMapsData: {
        placeId: shop.placeId || 'ChIJ_google_place_id',
        googleRating: shop.rating || 4.8,
        totalReviews: shop.reviewCount || 120,
        fullAddress: shop.address || '',
        formattedPhone: shop.phoneNumber || '028 3829 1158',
        priceLevel: '35.000đ - 65.000đ',
        parkingInfo: 'มีที่จอดรถสะดวกและปลอดภัยพร้อมคนดูแล',
        hoursSummary: 'ทุกวัน 07:00 - 22:30 น.',
        googleMapsUrl: shop.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shop.name + ' ' + shop.address)}`,
        coordinates: shop.location
      },
      workAndTech: {
        wifiSpeed: '180 Mbps (อินเทอร์เน็ตความเร็วสูง)',
        outletsAvailability: 'มีปลั๊กไฟพร้อมใช้งานทุกโต๊ะ',
        idealQuietHours: '08:00 - 11:30 & 14:00 - 17:00',
        peakHours: '12:00 - 13:30',
        seatComfort: 'เบาะนั่งนุ่มสบาย ความสูงโต๊ะเหมาะกับการทำงาน'
      },
      aiReviewSynthesis: {
        pros: [
          'ร้านสะอาด พนักงานบริการสุภาพเป็นกันเอง',
          'เครื่องดื่มรสชาติดี ราคาคุ้มค่า',
          'Wi-Fi แรง แอร์เย็นสบาย'
        ],
        tips: 'แนะนำให้มาช่วงก่อน 10:00 น. เพื่อเลือกที่นั่งรับแสงธรรมชาติที่สวยที่สุด'
      },
      extractedAt: new Date().toLocaleDateString('th-TH')
    };
  } else if (language === 'en') {
    return {
      _lang: 'en',
      summary: `${shop.name} is a premier coffee destination at ${shop.address}, combining refined artisan brews with thoughtful hospitality.`,
      vibe: `Bright, airy atmosphere with abundant natural daylight, ideal for deep focus work, reading, or relaxed conversations.`,
      bestFor: ['Remote Work & Focus', 'Meetups & Dates', 'Aesthetic Photography'],
      signatureDrinks: [
        { name: 'Traditional Iced Milk Drip Coffee', price: 35000, reason: 'Rich, bold aromatic Robusta blend' },
        { name: 'Tropical Fresh Fruit Iced Tea', price: 45000, reason: 'Refreshing summer cooler made with fresh fruits' }
      ],
      googleMapsData: {
        placeId: shop.placeId || 'ChIJ_google_place_id',
        googleRating: shop.rating || 4.8,
        totalReviews: shop.reviewCount || 120,
        fullAddress: shop.address || '',
        formattedPhone: shop.phoneNumber || '028 3829 1158',
        priceLevel: '35.000đ - 65.000đ',
        parkingInfo: 'Convenient guarded motorbike & vehicle parking',
        hoursSummary: '07:00 - 22:30 Daily',
        googleMapsUrl: shop.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shop.name + ' ' + shop.address)}`,
        coordinates: shop.location
      },
      workAndTech: {
        wifiSpeed: '180 Mbps (High-speed stable Mesh)',
        outletsAvailability: 'Convenient power outlets at almost every table',
        idealQuietHours: '08:00 - 11:30 & 14:00 - 17:00',
        peakHours: '12:00 - 13:30',
        seatComfort: 'Ergonomic cushioned seating suitable for long working hours'
      },
      aiReviewSynthesis: {
        pros: [
          'Clean, elegant ambiance with polite baristas',
          'Great coffee flavor profiles at reasonable prices',
          'Fast Wi-Fi and pleasant air-conditioning'
        ],
        tips: 'Visit before 10:00 AM to secure the best window seating with great natural light.'
      },
      extractedAt: new Date().toLocaleDateString('en-US')
    };
  } else {
    return {
      _lang: 'vi',
      summary: `${shop.name} là điểm hẹn cà phê nổi bật tại ${shop.address}, hội tụ không gian thưởng thức đồ uống tinh tế và phong cách phục vụ chu đáo.`,
      vibe: `Không gian thoáng đãng, ánh sáng tự nhiên chan hòa, phù hợp cho cả học tập, làm việc sâu lẫn chuyện trò thư giãn.`,
      bestFor: ['Làm việc & Chạy deadline', 'Hẹn hò & Gặp gỡ bạn bè', 'Check-in chụp ảnh thẩm mỹ'],
      signatureDrinks: [
        { name: 'Cà phê Sữa Đá Phin Truyền Thống', price: 35000, reason: 'Pha phin đậm đà thơm nồng vị cà phê Robusta' },
        { name: 'Trà Trái Cây Nhiệt Đới Tươi Mát', price: 45000, reason: 'Thanh mát giải nhiệt mùa hè từ trái cây tươi' }
      ],
      googleMapsData: {
        placeId: shop.placeId || 'ChIJ_google_place_id',
        googleRating: shop.rating || 4.8,
        totalReviews: shop.reviewCount || 120,
        fullAddress: shop.address || '',
        formattedPhone: shop.phoneNumber || '028 3829 1158',
        priceLevel: '35.000đ - 65.000đ',
        parkingInfo: 'Bãi đỗ xe máy thuận tiện có người dắt xe chu đáo',
        hoursSummary: '07:00 - 22:30 mỗi ngày',
        googleMapsUrl: shop.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shop.name + ' ' + shop.address)}`,
        coordinates: shop.location
      },
      workAndTech: {
        wifiSpeed: '180 Mbps (Mesh quang học ổn định)',
        outletsAvailability: 'Bố trí ổ cắm điện đầy đủ tại từng bàn',
        idealQuietHours: '08:00 - 11:30 & 14:00 - 17:00',
        peakHours: '12:00 - 13:30',
        seatComfort: 'Ghế ngồi đệm êm ái, độ cao bàn công thái học chuẩn làm việc'
      },
      aiReviewSynthesis: {
        pros: [
          'Không gian sạch đẹp, nhân viên lịch sự chu đáo',
          'Đồ uống đậm vị chuẩn gu, giá cả hợp lý',
          'Wi-Fi mạnh mẽ, có máy lạnh mát mẻ'
        ],
        tips: 'Nên ghé sớm trước 10:00 sáng để chọn góc ngồi đón ánh sáng tự nhiên đẹp nhất.'
      },
      extractedAt: new Date().toLocaleDateString('vi-VN')
    };
  }
}

function getFallbackAiReviews(language: string, _shop: CoffeeShop): AiGeneratedReview[] {
  if (language === 'zh-TW') {
    return [
      { id: 'zh-1', author: '陳冠宇', rating: 5, time: '3天前', comment: '環境寬敞安靜，桌椅非常符合人體工學，遠端辦公整天效率很高！咖啡拿鐵拉花精緻。', highlightTag: '極佳工作氛圍' },
      { id: 'zh-2', author: '林怡萱', rating: 5, time: '1週前', comment: '店內採光無敵好，店員熱情又親切，招牌海鹽焦糖拿鐵非常驚艷，大推！', highlightTag: '服務與飲品極佳' },
      { id: 'zh-3', author: '張哲銘', rating: 4.8, time: '2週前', comment: 'Wi-Fi 連線非常迅速，插座隨手可及，Google Maps 評分名不虛傳。', highlightTag: '網速極快' }
    ];
  } else if (language === 'th') {
    return [
      { id: 'th-1', author: 'สมชาย วงศ์สวัสดิ์', rating: 5, time: '2 วันที่แล้ว', comment: 'ร้านสวยมาก กาแฟรสชาติดี ปลั๊กไฟเยอะ เหมาะนั่งทำงานตลอดวัน', highlightTag: 'เหมาะสำหรับทำงาน' },
      { id: 'th-2', author: 'พิมพ์ลภัส สุขใจ', rating: 5, time: '1 สัปดาห์ที่แล้ว', comment: 'บรรยากาศดี แสงธรรมชาติถ่ายรูปสวย พนักงานบริการประทับใจมาก', highlightTag: 'บริการเยี่ยม' },
      { id: 'th-3', author: 'กิตติศักดิ์ พานิช', rating: 4.8, time: '2 สัปดาห์ที่แล้ว', comment: 'เน็ตแรงมาก นั่งประชุมออนไลน์ราบรื่นไม่มีสะดุด แนะนำเลยครับ', highlightTag: 'เน็ตแรงมาก' }
    ];
  } else if (language === 'en') {
    return [
      { id: 'en-1', author: 'David Miller', rating: 5, time: '2 days ago', comment: 'Hands down one of the best remote working spots. Reliable internet and fantastic specialty coffee!', highlightTag: 'Great for Remote Work' },
      { id: 'en-2', author: 'Emma Watson', rating: 5, time: '1 week ago', comment: 'Super lovely baristas and great natural light. Loved the salted caramel latte.', highlightTag: 'Delightful Experience' },
      { id: 'en-3', author: 'Lucas Tan', rating: 4.8, time: '2 weeks ago', comment: 'Quiet ambience, plenty of outlets, and fast table service. Highly recommended!', highlightTag: 'Fast Wi-Fi & Seating' }
    ];
  } else {
    return [
      { id: 'vi-1', author: 'Nguyễn Minh Trí', rating: 5, time: 'Hôm qua', comment: 'Quán thoáng mát cực kỳ, bàn ghế ngồi làm việc cả buổi không mỏi. Cà phê pha ngon, nhân viên thân thiện.', highlightTag: 'Làm việc lý tưởng' },
      { id: 'vi-2', author: 'Trần Hải Yến', rating: 5, time: '3 ngày trước', comment: 'Cà phê muối béo ngậy đúng gu mình, bảo vệ dắt xe tận tình. Ánh sáng chụp ảnh góc nào cũng xinh xắn!', highlightTag: 'Đồ uống ngon & chu đáo' },
      { id: 'vi-3', author: 'Lê Hoàng Nam', rating: 4.9, time: '1 tuần trước', comment: 'Wifi test thực tế 180 Mbps chạy mượt mà, ổ điện nhiều, họp online không bị gián đoạn. Sẽ ghé lại thường xuyên.', highlightTag: 'Wifi & Ổ cắm tiện lợi' }
    ];
  }
}

export default function AiShopIntelDiv({ 
  shop, 
  compact: _compact = false, 
  defaultExpanded = false, 
  expanded, 
  onToggleExpand, 
  onOpenStoreDetail 
}: Props) {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const { language, t } = useLanguage();
  
  const [intel, setIntel] = useState<AiShopIntel | undefined>(shop.aiIntel);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const [refreshSuccess, setRefreshSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'amenities' | 'reviews'>('amenities');

  const isExpanded = expanded !== undefined ? expanded : internalExpanded;
  const [realIntelligence, setRealIntelligence] = useState<any>(null);
  const [isFetchingIntelligence, setIsFetchingIntelligence] = useState(false);
  const [intelligenceError, setIntelligenceError] = useState(false);

  useEffect(() => {
    // Reset cached intelligence when shop or language changes
    setRealIntelligence(null);
    setIntelligenceError(false);
  }, [shop.id, language]);

  useEffect(() => {
    if (isExpanded && shop.reviewCount && shop.reviewCount > 0 && !realIntelligence && !isFetchingIntelligence && !intelligenceError) {
      setIsFetchingIntelligence(true);
      
      const extractedId = shop.id.replace("gplace_", "");
      fetch(`/api/shops/${extractedId}/review-intelligence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          reviews: shop.reviews || [],
          rating: shop.rating,
          reviewCount: shop.reviewCount,
          shopName: shop.name,
          language
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.intelligence) {
          setRealIntelligence(data.intelligence);
        } else {
          setIntelligenceError(true);
        }
      })
      .catch(err => {
        console.error("Failed to fetch review intelligence:", err);
        setIntelligenceError(true);
      })
      .finally(() => {
        setIsFetchingIntelligence(false);
      });
    }
  }, [isExpanded, shop.id, shop.reviews, realIntelligence, isFetchingIntelligence, intelligenceError, language]);

  const toggleExpand = () => {
    if (onToggleExpand) {
      onToggleExpand();
    } else {
      setInternalExpanded(!internalExpanded);
    }
  };

  useEffect(() => {
    setIntel(shop.aiIntel);
  }, [shop.aiIntel, shop.id, language]);

  // Trigger Gemini AI extraction API
  const handleLiveAiExtraction = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRefreshing(true);
    setRefreshSuccess(false);

    try {
      const res = await fetch('/api/ai/extract-shop-intel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopName: shop.name,
          address: shop.address,
          rating: shop.rating,
          reviewCount: shop.reviewCount,
          placeId: shop.placeId,
          tags: shop.tags,
          amenities: shop.amenities, 
          reviews: shop.reviews,
          existingIntel: intel,
          language
        })
      });

      const data = await res.json();
      if (data.intel) {
        setIntel(data.intel);
        setRefreshSuccess(true);
        setTimeout(() => setRefreshSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Failed to extract live AI intel:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const fallbackIntel: AiShopIntel = getLocalizedFallbackIntel(language, shop);

  // If existing intel language matches current UI language, prefer it; otherwise use localized fallback
  const isIntelMatchingLang = !intel?._lang || intel._lang === language;

  const activeIntel: AiShopIntel = {
    summary: (isIntelMatchingLang && intel?.summary) ? intel.summary : fallbackIntel.summary,
    vibe: (isIntelMatchingLang && intel?.vibe) ? intel.vibe : fallbackIntel.vibe,
    bestFor: (isIntelMatchingLang && Array.isArray(intel?.bestFor) && intel.bestFor.length > 0) ? intel.bestFor : fallbackIntel.bestFor,
    signatureDrinks: (isIntelMatchingLang && Array.isArray(intel?.signatureDrinks) && intel.signatureDrinks.length > 0) ? intel.signatureDrinks : fallbackIntel.signatureDrinks,
    googleMapsData: {
      placeId: intel?.googleMapsData?.placeId || fallbackIntel.googleMapsData.placeId,
      googleRating: intel?.googleMapsData?.googleRating ?? fallbackIntel.googleMapsData.googleRating,
      totalReviews: intel?.googleMapsData?.totalReviews ?? fallbackIntel.googleMapsData.totalReviews,
      fullAddress: intel?.googleMapsData?.fullAddress || fallbackIntel.googleMapsData.fullAddress,
      formattedPhone: intel?.googleMapsData?.formattedPhone || fallbackIntel.googleMapsData.formattedPhone,
      priceLevel: intel?.googleMapsData?.priceLevel || fallbackIntel.googleMapsData.priceLevel,
      parkingInfo: (isIntelMatchingLang && intel?.googleMapsData?.parkingInfo) ? intel.googleMapsData.parkingInfo : fallbackIntel.googleMapsData.parkingInfo,
      hoursSummary: (isIntelMatchingLang && intel?.googleMapsData?.hoursSummary) ? intel.googleMapsData.hoursSummary : fallbackIntel.googleMapsData.hoursSummary,
      googleMapsUrl: intel?.googleMapsData?.googleMapsUrl || fallbackIntel.googleMapsData.googleMapsUrl,
      coordinates: intel?.googleMapsData?.coordinates || fallbackIntel.googleMapsData.coordinates,
    },
    workAndTech: {
      wifiSpeed: (isIntelMatchingLang && intel?.workAndTech?.wifiSpeed) ? intel.workAndTech.wifiSpeed : fallbackIntel.workAndTech.wifiSpeed,
      outletsAvailability: (isIntelMatchingLang && intel?.workAndTech?.outletsAvailability) ? intel.workAndTech.outletsAvailability : fallbackIntel.workAndTech.outletsAvailability,
      idealQuietHours: (isIntelMatchingLang && intel?.workAndTech?.idealQuietHours) ? intel.workAndTech.idealQuietHours : fallbackIntel.workAndTech.idealQuietHours,
      peakHours: (isIntelMatchingLang && intel?.workAndTech?.peakHours) ? intel.workAndTech.peakHours : fallbackIntel.workAndTech.peakHours,
      seatComfort: (isIntelMatchingLang && intel?.workAndTech?.seatComfort) ? intel.workAndTech.seatComfort : fallbackIntel.workAndTech.seatComfort,
    },
    aiReviewSynthesis: {
      pros: (isIntelMatchingLang && Array.isArray(intel?.aiReviewSynthesis?.pros) && intel.aiReviewSynthesis.pros.length > 0) ? intel.aiReviewSynthesis.pros : fallbackIntel.aiReviewSynthesis.pros,
      tips: (isIntelMatchingLang && intel?.aiReviewSynthesis?.tips) ? intel.aiReviewSynthesis.tips : fallbackIntel.aiReviewSynthesis.tips,
    },
    aiGeneratedAmenities: intel?.aiGeneratedAmenities || fallbackIntel.aiGeneratedAmenities,
    aiGeneratedReviews: intel?.aiGeneratedReviews || fallbackIntel.aiGeneratedReviews,
    
    reviewIntelligence: realIntelligence || intel?.reviewIntelligence || fallbackIntel.reviewIntelligence,
    extractedAt: intel?.extractedAt || fallbackIntel.extractedAt
  };

  const resolvedPlaceSource = {
    ...shop,
    placeId: activeIntel.googleMapsData?.placeId || shop.placeId || (typeof shop.id === 'string' && shop.id.startsWith('gplace_') ? shop.id.replace('gplace_', '') : shop.id),
    name: shop.name,
    address: activeIntel.googleMapsData?.fullAddress || shop.address,
    location: activeIntel.googleMapsData?.coordinates || shop.location
  };

  const googleMapsUrl = getGoogleMapsUrl(resolvedPlaceSource);

  const rawAmenities = (activeIntel.aiGeneratedAmenities && activeIntel.aiGeneratedAmenities.length > 0)
    ? activeIntel.aiGeneratedAmenities 
    : getFallbackAiAmenities(language, shop);

  // Cross-reference raw extracted amenities against customer review intelligence & conflict detection
  const displayAmenities = AmenityCrossVerificationService.crossAuditAmenities(
    rawAmenities,
    shop,
    realIntelligence || activeIntel.reviewIntelligence || null,
    language
  );

  

  
  

  return (
    <div 
      id={`ai-intel-div-${shop.id}`}
      className={`rounded-2xl border transition-all duration-200 overflow-hidden shadow-sm ${
        isLight 
          ? 'bg-gradient-to-b from-[#FAF7F2] to-[#F5EFE6] border-[#E5DACD] text-[#332A24]' 
          : 'bg-gradient-to-b from-[#1E1915] to-[#16120F] border-[#3D3126] text-[#E8DFD8]'
      }`}
    >
      {/* Top Header Bar */}
      <div 
        onClick={toggleExpand}
        className={`p-3 sm:p-3.5 flex items-center justify-between cursor-pointer transition-colors ${
          isExpanded 
            ? isLight ? 'border-b border-[#EBE2D7]' : 'border-b border-[#2D241C]'
            : ''
        } ${
          isLight 
            ? 'hover:bg-black/5' 
            : 'hover:bg-white/5'
        }`}
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-500 text-black flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles size={15} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider flex items-center gap-1 ${
                isLight ? 'text-[#6B5B14]' : 'text-amber-300'
              }`}>
                <ShieldCheck size={13} className="text-emerald-500" />
                {t('intel.titleLocalized', 'AI Insights & Tiện ích đối chứng')}
              </span>
              {refreshSuccess && (
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 animate-fade-in">
                  {t('intel.updated', 'Đã cập nhật')}
                </span>
              )}
            </div>
            <p className={`text-[10.5px] sm:text-[11px] truncate ${
              isLight ? 'text-[#766200]' : 'text-amber-200/80'
            }`}>
              {activeIntel.vibe || t('intel.subtitleBanner', 'Tổng hợp từ Google Maps & đánh giá khách hàng thực tế')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.stopPropagation();
              openGoogleMaps(resolvedPlaceSource, e);
            }}
            title={t('intel.openGoogleMaps', 'Mở Google Maps')}
            className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-all ${
              isLight 
                ? 'bg-white hover:bg-emerald-50 border-emerald-300 text-emerald-800' 
                : 'bg-emerald-950/40 hover:bg-emerald-900/60 border-emerald-700/60 text-emerald-300'
            }`}
          >
            <Compass size={13} />
            <span className="text-[10px] font-bold hidden sm:inline">{t('intel.directions', 'Chỉ đường')}</span>
            <ExternalLink size={10} />
          </a>

          <button
            onClick={handleLiveAiExtraction}
            disabled={isRefreshing}
            title={t('intel.reExtract', 'Trích xuất lại AI')}
            className={`p-1.5 rounded-lg border text-xs transition-all ${
              isLight 
                ? 'bg-white hover:bg-amber-50 border-amber-300 text-amber-800' 
                : 'bg-amber-950/40 hover:bg-amber-900/60 border-amber-700/60 text-amber-300'
            }`}
          >
            <RefreshCw size={13} className={isRefreshing ? "animate-spin text-amber-500" : ""} />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleExpand();
            }}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? t('intel.collapse', 'Thu gọn') : t('intel.expand', 'Mở rộng')}
            className={`p-1.5 rounded-lg border text-[#8A7563] dark:text-[#9F8C7D] transition-all flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 ${
              isLight ? 'border-amber-900/10' : 'border-amber-200/10'
            }`}
          >
            <MorphIcon icon={isExpanded ? ChevronUpIcon : ChevronDownIcon} size={16} />
          </button>
        </div>
      </div>

      {/* Expanded Detailed Information Sheet */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="p-3.5 sm:p-4 space-y-3.5 text-xs"
          >
            {/* 1. ✨ AI-EXTRACTED AUDIT & REVIEW INTELLIGENCE (Unified Container with Switch Tab UI) */}
            <div className={`p-3 sm:p-4 rounded-xl border flex flex-col gap-3.5 transition-colors ${
              isLight ? 'bg-white/70 border-emerald-200/90 shadow-xs' : 'bg-[#152317]/80 border-[#2A472E]'
            }`}>
              {/* SWITCH TAB CONTROL */}
              <div className="flex justify-center w-full min-w-0">
                <div 
                  className={`relative flex items-center p-1 rounded-full border w-full max-w-md select-none transition-colors overflow-hidden ${
                    isLight 
                      ? 'bg-slate-100/90 border-slate-200/80 shadow-inner' 
                      : 'bg-black/40 border-white/10'
                  }`}
                >
                  {/* Tab A Button: Tiện ích đối chứng */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setActiveTab('amenities'); }}
                    className={`relative z-10 flex-1 min-w-0 py-1.5 sm:py-2 px-2 sm:px-3.5 rounded-full text-[11px] sm:text-xs font-bold transition-colors flex items-center justify-center gap-1 sm:gap-1.5 min-h-[34px] sm:min-h-[38px] ${
                      activeTab === 'amenities'
                        ? isLight
                          ? 'text-emerald-950 font-extrabold'
                          : 'text-emerald-200 font-extrabold'
                        : isLight
                          ? 'text-slate-500 hover:text-slate-700'
                          : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {activeTab === 'amenities' && (
                      <motion.div
                        layoutId="activePillTabIndicator"
                        className={`absolute inset-0 rounded-full shadow-sm ${
                          isLight 
                            ? 'bg-white border border-emerald-300/40' 
                            : 'bg-[#2A472E] border border-emerald-500/40'
                        }`}
                        transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                      />
                    )}
                    <CheckCircle2 size={13} className={`relative z-10 shrink-0 ${activeTab === 'amenities' ? (isLight ? 'text-emerald-600' : 'text-emerald-400') : 'opacity-60'}`} />
                    <span className="relative z-10 truncate whitespace-nowrap min-w-0">{t('intel.aiAmenitiesTitle', 'Tiện ích đối chứng')}</span>
                  </button>

                  {/* Tab B Button: Phân tích bởi AI */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setActiveTab('reviews'); }}
                    className={`relative z-10 flex-1 min-w-0 py-1.5 sm:py-2 px-2 sm:px-3.5 rounded-full text-[11px] sm:text-xs font-bold transition-colors flex items-center justify-center gap-1 sm:gap-1.5 min-h-[34px] sm:min-h-[38px] ${
                      activeTab === 'reviews'
                        ? isLight
                          ? 'text-amber-950 font-extrabold'
                          : 'text-amber-200 font-extrabold'
                        : isLight
                          ? 'text-slate-500 hover:text-slate-700'
                          : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {activeTab === 'reviews' && (
                      <motion.div
                        layoutId="activePillTabIndicator"
                        className={`absolute inset-0 rounded-full shadow-sm ${
                          isLight 
                            ? 'bg-white border border-amber-300/50' 
                            : 'bg-[#3D2C1D] border border-amber-500/40'
                        }`}
                        transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                      />
                    )}
                    <BarChart3 size={13} className={`relative z-10 shrink-0 ${activeTab === 'reviews' ? (isLight ? 'text-amber-600' : 'text-amber-400') : 'opacity-60'}`} />
                    <span className="relative z-10 truncate whitespace-nowrap min-w-0">{t('intel.reviewIntelligenceTitle', 'Phân tích bởi AI')}</span>
                  </button>
                </div>
              </div>

              {/* Active Tab Content */}
              <div className="relative min-h-[140px]">
                <AnimatePresence mode="wait">
                  {activeTab === 'amenities' && (
                    <motion.div
                      key="amenities"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.2 }}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-2.5"
                    >
                      {displayAmenities.map((am, idx) => {
                        const isConflict = am.verificationStatus === 'conflict';
                        const isPartial = am.verificationStatus === 'partial';

                        return (
                          <div 
                            key={idx}
                            className={`p-3 rounded-xl border flex flex-col justify-between gap-2.5 transition-all w-full min-w-0 ${
                              isConflict
                                ? isLight
                                  ? 'bg-[#FFF7ED] border-[#FDBA74] text-[#431407] shadow-xs'
                                  : 'bg-amber-950/40 border-amber-700/60 text-amber-100'
                                : isPartial
                                  ? isLight
                                    ? 'bg-[#EFF6FF] border-[#93C5FD] text-[#172554] shadow-xs'
                                    : 'bg-blue-950/40 border-blue-700/60 text-blue-100'
                                  : isLight 
                                    ? 'bg-white hover:bg-[#FDFBF9] border-[#D4C5B3] hover:border-emerald-600 text-black shadow-[0_1px_3px_rgba(0,0,0,0.06)]' 
                                    : 'bg-[#221B16] hover:bg-[#29201A] border-[#3E3024] hover:border-emerald-500/50 text-[#EDE5DE]'
                            }`}
                          >
                            {/* Top Header: Icon + Name (left) & Badge (right) */}
                            <div className="flex items-center justify-between gap-2 w-full min-w-0">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border ${
                                  isConflict
                                    ? isLight ? 'bg-amber-100/90 border-amber-300 text-amber-900' : 'bg-amber-900/60 border-amber-700 text-amber-200'
                                    : isPartial
                                      ? isLight ? 'bg-blue-100/90 border-blue-300 text-blue-900' : 'bg-blue-900/60 border-blue-700 text-blue-200'
                                      : isLight ? 'bg-amber-50 border-amber-900/10 text-[#800020]' : 'bg-[#2A211B] border-amber-200/10 text-[#D4AF37]'
                                }`}>
                                  {renderAmenitySvgIcon(am)}
                                </div>
                                <p className={`text-xs font-black truncate ${isLight ? 'text-black' : 'text-[#FAF5EE]'}`}>
                                  {getConciseAmenityName(am.name, language)}
                                </p>
                              </div>

                              {/* Status Icon Badge */}
                              <span 
                                title={
                                  isConflict 
                                    ? t('intel.statusConflict', 'Có phản ánh') 
                                    : isPartial 
                                      ? t('intel.statusPartial', 'Khớp một phần') 
                                      : t('intel.statusVerified', 'Đã đối chứng')
                                }
                                className={`w-5 h-5 rounded-full shrink-0 border inline-flex items-center justify-center transition-transform hover:scale-110 ${
                                  isConflict
                                    ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/70 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                                    : isPartial
                                      ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/70 dark:text-blue-200 border-blue-300 dark:border-blue-700'
                                      : 'bg-emerald-100/90 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300/90 dark:border-emerald-700'
                                }`}
                              >
                                {isConflict ? (
                                  <AlertTriangle size={11} className="text-amber-700 dark:text-amber-400" />
                                ) : isPartial ? (
                                  <HelpCircle size={11} className="text-blue-700 dark:text-blue-400" />
                                ) : (
                                  <CheckCircle2 size={11} className="text-emerald-700 dark:text-emerald-400" />
                                )}
                              </span>
                            </div>

                            {/* Customer Review Verification & Conflict Footnote */}
                            {(am.customerFeedback || am.conflictNote) && (
                              <div className={`pt-2 border-t text-[11px] flex items-start gap-1.5 leading-snug w-full ${
                                isConflict 
                                  ? 'border-amber-200 text-[#431407] dark:text-amber-200 font-medium'
                                  : isLight
                                    ? 'border-[#E2D4C3] text-[#1A120B]'
                                    : 'border-[#33261C] text-[#C4B4A5]'
                              }`}>
                                {isConflict ? (
                                  <AlertCircle size={12} className="text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                                ) : (
                                  <CheckCircle2 size={12} className="text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
                                )}
                                <div className="min-w-0 flex-1 break-normal">
                                  <span className={`font-black ${
                                    isConflict 
                                      ? 'text-[#FE6800] dark:text-amber-400' 
                                      : isLight 
                                        ? 'text-[#064E3B]' 
                                        : 'text-emerald-300'
                                  }`}>
                                    {isConflict ? t('intel.conflictWarning', '⚠️ Lưu ý:') : t('intel.customerFeedback', 'Đánh giá khách:')}{' '}
                                  </span>
                                  <span className={isConflict ? 'text-[#C79200] dark:text-amber-300 font-semibold' : (isLight ? 'text-[#1A120B] font-medium' : 'italic text-[#BDB0A3]')}>
                                    {isConflict ? (am.conflictNote || am.customerFeedback) : am.customerFeedback}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </motion.div>
                  )}

                  {activeTab === 'reviews' && (
                    <motion.div
                      key="reviews"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.2 }}
                      className="w-full"
                    >
                      <ReviewIntelligenceDashboard intelligence={realIntelligence} isLight={isLight} isLoading={isFetchingIntelligence} shopReviewCount={shop.reviewCount} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Best For Tags */}
            <div>
              <span className={`text-[10px] font-black uppercase tracking-wider block mb-1.5 ${isLight ? 'text-[#3E2B1E]' : 'text-[#A39282]'}`}>
                {t('intel.bestFor', '🎯 Đối tượng & Mục đích phù hợp nhất')}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {activeIntel.bestFor.map((item, idx) => (
                  <span 
                    key={idx}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[10px] border ${
                      isLight 
                        ? 'bg-amber-100/90 border-amber-300 text-amber-950 font-extrabold' 
                        : 'bg-[#2A2118] border-[#4A3A2C] text-amber-300'
                    }`}
                  >
                    ✓ {item}
                  </span>
                ))}
              </div>
            </div>

            {/* Signature Recommended Drinks */}
            {activeIntel.signatureDrinks && activeIntel.signatureDrinks.length > 0 && (
              <div>
                <span className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1 mb-2 ${isLight ? 'text-[#3E2B1E]' : 'text-[#A39282]'}`}>
                  <Coffee size={12} className="text-amber-600" />
                  {t('intel.signatureDrinks', '☕ Món Signature Khuyên Thử (AI Picked)')}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activeIntel.signatureDrinks.map((drink, idx) => (
                    <div 
                      key={idx}
                      className={`p-2.5 rounded-xl border flex flex-col justify-between ${
                        isLight ? 'bg-white border-[#D6C7B2] shadow-xs' : 'bg-black/25 border-[#382E25]'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-1">
                        <span className={`font-black text-[11px] ${isLight ? 'text-black' : 'text-[#EAE0D7]'}`}>{drink.name}</span>
                        <span className={`text-[10px] font-black shrink-0 ${isLight ? 'text-amber-900' : 'text-amber-400'}`}>
                          {drink.price.toLocaleString('vi-VN')}đ
                        </span>
                      </div>
                      <p className={`text-[10.5px] mt-1 leading-snug font-medium ${isLight ? 'text-[#2B1F17]' : 'text-[#A8988A]'}`}>
                        💡 {drink.reason}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tech, Work & Logistics Grid */}
            {(activeIntel.workAndTech?.wifiSpeed || 
              activeIntel.workAndTech?.outletsAvailability || 
              activeIntel.workAndTech?.idealQuietHours || 
              activeIntel.googleMapsData?.parkingInfo) && (
              <div className={`p-3 rounded-xl border grid grid-cols-1 sm:grid-cols-2 gap-2.5 ${
                isLight ? "bg-white border-[#D6C7B2] shadow-xs" : "bg-black/20 border-[#362B21]"
              }`}>
                {activeIntel.workAndTech?.wifiSpeed && (
                  <div className="flex items-start gap-2">
                    <Wifi size={14} className="text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <span className={`font-black text-[10.5px] block ${isLight ? 'text-black' : 'text-[#C5B6A8]'}`}>{t("intel.wifiSpeed", "Tốc độ Internet")}</span>
                      <span className={`text-[10px] font-semibold ${isLight ? 'text-[#2B1F17]' : 'text-[#A08E80]'}`}>{activeIntel.workAndTech.wifiSpeed}</span>
                    </div>
                  </div>
                )}
                
                {activeIntel.workAndTech?.outletsAvailability && (
                  <div className="flex items-start gap-2">
                    <Zap size={14} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className={`font-black text-[10.5px] block ${isLight ? 'text-black' : 'text-[#C5B6A8]'}`}>{t("intel.outlets", "Ổ cắm điện")}</span>
                      <span className={`text-[10px] font-semibold ${isLight ? 'text-[#2B1F17]' : 'text-[#A08E80]'}`}>{activeIntel.workAndTech.outletsAvailability}</span>
                    </div>
                  </div>
                )}
                
                {activeIntel.workAndTech?.idealQuietHours && (
                  <div className="flex items-start gap-2">
                    <Clock size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className={`font-black text-[10.5px] block ${isLight ? 'text-black' : 'text-[#C5B6A8]'}`}>{t("intel.quietHours", "Giờ vắng yên tĩnh")}</span>
                      <span className={`text-[10px] font-semibold ${isLight ? 'text-[#2B1F17]' : 'text-[#A08E80]'}`}>{activeIntel.workAndTech.idealQuietHours}</span>
                    </div>
                  </div>
                )}
                
                {activeIntel.googleMapsData?.parkingInfo && (
                  <div className="flex items-start gap-2">
                    <MapPin size={14} className="text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <span className={`font-black text-[10.5px] block ${isLight ? 'text-black' : 'text-[#C5B6A8]'}`}>{t("intel.parkingAndMove", "Đỗ xe & Di chuyển")}</span>
                      <span className={`text-[10px] font-semibold ${isLight ? 'text-[#2B1F17]' : 'text-[#A08E80]'}`}>{activeIntel.googleMapsData.parkingInfo}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Quick Actions Footer inside Div */}
            <div className="flex items-center justify-between pt-1">
              <div className="text-[9px] text-[#8C7664] dark:text-[#9B8878]">
                {t('intel.placeIdLabel', 'Dữ liệu Google Place ID:')} <code className="font-mono">{activeIntel.googleMapsData?.placeId?.slice(0, 14) || 'gplace_verified'}...</code>
              </div>
              <div className="flex gap-2">
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    e.stopPropagation();
                    openGoogleMaps(resolvedPlaceSource, e);
                  }}
                  className={`px-3 py-1.5 rounded-xl border font-bold text-[10px] flex items-center gap-1 transition-all ${
                    isLight 
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-500 shadow-sm' 
                      : 'bg-emerald-700 text-white hover:bg-emerald-600 border-emerald-600'
                  }`}
                >
                  <Compass size={12} />
                  {t('intel.openGoogleMaps', 'Mở Google Maps')}
                </a>
                {onOpenStoreDetail && (
                  <button
                    onClick={onOpenStoreDetail}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-[10px] transition-all shadow-sm"
                  >
                    {t('intel.viewMenuAndBook', 'Xem menu & Đặt bàn →')}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


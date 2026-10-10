// Coffee Passport Taxonomy - Single Source of Truth
import { Amenity, ShopStyle, SpecialModel, Mood } from '../../types';
import { LegacyCompatibilityLayer } from '../../../backend/server/search/taxonomy/compatibility';

export interface TaxonomyModelDef {
  id: string; // e.g. 'cat_cafe'
  uiName: SpecialModel; // e.g. 'Cat Café'
  category: 'special_model';
  icon: string;
  descriptionVi: string;
  descriptionEn: string;
  descriptionZh: string;
  descriptionJa: string;
  descriptionKo: string;
  descriptionTh: string;
  aliases: Record<string, string[]>; // lang -> alias keywords
}

export interface TaxonomyAmenityDef {
  id: string; // e.g. 'charging_station'
  uiName: Amenity; // e.g. 'Chỗ sạc'
  category: 'amenity';
  icon: string;
  aliases: Record<string, string[]>;
}

export interface TaxonomyExperienceDef {
  id: string; // e.g. 'quiet'
  uiStyle?: ShopStyle; // e.g. 'Minimalist' | 'Cozy Modern'
  uiMood?: Mood; // e.g. 'Làm việc / Học bài'
  category: 'experience';
  icon: string;
  aliases: Record<string, string[]>;
}

// 1. SPECIAL MODELS TAXONOMY (Source of Truth)
export const TAXONOMY_SPECIAL_MODELS: TaxonomyModelDef[] = [
  {
    id: 'cat_cafe',
    uiName: 'Cat Café',
    category: 'special_model',
    icon: '🐱',
    descriptionVi: 'Cà phê thú cưng mèo',
    descriptionEn: 'Cat & feline cafe',
    descriptionZh: '貓咪咖啡廳 寵物咖啡館',
    descriptionJa: '猫カフェ',
    descriptionKo: '고양이 카페',
    descriptionTh: 'คาเฟ่แมว',
    aliases: {
      vi: ['cà phê mèo', 'quán cà phê mèo', 'cat cafe', 'quán mèo', 'cafe mèo', 'uống cà phê với mèo'],
      en: ['cat cafe', 'cat coffee', 'feline cafe', 'cats cafe', 'kitten cafe'],
      'zh-TW': ['貓咪咖啡廳', '貓咪咖啡館', '貓咖啡', '貓咖', '擼貓咖啡'],
      'zh-CN': ['猫咪咖啡厅', '猫咪咖啡馆', '猫咖', '撸猫咖啡'],
      ja: ['猫カフェ', 'ネコカフェ', 'ねこカフェ', '猫珈琲'],
      ko: ['고양이 카페', '고양이카페', '냥이카페'],
      th: ['คาเฟ่แมว', 'ร้านกาแฟแมว', 'คาเฟ่น้องแมว'],
      id: ['kafe kucing', 'cat cafe']
    }
  },
  {
    id: 'dog_cafe',
    uiName: 'Dog Café',
    category: 'special_model',
    icon: '🐶',
    descriptionVi: 'Cà phê thú cưng cún',
    descriptionEn: 'Dog & canine cafe',
    descriptionZh: '狗狗咖啡廳 寵物咖啡館',
    descriptionJa: '犬カフェ',
    descriptionKo: '강아지 카페',
    descriptionTh: 'คาเฟ่สุนัข',
    aliases: {
      vi: ['cà phê cún', 'quán cà phê chó', 'dog cafe', 'quán cún', 'cafe chó', 'chó cưng'],
      en: ['dog cafe', 'puppy cafe', 'canine coffee', 'dogs cafe'],
      'zh-TW': ['狗狗咖啡廳', '狗狗咖啡館', '狗咖啡', '狗咖'],
      'zh-CN': ['狗狗咖啡厅', '狗狗咖啡馆', '狗咖'],
      ja: ['犬カフェ', 'ドッグカフェ', 'いぬカフェ'],
      ko: ['강아지 카페', '애견 카페', '댕댕이카페'],
      th: ['คาเฟ่สุนัข', 'คาเฟ่หมา', 'คาเฟ่น้องหมา'],
      id: ['kafe anjing', 'dog cafe']
    }
  },
  {
    id: 'board_game_cafe',
    uiName: 'Board Game Café',
    category: 'special_model',
    icon: '🎲',
    descriptionVi: 'Kho trò chơi Board Game phong phú',
    descriptionEn: 'Board games & tabletop cafe',
    descriptionZh: '桌遊咖啡廳 桌上遊戲咖啡館',
    descriptionJa: 'ボードゲームカフェ',
    descriptionKo: '보드게임 카페',
    descriptionTh: 'คาเฟ่บอร์ดเกม',
    aliases: {
      vi: ['board game cafe', 'quán board game', 'cà phê boardgame', 'quán cờ', 'chơi boardgame'],
      en: ['board game cafe', 'board games', 'tabletop cafe', 'card game cafe'],
      'zh-TW': ['桌遊咖啡廳', '桌遊店', '桌上遊戲咖啡館', '桌遊咖啡'],
      'zh-CN': ['桌游咖啡厅', '桌游吧', '桌上游戏咖啡馆'],
      ja: ['ボードゲームカフェ', 'ボドゲカフェ', 'ゲームカフェ'],
      ko: ['보드게임 카페', '보드게임카페'],
      th: ['คาเฟ่บอร์ดเกม', 'บอร์ดเกมคาเฟ่'],
      id: ['kafe board game', 'board game cafe']
    }
  },
  {
    id: 'workshop_cafe',
    uiName: 'Workshop Café',
    category: 'special_model',
    icon: '🛠️',
    descriptionVi: 'Không gian tổ chức Workshop & DIY',
    descriptionEn: 'Creative workshop & crafting studio',
    descriptionZh: '手作工作坊咖啡廳 創意工坊',
    descriptionJa: 'ワークショップカフェ',
    descriptionKo: '공방 카페',
    descriptionTh: 'คาเฟ่เวิร์กช็อป',
    aliases: {
      vi: ['workshop cafe', 'quán workshop', 'cà phê làm việc sáng tạo', 'diy cafe', 'thủ công'],
      en: ['workshop cafe', 'craft cafe', 'diy cafe', 'creative studio cafe'],
      'zh-TW': ['工作坊咖啡廳', '手作咖啡館', 'DIY咖啡廳', '體驗工坊'],
      'zh-CN': ['工作坊咖啡厅', '手作咖啡馆', 'DIY咖啡厅'],
      ja: ['ワークショップカフェ', 'ものづくりカフェ', 'DIYカフェ'],
      ko: ['공방 카페', '원데이클래스 카페', 'DIY 카페'],
      th: ['คาเฟ่เวิร์กช็อป', 'สตูดิโอคราฟต์'],
      id: ['kafe workshop', 'creative studio cafe']
    }
  },
  {
    id: 'console_gaming_cafe',
    uiName: 'Console Gaming Café',
    category: 'special_model',
    icon: '🎮',
    descriptionVi: 'Không gian cà phê, nhà hàng và giải trí cung cấp trải nghiệm chơi game PS5, Nintendo Switch, Xbox, hoặc các máy chơi game cổ điển.',
    descriptionEn: 'Cafes, dining spaces, and entertainment venues offering PS5, Nintendo Switch, Xbox, retro gaming, or other console gaming experiences.',
    descriptionZh: '提供 PS5、Nintendo Switch、Xbox、復古電玩或其他主機遊戲體驗的咖啡廳、餐飲空間及遊戲娛樂場所。',
    descriptionJa: 'ゲームカフェ',
    descriptionKo: '콘솔 게임 카페',
    descriptionTh: 'คาเฟ่ พื้นที่รับประทานอาหาร และสถานบันเทิงที่ให้บริการเครื่องเล่น PS5, Nintendo Switch, Xbox, วิดีโอเกมย้อนยุค หรือประสบการณ์การเล่นเกมคอนโซลอื่นๆ',
    aliases: {
      vi: ['console gaming cafe', 'quán ps5', 'cà phê chơi game', 'nintendo switch cafe', 'playstation cafe'],
      en: ['console gaming cafe', 'ps5 cafe', 'gaming lounge', 'switch cafe', 'video game cafe'],
      'zh-TW': ['主機遊戲咖啡廳', '電玩咖啡館', 'PS5咖啡廳', 'Switch咖啡'],
      'zh-CN': ['主机游戏咖啡厅', '电玩咖啡馆', '游戏主机咖啡厅'],
      ja: ['ゲームカフェ', 'eスポーツカフェ', 'PS5カフェ'],
      ko: ['콘솔 게임 카페', '플스 카페', '플레이스테이션 카페'],
      th: ['คาเฟ่เกมคอนโซล', 'คาเฟ่ PS5'],
      id: ['kafe console game', 'gaming cafe']
    }
  },
  {
    id: 'book_cafe',
    uiName: 'Book Café',
    category: 'special_model',
    icon: '📚',
    descriptionVi: 'Không gian sách & đọc sách yên tĩnh',
    descriptionEn: 'Library, reading & quiet book cafe',
    descriptionZh: '書店咖啡廳 閱讀安靜咖啡館',
    descriptionJa: 'ブックカフェ',
    descriptionKo: '북 카페',
    descriptionTh: 'คาเฟ่หนังสือ',
    aliases: {
      vi: ['cà phê sách', 'quán cà phê sách', 'book cafe', 'quán đọc sách', 'sách', 'thư viện cafe'],
      en: ['book cafe', 'reading cafe', 'library cafe', 'books and coffee', 'bookshop cafe'],
      'zh-TW': ['書店咖啡廳', '閱讀咖啡館', '書香咖啡', '圖書館咖啡'],
      'zh-CN': ['书店咖啡厅', '阅读咖啡馆', '书香咖啡'],
      ja: ['ブックカフェ', '読書カフェ', '本屋カフェ'],
      ko: ['북 카페', '책 카페', '도서관 카페'],
      th: ['คาเฟ่หนังสือ', 'บุ๊คคาเฟ่', 'ร้านกาแฟอ่านหนังสือ'],
      id: ['kafe buku', 'book cafe']
    }
  },
  {
    id: 'plant_cafe',
    uiName: 'Plant Café',
    category: 'special_model',
    icon: '🪴',
    descriptionVi: 'Cà phê cây cảnh nhiệt đới & Bonsai',
    descriptionEn: 'Botanical garden & indoor plant cafe',
    descriptionZh: '綠意植栽花園咖啡廳 森林系景觀',
    descriptionJa: 'ボタニカルカフェ',
    descriptionKo: '식물 카페',
    descriptionTh: 'คาเฟ่ต้นไม้',
    aliases: {
      vi: ['quán cà phê cây xanh', 'cà phê sân vườn', 'plant cafe', 'botanical cafe', 'vườn cây'],
      en: ['plant cafe', 'botanical cafe', 'garden cafe', 'greenery cafe', 'nature plant cafe'],
      'zh-TW': ['植栽咖啡廳', '植物咖啡館', '森林系咖啡', '花園景觀咖啡'],
      'zh-CN': ['绿植咖啡厅', '植物咖啡馆', '森林系咖啡'],
      ja: ['ボタニカルカフェ', '植物カフェ', 'ガーデンカフェ'],
      ko: ['식물 카페', '플랜트 카페', '가든 카페'],
      th: ['คาเฟ่ต้นไม้', 'คาเฟ่สวนธรรมชาติ'],
      id: ['kafe tanaman', 'plant cafe']
    }
  },
  {
    id: 'ceramic_cafe',
    uiName: 'Ceramic Café',
    category: 'special_model',
    icon: '🏺',
    descriptionVi: 'Trải nghiệm làm gốm & vẽ tranh gốm',
    descriptionEn: 'Ceramic & pottery crafting cafe',
    descriptionZh: '陶藝手作工坊咖啡廳',
    descriptionJa: '陶芸カフェ',
    descriptionKo: '도자기 카페',
    descriptionTh: 'คาเฟ่ปั้นเซรามิก',
    aliases: {
      vi: ['cà phê gốm', 'quán gốm', 'ceramic cafe', 'làm gốm', 'workshop gốm'],
      en: ['ceramic cafe', 'pottery cafe', 'ceramics coffee', 'clay workshop cafe'],
      'zh-TW': ['陶藝咖啡廳', '陶瓷咖啡館', '手作陶藝咖啡'],
      'zh-CN': ['陶艺咖啡厅', '陶瓷咖啡馆'],
      ja: ['陶芸カフェ', 'セラミックカフェ'],
      ko: ['도자기 카페', '도예 카페'],
      th: ['คาเฟ่ปั้นเซรามิก', 'เวิร์กช็อปเซรามิก'],
      id: ['kafe keramik', 'pottery cafe']
    }
  },
  {
    id: 'vinyl_cafe',
    uiName: 'Vinyl Café',
    category: 'special_model',
    icon: '🎵',
    descriptionVi: 'Nghe nhạc đĩa than & dàn âm thanh Hi-Fi',
    descriptionEn: 'Vinyl records & Hi-Fi acoustic lounge',
    descriptionZh: '黑膠唱片咖啡廳 爵士音響咖啡館',
    descriptionJa: 'レコードカフェ',
    descriptionKo: '바이닐 카페',
    descriptionTh: 'คาเฟ่แผ่นเสียง',
    aliases: {
      vi: ['cà phê đĩa than', 'quán đĩa than', 'vinyl cafe', 'hi-fi cafe', 'nghe nhạc đĩa than'],
      en: ['vinyl cafe', 'record cafe', 'vinyl bar cafe', 'hi-fi coffee', 'audiophile cafe'],
      'zh-TW': ['黑膠咖啡廳', '黑膠唱片咖啡館', '音樂咖啡廳'],
      'zh-CN': ['黑胶咖啡厅', '黑胶唱片咖啡馆'],
      ja: ['レコードカフェ', 'ジャズ喫茶', 'アナログカフェ'],
      ko: ['바이닐 카페', 'LP 카페', '음악 카페'],
      th: ['คาเฟ่แผ่นเสียง', 'คาเฟ่ดนตรีแจ๊ส'],
      id: ['kafe piringan hitam', 'vinyl cafe']
    }
  },
  {
    id: 'fashion_cafe',
    uiName: 'Fashion Café',
    category: 'special_model',
    icon: '👗',
    descriptionVi: 'Kết hợp thời trang thiết kế & may đo',
    descriptionEn: 'Fashion boutique & design apparel cafe',
    descriptionZh: '時尚選品服飾咖啡廳',
    descriptionJa: 'ファッションカフェ',
    descriptionKo: '패션 카페',
    descriptionTh: 'คาเฟ่แฟชั่น',
    aliases: {
      vi: ['cà phê thời trang', 'fashion cafe', 'boutique cafe', 'quán cafe quần áo'],
      en: ['fashion cafe', 'boutique cafe', 'clothing cafe', 'apparel cafe'],
      'zh-TW': ['時尚咖啡廳', '服飾選品咖啡館', '精品咖啡廳'],
      'zh-CN': ['时尚咖啡厅', '服饰咖啡馆'],
      ja: ['ファッションカフェ', 'アパレルカフェ'],
      ko: ['패션 카페', '편집숍 카페'],
      th: ['คาเฟ่แฟชั่น', 'บูติกคาเฟ่'],
      id: ['kafe busana', 'fashion cafe']
    }
  },
  {
    id: 'art_toy_cafe',
    uiName: 'Art Toy Café',
    category: 'special_model',
    icon: '🧸',
    descriptionVi: 'Trưng bày Art Toy & Blindbox độc lạ',
    descriptionEn: 'Art toy, blindbox & collectible figure cafe',
    descriptionZh: '潮玩盲盒藝術公仔咖啡廳',
    descriptionJa: 'トイカフェ',
    descriptionKo: '아트토이 카페',
    descriptionTh: 'คาเฟ่อาร์ตทอย',
    aliases: {
      vi: ['cà phê mô hình', 'art toy cafe', 'quán blindbox', 'mô hình đồ chơi', 'cà phê pop mart'],
      en: ['art toy cafe', 'blind box cafe', 'toy collectible cafe', 'figure cafe'],
      'zh-TW': ['潮玩咖啡廳', '公仔咖啡館', '盲盒咖啡廳', 'Art Toy咖啡'],
      'zh-CN': ['潮玩咖啡厅', '手办咖啡馆', '盲盒咖啡厅'],
      ja: ['トイカフェ', 'フィギュアカフェ', 'アートトイカフェ'],
      ko: ['아트토이 카페', '피규어 카페', '토이 카페'],
      th: ['คาเฟ่อาร์ตทอย', 'คาเฟ่ของสะสม'],
      id: ['kafe art toy', 'toy cafe']
    }
  },
  {
    id: 'anime_cafe',
    uiName: 'Anime Café',
    category: 'special_model',
    icon: '⚡',
    descriptionVi: 'Chủ đề Anime, Manga & Cosplay',
    descriptionEn: 'Anime, manga & cosplay themed cafe',
    descriptionZh: '動漫主題女僕Cosplay咖啡館',
    descriptionJa: 'アニメカフェ',
    descriptionKo: '애니메이션 카페',
    descriptionTh: 'คาเฟ่อนิเมะ',
    aliases: {
      vi: ['cà phê anime', 'quán anime', 'manga cafe', 'cosplay cafe', 'anime cafe'],
      en: ['anime cafe', 'manga cafe', 'cosplay cafe', 'japanese anime cafe'],
      'zh-TW': ['動漫咖啡廳', '漫畫咖啡館', 'Cosplay咖啡廳', '女僕咖啡'],
      'zh-CN': ['动漫咖啡厅', '漫画咖啡馆', '二次元咖啡厅'],
      ja: ['アニメカフェ', 'コラボカフェ', 'メイドカフェ'],
      ko: ['애니 카페', '콜라보 카페', '만화 카페'],
      th: ['คาเฟ่อนิเมะ', 'เมดคาเฟ่'],
      id: ['kafe anime', 'manga cafe']
    }
  },
  {
    id: 'vr_cafe',
    uiName: 'VR Café',
    category: 'special_model',
    icon: '🥽',
    descriptionVi: 'Trải nghiệm kính thực tế ảo VR',
    descriptionEn: 'Virtual reality & metaverse immersion cafe',
    descriptionZh: 'VR虛擬實境科技體驗咖啡廳',
    descriptionJa: 'VRカフェ',
    descriptionKo: 'VR 카페',
    descriptionTh: 'คาเฟ่ VR',
    aliases: {
      vi: ['vr cafe', 'cà phê thực tế ảo', 'kính vr', 'quán vr'],
      en: ['vr cafe', 'virtual reality cafe', 'metaverse cafe', 'vr arcade cafe'],
      'zh-TW': ['VR咖啡廳', '虛擬實境咖啡館'],
      'zh-CN': ['VR咖啡厅', '虚拟现实咖啡馆'],
      ja: ['VRカフェ', 'バーチャルカフェ'],
      ko: ['VR 카페', '가상현실 카페'],
      th: ['คาเฟ่ VR', 'คาเฟ่โลกเสมือน'],
      id: ['kafe vr', 'virtual reality cafe']
    }
  },
  {
    id: 'immersive_cafe',
    uiName: 'Immersive Café',
    category: 'special_model',
    icon: '✨',
    descriptionVi: 'Trình chiếu ánh sáng đa giác quan',
    descriptionEn: 'Sensory projection & immersive lighting cafe',
    descriptionZh: '光影沉浸式多感官藝術咖啡廳',
    descriptionJa: 'イマーシブカフェ',
    descriptionKo: '몰입형 카페',
    descriptionTh: 'คาเฟ่แสงสีอิมเมอร์ซีฟ',
    aliases: {
      vi: ['cà phê đa giác quan', 'immersive cafe', 'cà phê ánh sáng', 'chiếu hình nghệ thuật'],
      en: ['immersive cafe', 'projection cafe', 'light art cafe', 'sensory cafe'],
      'zh-TW': ['沉浸式咖啡廳', '光影藝術咖啡館'],
      'zh-CN': ['沉浸式咖啡厅', '光影咖啡馆'],
      ja: ['イマーシブカフェ', 'プロジェクションカフェ'],
      ko: ['몰입형 카페', '미디어아트 카페'],
      th: ['คาเฟ่อิมเมอร์ซีฟ', 'คาเฟ่แสงสีเสียง'],
      id: ['kafe immersive', 'sensory cafe']
    }
  },
  {
    id: 'car_workshop_cafe',
    uiName: 'Car Workshop Café',
    category: 'special_model',
    icon: '🏎️',
    descriptionVi: 'Gara xe hơi & bảo dưỡng ô tô cổ',
    descriptionEn: 'Classic car garage & auto salon lounge',
    descriptionZh: '經典老車車庫主題咖啡廳',
    descriptionJa: 'カーガレージカフェ',
    descriptionKo: '자동차 개러지 카페',
    descriptionTh: 'คาเฟ่อู่รถยนต์',
    aliases: {
      vi: ['cà phê xe hơi', 'gara ô tô cafe', 'car workshop cafe', 'cà phê xe cổ'],
      en: ['car cafe', 'garage cafe', 'auto workshop cafe', 'classic car cafe'],
      'zh-TW': ['汽車主題咖啡廳', '車庫咖啡館', '超跑咖啡'],
      'zh-CN': ['汽车主题咖啡厅', '车库咖啡馆'],
      ja: ['カーカフェ', 'ガレージカフェ'],
      ko: ['자동차 카페', '개러지 카페'],
      th: ['คาเฟ่รถยนต์', 'การาจคาเฟ่'],
      id: ['kafe mobil', 'garage cafe']
    }
  },
  {
    id: 'moto_workshop_cafe',
    uiName: 'Moto Workshop Café',
    category: 'special_model',
    icon: '🏍️',
    descriptionVi: 'Biker Lounge & xe phân khối lớn',
    descriptionEn: 'Motorbike customization & biker lounge',
    descriptionZh: '重型機車改裝騎士主題咖啡廳',
    descriptionJa: 'バイクカフェ',
    descriptionKo: '바이크 카페',
    descriptionTh: 'คาเฟ่บิ๊กไบค์',
    aliases: {
      vi: ['cà phê môtô', 'moto workshop cafe', 'biker cafe', 'xe phân khối lớn', 'quán cà phê biker'],
      en: ['moto cafe', 'biker cafe', 'motorcycle cafe', 'custom bike cafe'],
      'zh-TW': ['重機咖啡廳', '騎士咖啡館', '機車咖啡'],
      'zh-CN': ['机车咖啡厅', '重机咖啡馆'],
      ja: ['バイクカフェ', 'ライダーズカフェ'],
      ko: ['바이크 카페', '라이더 카페'],
      th: ['คาเฟ่บิ๊กไบค์', 'คาเฟ่ชาวไบค์เกอร์'],
      id: ['kafe motor', 'biker cafe']
    }
  }
];

// 2. AMENITIES TAXONOMY
export const TAXONOMY_AMENITIES: TaxonomyAmenityDef[] = [
  {
    id: 'charging_station',
    uiName: 'Chỗ sạc',
    category: 'amenity',
    icon: '⚡',
    aliases: {
      vi: ['chỗ sạc', 'ổ cắm điện', 'sạc pin', 'ổ điện', 'cắm laptop'],
      en: ['charging station', 'power outlets', 'sockets', 'plug', 'charger'],
      'zh-TW': ['插座', '充電座', '有插頭', '電源插座'],
      'zh-CN': ['插座', '充电口', '电源插座'],
      ja: ['電源あり', 'コンセントあり', '充電可能'],
      ko: ['콘센트', '충전 가능', '플러그'],
      th: ['ปลั๊กไฟ', 'ที่ชาร์จแบต'],
      id: ['colokan listrik', 'stopkontak']
    }
  },
  {
    id: 'wifi',
    uiName: 'Wi-Fi',
    category: 'amenity',
    icon: '📶',
    aliases: {
      vi: ['wifi', 'wi-fi', 'mạng', 'internet'],
      en: ['wifi', 'wi-fi', 'high-speed internet', 'wireless internet'],
      'zh-TW': ['WiFi', '無線網路', '免費網路'],
      'zh-CN': ['WiFi', '无线网络'],
      ja: ['Wi-Fiあり', '無線LAN'],
      ko: ['와이파이', '무료 Wi-Fi'],
      th: ['ไวไฟ', 'Wi-Fi ฟรี'],
      id: ['wifi gratis', 'internet cepat']
    }
  },
  {
    id: 'restroom',
    uiName: 'WC',
    category: 'amenity',
    icon: '🚻',
    aliases: {
      vi: ['wc', 'nhà vệ sinh', 'toilet', 'phòng vệ sinh'],
      en: ['restroom', 'toilet', 'bathroom', 'washroom', 'wc'],
      'zh-TW': ['洗手間', '廁所', '獨立衛浴'],
      'zh-CN': ['洗手间', '卫生间'],
      ja: ['トイレあり', 'お手洗い'],
      ko: ['화장실', '실내 화장실'],
      th: ['ห้องน้ำ', 'ห้องน้ำสะอาด'],
      id: ['toilet bersih', 'kamar kecil']
    }
  },
  {
    id: 'private_parking',
    uiName: 'Parking',
    category: 'amenity',
    icon: '🅿️',
    aliases: {
      vi: ['parking', 'bãi đỗ xe', 'chỗ gửi xe', 'đậu ô tô', 'giữ xe máy'],
      en: ['parking', 'private parking', 'valet parking', 'car park'],
      'zh-TW': ['停車位', '停車場', '專屬車位'],
      'zh-CN': ['停车场', '停车位'],
      ja: ['駐車場あり', 'パーキング'],
      ko: ['주차장', '무료 주차'],
      th: ['ที่จอดรถ', 'มีที่จอดรถ'],
      id: ['tempat parkir', 'area parkir']
    }
  },
  {
    id: 'indoor',
    uiName: 'Indoor',
    category: 'amenity',
    icon: '❄️',
    aliases: {
      vi: ['indoor', 'trong nhà', 'máy lạnh', 'điều hòa'],
      en: ['indoor', 'air conditioned', 'inside seating'],
      'zh-TW': ['室內座位', '冷氣開放'],
      'zh-CN': ['室内座位', '空调'],
      ja: ['屋内席', '冷房完備'],
      ko: ['실내 좌석', '에어컨 완비'],
      th: ['ห้องแอร์', 'ที่นั่งในร่ม'],
      id: ['ruang ber-AC', 'dalam ruangan']
    }
  },
  {
    id: 'outdoor',
    uiName: 'Outdoor',
    category: 'amenity',
    icon: '🌿',
    aliases: {
      vi: ['outdoor', 'ngoài trời', 'sân vườn', 'ban công', 'rooftop'],
      en: ['outdoor', 'terrace', 'patio', 'garden seating', 'rooftop'],
      'zh-TW': ['戶外座位', '露天庭院', '陽台'],
      'zh-CN': ['户外座位', '露天花园'],
      ja: ['テラス席', '屋外席', 'ガーデン席'],
      ko: ['야외 좌석', '테라스', '루프탑'],
      th: ['ที่นั่งกลางแจ้ง', 'ระเบียง'],
      id: ['luar ruangan', 'area terbuka']
    }
  },
  {
    id: 'private_space',
    uiName: 'Private',
    category: 'amenity',
    icon: '🚪',
    aliases: {
      vi: ['private', 'phòng riêng', 'khu riêng tư', 'phòng họp'],
      en: ['private space', 'meeting room', 'private booth', 'quiet room'],
      'zh-TW': ['包廂', '獨立包廂', '私人空間'],
      'zh-CN': ['包厢', '私密空间'],
      ja: ['個室あり', 'プライベート空間'],
      ko: ['룸', '개별 룸', '프라이빗 공간'],
      th: ['ห้องส่วนตัว', 'พื้นที่ส่วนตัว'],
      id: ['ruang privat', 'kamar terpisah']
    }
  },
  {
    id: 'shared_space',
    uiName: 'Shared',
    category: 'amenity',
    icon: '👥',
    aliases: {
      vi: ['shared', 'bàn dài', 'coworking', 'không gian chung'],
      en: ['shared table', 'communal table', 'coworking space'],
      'zh-TW': ['共享長桌', '共同工作空間'],
      'zh-CN': ['共享长桌', '联合办公'],
      ja: ['シェアスペース', '大テーブル'],
      ko: ['공용 테이블', '코워킹'],
      th: ['โต๊ะทำงานร่วมกัน'],
      id: ['meja bersama']
    }
  },
  {
    id: 'table_service',
    uiName: 'Table Service',
    category: 'amenity',
    icon: '🛎️',
    aliases: {
      vi: ['table service', 'phục vụ tại bàn', 'gọi món tại bàn'],
      en: ['table service', 'waiter service', 'served at table'],
      'zh-TW': ['桌邊服務', '點餐送餐至座位'],
      'zh-CN': ['桌边服务'],
      ja: ['フルサービス', 'テーブル注文'],
      ko: ['테이블 서빙'],
      th: ['เสิร์ฟถึงโต๊ะ'],
      id: ['layanan meja']
    }
  },
  {
    id: 'self_service',
    uiName: 'Self Service',
    category: 'amenity',
    icon: '🥤',
    aliases: {
      vi: ['self service', 'tự phục vụ', 'lấy nước tại quầy'],
      en: ['self service', 'counter pickup', 'order at counter'],
      'zh-TW': ['自助取餐', '櫃檯點餐'],
      'zh-CN': ['自助取餐'],
      ja: ['セルフサービス'],
      ko: ['셀프 서비스'],
      th: ['บริการตัวเอง'],
      id: ['layanan mandiri']
    }
  }
];

// 3. EXPERIENCES & STYLES TAXONOMY
export const TAXONOMY_EXPERIENCES: TaxonomyExperienceDef[] = [
  {
    id: 'quiet',
    uiStyle: 'Minimalist',
    uiMood: 'Làm việc / Học bài',
    category: 'experience',
    icon: '🎧',
    aliases: {
      vi: ['yên tĩnh', 'yên tĩnh làm việc', 'học bài', 'không ồn ào', 'tập trung'],
      en: ['quiet', 'silent', 'peaceful', 'study cafe', 'deep work', 'concentrate'],
      'zh-TW': ['安靜', '適合讀書', '專注工作', '不吵雜', '安靜舒適'],
      'zh-CN': ['安静', '适合学习', '专注工作'],
      ja: ['静か', '作業向け', '勉強できる', '落ち着いた'],
      ko: ['조용한', '공부하기 좋은', '집중하기 좋은'],
      th: ['เงียบสงบ', 'เหมาะนั่งทำงาน', 'อ่านหนังสือ'],
      id: ['tenang', 'untuk belajar', 'fokus kerja']
    }
  },
  {
    id: 'cozy_modern',
    uiStyle: 'Cozy Modern',
    uiMood: 'Thư giãn / Chill',
    category: 'experience',
    icon: '🛋️',
    aliases: {
      vi: ['ấm cúng', 'hiện đại', 'cozy', 'ấm áp', 'sofa êm'],
      en: ['cozy', 'modern', 'warm', 'comfortable sofa', 'chill'],
      'zh-TW': ['溫馨現代', '舒適放鬆', '沙發座'],
      'zh-CN': ['温馨现代', '舒适放松'],
      ja: ['モダン', '居心地が良い', 'ソファ席'],
      ko: ['아늑한', '모던한', '편안한'],
      th: ['อบอุ่นทันสมัย', 'นั่งสบาย'],
      id: ['hangat', 'modern nyaman']
    }
  },
  {
    id: 'retro_vintage',
    uiStyle: 'Retro',
    uiMood: 'Thư giãn / Chill',
    category: 'experience',
    icon: '📻',
    aliases: {
      vi: ['vintage', 'retro', 'cổ điển', 'hoài niệm', 'thời xưa', 'xưa cũ'],
      en: ['vintage', 'retro', 'nostalgic', 'antique', 'classic 90s'],
      'zh-TW': ['復古', '懷舊', '古董風', '老派風格'],
      'zh-CN': ['复古', '怀旧', '老派'],
      ja: ['レトロ', 'ヴィンテージ', '古民家風'],
      ko: ['레트로', '빈티지', '옛날 감성'],
      th: ['วินเทจ', 'เรโทร', 'คลาสสิก'],
      id: ['vintage', 'klasik jadul']
    }
  },
  {
    id: 'minimalist',
    uiStyle: 'Minimalist',
    uiMood: 'Làm việc / Học bài',
    category: 'experience',
    icon: '⚪',
    aliases: {
      vi: ['tối giản', 'minimalist', 'tinh tế', 'thoáng đãng'],
      en: ['minimalist', 'minimal', 'clean aesthetic', 'simple'],
      'zh-TW': ['極簡', '簡約風', '純白美學'],
      'zh-CN': ['极简', '简约风'],
      ja: ['ミニマリスト', 'シンプル'],
      ko: ['미니멀', '깔끔한'],
      th: ['มินิมอล', 'เรียบง่าย'],
      id: ['minimalis', 'simpel']
    }
  },
  {
    id: 'nature',
    uiStyle: 'Nature',
    uiMood: 'Thư giãn / Chill',
    category: 'experience',
    icon: '🍃',
    aliases: {
      vi: ['thiên nhiên', 'sân vườn', 'cây cối', 'xanh mát', 'thoáng mát'],
      en: ['nature', 'botanical', 'lush greenery', 'fresh air'],
      'zh-TW': ['大自然', '綠意盎然', '花園景觀'],
      'zh-CN': ['自然风', '绿植'],
      ja: ['自然豊か', '緑が見える'],
      ko: ['자연 친화적', '가든 뷰'],
      th: ['ธรรมชาติ', 'ร่มรื่น'],
      id: ['alami', 'taman hijau']
    }
  },
  {
    id: 'cute',
    uiStyle: 'Cute',
    uiMood: 'Chụp ảnh / Check-in',
    category: 'experience',
    icon: '🌸',
    aliases: {
      vi: ['dễ thương', 'cute', 'ngọt ngào', 'pastel', 'đáng yêu'],
      en: ['cute', 'sweet', 'pastel', 'kawaii', 'adorable'],
      'zh-TW': ['可愛', '粉嫩', '打卡甜美'],
      'zh-CN': ['可爱', '粉嫩少女心'],
      ja: ['かわいい', 'パステル'],
      ko: ['귀여운', '파스텔톤'],
      th: ['น่ารัก', 'พาสเทล'],
      id: ['imut', 'lucu pastel']
    }
  },
  {
    id: 'industrial',
    uiStyle: 'Industrial',
    uiMood: 'Làm việc / Học bài',
    category: 'experience',
    icon: '🧱',
    aliases: {
      vi: ['industrial', 'công nghiệp', 'gạch thô', 'kim loại', 'loft'],
      en: ['industrial', 'loft', 'brick and steel', 'roastery'],
      'zh-TW': ['工業風', '工廠風', '紅磚水泥'],
      'zh-CN': ['工业风', '金属质感'],
      ja: ['インダストリアル', '倉庫風'],
      ko: ['인더스트리얼', '콘크리트'],
      th: ['อินดัสเทรียล', 'ลอฟท์'],
      id: ['industrial', 'gaya loft']
    }
  },
  {
    id: 'artistic',
    uiStyle: 'Artistic',
    uiMood: 'Chụp ảnh / Check-in',
    category: 'experience',
    icon: '🎨',
    aliases: {
      vi: ['nghệ thuật', 'artistic', 'triển lãm', 'gallery', 'tranh ảnh'],
      en: ['artistic', 'art gallery', 'exhibition', 'creative decor'],
      'zh-TW': ['藝術', '藝廊美學', '展覽空間'],
      'zh-CN': ['艺术感', '画廊风'],
      ja: ['アート空間', 'ギャラリー風'],
      ko: ['예술적인', '갤러리 카페'],
      th: ['อาร์ต', 'แกลเลอรี'],
      id: ['artistik', 'galeri seni']
    }
  },
  {
    id: 'futuristic',
    uiStyle: 'Futuristic',
    uiMood: 'Chụp ảnh / Check-in',
    category: 'experience',
    icon: '🚀',
    aliases: {
      vi: ['tương lai', 'futuristic', 'cyberpunk', 'đèn neon', 'công nghệ'],
      en: ['futuristic', 'cyberpunk', 'neon lights', 'sci-fi', 'tech vibe'],
      'zh-TW': ['未來感', '賽博龐克', '科技霓虹'],
      'zh-CN': ['未来感', '赛博朋克'],
      ja: ['近未来', 'サイバーパンク'],
      ko: ['미래지향적', '사이버펑크'],
      th: ['ล้ำสมัย', 'ไซเบอร์พังก์'],
      id: ['futuristik', 'cyberpunk']
    }
  }
];

export class TaxonomyService {
  private static modelsMap = new Map<string, TaxonomyModelDef>(
    TAXONOMY_SPECIAL_MODELS.map(m => [m.id, m])
  );

  private static amenitiesMap = new Map<string, TaxonomyAmenityDef>(
    TAXONOMY_AMENITIES.map(a => [a.id, a])
  );

  private static experiencesMap = new Map<string, TaxonomyExperienceDef>(
    TAXONOMY_EXPERIENCES.map(e => [e.id, e])
  );

  // Get by ID
  public static getModel(id: string): TaxonomyModelDef | undefined {
    return this.modelsMap.get(id);
  }

  public static getAmenity(id: string): TaxonomyAmenityDef | undefined {
    return this.amenitiesMap.get(id);
  }

  public static getExperience(id: string): TaxonomyExperienceDef | undefined {
    return this.experiencesMap.get(id);
  }

  // Model ID validation
  public static isValidModel(id: string): boolean {
    return this.modelsMap.has(id);
  }

  public static isValidAmenity(id: string): boolean {
    return this.amenitiesMap.has(id);
  }

  public static isValidExperience(id: string): boolean {
    return this.experiencesMap.has(id);
  }

  // Convert canonical ID to localized UI label
  public static getModelUiLabel(id: string, lang: string = 'vi'): string {
    const m = this.getModel(id);
    if (!m) return id;
    if (lang === 'zh-TW') return m.descriptionZh.split(' ')[0] || m.uiName;
    if (lang === 'ja') return m.descriptionJa || m.uiName;
    if (lang === 'ko') return m.descriptionKo || m.uiName;
    if (lang === 'th') return m.descriptionTh || m.uiName;
    if (lang === 'en') return m.descriptionEn || m.uiName;
    return m.uiName;
  }

  // Convert UI SpecialModel (e.g. 'Cat Café') to canonical machine ID ('cat_cafe')
  public static mapUiModelToId(uiName: string): string | null {
    const found = TAXONOMY_SPECIAL_MODELS.find(
      m => m.uiName.toLowerCase() === uiName.toLowerCase() || m.id === uiName
    );
    return found ? found.id : null;
  }

  // Convert UI Amenity (e.g. 'Chỗ sạc') to canonical machine ID ('charging_station')
  public static mapUiAmenityToId(uiAmenity: string): string | null {
    const lower = uiAmenity.toLowerCase();
    if (lower === 'chỗ sạc' || lower === 'charging_station') return 'charging_station';
    if (lower === 'wi-fi' || lower === 'wifi') return 'wifi';
    if (lower === 'wc' || lower === 'restroom') return 'restroom';
    if (lower === 'parking' || lower === 'private_parking') return 'private_parking';
    if (lower === 'indoor') return 'indoor';
    if (lower === 'outdoor') return 'outdoor';
    if (lower === 'private' || lower === 'private_space') return 'private_space';
    if (lower === 'shared' || lower === 'shared_space') return 'shared_space';
    if (lower === 'table service' || lower === 'table_service') return 'table_service';
    if (lower === 'self service' || lower === 'self_service') return 'self_service';
    return null;
  }

  /**
   * Phase 2C Non-breaking Compatibility Lookup Path.
   * Resolves any legacy identifier (e.g. 'Cat Café', 'Chỗ sạc', 'work_friendly',
   * or legacy machine slug) through the Phase 2C LegacyCompatibilityLayer.
   * If not resolvable or unmapped, safely falls back to existing legacy mapping.
   */
  public static resolveCanonical(legacyId: string): string | null {
    const canonical = LegacyCompatibilityLayer.resolveCanonicalId(legacyId);
    if (canonical) {
      return canonical;
    }
    return this.mapUiModelToId(legacyId) || this.mapUiAmenityToId(legacyId);
  }
}

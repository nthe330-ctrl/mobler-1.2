import { CoffeeShop, Table, MenuItem, Amenity, ShopStyle, SpecialModel } from './types';

export interface AmenityInfo {
  id: Amenity;
  name: string;
  icon: string;
  description: string;
}

export interface ShopStyleInfo {
  id: ShopStyle;
  name: string;
  icon: string;
  description: string;
}

export interface SpecialModelInfo {
  id: SpecialModel;
  name: string;
  icon: string;
  description: string;
}

export const AMENITIES_CONFIG: AmenityInfo[] = [
  { id: 'Wi-Fi', name: 'Wi-Fi', icon: '📶', description: 'Đường truyền tốc độ cao' },
  { id: 'Chỗ sạc', name: 'Chỗ sạc', icon: '⚡', description: 'Ổ cắm điện tại bàn' },
  { id: 'WC', name: 'WC', icon: '🚻', description: 'Nhà vệ sinh sạch sẽ, riêng biệt' },
  { id: 'Parking', name: 'Parking', icon: '🅿️', description: 'Bãi đỗ xe máy & ô tô' },
  { id: 'Indoor', name: 'Indoor', icon: '❄️', description: 'Không gian máy lạnh trong nhà' },
  { id: 'Outdoor', name: 'Outdoor', icon: '🌿', description: 'Sân vườn thoáng mát ngoài trời' },
  { id: 'Private', name: 'Private', icon: '🚪', description: 'Phòng riêng, khu vực riêng tư' },
  { id: 'Shared', name: 'Shared', icon: '👥', description: 'Bàn dài làm việc chung' },
  { id: 'Table Service', name: 'Table Service', icon: '🛎️', description: 'Phục vụ món tận bàn' },
  { id: 'Self Service', name: 'Self Service', icon: '🥤', description: 'Tự lấy nước tại quầy' }
];

export const STYLES_CONFIG: ShopStyleInfo[] = [
  { id: 'Cozy Modern', name: 'Cozy Modern', icon: '🛋️', description: 'Ấm cúng, hiện đại & tiện nghi' },
  { id: 'Futuristic', name: 'Futuristic', icon: '🚀', description: 'Tương lai, viễn tưởng & Cyberpunk' },
  { id: 'Retro', name: 'Retro', icon: '📼', description: 'Hoài niệm thập niên 80s - 90s' },
  { id: 'Vintage', name: 'Vintage', icon: '📻', description: 'Cổ điển, mộc mạc & xưa cũ' },
  { id: 'Cute', name: 'Cute', icon: '🌸', description: 'Dễ thương, ngọt ngào & Pastel' },
  { id: 'Minimalist', name: 'Minimalist', icon: '⚪', description: 'Tối giản, tinh tế & thoáng đãng' },
  { id: 'Industrial', name: 'Industrial', icon: '🧱', description: 'Công nghiệp thô mộc kim loại & gạch' },
  { id: 'Nature', name: 'Nature', icon: '🍃', description: 'Hòa mình cùng thiên nhiên & cây xanh' },
  { id: 'Artistic', name: 'Artistic', icon: '🎨', description: 'Đậm chất nghệ thuật & triển lãm' }
];

export const SPECIAL_MODELS_CONFIG: SpecialModelInfo[] = [
  { id: 'Cat Café', name: 'Cat Café', icon: '🐱', description: 'Cà phê thú cưng mèo' },
  { id: 'Dog Café', name: 'Dog Café', icon: '🐶', description: 'Cà phê thú cưng cún' },
  { id: 'Board Game Café', name: 'Board Game Café', icon: '🎲', description: 'Kho trò chơi Board Game phong phú' },
  { id: 'Workshop Café', name: 'Workshop Café', icon: '🛠️', description: 'Không gian tổ chức Workshop & DIY' },
  { id: 'Console Gaming Café', name: 'Console Gaming Café', icon: '🎮', description: 'Không gian cà phê, nhà hàng và giải trí cung cấp trải nghiệm chơi game PS5, Nintendo Switch, Xbox, hoặc các máy chơi game cổ điển.' },
  { id: 'Book Café', name: 'Book Café', icon: '📚', description: 'Không gian sách & đọc sách yên tĩnh' },
  { id: 'Plant Café', name: 'Plant Café', icon: '🪴', description: 'Cà phê cây cảnh nhiệt đới & Bonsai' },
  { id: 'Ceramic Café', name: 'Ceramic Café', icon: '🏺', description: 'Trải nghiệm làm gốm & vẽ tranh gốm' },
  { id: 'Vinyl Café', name: 'Vinyl Café', icon: '🎵', description: 'Nghe nhạc đĩa than & dàn âm thanh Hi-Fi' },
  { id: 'Fashion Café', name: 'Fashion Café', icon: '👗', description: 'Kết hợp thời trang thiết kế & may đo' },
  { id: 'Art Toy Café', name: 'Art Toy Café', icon: '🧸', description: 'Trưng bày Art Toy & Blindbox độc lạ' },
  { id: 'Anime Café', name: 'Anime Café', icon: '⚡', description: 'Chủ đề Anime, Manga & Cosplay' },
  { id: 'VR Café', name: 'VR Café', icon: '🥽', description: 'Trải nghiệm kính thực tế ảo VR đỉnh cao' },
  { id: 'Immersive Café', name: 'Immersive Café', icon: '✨', description: 'Trình chiếu ánh sáng đa giác quan' },
  { id: 'Car Workshop Café', name: 'Car Workshop Café', icon: '🏎️', description: 'Gara xe hơi & bảo dưỡng ô tô cổ' },
  { id: 'Moto Workshop Café', name: 'Moto Workshop Café', icon: '🏍️', description: 'Biker Lounge & xe phân khối lớn' }
];

export const MOCK_MENU: MenuItem[] = [
  {
    id: 'm1',
    name: 'Cà phê Sữa Đá',
    description: 'Cà phê pha phin Robusta rang đậm thơm nồng, hòa quyện cùng sữa đặc béo ngậy truyền thống.',
    price: 45000,
    image: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&q=80&w=400',
    category: 'Cà phê',
    isBogoEligible: true
  },
  {
    id: 'm2',
    name: 'Cold Brew Signature',
    description: 'Cà phê Arabica Cầu Đất ủ lạnh 24 giờ, thoang thoảng nốt hương hoa quả thanh mát và ngọt hậu tự nhiên.',
    price: 55000,
    image: 'https://images.unsplash.com/photo-1461023058943-0708e522b512?auto=format&fit=crop&q=80&w=400',
    category: 'Cà phê',
    isBogoEligible: true
  },
  {
    id: 'm3',
    name: 'Cà phê Muối Biển',
    description: 'Lớp kem muối béo ngậy mằn mặn đặc trưng phủ trên nền cà phê đen pha phin đậm đà chuẩn vị Huế.',
    price: 48000,
    image: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&q=80&w=400',
    category: 'Cà phê',
    isBogoEligible: true
  },
  {
    id: 'm4',
    name: 'Latte Hạnh Nhân',
    description: 'Espresso đậm vị kết hợp sữa hạt hạnh nhân nguyên chất đánh bọt mịn, ít béo và tốt cho sức khỏe.',
    price: 59000,
    image: 'https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&q=80&w=400',
    category: 'Cà phê',
    isBogoEligible: true
  },
  {
    id: 'm5',
    name: 'Trà Đào Cam Sả',
    description: 'Trà đen hảo hạng ủ lạnh cùng cam vàng mọng nước, sả tươi đập dập và đào ngâm giòn ngọt thanh tao.',
    price: 50000,
    image: 'https://images.unsplash.com/photo-1558160074-4d7d8bdf4256?auto=format&fit=crop&q=80&w=400',
    category: 'Trà & Trái cây'
  },
  {
    id: 'm6',
    name: 'Trà Sữa Oolong Nướng',
    description: 'Trà ô long rang lửa đậm hương khói nướng kết hợp sữa tươi thanh trùng, vị trà đậm đà khó quên.',
    price: 52000,
    image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&q=80&w=400',
    category: 'Trà & Trái cây'
  },
  {
    id: 'm7',
    name: 'Matcha Latte Nhật Bản',
    description: 'Bột trà xanh Uji Kyoto thượng hạng đánh ấm cùng sữa tươi nguyên kem, thơm ngát vị trà tươi thanh khiết.',
    price: 58000,
    image: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&q=80&w=400',
    category: 'Trà & Trái cây'
  },
  {
    id: 'm8',
    name: 'Bánh Sừng Bò (Croissant)',
    description: 'Croissant bơ Pháp cao cấp nướng vàng giòn rụm bên ngoài, ngàn lớp mềm ẩm và thơm nức bên trong.',
    price: 40000,
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=400',
    category: 'Bánh & Tráng miệng'
  },
  {
    id: 'm9',
    name: 'Bánh Tiramisu Ý',
    description: 'Lớp bánh ladyfinger thấm đẫm espresso và rượu nhẹ quyện cùng phô mai Mascarpone béo mịn rắc bột cacao.',
    price: 55000,
    image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&q=80&w=400',
    category: 'Bánh & Tráng miệng'
  }
];

export const MOCK_SHOPS: CoffeeShop[] = [
  {
    id: '1',
    name: 'The Workshop Coffee',
    address: '27 Ngô Đức Kế, Bến Nghé, Quận 1, TP.HCM',
    distance: '1.2 km',
    rating: 4.8,
    reviewCount: 342,
    coverImage: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&q=80&w=800',
    images: [
      'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?auto=format&fit=crop&q=80&w=800'
    ],
    openingHours: [
      { day: 'Thứ 2 - Thứ 6', time: '08:00 - 22:00' },
      { day: 'Thứ 7 - CN', time: '07:30 - 23:00' }
    ],
    moods: ['Làm việc / Học bài', 'Thư giãn / Chill'],
    tags: ['Cà phê đặc sản', 'Yên tĩnh', 'Công nghiệp'],
    amenities: ['Wi-Fi', 'Chỗ sạc', 'WC', 'Parking', 'Indoor', 'Shared', 'Table Service'],
    styles: ['Industrial', 'Minimalist'],
    specialModels: ['Workshop Café'],
    primaryStyle: 'Industrial',
    primaryModel: 'Workshop Café',
    location: { lat: 10.7735, lng: 106.7051 },
    placeId: 'ChIJb6e9uVp1eTERE1_VfHwZ5kM',
    isGoogleVerified: true,
    phoneNumber: '+84 28 3824 6801',
    website: 'https://theworkshopcoffee.com',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=The+Workshop+Coffee+27+Ngo+Duc+Ke+Ben+Nghe+District+1&query_place_id=ChIJb6e9uVp1eTERE1_VfHwZ5kM',
    aiIntel: {
      summary: 'Quán cà phê tiên phong phong cách Specialty Coffee tại trung tâm Quận 1 với kiến trúc Industrial trần cao, bàn gỗ dài mộc mạc và quầy Bar Pour-over đẳng cấp.',
      vibe: 'Không gian gạch trần vintage & kim loại hiện đại, ngập tràn ánh sáng tự nhiên từ cửa sổ vòm lớn, nhạc Jazz nhẹ tạo sự tập trung tối đa.',
      bestFor: ['Làm việc sâu & Remote Coding', 'Gặp gỡ đối tác quốc tế', 'Thưởng thức Specialty Coffee'],
      signatureDrinks: [
        { name: 'Cold Brew Signature', price: 55000, reason: 'Ủ lạnh 24h từ hạt Arabica Cầu Đất, hậu vị trái cây nhiệt đới thơm mát' },
        { name: 'Pour-Over V60 Ethiopia', price: 68000, reason: 'Nốt hương hoa nhài và cam bergamot thanh tao đạt chuẩn quốc tế' }
      ],
      googleMapsData: {
        placeId: 'ChIJb6e9uVp1eTERE1_VfHwZ5kM',
        googleRating: 4.8,
        totalReviews: 342,
        fullAddress: 'Lầu 2, 27 Ngô Đức Kế, Bến Nghé, Quận 1, TP. Hồ Chí Minh',
        formattedPhone: '028 3824 6801',
        priceLevel: '50.000đ - 95.000đ',
        parkingInfo: 'Gửi xe máy dưới sảnh toà nhà (Miễn phí có bảo vệ)',
        hoursSummary: '08:00 - 22:00 hàng ngày (Mở cửa tất cả ngày lễ)',
        googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=The+Workshop+Coffee+27+Ngo+Duc+Ke+Ben+Nghe+District+1&query_place_id=ChIJb6e9uVp1eTERE1_VfHwZ5kM',
        coordinates: { lat: 10.7735, lng: 106.7051 }
      },
      workAndTech: {
        wifiSpeed: '180 Mbps (Băng thông quốc tế ổn định)',
        outletsAvailability: 'Có ổ cắm tại 95% vị trí ngồi & bàn dài',
        idealQuietHours: '08:30 - 11:30 & 14:00 - 17:30',
        peakHours: '12:00 - 13:30 (Giờ ăn trưa)',
        seatComfort: 'Ghế bọc đệm êm ái, độ cao bàn công thái học chuẩn làm việc'
      },
      aiReviewSynthesis: {
        pros: [
          'Chất lượng hạt cà phê rang xay tươi mới, barista am hiểu tư vấn nhiệt tình',
          'Tốc độ internet cực kỳ mạnh, có thể họp video call mượt mà',
          'Không gian tầng lầu thoáng đãng, tách biệt khỏi tiếng ồn xe cộ phố thị'
        ],
        tips: 'Nên lên sớm trước 10:00 sáng để chọn vị trí cạnh cửa sổ đón nắng đẹp nhất.'
      },
      extractedAt: '05/09/2026'
    },
    reviews: [
      {
        id: 'r1',
        userId: 'u1',
        userName: 'Minh Tu',
        userAvatar: 'https://i.pravatar.cc/150?img=32',
        userSystemBadge: 'Chuyên gia cà phê',
        date: '2 giờ trước',
        images: ['https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&q=80&w=400', 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&q=80&w=400'],
        content: 'Nơi tuyệt vời để tập trung. Cà phê pour-over rất ngon. Internet đủ nhanh để gọi video. Chắc chắn là điểm đến yêu thích của tôi khi cần làm việc sâu.',
        likes: 24,
        comments: 3,
        metrics: { noise: 4, seating: 5, accuracy: 5 }
      },
      {
        id: 'r2',
        userId: 'u2',
        userName: 'Ha Nguyen',
        userAvatar: 'https://i.pravatar.cc/150?img=44',
        userSystemBadge: 'Thám hiểm gia',
        date: '1 ngày trước',
        images: [],
        content: 'Phong cách công nghiệp rất ngầu, nhưng có thể hơi ồn ào vào giờ ăn trưa. Chỗ ngồi khá thoải mái.',
        likes: 12,
        comments: 1,
        metrics: { noise: 3, seating: 4, accuracy: 4 }
      }
    ]
  },
  {
    id: '2',
    name: 'Blanc. Cafe',
    address: '158 Hai Bà Trưng, Phường 6, Quận 3, TP.HCM',
    distance: '2.5 km',
    rating: 4.6,
    reviewCount: 128,
    coverImage: 'https://images.unsplash.com/photo-1508424757105-b6d5ad9329d0?auto=format&fit=crop&q=80&w=800',
    images: [
      'https://images.unsplash.com/photo-1508424757105-b6d5ad9329d0?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1445116572660-236099ec97a0?auto=format&fit=crop&q=80&w=800'
    ],
    openingHours: [
      { day: 'Thứ 2 - CN', time: '07:00 - 22:30' }
    ],
    moods: ['Chụp ảnh / Check-in', 'Hẹn hò'],
    tags: ['Thẩm mỹ', 'Bánh ngọt', 'Ngoài trời', 'Cây xanh'],
    amenities: ['Wi-Fi', 'Chỗ sạc', 'WC', 'Parking', 'Indoor', 'Outdoor', 'Table Service'],
    styles: ['Minimalist', 'Nature'],
    specialModels: ['Plant Café'],
    primaryStyle: 'Minimalist',
    primaryModel: 'Plant Café',
    location: { lat: 10.7852, lng: 106.6978 },
    placeId: 'ChIJW-91iQd1eTER0JvN78n_2b4',
    isGoogleVerified: true,
    phoneNumber: '+84 28 3829 1158',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Blanc+Cafe+158+Hai+Ba+Trung+District+3+HCM&query_place_id=ChIJW-91iQd1eTER0JvN78n_2b4',
    aiIntel: {
      summary: 'Không gian cà phê sân vườn phong cách Minimalist tông trắng tinh khôi kết hợp vườn cây nhiệt đới xanh mát, cực kỳ lãng mạn và ăn ảnh.',
      vibe: 'Bầu không khí thanh lịch dịu nhẹ, mùi bánh mới nướng thơm phức lan tỏa khắp gian phòng kính đón nắng dịu mát.',
      bestFor: ['Hẹn hò lãng mạn', 'Chụp ảnh Check-in thẩm mỹ', 'Thưởng thức trà chiều & bánh ngọt'],
      signatureDrinks: [
        { name: 'Trà Đào Cam Sả Thượng Hạng', price: 50000, reason: 'Trà ủ lạnh kết hợp đào ngâm giòn ngọt và sả tươi thanh lọc' },
        { name: 'Croissant Bơ Pháp Nướng Nóng', price: 40000, reason: 'Ngàn lớp vỏ giòn rụm thơm nức bơ béo xốp mềm bên trong' }
      ],
      googleMapsData: {
        placeId: 'ChIJW-91iQd1eTER0JvN78n_2b4',
        googleRating: 4.6,
        totalReviews: 128,
        fullAddress: '158 Hai Bà Trưng, Phường Đa Kao, Quận 3, TP. Hồ Chí Minh',
        formattedPhone: '028 3829 1158',
        priceLevel: '45.000đ - 75.000đ',
        parkingInfo: 'Bãi giữ xe máy rộng rãi ngay trước quán có mái che',
        hoursSummary: '07:00 - 22:30 mỗi ngày',
        googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Blanc+Cafe+158+Hai+Ba+Trung+District+3+HCM&query_place_id=ChIJW-91iQd1eTER0JvN78n_2b4',
        coordinates: { lat: 10.7852, lng: 106.6978 }
      },
      workAndTech: {
        wifiSpeed: '100 Mbps (Tốc độ ổn định lướt web & làm việc)',
        outletsAvailability: 'Bố trí tại các bàn sát tường khu trong nhà',
        idealQuietHours: '07:30 - 09:30 & 14:00 - 16:30',
        peakHours: '16:30 - 18:00 (Khung giờ check-in hoàng hôn)',
        seatComfort: 'Ghế mây đan nghệ thuật và sofa êm ái'
      },
      aiReviewSynthesis: {
        pros: [
          'Góc sân vườn nhiều cây xanh rợp bóng, ánh sáng chụp ảnh lên hình rất nét',
          'Menu bánh ngọt nướng mới mỗi ngày, độ ngọt thanh vừa vặn',
          'Nhân viên chu đáo, lễ phép và giữ xe cẩn thận'
        ],
        tips: 'Bàn ngoài sân vườn đẹp nhất lúc 16:00 khi có nắng xiên hoàng hôn.'
      },
      extractedAt: '05/09/2026'
    },
    reviews: [
      {
        id: 'r3',
        userId: 'u3',
        userName: 'Linh Tran',
        userAvatar: 'https://i.pravatar.cc/150?img=5',
        userSystemBadge: 'Người dẫn đầu xu hướng',
        date: '3 ngày trước',
        images: ['https://images.unsplash.com/photo-1495474472201-35011f0f3656?auto=format&fit=crop&q=80&w=400'],
        content: 'Ánh sáng hoàn hảo để chụp ảnh! Bánh sừng bò cực kỳ ngon. Rất khuyến khích đặt bàn ở ngoài trời.',
        likes: 89,
        comments: 12,
        metrics: { noise: 4, seating: 4, accuracy: 5 }
      }
    ]
  },
  {
    id: '3',
    name: 'SOK - Space of K',
    address: '42 Nguyễn Hữu Cảnh, Phường 22, Bình Thạnh, TP.HCM',
    distance: '3.1 km',
    rating: 4.9,
    reviewCount: 512,
    coverImage: 'https://images.unsplash.com/photo-1600093463592-8e36ae95ef56?auto=format&fit=crop&q=80&w=800',
    images: [
      'https://images.unsplash.com/photo-1600093463592-8e36ae95ef56?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=800'
    ],
    openingHours: [
      { day: 'Thứ 2 - Thứ 6', time: '09:00 - 23:30' },
      { day: 'Thứ 7 - CN', time: '08:00 - 24:00' }
    ],
    moods: ['Tụ tập nhóm', 'Thư giãn / Chill'],
    tags: ['Rộng rãi', 'Board Games', 'Mở khuya'],
    amenities: ['Wi-Fi', 'Chỗ sạc', 'WC', 'Parking', 'Indoor', 'Private', 'Shared', 'Self Service'],
    styles: ['Cozy Modern', 'Retro'],
    specialModels: ['Board Game Café'],
    primaryStyle: 'Cozy Modern',
    primaryModel: 'Board Game Café',
    location: { lat: 10.7915, lng: 106.7118 },
    placeId: 'ChIJz-N1Vp50eTERuV_c639v-aA',
    isGoogleVerified: true,
    phoneNumber: '+84 90 912 3456',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=SOK+Space+of+K+42+Nguyen+Huu+Canh+Binh+Thanh&query_place_id=ChIJz-N1Vp50eTERuV_c639v-aA',
    aiIntel: {
      summary: 'Không gian tổ hợp 3 tầng hiện đại với hơn 150+ tựa game Board Game phong phú, phòng cách âm riêng biệt và mở cửa đến nửa đêm cho các nhóm bạn.',
      vibe: 'Năng động, ấm cúng và đầy ắp tiếng cười; có khu vực yên tĩnh tầng 2 dành riêng cho học bài và làm việc nhóm.',
      bestFor: ['Tụ tập nhóm chơi Board Game', 'Học nhóm đồ án & Làm việc ca tối', 'Sinh nhật & Giao lưu bạn bè'],
      signatureDrinks: [
        { name: 'Cà phê Muối Biển Signature', price: 48000, reason: 'Lớp kem béo mằn mặn hòa quyện nền cà phê pha phin thơm lừng' },
        { name: 'Trà Sữa Oolong Nướng Trân Châu', price: 52000, reason: 'Đậm vị trà nướng khói quyến rũ, trân châu dẻo thơm' }
      ],
      googleMapsData: {
        placeId: 'ChIJz-N1Vp50eTERuV_c639v-aA',
        googleRating: 4.9,
        totalReviews: 512,
        fullAddress: '42 Nguyễn Hữu Cảnh, Phường 22, Quận Bình Thạnh, TP. Hồ Chí Minh',
        formattedPhone: '090 912 3456',
        priceLevel: '45.000đ - 70.000đ',
        parkingInfo: 'Hầm giữ xe rộng rãi chứa được hơn 100 xe máy và ô tô',
        hoursSummary: '09:00 - 23:30 (Cuối tuần mở đến 24:00)',
        googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=SOK+Space+of+K+42+Nguyen+Huu+Canh+Binh+Thanh&query_place_id=ChIJz-N1Vp50eTERuV_c639v-aA',
        coordinates: { lat: 10.7915, lng: 106.7118 }
      },
      workAndTech: {
        wifiSpeed: '220 Mbps (Dual-band Mesh toàn tòa nhà)',
        outletsAvailability: 'Trang bị ổ cắm đa năng kèm cổng USB tại từng bàn',
        idealQuietHours: '09:00 - 16:00 (Các buổi sáng trong tuần rất êm đềm)',
        peakHours: '19:30 - 22:30 (Cao điểm các nhóm Board Game)',
        seatComfort: 'Bàn họp rộng, ghế đệm lưng êm và sofa nhóm'
      },
      aiReviewSynthesis: {
        pros: [
          'Kho game bản quyền khổng lồ, nhân viên hướng dẫn luật tận tình',
          'Mở cửa muộn đến 24:00, vị trí đắc địa gần Landmark 81',
          'Đồ uống đa dạng giá sinh viên hợp lý'
        ],
        tips: 'Nên đặt trước phòng riêng nếu đi nhóm từ 6 người trở lên vào tối cuối tuần.'
      },
      extractedAt: '05/09/2026'
    },
    reviews: [],
  },
  {
    id: '4',
    name: 'Là Việt Coffee Saigon',
    address: '193 Hai Bà Trưng, Phường 6, Quận 3, TP.HCM',
    distance: '2.4 km',
    rating: 4.8,
    reviewCount: 485,
    coverImage: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&q=80&w=800',
    images: [
      'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=800'
    ],
    openingHours: [
      { day: 'Thứ 2 - CN', time: '07:00 - 22:00' }
    ],
    moods: ['Làm việc / Học bài', 'Thư giãn / Chill'],
    tags: ['Cà phê Đà Lạt', 'Specialty Coffee', 'Workshop', 'Industrial'],
    amenities: ['Wi-Fi', 'Chỗ sạc', 'WC', 'Parking', 'Indoor', 'Shared', 'Table Service'],
    styles: ['Industrial', 'Minimalist'],
    specialModels: ['Workshop Café'],
    primaryStyle: 'Industrial',
    primaryModel: 'Workshop Café',
    location: { lat: 10.7845, lng: 106.6968 },
    placeId: 'ChIJs8sV0lF1eTERTfW1a2bK_8M',
    isGoogleVerified: true,
    phoneNumber: '+84 28 3824 1930',
    website: 'https://laviet.coffee',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=La+Viet+Coffee+193+Hai+Ba+Trung+District+3+Saigon&query_place_id=ChIJs8sV0lF1eTERTfW1a2bK_8M',
    aiIntel: {
      summary: 'Thương hiệu cà phê đặc sản trứ danh từ Đà Lạt với quy trình từ nông trại đến tách cà phê (Farm to Cup), mang trọn hương vị Arabica mộc thanh khiết trong không gian Industrial khoáng đạt.',
      vibe: 'Không gian mở thiết kế xưởng chế biến gỗ và kim loại, thoang thoảng mùi hạt cà phê rang tươi mới cùng giai điệu Indie Acoustic nhẹ nhàng.',
      bestFor: ['Thưởng thức cà phê mộc nguyên bản', 'Làm việc & Họp nhóm sáng tạo', 'Mua quà tặng hạt cà phê chất lượng cao'],
      signatureDrinks: [
        { name: 'Cold Brew Truyền Thống Đà Lạt', price: 50000, reason: 'Ủ lạnh từ 100% Arabica Cầu Đất, mượt mà hậu vị ngọt tự nhiên' },
        { name: 'Cà phê Sữa Tươi Rang Mộc', price: 45000, reason: 'Espresso đậm vị kết hợp sữa tươi thanh trùng không đường hóa học' }
      ],
      googleMapsData: {
        placeId: 'ChIJs8sV0lF1eTERTfW1a2bK_8M',
        googleRating: 4.8,
        totalReviews: 485,
        fullAddress: '193 Hai Bà Trưng, Phường 6, Quận 3, TP. Hồ Chí Minh',
        formattedPhone: '028 3824 1930',
        priceLevel: '40.000đ - 70.000đ',
        parkingInfo: 'Có chỗ gửi xe máy miễn phí trước quán, ô tô gửi bãi lân cận',
        hoursSummary: '07:00 - 22:00 tất cả các ngày trong tuần',
        googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=La+Viet+Coffee+193+Hai+Ba+Trung+District+3+Saigon&query_place_id=ChIJs8sV0lF1eTERTfW1a2bK_8M',
        coordinates: { lat: 10.7845, lng: 106.6968 }
      },
      workAndTech: {
        wifiSpeed: '170 Mbps (Ổn định xuyên suốt)',
        outletsAvailability: 'Bố trí đều dọc theo bàn dài và các góc tường',
        idealQuietHours: '07:30 - 11:00 & 14:00 - 17:00',
        peakHours: '12:00 - 13:30 (Dân văn phòng ghé sau bữa trưa)',
        seatComfort: 'Ghế gỗ đệm công thái học thoải mái ngồi làm việc 4-6 tiếng'
      },
      aiReviewSynthesis: {
        pros: [
          'Hương vị cà phê thật sự chất lượng và chuẩn gu người sành uống',
          'Không gian bàn làm việc rộng rãi, ánh sáng tự nhiên ngập tràn',
          'Nhân viên am hiểu sâu sắc về từng loại hạt cà phê'
        ],
        tips: 'Nên thử cà phê pha Drip hoặc Cold brew để cảm nhận rõ nhất hương thơm hoa quả.'
      },
      extractedAt: '05/09/2026'
    },
    reviews: [],
  },
  {
    id: '5',
    name: 'Okkio Caffe - Lê Lợi',
    address: '120-122 Lê Lợi, Phường Bến Thành, Quận 1, TP.HCM',
    distance: '1.0 km',
    rating: 4.7,
    reviewCount: 360,
    coverImage: 'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?auto=format&fit=crop&q=80&w=800',
    images: [
      'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&q=80&w=800'
    ],
    openingHours: [
      { day: 'Thứ 2 - CN', time: '07:30 - 22:00' }
    ],
    moods: ['Thư giãn / Chill', 'Hẹn hò', 'Chụp ảnh / Check-in'],
    tags: ['Retro Sài Gòn', 'Specialty Coffee', 'Bến Thành', 'Artistic'],
    amenities: ['Wi-Fi', 'Chỗ sạc', 'WC', 'Parking', 'Indoor', 'Table Service'],
    styles: ['Retro', 'Vintage', 'Artistic'],
    specialModels: ['Vinyl Café'],
    primaryStyle: 'Retro',
    primaryModel: 'Vinyl Café',
    location: { lat: 10.7725, lng: 106.6990 },
    placeId: 'ChIJN8v8m1h1eTER4t4b7_9k3L4',
    isGoogleVerified: true,
    phoneNumber: '+84 28 3821 0022',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Okkio+Caffe+120+Le+Loi+Ben+Thanh+District+1&query_place_id=ChIJN8v8m1h1eTER4t4b7_9k3L4',
    aiIntel: {
      summary: 'Viên ngọc kiến trúc Retro Vintage nằm ngay góc đường Lê Lợi nhìn ra chợ Bến Thành, nổi bật với tông màu gạch đất nung đỏ và quầy pha chế cà phê specialty tinh xảo.',
      vibe: 'Ấm cúng, hoài cổ nhưng đậm tính đương đại; ánh sáng dịu mắt kết hợp âm nhạc Lo-fi & Jazz thư thái.',
      bestFor: ['Hẹn hò lãng mạn', 'Thưởng thức Specialty Coffee & Bánh ngọt Pháp', 'Ngắm nhìn nhịp sống trung tâm Sài Gòn'],
      signatureDrinks: [
        { name: 'Okkio Egg Coffee (Cà phê Trứng)', price: 65000, reason: 'Kem trứng đánh bông mịn ngậy không tanh, hòa cùng espresso nóng thơm lừng' },
        { name: 'Cascara Tea Soda', price: 60000, reason: 'Trà vỏ quả cà phê ủ lạnh kết hợp soda thanh mát sảng khoái' }
      ],
      googleMapsData: {
        placeId: 'ChIJN8v8m1h1eTER4t4b7_9k3L4',
        googleRating: 4.7,
        totalReviews: 360,
        fullAddress: '120-122 Lê Lợi, Phường Bến Thành, Quận 1, TP.HCM',
        formattedPhone: '028 3821 0022',
        priceLevel: '55.000đ - 90.000đ',
        parkingInfo: 'Gửi xe tại bãi chợ Bến Thành hoặc tòa nhà Saigon Centre kế bên',
        hoursSummary: '07:30 - 22:00 hàng ngày',
        googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Okkio+Caffe+120+Le+Loi+Ben+Thanh+District+1&query_place_id=ChIJN8v8m1h1eTER4t4b7_9k3L4',
        coordinates: { lat: 10.7725, lng: 106.6990 }
      },
      workAndTech: {
        wifiSpeed: '130 Mbps',
        outletsAvailability: 'Có tại khu vực quầy bar và bàn dài',
        idealQuietHours: '08:00 - 10:30 & 14:00 - 16:30',
        peakHours: '17:00 - 20:30 (Đông khách du lịch và giới trẻ)',
        seatComfort: 'Ghế sofa nệm nhung và ghế quầy bar cao cấp'
      },
      aiReviewSynthesis: {
        pros: [
          'Kiến trúc nội thất gạch vòm đỏ cực kỳ ấn tượng và sang trọng',
          'Cà phê trứng và cold brew thuộc hàng ngon nhất nhì khu trung tâm',
          'Vị trí đắc địa ngay tuyến phố đi bộ Lê Lợi - Chợ Bến Thành'
        ],
        tips: 'Góc cầu thang xoắn ốc và cửa sổ nhìn ra đường Lê Lợi là vị trí check-in đẹp nhất.'
      },
      extractedAt: '05/09/2026'
    },
    reviews: [],
  },
  {
    id: '6',
    name: 'Cộng Cà Phê - Lý Tự Trọng',
    address: '26 Lý Tự Trọng, Phường Bến Nghé, Quận 1, TP.HCM',
    distance: '0.8 km',
    rating: 4.6,
    reviewCount: 920,
    coverImage: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=800',
    images: [
      'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1508424757105-b6d5ad9329d0?auto=format&fit=crop&q=80&w=800'
    ],
    openingHours: [
      { day: 'Thứ 2 - CN', time: '07:00 - 23:00' }
    ],
    moods: ['Tụ tập nhóm', 'Thư giãn / Chill'],
    tags: ['Cà phê Cốt Dừa', 'Bao Cấp', 'Retro Hoài Niệm', 'Sài Gòn Xưa'],
    amenities: ['Wi-Fi', 'Chỗ sạc', 'WC', 'Parking', 'Indoor', 'Outdoor', 'Table Service'],
    styles: ['Retro', 'Vintage'],
    specialModels: ['Book Café'],
    primaryStyle: 'Retro',
    primaryModel: 'Book Café',
    location: { lat: 10.7780, lng: 106.7020 },
    placeId: 'ChIJk_2190p1eTER0O8q183x_6Y',
    isGoogleVerified: true,
    phoneNumber: '+84 28 3829 7890',
    website: 'https://congcaphe.com',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Cong+Ca+Phe+26+Ly+Tu+Trong+District+1&query_place_id=ChIJk_2190p1eTER0O8q183x_6Y',
    aiIntel: {
      summary: 'Không gian hoài niệm thời kỳ bao cấp độc đáo với tông màu xanh áo lính, bàn ghế gỗ mộc, đèn dầu và sách cũ; nổi danh với món Cà phê Cốt Dừa huyền thoại.',
      vibe: 'Mộc mạc, đậm bản sắc văn hóa Việt Nam, rộn ràng tiếng trò chuyện ấm cúng của bạn bè bốn phương.',
      bestFor: ['Thưởng thức Cà phê Cốt Dừa đặc sản', 'Dẫn bạn bè quốc tế trải nghiệm văn hóa Việt', 'Tụ tập trò chuyện cuối tuần'],
      signatureDrinks: [
        { name: 'Cà phê Cốt Dừa Đá Tuyết', price: 55000, reason: 'Nước cốt dừa xay mịn thơm béo ngậy rót trên nền cà phê phin đắng đậm đà' },
        { name: 'Cốt Dừa Cacao / Đậu Xanh', price: 55000, reason: 'Món tráng miệng mát lạnh ngậy béo không thể bỏ lỡ' }
      ],
      googleMapsData: {
        placeId: 'ChIJk_2190p1eTER0O8q183x_6Y',
        googleRating: 4.6,
        totalReviews: 920,
        fullAddress: '26 Lý Tự Trọng, Phường Bến Nghé, Quận 1, TP.HCM',
        formattedPhone: '028 3829 7890',
        priceLevel: '40.000đ - 65.000đ',
        parkingInfo: 'Gửi xe máy trước quán có nhân viên dắt hộ',
        hoursSummary: '07:00 - 23:00 mỗi ngày',
        googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Cong+Ca+Phe+26+Ly+Tu+Trong+District+1&query_place_id=ChIJk_2190p1eTER0O8q183x_6Y',
        coordinates: { lat: 10.7780, lng: 106.7020 }
      },
      workAndTech: {
        wifiSpeed: '110 Mbps',
        outletsAvailability: 'Có tại các bàn góc tường và tầng lầu',
        idealQuietHours: '07:00 - 09:30',
        peakHours: '19:00 - 22:00 (Rất đông vui náo nhiệt)',
        seatComfort: 'Ghế gỗ bọc vải chăn con công truyền thống êm ái'
      },
      aiReviewSynthesis: {
        pros: [
          'Món cốt dừa cà phê chuẩn vị, béo ngậy mịn màng',
          'Không gian decor rất có gu, nhiều góc hoài niệm đậm chất Việt',
          'Phục vụ nhanh nhẹn dù quán lúc nào cũng tấp nập'
        ],
        tips: 'Khu vực ban công tầng 2 nhìn xuống đường Lý Tự Trọng ngắm phố rất chill.'
      },
      extractedAt: '05/09/2026'
    },
    reviews: [],
  },
  {
    id: '7',
    name: 'Maison Marou Flagship Cafe',
    address: '167-169 Calmette, Phường Nguyễn Thái Bình, Quận 1, TP.HCM',
    distance: '1.6 km',
    rating: 4.8,
    reviewCount: 1450,
    coverImage: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&q=80&w=800',
    images: [
      'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=800'
    ],
    openingHours: [
      { day: 'Thứ 2 - CN', time: '09:00 - 22:00' }
    ],
    moods: ['Hẹn hò', 'Chụp ảnh / Check-in', 'Thư giãn / Chill'],
    tags: ['Chocolate Thủ Công', 'Bánh Pháp Cao Cấp', 'Bean to Bar', 'Workshop'],
    amenities: ['Wi-Fi', 'Chỗ sạc', 'WC', 'Parking', 'Indoor', 'Table Service'],
    styles: ['Cozy Modern', 'Industrial', 'Artistic'],
    specialModels: ['Workshop Café'],
    primaryStyle: 'Cozy Modern',
    primaryModel: 'Workshop Café',
    location: { lat: 10.7692, lng: 106.6985 },
    placeId: 'ChIJv3Z2oFd1eTER8U9o1_7l_3Q',
    isGoogleVerified: true,
    phoneNumber: '+84 28 3914 1530',
    website: 'https://maisonmarou.com',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Maison+Marou+167+Calmette+District+1&query_place_id=ChIJv3Z2oFd1eTER8U9o1_7l_3Q',
    aiIntel: {
      summary: 'Thánh đường socola thủ công thủ phủ Việt Nam (Bean-to-Bar), nơi thực khách được tận mắt chứng kiến quy trình rang xay cacao nguyên hạt và thưởng thức những món bánh ngọt, kem gelato đẳng cấp quốc tế.',
      vibe: 'Sang trọng, thơm lừng hương bơ cacao ngọt ngào, kính trong suốt nhìn thẳng vào xưởng làm bánh nghệ thuật.',
      bestFor: ['Thưởng thức socola thủ công thượng hạng', 'Hẹn hò ngọt ngào & Trải nghiệm bánh ngọt Pháp', 'Mua quà tặng cao cấp đặc sản Việt Nam'],
      signatureDrinks: [
        { name: 'Marou Signature Hot Chocolate', price: 90000, reason: 'Socola nóng sánh mịn nấu từ cacao nguyên chất 70% Tiền Giang' },
        { name: 'Mocha Arabica Cầu Đất & Marou Dark', price: 85000, reason: 'Sự kết hợp hoàn hảo giữa espresso và socola đen thượng hạng' }
      ],
      googleMapsData: {
        placeId: 'ChIJv3Z2oFd1eTER8U9o1_7l_3Q',
        googleRating: 4.8,
        totalReviews: 1450,
        fullAddress: '167-169 Calmette, Phường Nguyễn Thái Bình, Quận 1, TP.HCM',
        formattedPhone: '028 3914 1530',
        priceLevel: '70.000đ - 150.000đ',
        parkingInfo: 'Gửi xe máy trước quán có bảo vệ hướng dẫn an toàn',
        hoursSummary: '09:00 - 22:00 hàng ngày',
        googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Maison+Marou+167+Calmette+District+1&query_place_id=ChIJv3Z2oFd1eTER8U9o1_7l_3Q',
        coordinates: { lat: 10.7692, lng: 106.6985 }
      },
      workAndTech: {
        wifiSpeed: '140 Mbps',
        outletsAvailability: 'Có ở khu vực bàn đơn và góc sofa',
        idealQuietHours: '09:30 - 11:30',
        peakHours: '15:00 - 18:00 (Giờ trà chiều & thưởng thức bánh)',
        seatComfort: 'Bàn gỗ lớn và sofa bọc da cao cấp'
      },
      aiReviewSynthesis: {
        pros: [
          'Socola nóng và bánh Opera, Eclair ngon bậc nhất Sài Gòn',
          'Trải nghiệm quan sát thợ làm socola trực tiếp qua vách kính rất thú vị',
          'Nhân viên chu đáo, cho thử các dòng socola khác nhau trước khi chọn'
        ],
        tips: 'Đừng quên thử bánh Tiramisu hoặc Tart socola ớt độc đáo tại quầy tráng miệng.'
      },
      extractedAt: '05/09/2026'
    },
    reviews: [],
  },
  {
    id: '8',
    name: 'Rang Rang Coffee - Thảo Điền',
    address: '1 Thảo Điền, Phường Thảo Điền, TP. Thủ Đức, TP.HCM',
    distance: '4.8 km',
    rating: 4.8,
    reviewCount: 310,
    coverImage: 'https://images.unsplash.com/photo-1508424757105-b6d5ad9329d0?auto=format&fit=crop&q=80&w=800',
    images: [
      'https://images.unsplash.com/photo-1508424757105-b6d5ad9329d0?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1600093463592-8e36ae95ef56?auto=format&fit=crop&q=80&w=800'
    ],
    openingHours: [
      { day: 'Thứ 2 - CN', time: '07:00 - 22:00' }
    ],
    moods: ['Làm việc / Học bài', 'Thư giãn / Chill'],
    tags: ['Minimalism Tối Giản', 'Specialty Coffee', 'Thảo Điền', 'Không Gian Đẹp'],
    amenities: ['Wi-Fi', 'Chỗ sạc', 'WC', 'Parking', 'Indoor', 'Outdoor', 'Table Service'],
    styles: ['Minimalist', 'Cozy Modern'],
    specialModels: ['Plant Café'],
    primaryStyle: 'Minimalist',
    primaryModel: 'Plant Café',
    location: { lat: 10.8030, lng: 106.7335 },
    placeId: 'ChIJ19d1vF11eTER7I4a2_9e_5M',
    isGoogleVerified: true,
    phoneNumber: '+84 89 616 2688',
    website: 'https://rangrangcoffee.com',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Rang+Rang+Coffee+1+Thao+Dien+Thu+Duc&query_place_id=ChIJ19d1vF11eTER7I4a2_9e_5M',
    aiIntel: {
      summary: 'Không gian cà phê Specialty phong cách tối giản Minimalist chuẩn mực với tông màu xám bê tông và kính trong suốt, phục vụ các dòng cà phê tuyển chọn hạt Geisha, Ethiopia, Panama.',
      vibe: 'Yên tĩnh, thanh thoát, tinh tế và cực kỳ hiện đại với cây xanh nhiệt đới điểm xuyết trong nhà kính.',
      bestFor: ['Làm việc máy tính & Đọc sách', 'Thưởng thức Specialty Coffee cao cấp', 'Chụp ảnh phong cách Monochrome tối giản'],
      signatureDrinks: [
        { name: 'Pour-Over Geisha Panama', price: 95000, reason: 'Nốt hương hoa đào, cam chanh tinh tế đạt điểm cupping trên 90' },
        { name: 'Dirty Coffee Đá Lạnh', price: 65000, reason: 'Espresso đậm đặc nóng rót trên lớp sữa tươi béo ngậy ủ lạnh' }
      ],
      googleMapsData: {
        placeId: 'ChIJ19d1vF11eTER7I4a2_9e_5M',
        googleRating: 4.8,
        totalReviews: 310,
        fullAddress: '1 Thảo Điền, Phường Thảo Điền, TP. Thủ Đức, TP.HCM',
        formattedPhone: '089 616 2688',
        priceLevel: '55.000đ - 110.000đ',
        parkingInfo: 'Chỗ gửi xe rộng rãi có bảo vệ trông giữ an toàn',
        hoursSummary: '07:00 - 22:00 mỗi ngày',
        googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Rang+Rang+Coffee+1+Thao+Dien+Thu+Duc&query_place_id=ChIJ19d1vF11eTER7I4a2_9e_5M',
        coordinates: { lat: 10.8030, lng: 106.7335 }
      },
      workAndTech: {
        wifiSpeed: '190 Mbps (Mesh cao tốc)',
        outletsAvailability: 'Trang bị ổ cắm ngầm tinh tế tại hầu hết các bàn',
        idealQuietHours: '07:30 - 11:30 & 14:00 - 17:30',
        peakHours: '18:30 - 21:00',
        seatComfort: 'Bàn ghế thiết kế công thái học sang trọng'
      },
      aiReviewSynthesis: {
        pros: [
          'Chất lượng cà phê Specialty và máy pha Sanremo / Slayer đẳng cấp',
          'Không gian cực kỳ yên tĩnh và tập trung làm việc',
          'Thiết kế tối giản sang trọng, lên hình đẹp không góc chết'
        ],
        tips: 'Nên ngồi dãy bàn dài nhìn ra vườn cây nếu bạn cần làm việc thời gian dài.'
      },
      extractedAt: '05/09/2026'
    },
    reviews: [],
  },
  {
    id: '9',
    name: 'Cú Trên Cây Coffee (Tree Owl Cafe)',
    address: '262 Ung Văn Khiêm, Phường 25, Quận Bình Thạnh, TP.HCM',
    distance: '3.8 km',
    rating: 4.7,
    reviewCount: 540,
    coverImage: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&q=80&w=800',
    images: [
      'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1495474472201-35011f0f3656?auto=format&fit=crop&q=80&w=800'
    ],
    openingHours: [
      { day: 'Thứ 2 - CN', time: '07:30 - 22:30' }
    ],
    moods: ['Thư giãn / Chill', 'Hẹn hò'],
    tags: ['Sân Vườn Rừng Nhiệt Đới', 'Đà Lạt Giữa Sài Gòn', 'Cây Xanh', 'Nhà Gỗ'],
    amenities: ['Wi-Fi', 'Chỗ sạc', 'WC', 'Parking', 'Indoor', 'Outdoor', 'Table Service'],
    styles: ['Nature', 'Vintage', 'Artistic'],
    specialModels: ['Plant Café', 'Book Café'],
    primaryStyle: 'Nature',
    primaryModel: 'Plant Café',
    location: { lat: 10.8085, lng: 106.7160 },
    placeId: 'ChIJ6-c1n610eTER9W7p3_4x_9L',
    isGoogleVerified: true,
    phoneNumber: '+84 28 3512 4567',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Cu+Tren+Cay+Coffee+262+Ung+Van+Khiem+Binh+Thanh&query_place_id=ChIJ6-c1n610eTER9W7p3_4x_9L',
    aiIntel: {
      summary: 'Khu rừng nhiệt đới thu nhỏ ẩn mình giữa lòng Bình Thạnh, mang phong vị Đà Lạt thơ mộng với nhà gỗ mộc mạc, cây cổ thụ rợp bóng và giàn dây leo xanh mướt.',
      vibe: 'Trong lành, ríu rít tiếng chim hót và tiếng gió xào xạc; không gian chữa lành (healing) tách biệt hoàn toàn khỏi khói bụi thành phố.',
      bestFor: ['Hẹn hò lãng mạn giữa thiên nhiên', 'Đọc sách & Viết lách thư thái', 'Thư giãn cuối tuần xả stress'],
      signatureDrinks: [
        { name: 'Trà Trái Cây Nhiệt Đới Ủ Lạnh', price: 52000, reason: 'Hương vị trái cây thanh mát hòa quyện mật ong rừng thơm lành' },
        { name: 'Cà phê Phin Bơ Béo Cú Style', price: 48000, reason: 'Pha chế mộc mạc cùng lớp kem bơ dẻo thơm ngậy' }
      ],
      googleMapsData: {
        placeId: 'ChIJ6-c1n610eTER9W7p3_4x_9L',
        googleRating: 4.7,
        totalReviews: 540,
        fullAddress: '262 Ung Văn Khiêm, Phường 25, Quận Bình Thạnh, TP.HCM',
        formattedPhone: '028 3512 4567',
        priceLevel: '40.000đ - 65.000đ',
        parkingInfo: 'Sân giữ xe máy rộng rãi ngay trước cổng vào quán',
        hoursSummary: '07:30 - 22:30 mỗi ngày',
        googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Cu+Tren+Cay+Coffee+262+Ung+Van+Khiem+Binh+Thanh&query_place_id=ChIJ6-c1n610eTER9W7p3_4x_9L',
        coordinates: { lat: 10.8085, lng: 106.7160 }
      },
      workAndTech: {
        wifiSpeed: '120 Mbps',
        outletsAvailability: 'Có tại khu nhà gỗ trong nhà và các góc bàn mái che',
        idealQuietHours: '08:00 - 11:30 & 13:30 - 16:30',
        peakHours: '16:30 - 19:30 (Đông bạn trẻ ngắm hoàng hôn vườn)',
        seatComfort: 'Ghế gỗ mộc mạc và ghế mây đan tự nhiên'
      },
      aiReviewSynthesis: {
        pros: [
          'Cây xanh dày đặc giúp không khí mát hơn bên ngoài 2-3 độ C',
          'Menu đồ uống đa dạng, trà thảo mộc rất thanh tao',
          'Nhiều góc ngồi riêng tư, yên tĩnh như một góc Đà Lạt thu nhỏ'
        ],
        tips: 'Nên ngồi khu vực hiên gỗ tầng 2 để ngắm toàn cảnh khu vườn từ trên cao.'
      },
      extractedAt: '05/09/2026'
    },
    reviews: [],
  },
  {
    id: '10',
    name: 'Cheese Coffee - Lê Thị Riêng',
    address: '41 Lê Thị Riêng, Phường Bến Thành, Quận 1, TP.HCM',
    distance: '1.1 km',
    rating: 4.7,
    reviewCount: 780,
    coverImage: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&q=80&w=800',
    images: [
      'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&q=80&w=800'
    ],
    openingHours: [
      { day: 'Thứ 2 - CN', time: '07:00 - 22:30' }
    ],
    moods: ['Tụ tập nhóm', 'Chụp ảnh / Check-in', 'Làm việc / Học bài'],
    tags: ['Trà Sữa Nguyên Bản', 'European Retro', 'Trung Tâm Quận 1', 'Bánh Nướng'],
    amenities: ['Wi-Fi', 'Chỗ sạc', 'WC', 'Parking', 'Indoor', 'Table Service'],
    styles: ['Industrial', 'Cozy Modern'],
    specialModels: ['Workshop Café'],
    primaryStyle: 'Industrial',
    primaryModel: 'Workshop Café',
    location: { lat: 10.7710, lng: 106.6915 },
    placeId: 'ChIJr2d1k1p1eTER3K4e5_8k_2N',
    isGoogleVerified: true,
    phoneNumber: '+84 28 3925 5789',
    website: 'https://cheesecoffee.vn',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Cheese+Coffee+41+Le+Thi+Rieng+District+1&query_place_id=ChIJr2d1k1p1eTER3K4e5_8k_2N',
    aiIntel: {
      summary: 'Thương hiệu cà phê phong cách Châu Âu hiện đại với phong cách thiết kế Industrial gạch thô thời thượng, tiên phong với các dòng Trà sữa nguyên bản, Marble Caffe và bánh ngọt cao cấp.',
      vibe: 'Năng động, sành điệu, ánh sáng ấm cúng và tràn ngập cảm hứng sáng tạo của người trẻ thành thị.',
      bestFor: ['Tụ tập bạn bè trò chuyện', 'Học bài & Làm việc nhóm', 'Thưởng thức trà sữa nguyên bản & Bánh phô mai'],
      signatureDrinks: [
        { name: 'Trà Sữa Lài Cheese Macchiato', price: 55000, reason: 'Trà lài thơm thanh thoát phủ lớp kem phô mai béo mặn đặc trưng' },
        { name: 'Marble Caffe Hạnh Nhân', price: 52000, reason: 'Vân cà phê đan xen sữa béo nghệ thuật vị êm dịu dễ uống' }
      ],
      googleMapsData: {
        placeId: 'ChIJr2d1k1p1eTER3K4e5_8k_2N',
        googleRating: 4.7,
        totalReviews: 780,
        fullAddress: '41 Lê Thị Riêng, Phường Bến Thành, Quận 1, TP.HCM',
        formattedPhone: '028 3925 5789',
        priceLevel: '45.000đ - 70.000đ',
        parkingInfo: 'Gửi xe máy trước quán có bảo vệ dắt xe miễn phí',
        hoursSummary: '07:00 - 22:30 mỗi ngày',
        googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Cheese+Coffee+41+Le+Thi+Rieng+District+1&query_place_id=ChIJr2d1k1p1eTER3K4e5_8k_2N',
        coordinates: { lat: 10.7710, lng: 106.6915 }
      },
      workAndTech: {
        wifiSpeed: '160 Mbps',
        outletsAvailability: 'Có tại hầu hết các bàn tầng lửng và tầng trệt',
        idealQuietHours: '07:30 - 10:30 & 13:30 - 16:30',
        peakHours: '19:00 - 21:30 (Đông đúc các bạn trẻ tụ họp)',
        seatComfort: 'Ghế bọc nệm êm ái, bàn tròn và bàn dài làm việc'
      },
      aiReviewSynthesis: {
        pros: [
          'Trà sữa béo thơm đậm vị trà, kem macchiato đặc trưng khó cưỡng',
          'Không gian thiết kế đẹp, ánh sáng chụp ảnh sắc nét',
          'Vị trí trung tâm Quận 1 thuận tiện hẹn gặp bạn bè'
        ],
        tips: 'Nên gọi kèm bánh sừng bò trứng muối nướng nóng để thưởng thức cùng trà sữa.'
      },
      extractedAt: '05/09/2026'
    },
    reviews: [],
  },
  {
    id: '11',
    name: '貓咪花園 咖啡 Cat Flower Garden',
    address: 'No. 129, Fuhua Rd, Shilin District, Taipei City, Taiwan 111',
    distance: '350 m',
    rating: 4.8,
    reviewCount: 920,
    coverImage: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=800',
    images: [
      'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?auto=format&fit=crop&q=80&w=800'
    ],
    openingHours: [
      { day: '週一 - 週日', time: '11:00 - 21:00' }
    ],
    moods: ['Thư giãn / Chill', 'Chụp ảnh / Check-in'],
    tags: ['貓咪咖啡廳', '台北士林', '插座充足', 'Wi-Fi'],
    amenities: ['Wi-Fi', 'Chỗ sạc', 'WC', 'Indoor', 'Table Service'],
    styles: ['Cute', 'Cozy Modern'],
    specialModels: ['Cat Café'],
    primaryStyle: 'Cute',
    primaryModel: 'Cat Café',
    location: { lat: 25.0330, lng: 121.5654 },
    placeId: 'ChIJtwb7T0CpQjQRr9j3p4zX5vM',
    isGoogleVerified: true,
    phoneNumber: '+886 2 2835 1553',
    website: 'https://catflowergarden.tw',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Cat+Flower+Garden+Taipei&query_place_id=ChIJtwb7T0CpQjQRr9j3p4zX5vM',
    aiIntel: {
      summary: 'Quán cà phê mèo lâu đời và nổi tiếng nhất tại Đài Bắc, kết hợp không gian vườn hoa ấm cúng với hơn 15 bé mèo thân thiện và menu trà hoa thảo mộc ngọt dịu.',
      vibe: 'Dễ thương, yên bình và ấm cúng; ánh nắng chiếu nhẹ qua rèm hoa cùng tiếng mèo rù quyến rũ.',
      bestFor: ['Thư giãn cùng mèo cưng', 'Check-in chụp ảnh dễ thương', 'Thưởng thức trà hoa & Bánh ngọt'],
      signatureDrinks: [
        { name: 'Trà Hoa Cúc Mật Ong Đài Loan', price: 65000, reason: 'Trà hoa cúc nguyên bông thơm dịu giúp an thần và thư giãn' },
        { name: 'Latte Mèo Vẽ Bọt 3D', price: 75000, reason: 'Nghệ thuật tạo hình bọt sữa hình mèo 3D siêu dễ thương' }
      ],
      googleMapsData: {
        placeId: 'ChIJtwb7T0CpQjQRr9j3p4zX5vM',
        googleRating: 4.8,
        totalReviews: 920,
        fullAddress: 'No. 129, Fuhua Rd, Shilin District, Taipei City, Taiwan 111',
        formattedPhone: '+886 2 2835 1553',
        priceLevel: '60.000đ - 110.000đ',
        parkingInfo: 'Gần ga MRT Zhishan (Exit 1), đi bộ 2 phút',
        hoursSummary: '11:00 - 21:00 mỗi ngày',
        googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Cat+Flower+Garden+Taipei&query_place_id=ChIJtwb7T0CpQjQRr9j3p4zX5vM',
        coordinates: { lat: 25.0330, lng: 121.5654 }
      },
      workAndTech: {
        wifiSpeed: '150 Mbps',
        outletsAvailability: 'Có tại khu vực bàn sát tường',
        idealQuietHours: '11:00 - 13:30',
        peakHours: '15:00 - 18:30',
        seatComfort: 'Ghế bọc nệm và thảm ngồi chơi cùng mèo'
      },
      aiReviewSynthesis: {
        pros: [
          'Các bé mèo được chăm sóc chu đáo, lông mượt và rất quấn khách',
          'Không gian sạch sẽ, không có mùi hôi động vật',
          'Đồ uống trang trí tinh tế và ngon miệng'
        ],
        tips: 'Nên rửa tay và đọc kỹ nội quy vuốt ve mèo trước khi vào khu vực chơi.'
      },
      extractedAt: '05/09/2026'
    },
    reviews: [],
  },
  {
    id: '12',
    name: '台北桌遊咖啡館 Taipei Board Game Lounge',
    address: 'No. 88, Section 1, Xinsheng S Rd, Zhongzheng District, Taipei City, Taiwan 100',
    distance: '850 m',
    rating: 4.9,
    reviewCount: 640,
    coverImage: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&q=80&w=800',
    images: [
      'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&q=80&w=800'
    ],
    openingHours: [
      { day: '週二 - 週日', time: '13:00 - 23:00' }
    ],
    moods: ['Tụ tập nhóm', 'Thư giãn / Chill'],
    tags: ['桌遊咖啡廳', '300+款桌遊', '包廂', 'WiFi'],
    amenities: ['Wi-Fi', 'Chỗ sạc', 'WC', 'Indoor', 'Shared', 'Private'],
    styles: ['Minimalist', 'Cozy Modern'],
    specialModels: ['Board Game Café'],
    primaryStyle: 'Cozy Modern',
    primaryModel: 'Board Game Café',
    location: { lat: 25.0420, lng: 121.5320 },
    placeId: 'ChIJ8Zl5yACpQjQRq5v1u5mB3eM',
    isGoogleVerified: true,
    phoneNumber: '+886 2 2391 8899',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Taipei+Board+Game+Lounge&query_place_id=ChIJ8Zl5yACpQjQRq5v1u5mB3eM',
    aiIntel: {
      summary: 'Không gian board game hiện đại tại khu Zhongzheng với hơn 300 trò chơi quốc tế, phòng VIP cách âm và đội ngũ game master hướng dẫn tận tâm.',
      vibe: 'Sôi nổi, hào hứng, bàn chơi game kích thước lớn đạt tiêu chuẩn thi đấu.',
      bestFor: ['Chơi Board Game đồng đội', 'Sinh nhật & Gặp gỡ bạn bè', 'Giải trí nhóm cuối tuần'],
      signatureDrinks: [
        { name: 'Trà Oolong Sữa Nướng Đài Loan', price: 55000, reason: 'Vị trà Ô Long trứ danh Đài Loan hòa cùng sữa thơm béo' },
        { name: 'Khoai Tây Chiên Phô Mai Giòn Rụm', price: 45000, reason: 'Món ăn vặt tiếp năng lượng hoàn hảo khi chơi game' }
      ],
      googleMapsData: {
        placeId: 'ChIJ8Zl5yACpQjQRq5v1u5mB3eM',
        googleRating: 4.9,
        totalReviews: 640,
        fullAddress: 'No. 88, Section 1, Xinsheng S Rd, Zhongzheng District, Taipei City, Taiwan 100',
        formattedPhone: '+886 2 2391 8899',
        priceLevel: '50.000đ - 90.000đ',
        parkingInfo: 'Gần ga MRT Zhongxiao Xinsheng (Exit 5)',
        hoursSummary: '13:00 - 23:00 (Nghỉ Thứ 2)',
        googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Taipei+Board+Game+Lounge&query_place_id=ChIJ8Zl5yACpQjQRq5v1u5mB3eM',
        coordinates: { lat: 25.0420, lng: 121.5320 }
      },
      workAndTech: {
        wifiSpeed: '200 Mbps',
        outletsAvailability: 'Bố trí đầy đủ tại các cụm bàn',
        idealQuietHours: '13:00 - 15:30',
        peakHours: '18:00 - 22:00',
        seatComfort: 'Ghế tựa lưng công thái học chơi lâu không mỏi'
      },
      aiReviewSynthesis: {
        pros: [
          'Kho trò chơi phong phú, luôn cập nhật game mới nhất thế giới',
          'Game master giải thích luật chơi chi tiết và nhiệt tình',
          'Giá vé kèm nước hợp lý, không gian sạch sẽ'
        ],
        tips: 'Nên đặt bàn trước nếu đi nhóm từ 5 người trở lên vào tối Thứ 6 hoặc Thứ 7.'
      },
      extractedAt: '05/09/2026'
    },
    reviews: [],
  },
  {
    id: '13',
    name: '猫カフェ モカ 新宿店 Cat Cafe Mocha Shinjuku',
    address: '3-31-5 Shinjuku, Shinjuku-ku, Tokyo, Japan 160-0022',
    distance: '420 m',
    rating: 4.8,
    reviewCount: 1450,
    coverImage: 'https://images.unsplash.com/photo-1543852786-1cf6624b9987?auto=format&fit=crop&q=80&w=800',
    images: [
      'https://images.unsplash.com/photo-1543852786-1cf6624b9987?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&q=80&w=800'
    ],
    openingHours: [
      { day: '月曜日 - 日曜日', time: '10:00 - 20:00' }
    ],
    moods: ['Thư giãn / Chill', 'Chụp ảnh / Check-in'],
    tags: ['猫カフェ', '新宿', '電源あり', 'Wi-Fi完備'],
    amenities: ['Wi-Fi', 'Chỗ sạc', 'WC', 'Indoor', 'Self Service'],
    styles: ['Cozy Modern', 'Cute'],
    specialModels: ['Cat Café'],
    primaryStyle: 'Cozy Modern',
    primaryModel: 'Cat Café',
    location: { lat: 35.6900, lng: 139.7000 },
    placeId: 'ChIJd8BlQ2BOGGAR3F1v-5x_7eN',
    isGoogleVerified: true,
    phoneNumber: '+81 3 6709 8822',
    website: 'https://catmocha.jp',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Cat+Cafe+Mocha+Shinjuku+Tokyo&query_place_id=ChIJd8BlQ2BOGGAR3F1v-5x_7eN',
    aiIntel: {
      summary: 'Quán cà phê mèo phong cách sang trọng hàng đầu Tokyo với cây gỗ leo khổng lồ giữa sảnh, máy pha đồ uống tự động không giới hạn và góc truyện tranh manga thư giãn.',
      vibe: 'Thư thái tuyệt đối, ánh sáng vàng dịu nhẹ tạo cảm giác ấm cúng như ở phòng khách gia đình.',
      bestFor: ['Nghỉ ngơi thư giãn khi du lịch Shinjuku', 'Vuốt ve mèo và đọc Manga', 'Làm việc nhẹ nhàng trên laptop'],
      signatureDrinks: [
        { name: 'Trà Xanh Matcha Latte Nhật Bản', price: 60000, reason: 'Matcha Uji thơm đậm vị truyền thống từ quầy nước tự phục vụ' },
        { name: 'Cà phê Rang Say Tươi Mocha Blend', price: 55000, reason: 'Cà phê nguyên chất pha tự động thơm nồng' }
      ],
      googleMapsData: {
        placeId: 'ChIJd8BlQ2BOGGAR3F1v-5x_7eN',
        googleRating: 4.8,
        totalReviews: 1450,
        fullAddress: '3-31-5 Shinjuku, Shinjuku-ku, Tokyo, Japan 160-0022',
        formattedPhone: '+81 3 6709 8822',
        priceLevel: '70.000đ - 120.000đ',
        parkingInfo: 'Đi bộ 1 phút từ Ga JR Shinjuku (Cổng Đông)',
        hoursSummary: '10:00 - 20:00 mỗi ngày',
        googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Cat+Cafe+Mocha+Shinjuku+Tokyo&query_place_id=ChIJd8BlQ2BOGGAR3F1v-5x_7eN',
        coordinates: { lat: 35.6900, lng: 139.7000 }
      },
      workAndTech: {
        wifiSpeed: '250 Mbps (Cáp quang tốc độ cao)',
        outletsAvailability: 'Có ổ cắm điện và cổng sạc tại từng ghế ngồi',
        idealQuietHours: '10:30 - 13:00',
        peakHours: '16:00 - 19:00',
        seatComfort: 'Sofa cao cấp, gối ôm êm ái và đệm lông'
      },
      aiReviewSynthesis: {
        pros: [
          'Không gian thiết kế bằng gỗ tuyệt đẹp, đẳng cấp và sạch tinh tươm',
          'Vị trí siêu thuận tiện ngay trung tâm sầm uất Shinjuku',
          'Có quầy nước uống tự do và nhiều kệ sách truyện tranh'
        ],
        tips: 'Có thể mua món thưởng cho mèo (Cat Treats) tại quầy để được các bé vây quanh.'
      },
      extractedAt: '05/09/2026'
    },
    reviews: [],
  },
  {
    id: '14',
    name: 'Kuro Cat Coffee Lounge & Bakery',
    address: '124 Nguyễn Đình Chiểu, Phường Đa Kao, Quận 1, TP.HCM',
    distance: '650 m',
    rating: 4.8,
    reviewCount: 380,
    coverImage: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=800',
    images: [
      'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=800'
    ],
    openingHours: [
      { day: 'Thứ 2 - CN', time: '08:30 - 22:00' }
    ],
    moods: ['Thư giãn / Chill', 'Chụp ảnh / Check-in', 'Làm việc / Học bài'],
    tags: ['Cà phê mèo', 'Yên tĩnh', 'Mèo Anh lông ngắn', 'Chỗ sạc'],
    amenities: ['Wi-Fi', 'Chỗ sạc', 'WC', 'Parking', 'Indoor', 'Table Service'],
    styles: ['Cute', 'Cozy Modern', 'Minimalist'],
    specialModels: ['Cat Café'],
    primaryStyle: 'Cute',
    primaryModel: 'Cat Café',
    location: { lat: 10.7780, lng: 106.6980 },
    placeId: 'ChIJkuro_cat_q1_hcm',
    isGoogleVerified: true,
    phoneNumber: '+84 90 888 7766',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Kuro+Cat+Coffee+Nguyen+Dinh+Chieu+District+1&query_place_id=ChIJkuro_cat_q1_hcm',
    aiIntel: {
      summary: 'Lounge cà phê mèo yên tĩnh giữa trung tâm Quận 1 chuyên các bé mèo Anh lông ngắn và mèo Bengal hiền lành, kết hợp xưởng bánh ngọt nướng tươi mỗi ngày.',
      vibe: 'Tone gỗ ấm áp, nhạc jazz acoustic êm đềm, không gian thơm mùi bánh bơ nướng dịu ngọt.',
      bestFor: ['Làm việc nhẹ nhàng & Chạy deadline', 'Chơi đùa cùng mèo cưng', 'Thưởng thức bánh ngọt & Cà phê pha máy'],
      signatureDrinks: [
        { name: 'Kuro Salted Cream Latte', price: 48000, reason: 'Latte sánh mịn phủ lớp kem muối mặn béo ngậy độc quyền' },
        { name: 'Bánh Mousse Mèo Socola Đen', price: 42000, reason: 'Tạo hình mèo đen dễ thương, vị đắng ngọt hài hòa' }
      ],
      googleMapsData: {
        placeId: 'ChIJkuro_cat_q1_hcm',
        googleRating: 4.8,
        totalReviews: 380,
        fullAddress: '124 Nguyễn Đình Chiểu, Phường Đa Kao, Quận 1, TP.HCM',
        formattedPhone: '090 888 7766',
        priceLevel: '42.000đ - 70.000đ',
        parkingInfo: 'Gửi xe máy miễn phí ngay trước cửa quán',
        hoursSummary: '08:30 - 22:00 mỗi ngày',
        googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Kuro+Cat+Coffee+Nguyen+Dinh+Chieu+District+1&query_place_id=ChIJkuro_cat_q1_hcm',
        coordinates: { lat: 10.7780, lng: 106.6980 }
      },
      workAndTech: {
        wifiSpeed: '160 Mbps',
        outletsAvailability: 'Có ổ cắm tại tất cả các bàn khu vực làm việc',
        idealQuietHours: '08:30 - 11:30 & 13:30 - 16:30',
        peakHours: '17:30 - 20:30',
        seatComfort: 'Ghế bọc nệm công thái học thoải mái ngồi làm việc'
      },
      aiReviewSynthesis: {
        pros: [
          'Các bé mèo thân thiện, được tiêm phòng đầy đủ và vệ sinh thơm tho',
          'Cà phê kem muối và bánh mousse rất ngon',
          'Không gian yên tĩnh, có thể tập trung học bài hoặc làm việc hiệu quả'
        ],
        tips: 'Khu vực tầng 2 có dãy bàn làm việc riêng tư nhìn ra tán cây xanh.'
      },
      extractedAt: '05/09/2026'
    },
    reviews: [],
  }
];

export const MOCK_TABLES: Table[] = [
  { id: 't1', x: 20, y: 20, width: 60, height: 60, seats: 2, type: 'round', status: 'empty', photo: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=400' },
  { id: 't2', x: 20, y: 120, width: 60, height: 60, seats: 2, type: 'round', status: 'full', photo: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&q=80&w=400' },
  { id: 't3', x: 150, y: 20, width: 120, height: 80, seats: 4, type: 'rect', status: 'empty', photo: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=400' },
  { id: 't4', x: 150, y: 140, width: 120, height: 80, seats: 4, type: 'rect', status: 'empty', photo: 'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?auto=format&fit=crop&q=80&w=400' },
  { id: 't5', x: 300, y: 20, width: 100, height: 200, seats: 6, type: 'sofa', status: 'full', photo: 'https://images.unsplash.com/photo-1508424757105-b6d5ad9329d0?auto=format&fit=crop&q=80&w=400' },
  { id: 't6', x: 20, y: 240, width: 120, height: 80, seats: 4, type: 'rect', status: 'empty', photo: 'https://images.unsplash.com/photo-1445116572660-236099ec97a0?auto=format&fit=crop&q=80&w=400' },
  { id: 't7', x: 180, y: 260, width: 60, height: 60, seats: 2, type: 'round', status: 'empty', photo: 'https://images.unsplash.com/photo-1495474472201-35011f0f3656?auto=format&fit=crop&q=80&w=400' },
  { id: 't8', x: 280, y: 260, width: 60, height: 60, seats: 2, type: 'round', status: 'empty', photo: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=400' },
];


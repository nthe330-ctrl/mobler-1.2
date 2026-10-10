import { Language } from '../context/LanguageContext';
import { CoffeeShop, MenuItem, Mood } from '../types';

export interface LocalizedShopData {
  name: string;
  address: string;
  tags?: string[];
  summary?: string;
  vibe?: string;
  bestFor?: string[];
  fullAddress?: string;
  parkingInfo?: string;
  hoursSummary?: string;
  signatureDrinks?: { name: string; price: number; reason: string }[];
  workAndTech?: {
    wifiSpeed?: string;
    outletsAvailability?: string;
    idealQuietHours?: string;
    peakHours?: string;
    seatComfort?: string;
  };
  pros?: string[];
  tips?: string;
}

export interface LocalizedMenuItemData {
  name: string;
  description: string;
  category: string;
}

export const SHOP_TRANSLATIONS: Record<Language, Record<string, LocalizedShopData>> = {
  'zh-TW': {
    '1': {
      name: 'The Workshop 手沖精品咖啡館',
      address: '胡志明市第一郡吳德繼街27號2樓',
      tags: ['精品咖啡', '靜謐專注', '工業風格'],
      summary: '胡志明市第一郡精品手沖咖啡的先驅者，擁有挑高工業風閣樓、質樸實木長桌與專業頂級義式及手沖吧檯。',
      vibe: '裸磚復古與現代金屬交融，挑高大圓拱窗採光充足，輕柔爵士樂营造極致專注工作氛圍。',
      bestFor: ['深度辦公與遠距寫扣', '國際商務會談', '品鑑世界級手沖咖啡'],
      fullAddress: '胡志明市第一郡𤅶藝坊吳德繼街27號2樓',
      parkingInfo: '大樓一樓備有專屬機車停車位（免費並有警衛看管）',
      hoursSummary: '每日 08:00 - 22:00（節假日正常營業）',
      signatureDrinks: [
        { name: '招牌特調冷萃咖啡', price: 55000, reason: '嚴選大叻阿拉比卡豆冷萃24小時，散發熱帶果香與甘甜回韻' },
        { name: '衣索比亞 V60 單品手沖', price: 68000, reason: '茉莉花香與佛手柑清香層次豐富，達國際精品咖啡標準' }
      ],
      workAndTech: {
        wifiSpeed: '180 Mbps（高速穩定國際頻寬）',
        outletsAvailability: '95%座位與長桌均配備電源插座',
        idealQuietHours: '08:30 - 11:30 及 14:00 - 17:30',
        peakHours: '12:00 - 13:30（午間尖峰）',
        seatComfort: '人體工學軟墊座椅，辦公高度適中舒適'
      },
      pros: [
        '自家新鮮烘焙咖啡豆，咖啡師專業且熱情解說',
        '網路速度極快，進行視訊會議流暢無延遲',
        '二樓空間寬敞透光，遠離街道車流喧囂'
      ],
      tips: '建議早上 10:00 前抵達，挑選窗邊採光最佳的靠窗座位。'
    },
    '2': {
      name: 'Blanc. 極簡純白花園咖啡',
      address: '胡志明市第三郡二徵夫人街158號',
      tags: ['美學空間', '法式甜點', '戶外庭院', '綠意植栽'],
      summary: '純白極簡美學結合熱帶綠意庭園，氛圍優雅浪漫，採光極佳，為絕美打卡與下午茶勝地。',
      vibe: '優雅明亮的白色調空間，伴隨現烤可頌與麵包香氣，陽光透過落地玻璃窗灑落，怡人愜意。',
      bestFor: ['浪漫約會', '美學打卡拍照', '精緻下午茶品鑑'],
      fullAddress: '胡志明市第三郡多高坊二徵夫人街158號',
      parkingInfo: '店門口設有遮陽機車停車區',
      hoursSummary: '每日 07:00 - 22:30',
      signatureDrinks: [
        { name: '鮮橙檸檬草蜜桃冰茶', price: 50000, reason: '冷萃紅茶搭配香脆水蜜桃片與新鮮現擠甜橙汁，清甜爽口' },
        { name: '現烤法式頂級奶油可頌', price: 40000, reason: '外層金黃酥脆，千層內部柔軟濕潤且散發天然發酵奶油香' }
      ],
      workAndTech: {
        wifiSpeed: '100 Mbps（連線穩定）',
        outletsAvailability: '室內靠牆座位均備有充電插座',
        idealQuietHours: '07:30 - 09:30 及 14:00 - 16:30',
        peakHours: '16:30 - 18:00（傍晚打卡人潮）',
        seatComfort: '精緻藤編椅與柔軟沙發'
      },
      pros: [
        '庭園綠樹成蔭，戶外自然光拍照非常出片',
        '法式可頌與甜點每日新鮮出爐，口感極佳',
        '店員服務親切，環境整潔優雅'
      ],
      tips: '推薦下午 15:30 - 17:00 前來，捕捉最柔和的自然斜射光線。'
    },
    '3': {
      name: 'SOK - Space of K 賽博龐克遊戲咖啡',
      address: '胡志明市第一郡阮太學街45號',
      tags: ['PS5遊戲館', '賽博龐克', '夜貓暢飲', '桌遊對戰'],
      summary: '結合 PS5 主機遊戲、霓虹賽博龐克視覺與精緻咖啡調飲的次世代娛樂社交空間。',
      vibe: '暗黑系霓虹光影流動，專業電競座椅與大螢幕 4K 電視，充滿年輕活力與科技感。',
      bestFor: ['主機遊戲對戰', '夜間聚會 Chill', '好友開黑放鬆'],
      fullAddress: '胡志明市第一郡梂翁領坊阮太學街45號',
      parkingInfo: '店門口專人泊車與看管',
      hoursSummary: '24 小時全天候營業',
      signatureDrinks: [
        { name: '賽博冰釀冷萃 (Neon Cold Brew)', price: 58000, reason: '特調能量冷萃咖啡，附發光冰球與特調柑橘糖漿' },
        { name: '抹茶乳酪特調 (Matcha Cyber Cheese)', price: 62000, reason: '濃郁宇治抹茶搭配厚起司奶蓋，口感醇厚' }
      ],
      workAndTech: {
        wifiSpeed: '250 Mbps（低延遲電競級光纖）',
        outletsAvailability: '全館每個座位均有快充插座與 USB-C 接口',
        idealQuietHours: '08:00 - 12:00',
        peakHours: '19:00 - 02:00（夜間高峰）',
        seatComfort: '人體工學電競椅與柔軟寬大沙發'
      },
      pros: [
        '最新 PS5 遊戲庫與雙手把齊全，隨到隨玩',
        '24 小時營業，隨時都能享受咖啡與遊戲樂趣',
        '飲品與炸物點心水準在水準之上'
      ],
      tips: '週末晚間建議提前透過 App 預約包廂或大螢幕沙發座。'
    },
    '4': {
      name: 'Là Việt 大叻經典手沖咖啡',
      address: '胡志明市第三郡秀昌街19號',
      tags: ['大叻阿拉比卡', '大工作長桌', '簡約美學'],
      summary: '來自越南咖啡之都大叻的知名精品品牌，展現從農場到咖啡杯的純粹工藝與溫暖木質空間。',
      vibe: '寬敞挑高的木質工業風，滿室咖啡烘焙香氣，多張大型共享實木長桌，極適合閱讀辦公。',
      bestFor: ['全日筆電辦公', '體驗越南道地精品咖啡豆', '安靜閱讀'],
      fullAddress: '胡志明市第三郡武氏六坊秀昌街19號',
      parkingInfo: '院內可免費停放機車',
      hoursSummary: '每日 07:00 - 22:00',
      signatureDrinks: [
        { name: '大叻手沖單品咖啡 (Pour Over Da Lat)', price: 50000, reason: '中淺焙大叻高山阿拉比卡，果酸明亮清雅回甘' },
        { name: '手工冷萃咖啡 (Artisan Cold Brew)', price: 55000, reason: '柑橘香氣明顯，口感清爽順口' }
      ],
      workAndTech: {
        wifiSpeed: '120 Mbps（高速穩定）',
        outletsAvailability: '中央共享長桌全面配備電源插座',
        idealQuietHours: '07:30 - 11:30 及 13:30 - 17:00',
        peakHours: '11:30 - 13:00',
        seatComfort: '天然實木大長桌與人體工學靠背椅'
      },
      pros: [
        '咖啡品質極佳且價格合理實惠',
        '長桌空間寬闊，非常適合筆電工作者長時間停留',
        '店員對咖啡風味知識非常專業'
      ],
      tips: '可以購買店家現場烘焙包裝的大叻咖啡豆回家品嚐。'
    },
    '5': {
      name: 'Okkio Caffe 復古摩登紅磚咖啡',
      address: '胡志明市第一郡黎利大道120/1號',
      tags: ['復古紅磚', '精品特調', '溫馨浪漫'],
      summary: '藏身於繁華市中心的復古紅磚質感咖啡館，將老式建築情懷與現代精品咖啡完美融合。',
      vibe: '暖色調紅磚弧形穹頂、溫暖昏黃鎢絲燈光與黑膠唱片旋律，營造私密而優雅的時光感。',
      bestFor: ['約會談心', '沉浸式閱讀', '品嚐招牌手作蛋咖啡'],
      fullAddress: '胡志明市第一郡𤅶成坊黎利大道120/1號',
      parkingInfo: '附近有公共收費機車與汽車停車場',
      hoursSummary: '每日 07:30 - 22:00',
      signatureDrinks: [
        { name: '招牌生蛋黃金咖啡 (Egg Coffee)', price: 65000, reason: '濃郁綿密蛋奶慕斯，口感如甜點般絲滑香甜' },
        { name: '燕麥奶西班牙拿鐵', price: 60000, reason: '濃縮咖啡搭配燕麥奶與少許煉乳，風味溫潤濃郁' }
      ],
      workAndTech: {
        wifiSpeed: '90 Mbps',
        outletsAvailability: '主要分布在角落與靠牆卡座',
        idealQuietHours: '08:00 - 10:30',
        peakHours: '15:00 - 18:00',
        seatComfort: '復古皮質軟墊椅與圓木桌'
      },
      pros: [
        '蛋咖啡風味驚艷，完全無腥味且奶泡細膩',
        '紅磚拱門設計極具美感，拍照非常有質感',
        '隱密安靜，遠離大馬路的吵雜'
      ],
      tips: '入口在小巷內，走上旋轉樓梯即可進入這片秘密基地。'
    },
    '6': {
      name: 'Cộng Cà Phê 越共復古椰子咖啡',
      address: '胡志明市第一郡李自重街26號1樓',
      tags: ['椰子冰沙咖啡', '復古軍綠風', '懷舊時光'],
      summary: '越南極具代表性的懷舊主題咖啡館，以 80 年代越共懷舊風格與招牌椰子冰沙咖啡聞名國際。',
      vibe: '軍綠色牆面、舊木窗櫺、古董書籍與印花花布椅墊，彷彿穿越回純樸的歷史年代。',
      bestFor: ['品嚐經典椰子咖啡', '體驗越南特色歷史文化', '好友聚會閒聊'],
      fullAddress: '胡志明市第一郡𤅶藝坊李自重街26號1樓',
      parkingInfo: '大樓前有專用機車停放點',
      hoursSummary: '每日 07:00 - 23:00',
      signatureDrinks: [
        { name: '招牌椰子冰沙咖啡 (Cốt Dừa Cà Phê)', price: 59000, reason: '香濃椰奶冰沙融合醇厚黑咖啡，甜而不膩，夏日必點' },
        { name: '綠豆冰沙咖啡 (Cốt Dừa Đậu Xanh)', price: 55000, reason: '獨家綠豆香氣與綿密椰香，口感豐富傳統' }
      ],
      workAndTech: {
        wifiSpeed: '80 Mbps',
        outletsAvailability: '部分座位提供插座',
        idealQuietHours: '07:00 - 09:00',
        peakHours: '14:00 - 17:00 及 19:30 - 21:30',
        seatComfort: '傳統矮木椅與復古花布軟墊'
      },
      pros: [
        '椰子冰沙咖啡風味無可挑剔，名不虛傳',
        '店內陳設充滿歷史細節與懷舊道具',
        '地理位置優越，位於市中心核心區域'
      ],
      tips: '二樓陽台座位可以俯瞰市中心街景，視野極佳。'
    },
    '7': {
      name: 'Maison Marou 頂級可可工坊咖啡',
      address: '胡志明市第一郡卡梅特街167-169號',
      tags: ['頂級精品巧克力', '現場烘焙工坊', '精緻法式甜點'],
      summary: '被《紐約時報》譽為全球最棒巧克力之一的越南頂級 Bean-to-Bar 巧克力工坊旗艦店。',
      vibe: '開放式烘焙工坊可觀賞可可豆烘烤與研磨過程，空氣中瀰漫濃郁頂級可可香。',
      bestFor: ['品嚐世界級純黑熱巧克力', '購買頂級伴手禮', '精緻法式甜點品鑑'],
      fullAddress: '胡志明市第一郡阮太平坊卡梅特街167-169號',
      parkingInfo: '門口有機車停放區並有專人引導',
      hoursSummary: '每日 09:00 - 22:00',
      signatureDrinks: [
        { name: '招牌極品熱巧克力 (Signature Hot Chocolate)', price: 85000, reason: '採用越南單一產區 70% 頂級黑可可現煮，濃醇細緻' },
        { name: '摩卡特調 (Marou Mocha)', price: 75000, reason: '精品義式濃縮與莊園級黑巧克力醬的奢華結合' }
      ],
      workAndTech: {
        wifiSpeed: '100 Mbps',
        outletsAvailability: '靠窗長吧檯提供插座',
        idealQuietHours: '09:00 - 11:00',
        peakHours: '15:00 - 19:00',
        seatComfort: '現代木質座椅與皮質長凳'
      },
      pros: [
        '巧克力濃郁純正，層次豐富無可比擬',
        '開放式透明工坊可近距離觀看製程，極富趣味',
        '包裝精美，為伴手禮首選'
      ],
      tips: '必點熱巧克力搭配招牌百香果巧克力塔或可可泡芙。'
    },
    '8': {
      name: 'Rang Rang Coffee 草田極簡設計咖啡',
      address: '胡志明市守德市草田坊國香街1號',
      tags: ['未來極簡', '精品冷萃', '外籍社群空間'],
      summary: '坐落於異國風情草田區的高科技極簡咖啡廳，以純粹銀灰色金屬質感與頂級精品咖啡聞名。',
      vibe: '大面積透明玻璃、極簡金屬線條與前衛未來感設計，是國際數位遊民與創意人士的聚會首選。',
      bestFor: ['自由職業者工作', '高質感打卡', '精品冷萃與手沖'],
      fullAddress: '胡志明市守德市草田坊國香街1號',
      parkingInfo: '寬敞地下機車與汽車停車位',
      hoursSummary: '每日 07:00 - 22:30',
      signatureDrinks: [
        { name: '氮氣冷萃咖啡 (Nitro Cold Brew)', price: 65000, reason: '注入微細氮氣氣泡，呈現如黑啤酒般的綿密奶油口感' },
        { name: '髒髒咖啡 (Dirty Coffee)', price: 60000, reason: '濃烈熱濃縮咖啡分層倒入冰鎮特調厚牛奶，冷熱交織' }
      ],
      workAndTech: {
        wifiSpeed: '200 Mbps（高速穩定光纖）',
        outletsAvailability: '每張桌子底下皆配有隱藏式電源插座',
        idealQuietHours: '07:30 - 11:30',
        peakHours: '14:30 - 17:30',
        seatComfort: '極簡設計椅與寬大辦公長桌'
      },
      pros: [
        '極簡空間設計極富未來感與乾淨俐落感',
        '義式與冷萃咖啡品質非常穩定出色',
        '工作氛圍絕佳，外籍創業者聚集'
      ],
      tips: '推薦點一杯 Dirty 咖啡，大口喝下享受冰熱奶香與濃縮咖啡的極致碰撞。'
    },
    '9': {
      name: 'Cú Trên Cây 樹洞貓頭鷹森林花園咖啡',
      address: '胡志明市平盛郡第十三坊恩加街262號',
      tags: ['綠意森林系', '閱讀小木屋', '貓頭鷹主題'],
      summary: '隱身在喧鬧城市中的鬱鬱蔥蔥綠色森林秘密花園，如宮崎駿動畫般的木屋與樹屋咖啡館。',
      vibe: '綠色植物蔓生、原木小木屋、潺潺水聲與微風吹拂，令人瞬間遠離塵囂，徹底放鬆心靈。',
      bestFor: ['放鬆放空 Chill', '安靜看書與沈思', '自然系打卡拍照'],
      fullAddress: '胡志明市平盛郡第十三坊恩加街262號',
      parkingInfo: '店旁設有專屬機車停車棚',
      hoursSummary: '每日 07:30 - 22:00',
      signatureDrinks: [
        { name: '熱帶青檸蜂蜜香草茶', price: 45000, reason: '天然森林野蜂蜜搭配新鮮檸檬與薄荷葉，清爽潤喉' },
        { name: '招牌黑糖珍珠鮮奶拿鐵', price: 52000, reason: '手炒黑糖蜜搭配在地小農鮮奶與濃縮咖啡，香氣濃郁' }
      ],
      workAndTech: {
        wifiSpeed: '80 Mbps',
        outletsAvailability: '木屋室內區域設有插座',
        idealQuietHours: '08:00 - 11:00',
        peakHours: '15:00 - 18:00',
        seatComfort: '天然木椅、藤編搖椅與吊床'
      },
      pros: [
        '綠植覆蓋率極高，空氣清新自然，微風涼爽',
        '安靜悠閒，非常適合閱讀與心靈放鬆',
        '木質裝潢極具童話故事感'
      ],
      tips: '建議噴抹少許防蚊液，選擇二樓木屋露台座位更涼爽。'
    },
    '10': {
      name: 'Cheese Coffee 歐風復古烘焙咖啡',
      address: '胡志明市第一郡范五老坊黎氏蓮街41號',
      tags: ['起司瑪奇朵', '歐陸復古裝潢', '打卡拍照名店'],
      summary: '以經典特調厚起司奶蓋茶與歐式復古法蘭西建築風格風靡全城的超人氣連鎖精品咖啡館。',
      vibe: '古典歐式深色實木、復古壁畫與暖調吊燈，散發低調優雅的巴黎街頭咖啡館情調。',
      bestFor: ['起司奶蓋茶愛好者', '聚會拍照打卡', '品嚐精緻法式甜點'],
      fullAddress: '胡志明市第一郡范五老坊黎氏蓮街41號',
      parkingInfo: '門口有專人代客停放機車',
      hoursSummary: '每日 07:00 - 22:30',
      signatureDrinks: [
        { name: '招牌起司瑪奇朵咖啡 (Cheese Coffee Macchiato)', price: 55000, reason: '厚達 2 公分的微鹹金黃起司奶蓋，搭配濃郁黑咖啡，絕妙平衡' },
        { name: '法式黑可可奶蓋茶 (Dark Choco Macchiato)', price: 58000, reason: '苦甜純黑可可融合起司慕斯，層次濃郁奢華' }
      ],
      workAndTech: {
        wifiSpeed: '110 Mbps',
        outletsAvailability: '二樓靠窗座位與長桌均備有插座',
        idealQuietHours: '07:30 - 09:30',
        peakHours: '13:30 - 16:30 及 19:00 - 21:30',
        seatComfort: '歐風皮質靠背椅與圓桌'
      },
      pros: [
        '起司奶蓋質地厚實綿密，全城公認頂級',
        '裝潢精美華麗，採光通透，拍照極度吸睛',
        '甜點與飲品選擇豐富多元'
      ],
      tips: '品嚐起司瑪奇朵時請直接就口大口飲用，不要用吸管，體驗奶蓋與咖啡交融的美味。'
    },
    '11': {
      name: '貓咪花園 咖啡 Cat Flower Garden',
      address: '台北市士林區福華路129號',
      tags: ['貓咪主題', '溫馨療癒', '寵物互動'],
      summary: '全球第一家貓咪咖啡館的傳奇始祖，店內有多隻溫馴可愛的貓咪與狗狗自由漫步，溫馨治癒。',
      vibe: '溫暖的木質地板、豐富的貓跳台與逗貓棒，充滿歡聲笑語與毛孩的療癒時光。',
      bestFor: ['毛孩互動療癒', '貓奴朝聖打卡', '家庭與好友聚會'],
      fullAddress: '台北市士林區福華路129號（近芝山捷運站）',
      parkingInfo: '捷運站旁設有收費停車場',
      hoursSummary: '週二至週日 12:00 - 21:00',
      signatureDrinks: [
        { name: '貓掌特調拿鐵 (Cat Paw Latte)', price: 65000, reason: '特製萌系立體立體貓掌奶泡，口感綿密香濃' }
      ]
    },
    '12': {
      name: '台北桌遊咖啡館 Taipei Board Game Lounge',
      address: '台北市大安區新生南路三段88號',
      tags: ['桌遊咖啡', '策略對戰', '好友聚會'],
      summary: '擁有超過 500 款世界正版桌上遊戲的專業桌遊咖啡廳，並有專業遊戲指導員教學。',
      vibe: '歡樂熱鬧的對戰氛圍，寬大的實木對戰桌與舒適座椅，適合團體派對。',
      bestFor: ['桌遊聚會派對', '破冰與團隊建設', '學生好友暢玩'],
      fullAddress: '台北市大安區新生南路三段88號2樓（台大公館商圈）',
      parkingInfo: '公館商圈周邊停車位',
      hoursSummary: '每日 13:00 - 22:30'
    },
    '13': {
      name: '猫カフェ モカ 新宿店 Cat Cafe Mocha',
      address: '東京都新宿區新宿3-31-5 新宿武藏野大樓5樓',
      tags: ['時尚貓咖', '新宿商圈', '極致療癒'],
      summary: '日本超人氣連鎖奢華貓咪咖啡館，擁有絕美的日式原木空間與眾多溫馴的純種貓咪。',
      vibe: '優雅精緻的木質設計、環形貓樹與大片落地窗，宛如童話中的貓咪樂園。',
      bestFor: ['新宿逛街歇腳', '與可愛貓咪互動', '安靜放鬆治癒'],
      fullAddress: '東京都新宿區新宿3-31-5 新宿武藏野大樓5樓',
      parkingInfo: '新宿周邊公共收費停車場',
      hoursSummary: '每日 10:00 - 20:00'
    },
    '14': {
      name: 'Kuro Cat 貓咪黑膠烘焙咖啡',
      address: '胡志明市第七郡新風坊新富街88號',
      tags: ['黑貓主題', '黑膠唱片', '現烤麵包'],
      summary: '結合可愛店貓、黑膠唱片溫暖樂音與每日現烤歐式酸種麵包的質感生活空間。',
      vibe: '柔和的燈光、復古黑膠唱機流淌出的 Lo-Fi 與 Jazz 音樂，黑貓在陽光下慵懶伸懶腰。',
      bestFor: ['黑膠音樂鑑賞', '品嚐手工烘焙麵包', '享受安靜午後時光'],
      fullAddress: '胡志明市第七郡新風坊新富街88號（富美興特區）',
      parkingInfo: '門前寬闊機車與汽車停車位',
      hoursSummary: '每日 08:00 - 21:30'
    }
  },
  'th': {
    '1': {
      name: 'The Workshop คาเฟ่กาแฟดริปพิเศษ',
      address: 'ชั้น 2, 27 ถนนโงดึ๊กเก้, เขต 1, โฮจิมินห์',
      tags: ['กาแฟสเปเชียลตี้', 'เงียบสงบ', 'สไตล์อินดัสเทรียล'],
      summary: 'ผู้บุกเบิกวงการกาแฟ Specialty แห่งแรกใจกลางเขต 1 โดดเด่นด้วยสถาปัตยกรรมอินดัสเทรียลเพดานสูง โต๊ะไม้ยาว และบาร์ดริปมาตรฐานระดับสากล',
      vibe: 'อิฐเปลือยวินเทจผสานโลหะทันสมัย แสงธรรมชาติส่องผ่านหน้าต่างโค้งขนาดใหญ่ เคล้าเสียงเพลงแจ๊สเพื่อสมาธิการทำงานสูงสุด',
      bestFor: ['ทำงานอย่างมีสมาธิและเขียนโค้ด', 'ประชุมพบปะพันธมิตร', 'ลิ้มลองกาแฟ Specialty ชั้นเลิศ'],
      fullAddress: 'ชั้น 2, 27 ถนนโงดึ๊กเก้, แขวงเบ๊นเหงะ, เขต 1, โฮจิมินห์',
      parkingInfo: 'ที่จอดรถมอเตอร์ไซค์ใต้ตึก (ฟรีและมีรปภ.ดูแลตลอด)',
      hoursSummary: '08:00 - 22:00 ทุกวัน (เปิดบริการทุกวันหยุดนักขัตฤกษ์)',
      signatureDrinks: [
        { name: 'ซิกเนเจอร์โคลด์บริว', price: 55000, reason: 'สกัดเย็น 24 ชม. จากเมล็ดอาราบิก้าดาลัด ให้กลิ่นผลไม้เมืองร้อนสดชื่นหวานธรรมชาติ' },
        { name: 'กาแฟดริป V60 เอธิโอเปีย', price: 68000, reason: 'โน้ตกลิ่นดอกมะลิและส้มเบอร์กามอตหอมละมุนตามมาตรฐานระดับโลก' }
      ],
      workAndTech: {
        wifiSpeed: '180 Mbps (อินเทอร์เน็ตความเร็วสูงเสถียร)',
        outletsAvailability: 'มีปลั๊กไฟรองรับ 95% ของทุกที่นั่งและโต๊ะยาว',
        idealQuietHours: '08:30 - 11:30 & 14:00 - 17:30',
        peakHours: '12:00 - 13:30 (ช่วงพักเที่ยง)',
        seatComfort: 'เก้าอี้เบาะนุ่มสบาย โต๊ะสูงถูกหลักสรีระเหมาะกับการทำงาน'
      },
      pros: [
        'เมล็ดกาแฟคั่วสดใหม่ บาริสต้าเชี่ยวชาญให้คำแนะนำอย่างอบอุ่น',
        'อินเทอร์เน็ตแรงมาก ประชุมวิดีโอคอลได้อย่างราบรื่น',
        'พื้นที่ชั้นสองโปร่งสบาย เงียบสงบจากเสียงรถบนท้องถนน'
      ],
      tips: 'แนะนำให้มาถึงก่อน 10:00 น. เพื่อเลือกที่นั่งริมหน้าต่างที่ได้รับแสงแดดสวยที่สุด'
    },
    '2': {
      name: 'Blanc. คาเฟ่สวนมินิมอลสีขาว',
      address: '158 ถนนไฮบาจุง, เขต 3, โฮจิมินห์',
      tags: ['มุมถ่ายรูปสวย', 'ขนมอบฝรั่งเศส', 'สวนกลางแจ้ง', 'ต้นไม้ร่มรื่น'],
      summary: 'พื้นที่คาเฟ่สวนสไตล์มินิมอลโทนสีขาวบริสุทธิ์ ผสมผสานสวนเมืองร้อนเขียวขจี บรรยากาศโรแมนติกและถ่ายรูปสวยเป็นพิเศษ',
      vibe: 'บรรยากาศเรียบหรูอบอุ่น กลิ่นขนมอบสดใหม่หอมกรุ่นทั่วห้องกระจกรับแสงแดดอ่อนๆ',
      bestFor: ['เดทสุดโรแมนติก', 'ถ่ายรูปเช็คอินมุมสวย', 'จิบน้ำชายามบ่ายพร้อมเบเกอรี่'],
      fullAddress: '158 ถนนไฮบาจุง, แขวงดากาว, เขต 3, โฮจิมินห์',
      parkingInfo: 'ลานจอดรถมอเตอร์ไซค์กว้างขวางมีหลังคาหน้าร้าน',
      hoursSummary: '07:00 - 22:30 ทุกวัน',
      signatureDrinks: [
        { name: 'ชาพีชส้มตะไคร้สด', price: 50000, reason: 'ชาดำสกัดเย็นผสมส้มหวานสด ตะไคร้ และชิ้นพีชกรอบหวานชื่นใจ' },
        { name: 'ครัวซองต์เนยฝรั่งเศสพรีเมียม', price: 40000, reason: 'กรอบนอกนุ่มฟู หอมเนยแท้ละมุนลิ้น' }
      ],
      workAndTech: {
        wifiSpeed: '100 Mbps',
        outletsAvailability: 'จัดวางตามโต๊ะติดผนังโซนในร่ม',
        idealQuietHours: '07:30 - 09:30 & 14:00 - 16:30',
        peakHours: '16:30 - 18:00 (ช่วงถ่ายรูปพระอาทิตย์ตก)',
        seatComfort: 'เก้าอี้หวายดีไซน์ศิลปะและโซฟานุ่ม'
      },
      pros: [
        'สวนร่มรื่นใต้ร่มไม้ แสงธรรมชาติถ่ายรูปสวยคมชัด',
        'ครัวซองต์และเค้กอบสดใหม่ทุกวัน รสชาติยอดเยี่ยม',
        'พนักงานน่ารัก อัธยาศัยดี ร้านสะอาดสะอ้าน'
      ],
      tips: 'ช่วงเวลา 15:30 - 17:00 น. แสงแดดจะเฉียงสวยที่สุด เหมาะกับการถ่ายภาพพอร์ตเทรต'
    },
    '3': {
      name: 'SOK - Space of K คาเฟ่เกมไซเบอร์พังก์',
      address: '45 ถนนเหงียนไทฮ็อก, เขต 1, โฮจิมินห์',
      tags: ['เกมคอนโซล PS5', 'ไซเบอร์พังก์', 'เปิดดึก 24/7', 'บอร์ดเกม'],
      summary: 'คอมมูนิตี้คาเฟ่แห่งอนาคต ผสมผสานเกมคอนโซล PS5 แสงไฟนีออนไซเบอร์พังก์ และเครื่องดื่มสูตรพิเศษ',
      vibe: 'แสงไฟนีออนล้ำสมัย เก้าอี้เกมมิ่งระดับมืออาชีพ และทีวี 4K จอยักษ์ เต็มไปด้วยพลังและความสนุก',
      bestFor: ['เล่นเกม PS5 กับเพื่อน', 'สังสรรค์ยามดึก', 'พักผ่อนคลายเครียด'],
      fullAddress: '45 ถนนเหงียนไทฮ็อก, เขต 1, โฮจิมินห์',
      parkingInfo: 'มีพนักงานดูแลที่จอดรถหน้าร้าน',
      hoursSummary: 'เปิดบริการตลอด 24 ชั่วโมง',
      signatureDrinks: [
        { name: 'นีออนโคลด์บริว (Neon Cold Brew)', price: 58000, reason: 'กาแฟสกัดเย็นผสมไซรัปส้มยูซุและน้ำแข็งเรืองแสง' },
        { name: 'มัทฉะไซเบอร์ชีส (Matcha Cyber Cheese)', price: 62000, reason: 'มัทฉะเข้มข้นท็อปด้วยครีมชีสหนานุ่ม' }
      ],
      workAndTech: {
        wifiSpeed: '250 Mbps (เน็ตเกมมิ่งไฟเบอร์ค่า Ping ต่ำ)',
        outletsAvailability: 'มีปลั๊กไฟและช่องชาร์จ Type-C ครบทุกโต๊ะ',
        idealQuietHours: '08:00 - 12:00',
        peakHours: '19:00 - 02:00 (ช่วงค่ำ)',
        seatComfort: 'เก้าอี้เกมมิ่งปรับระดับและโซฟาขนาดใหญ่'
      },
      pros: [
        'เกม PS5 อัปเดตใหม่ล่าสุดพร้อมจอยไร้สายพร้อมเล่น',
        'เปิด 24 ชม. สะดวกสำหรับสายนอนดึก',
        'เครื่องดื่มและของทานเล่นรสชาติอร่อยคุ้มราคา'
      ],
      tips: 'ช่วงวันหยุดสุดสัปดาห์แนะนำให้จองโต๊ะโซฟาใหญ่ล่วงหน้าผ่านแอป'
    },
    '4': {
      name: 'Là Việt คาเฟ่กาแฟดาลัดพรีเมียม',
      address: '19 ถนนตูซวง, เขต 3, โฮจิมินห์',
      tags: ['กาแฟดาลัดแท้', 'โต๊ะทำงานกว้าง', 'มินิมอลโปร่งสบาย'],
      summary: 'แบรนด์กาแฟชื่อดังจากดาลัด ถ่ายทอดศิลปะกาแฟจากฟาร์มสู่แก้ว ในบรรยากาศไม้และเหล็กสไตล์โรงคั่ว',
      vibe: 'เพดานสูงโปร่ง กลิ่นคั่วกาแฟหอมฟุ้ง โต๊ะไม้ยาวส่วนกลางกว้างขวาง เหมาะแก่การอ่านหนังสือและทำงาน',
      bestFor: ['นั่งทำงานยาวทั้งวัน', 'ดื่มด่ำกาแฟดาลัดแท้', 'อ่านหนังสือเงียบๆ'],
      fullAddress: '19 ถนนตูซวง, แขวง 7, เขต 3, โฮจิมินห์',
      parkingInfo: 'จอดรถมอเตอร์ไซค์ฟรีในบริเวณลานร้าน',
      hoursSummary: '07:00 - 22:00 ทุกวัน',
      signatureDrinks: [
        { name: 'กาแฟดริปดาลัดซิกเนเจอร์', price: 50000, reason: 'อาราบิก้าดาลัดคั่วกลาง กลิ่นผลไม้และคาราเมลหอมชื่นใจ' }
      ]
    },
    '5': {
      name: 'Okkio Caffe คาเฟ่อิฐแดงเรโทรสุดคลาสสิก',
      address: '120/1 ถนนเลอลอย, เขต 1, โฮจิมินห์',
      tags: ['อิฐแดงวินเทจ', 'เครื่องดื่มซิกเนเจอร์', 'บรรยากาศอบอุ่น'],
      summary: 'คาเฟ่อิฐแดงโทนอบอุ่นซ่อนตัวใจกลางเมือง ผสมผสานสถาปัตยกรรมยุคเก่าเข้ากับกาแฟ Specialty ชั้นเลิศ',
      vibe: 'เพดานโค้งอิฐแดง แสงไฟสีส้มสลัว เพลงแผ่นเสียงไพเราะ ให้ความรู้สึกโรแมนติกและเงียบสงบ',
      bestFor: ['เดทพูดคุย', 'อ่านหนังสือ', 'ลองกาแฟไข่สูตรพิเศษ'],
      fullAddress: '120/1 ถนนเลอลอย, แขวงเบ๊นถั่ญ, เขต 1, โฮจิมินห์',
      parkingInfo: 'มีที่จอดรถใกล้เคียง',
      hoursSummary: '07:30 - 22:00 ทุกวัน',
      signatureDrinks: [
        { name: 'กาแฟไข่สูตรพิเศษ (Egg Coffee)', price: 65000, reason: 'ฟองครีมไข่หวานมันเนียนนุ่มดุจขนมหวาน ผสานกาแฟดำเข้มข้น' }
      ]
    },
    '6': {
      name: 'Cộng Cà Phê กาแฟมะพร้าวสไตล์วินเทจเวียดนาม',
      address: 'ชั้น 1, 26 ถนนลีตึจ่อง, เขต 1, โฮจิมินห์',
      tags: ['กาแฟปั่นมะพร้าว', 'วินเทจยุคเก่า', 'กลิ่นอายประวัติศาสตร์'],
      summary: 'คาเฟ่สไตล์วินเทจที่เป็นเอกลักษณ์ของเวียดนาม โด่งดังระดับสากลด้วยเมนูกาแฟปั่นกะทิมะพร้าวในตำนาน',
      vibe: 'ผนังสีเขียวทหาร เฟอร์นิเจอร์ไม้เก่า เบาะผ้าลายดอกโบราณ ชวนย้อนรอยอดีต',
      bestFor: ['ลองกาแฟปั่นกะทิมะพร้าว', 'สัมผัสวัฒนธรรมเวียดนาม', 'พบปะพูดคุย'],
      fullAddress: 'ชั้น 1, 26 ถนนลีตึจ่อง, แขวงเบ๊นเหงะ, เขต 1, โฮจิมินห์',
      parkingInfo: 'ที่จอดรถด้านหน้าอาคาร',
      hoursSummary: '07:00 - 23:00 ทุกวัน',
      signatureDrinks: [
        { name: 'กาแฟปั่นกะทิมะพร้าว (Cốt Dừa Cà Phê)', price: 59000, reason: 'กะทิมะพร้าวปั่นเนื้อเนียนหอมมันตัดกับกาแฟดำเข้มข้น อร่อยลงตัว' }
      ]
    },
    '7': {
      name: 'Maison Marou คาเฟ่ช็อกโกแลตพรีเมียมคราฟต์',
      address: '167-169 ถนนคัลเมตต์, เขต 1, โฮจิมินห์',
      tags: ['ช็อกโกแลตคราฟต์', 'เบเกอรี่สดใหม่', 'เวิร์กช็อปช็อกโกแลต'],
      summary: 'โรงงานช็อกโกแลตคราฟต์ Bean-to-Bar ชื่อดังระดับโลกที่ได้รับการยกย่องโดย New York Times',
      vibe: 'โรงคั่วช็อกโกแลตแบบเปิด มองเห็นกรรมวิธีการผลิต พร้อมกลิ่นโกโก้หอมกรุ่นทั่วร้าน',
      bestFor: ['ลิ้มลองช็อกโกแลตร้อนเข้มข้น', 'ซื้อของฝากพรีเมียม', 'ชิมขนมหวานฝรั่งเศส'],
      fullAddress: '167-169 ถนนคัลเมตต์, เขต 1, โฮจิมินห์',
      parkingInfo: 'มีที่จอดรถหน้าร้านพร้อมเจ้าหน้าที่ดูแล',
      hoursSummary: '09:00 - 22:00 ทุกวัน',
      signatureDrinks: [
        { name: 'ช็อกโกแลตร้อนซิกเนเจอร์', price: 85000, reason: 'ปรุงจากดาร์กช็อกโกแลต 70% แท้ของเวียดนาม เข้มข้น นุ่มนวล ไร้ที่ติ' }
      ]
    },
    '8': {
      name: 'Rang Rang Coffee คาเฟ่มินิมอลล้ำสมัยเถาเดียน',
      address: '1 ถนนก๊วกเฮือง, เถาเดียน, เมืองทูดึ๊ก, โฮจิมินห์',
      tags: ['มินิมอลล้ำยุค', 'โคลด์บริวพรีเมียม', 'ชุมชนเอ็กซ์แพท'],
      summary: 'คาเฟ่มินิมอลดีไซน์ล้ำสมัยในย่านเถาเดียน โดดเด่นด้วยโทนสีเมทัลลิกและกาแฟดริประดับพรีเมียม',
      vibe: 'กระจกบานใหญ่ โลหะสีเงินสะอาดตา บรรยากาศเงียบสงบเป็นศูนย์รวมของเหล่าครีเอทีฟและชาวต่างชาติ',
      bestFor: ['ทำงานฟรีแลนซ์', 'ถ่ายรูปเช็คอินล้ำๆ', 'ดื่มด่ำกาแฟสกัดเย็น'],
      fullAddress: '1 ถนนก๊วกเฮือง, เถาเดียน, เมืองทูดึ๊ก, โฮจิมินห์',
      parkingInfo: 'ที่จอดรถชั้นใต้ดินกว้างขวาง',
      hoursSummary: '07:00 - 22:30 ทุกวัน',
      signatureDrinks: [
        { name: 'ไนโตรโคลด์บริว (Nitro Cold Brew)', price: 65000, reason: 'ฟองโฟมเนียนนุ่มคล้ายเบียร์ดำ รสชาตินุ่มละมุนสดชื่น' }
      ]
    },
    '9': {
      name: 'Cú Trên Cây คาเฟ่บ้านต้นไม้นกฮูกในป่าร่มรื่น',
      address: '262 ถนนอุงวันเคียม, เขตบินห์ถั่น, โฮจิมินห์',
      tags: ['สวนป่าธรรมชาติ', 'บ้านไม้อ่านหนังสือ', 'คาเฟ่นกฮูก'],
      summary: 'โอเอซิสสีเขียวกลางเมืองใหญ่ คาเฟ่บ้านต้นไม้ไม้เก่าที่ปกคลุมด้วยต้นไม้ร่มรื่นดั่งเทพนิยาย',
      vibe: 'ต้นไม้เขียวขจี ลมพัดเย็นสบาย เสียงน้ำไหลและบ้านไม้ ให้ความรู้สึกผ่อนคลายตัดขาดจากความวุ่นวาย',
      bestFor: ['นั่งพักผ่อนชิลๆ', 'อ่านหนังสือ', 'ถ่ายรูปฟีลธรรมชาติ'],
      fullAddress: '262 ถนนอุงวันเคียม, แขวง 25, เขตบินห์ถั่น, โฮจิมินห์',
      parkingInfo: 'มีที่จอดรถข้างร้าน',
      hoursSummary: '07:30 - 22:00 ทุกวัน',
      signatureDrinks: [
        { name: 'ชามะนาวน้ำผึ้งป่าสะระแหน่', price: 45000, reason: 'น้ำผึ้งป่าธรรมชาติหอมหวานผสานมะนาวสดและใบสะระแหน่' }
      ]
    },
    '10': {
      name: 'Cheese Coffee คาเฟ่สไตล์ยุโรปวินเทจ',
      address: '41 ถนนเลถิเรียง, เขต 1, โฮจิมินห์',
      tags: ['มัคคิอาโตชีส', 'สไตล์ยุโรปคลาสสิก', 'มุมถ่ายรูปยอดนิยม'],
      summary: 'คาเฟ่ยอดฮิตตกแต่งสไตล์ยุโรปวินเทจ โด่งดังด้วยเมนูมัคคิอาโตครีมชีสหนานุ่ม',
      vibe: 'ไม้สีเข้ม โคมไฟโทนอุ่น และภาพวาดคลาสสิก ให้บรรยากาศคาเฟ่สไตล์ปารีส',
      bestFor: ['คนรักครีมชีสโฟม', 'ถ่ายรูปเช็คอินสุดปัง', 'ทานเบเกอรี่แสนอร่อย'],
      fullAddress: '41 ถนนเลถิเรียง, แขวงฝั่มหงูเหลา, เขต 1, โฮจิมินห์',
      parkingInfo: 'มีบริการช่วยจอดรถหน้าร้าน',
      hoursSummary: '07:00 - 22:30 ทุกวัน',
      signatureDrinks: [
        { name: 'ชีสมัคคิอาโตคลาสสิก', price: 55000, reason: 'ครีมชีสรสเค็มนุ่มหนา 2 ซม. เข้ากันอย่างลงตัวกับกาแฟดำเข้มข้น' }
      ]
    },
    '11': {
      name: 'Cat Flower Garden คาเฟ่แมวดอกไม้ไทเป',
      address: '129 ถนนฟูฮัว, เขตซื่อหลิน, ไทเป',
      tags: ['คาเฟ่แมว', 'อบอุ่นผ่อนคลาย', 'เล่นกับน้องแมว'],
      summary: 'คาเฟ่แมวแห่งแรกของโลก มีน้องแมวและสุนัขแสนเชื่องคอยต้อนรับอย่างอบอุ่น',
      vibe: 'พื้นไม้ อุปกรณ์ของเล่นแมว บรรยากาศผ่อนคลายและน่ารัก',
      bestFor: ['เล่นกับน้องแมว', 'ทาสแมวเช็คอิน', 'ครอบครัวและเพื่อนฝูง'],
      fullAddress: '129 ถนนฟูฮัว, เขตซื่อหลิน, ไทเป (ใกล้ MRT Zhishan)',
      parkingInfo: 'ที่จอดรถใกล้สถานี MRT',
      hoursSummary: 'อังคาร - อาทิตย์ 12:00 - 21:00'
    },
    '12': {
      name: 'Taipei Board Game Lounge คาเฟ่บอร์ดเกมไทเป',
      address: '88 ถนนซินเซิงใต้, เขตต้าอัน, ไทเป',
      tags: ['บอร์ดเกม', 'เล่นเกมกับเพื่อน', 'ปาร์ตี้สนุกสนาน'],
      summary: 'คาเฟ่บอร์ดเกมที่มีเกมแท้มากกว่า 500 เกมพร้อมผู้สอนแนะนำวิธีการเล่น',
      vibe: 'โต๊ะเล่นเกมขนาดใหญ่ บรรยากาศสนุกสนานเฮฮา',
      bestFor: ['ปาร์ตี้บอร์ดเกม', 'สังสรรค์กลุ่มเพื่อน', 'กิจกรรมสานสัมพันธ์'],
      fullAddress: 'ชั้น 2, 88 ถนนซินเซิงใต้ ตอน 3, เขตต้าอัน, ไทเป',
      parkingInfo: 'ที่จอดรถบริเวณกงกวน',
      hoursSummary: '13:00 - 22:30 ทุกวัน'
    },
    '13': {
      name: 'Cat Cafe Mocha คาเฟ่แมวโมกะ ชินจูกุ โตเกียว',
      address: 'ชั้น 5 ตึกมูซาชิโนะ, 3-31-5 ชินจูกุ, โตเกียว',
      tags: ['คาเฟ่แมวหรู', 'ย่านชินจูกุ', 'ผ่อนคลายจิตใจ'],
      summary: 'คาเฟ่แมวสไตล์ญี่ปุ่นสุดหรูใจกลางชินจูกุ มีต้นไม้ไม้และน้องแมวน่ารักมากมาย',
      vibe: 'ดีไซน์ไม้สวยงาม ผ่อนคลาย สะอาดและเงียบสงบ',
      bestFor: ['แวะพักช้อปปิ้ง', 'เล่นกับน้องแมวน่ารัก', 'พักผ่อนอย่างเงียบสงบ'],
      fullAddress: 'ชั้น 5 ตึกมูซาชิโนะ, 3-31-5 ชินจูกุ, โตเกียว',
      parkingInfo: 'ที่จอดรถสาธารณะรอบชินจูกุ',
      hoursSummary: '10:00 - 20:00 ทุกวัน'
    },
    '14': {
      name: 'Kuro Cat คาเฟ่แมวดำและเบเกอรี่อบสด',
      address: '88 ถนนตันฟู, ตันฟอง, เขต 7, โฮจิมินห์',
      tags: ['คาเฟ่แมวดำ', 'แผ่นเสียงคลาสสิก', 'เบเกอรี่โฮมเมด'],
      summary: 'คาเฟ่บรรยากาศอบอุ่นที่รวมน้องแมวดำ เสียงเพลงแผ่นเสียงไพเราะ และขนมปังอบสดใหม่ทุกวัน',
      vibe: 'แสงไฟสลัว เพลงแจ๊สจากเครื่องเล่นแผ่นเสียง และน้องแมวอารมณ์ดี',
      bestFor: ['ฟังเพลงแผ่นเสียง', 'ทานขนมปังอบสด', 'พักผ่อนยามบ่าย'],
      fullAddress: '88 ถนนตันฟู, ตันฟอง, เขต 7, โฮจิมินห์',
      parkingInfo: 'ที่จอดรถสะดวกสบายหน้าร้าน',
      hoursSummary: '08:00 - 21:30 ทุกวัน'
    }
  },
  'en': {
    '1': {
      name: 'The Workshop Specialty Coffee',
      address: '2nd Fl, 27 Ngo Duc Ke, Ben Nghe, District 1, HCMC',
      tags: ['Specialty Coffee', 'Quiet & Focused', 'Industrial Vibe'],
      summary: 'Pioneering specialty coffee roastery in District 1 featuring industrial loft aesthetics, communal timber tables, and world-class manual brew bar.',
      vibe: 'Exposed brick, sleek metal accents, arched windows with natural sunlight, and mellow jazz for deep productivity.',
      bestFor: ['Deep Work & Remote Coding', 'Business Meetings', 'Artisanal Pour-Overs'],
      fullAddress: '2nd Fl, 27 Ngo Duc Ke, Ben Nghe Ward, District 1, HCMC',
      parkingInfo: 'Ground floor motorbike parking (Free with 24/7 security guard)',
      hoursSummary: '08:00 - 22:00 Daily (Open all public holidays)',
      signatureDrinks: [
        { name: 'Signature Cold Brew', price: 55000, reason: '24-hour steep of Da Lat Arabica beans with refreshing tropical fruit notes and natural sweetness.' },
        { name: 'Ethiopia Pour-Over V60', price: 68000, reason: 'Delicate jasmine floral aroma with crisp bergamot finish matching global cup standards.' }
      ],
      workAndTech: {
        wifiSpeed: '180 Mbps (Stable high-speed international bandwidth)',
        outletsAvailability: 'Available at 95% of seating & communal worktables',
        idealQuietHours: '08:30 - 11:30 & 14:00 - 17:30',
        peakHours: '12:00 - 13:30 (Lunch peak)',
        seatComfort: 'Ergonomic padded chairs with optimal desk height'
      },
      pros: [
        'Freshly roasted single-origin beans and passionate, knowledgeable baristas',
        'Blazing-fast internet speed ideal for smooth HD video conferences',
        'Airy upper-floor layout peacefully sheltered from street traffic noise'
      ],
      tips: 'Arrive before 10:00 AM to secure prime natural daylight seating by the arched windows.'
    },
    '2': {
      name: 'Blanc. Minimalist Garden Cafe',
      address: '158 Hai Ba Trung, Ward 6, District 3, HCMC',
      tags: ['Aesthetic Spot', 'Artisan Pastry', 'Outdoor Patio', 'Lush Greenery'],
      summary: 'Serene all-white minimalist glasshouse cafe nestled inside a lush tropical garden, renowned for aesthetic photography and afternoon tea.',
      vibe: 'Bright, airy white aesthetic filled with freshly baked croissant aromas and soft sunlight.',
      bestFor: ['Romantic Dates', 'Aesthetic Photo Check-ins', 'Afternoon Pastry & Tea'],
      fullAddress: '158 Hai Ba Trung, Da Kao, District 3, HCMC',
      parkingInfo: 'Spacious sheltered motorbike parking right in front',
      hoursSummary: '07:00 - 22:30 Daily',
      signatureDrinks: [
        { name: 'Premium Peach Orange Lemongrass Tea', price: 50000, reason: 'Cold-steeped black tea with crunchy peach slices and fresh sweet orange.' },
        { name: 'Warm French Butter Croissant', price: 40000, reason: 'Flaky golden crust with thousands of buttery, airy layers inside.' }
      ],
      workAndTech: {
        wifiSpeed: '100 Mbps',
        outletsAvailability: 'Placed along wall seating in the indoor section',
        idealQuietHours: '07:30 - 09:30 & 14:00 - 16:30',
        peakHours: '16:30 - 18:00 (Sunset golden hour)',
        seatComfort: 'Rattan chairs and comfortable sofas'
      },
      pros: [
        'Shaded garden with lush plants and great natural photography lighting',
        'Freshly baked daily artisanal French croissants and pastries',
        'Attentive, friendly staff and immaculate cleanliness'
      ],
      tips: 'Visit between 15:30 and 17:00 for the softest natural golden-hour photography lighting.'
    },
    '3': {
      name: 'SOK - Space of K Cyberpunk Gaming Cafe',
      address: '45 Nguyen Thai Hoc, Cau Ong Lanh, District 1, HCMC',
      tags: ['Console Gaming', 'Cyberpunk Vibe', 'Late Night', 'Board Games'],
      summary: 'Next-gen gaming lounge and cyberpunk coffee bar equipped with PS5 consoles, 4K displays, and craft energy drinks.',
      vibe: 'Cyberpunk neon lighting, ergonomic gaming chairs, and massive 4K gaming screens buzzing with friendly energy.',
      bestFor: ['Console Gaming Battles', 'Late Night Hangouts', 'Social Group Fun'],
      fullAddress: '45 Nguyen Thai Hoc, Cau Ong Lanh, District 1, HCMC',
      parkingInfo: 'Attendant parking in front',
      hoursSummary: 'Open 24/7 All Day & Night',
      signatureDrinks: [
        { name: 'Neon Cyber Cold Brew', price: 58000, reason: 'Energizing citrus cold brew served with glowing LED ice cube' },
        { name: 'Matcha Cyber Cheese', price: 62000, reason: 'Rich ceremonial matcha topped with thick creamy cheese mousse' }
      ],
      workAndTech: {
        wifiSpeed: '250 Mbps (Ultra-low ping gaming fiber optic)',
        outletsAvailability: 'Equipped with fast chargers and USB-C at all stations',
        idealQuietHours: '08:00 - 12:00',
        peakHours: '19:00 - 02:00 (Night owl rush)',
        seatComfort: 'Adjustable gaming chairs and large plush sofas'
      },
      pros: [
        'Latest PS5 game catalog and dual controllers ready to play',
        '24/7 service convenient for late-night coffee and gaming',
        'Quality drinks and snacks at reasonable prices'
      ],
      tips: 'Book large sofa screens in advance via the app for weekend game nights.'
    },
    '4': {
      name: 'Là Việt Specialty Coffee Saigon',
      address: '19 Tu Xuong, Ward 7, District 3, HCMC',
      tags: ['Da Lat Arabica', 'Co-working Tables', 'Minimalist Roast'],
      summary: 'Iconic coffee roaster from Da Lat celebrating farm-to-cup coffee culture in an expansive wood-and-steel industrial space.',
      vibe: 'High ceilings, rich coffee roastery aromas, and expansive communal timber desks tailored for readers and remote workers.',
      bestFor: ['All-Day Laptop Working', 'Authentic Da Lat Coffee', 'Quiet Reading'],
      fullAddress: '19 Tu Xuong, Vo Thi Sau, District 3, HCMC',
      parkingInfo: 'Free motorbike parking in the front courtyard',
      hoursSummary: '07:00 - 22:00 Daily',
      signatureDrinks: [
        { name: 'Da Lat Pour-Over Single Origin', price: 50000, reason: 'Medium roast Da Lat Arabica with bright acidity and smooth caramel finish.' }
      ]
    },
    '5': {
      name: 'Okkio Caffe - Le Loi Vintage',
      address: '120/1 Le Loi, Ben Thanh, District 1, HCMC',
      tags: ['Retro Red Brick', 'Signature Brew', 'Romantic & Warm'],
      summary: 'Cozy red-brick retro sanctuary hidden down a quiet alleyway in the heart of Saigon, pairing vintage nostalgia with specialty brews.',
      vibe: 'Curved exposed brick arches, warm amber filament lighting, and vinyl tunes creating an intimate romantic atmosphere.',
      bestFor: ['Romantic Dates', 'Intimate Conversations', 'Signature Egg Coffee'],
      fullAddress: '120/1 Le Loi, Ben Thanh Ward, District 1, HCMC',
      parkingInfo: 'Nearby public parking',
      hoursSummary: '07:30 - 22:00 Daily',
      signatureDrinks: [
        { name: 'Signature Egg Coffee', price: 65000, reason: 'Decadently whipped egg yolk custard foam layered over rich Vietnamese dark brew.' }
      ]
    },
    '6': {
      name: 'Cong Caphe - Ly Tu Trong Vintage',
      address: '1st Fl, 26 Ly Tu Trong, Ben Nghe, District 1, HCMC',
      tags: ['Coconut Coffee', 'Retro Military Vibe', 'Iconic Heritage'],
      summary: 'Iconic Vietnamese retro cafe known internationally for its famous frozen coconut milk coffee and vintage military decor.',
      vibe: 'Army green walls, antique wood window frames, vintage books, and floral patterned cushions evoking 1980s nostalgia.',
      bestFor: ['Iconic Coconut Coffee', 'Cultural Heritage Vibe', 'Socializing with Friends'],
      fullAddress: '1st Fl, 26 Ly Tu Trong, Ben Nghe, District 1, HCMC',
      parkingInfo: 'Motorbike parking at building entrance',
      hoursSummary: '07:00 - 23:00 Daily',
      signatureDrinks: [
        { name: 'Signature Coconut Coffee Slush (Cốt Dừa Cà Phê)', price: 59000, reason: 'Creamy blended coconut slush poured over bold Vietnamese espresso.' }
      ]
    },
    '7': {
      name: 'Maison Marou Artisanal Chocolate & Cafe',
      address: '167-169 Calmette, Nguyen Thai Binh, District 1, HCMC',
      tags: ['Artisan Chocolate', 'Live Roastery', 'Gourmet Pastries'],
      summary: 'World-renowned Vietnamese Bean-to-Bar chocolate factory and cafe hailed by The New York Times.',
      vibe: 'Open view roastery where you can watch cocoa beans being roasted and ground amidst intoxicating chocolate aromas.',
      bestFor: ['Rich Artisanal Hot Chocolate', 'Luxury Chocolate Gifts', 'French Pastries'],
      fullAddress: '167-169 Calmette, Nguyen Thai Binh, District 1, HCMC',
      parkingInfo: 'Attendant parking in front',
      hoursSummary: '09:00 - 22:00 Daily',
      signatureDrinks: [
        { name: 'Signature Marou Hot Chocolate', price: 85000, reason: 'Melted 70% single-origin dark Vietnamese chocolate whisked to silky perfection.' }
      ]
    },
    '8': {
      name: 'Rang Rang Coffee - Thao Dien Modern',
      address: '1 Quoc Huong, Thao Dien, Thu Duc City, HCMC',
      tags: ['Futuristic Minimalist', 'Craft Cold Brew', 'Expat Hub'],
      summary: 'Futuristic minimalist sanctuary in trendy Thao Dien, featuring clean metallic architecture and premium specialty brews.',
      vibe: 'Floor-to-ceiling glass, sleek silver steel lines, and minimalist calm popular among international digital nomads.',
      bestFor: ['Remote Laptop Work', 'Modern Aesthetic Photos', 'Specialty Cold Brews'],
      fullAddress: '1 Quoc Huong, Thao Dien, Thu Duc City, HCMC',
      parkingInfo: 'Spacious basement parking',
      hoursSummary: '07:00 - 22:30 Daily',
      signatureDrinks: [
        { name: 'Nitro Cold Brew', price: 65000, reason: 'Infused with micro-nitrogen bubbles for a velvety stout-like crema.' }
      ]
    },
    '9': {
      name: 'Tree Owl Forest & Nature Cafe',
      address: '262 Ung Van Khiem, Ward 25, Binh Thanh, HCMC',
      tags: ['Lush Nature Garden', 'Wooden Book Haven', 'Owl Sanctuary Vibe'],
      summary: 'Lush green urban oasis and treehouse cafe brimming with tropical plants, cozy wooden reading nooks, and nature vibes.',
      vibe: 'Cascading vines, rustic timber huts, trickling water, and refreshing breezes offering complete escape from city noise.',
      bestFor: ['Relaxing & Chilling', 'Quiet Reading', 'Nature Photography'],
      fullAddress: '262 Ung Van Khiem, Ward 25, Binh Thanh, HCMC',
      parkingInfo: 'Dedicated motorbike shelter beside shop',
      hoursSummary: '07:30 - 22:00 Daily',
      signatureDrinks: [
        { name: 'Tropical Lime Wild Honey Mint Tea', price: 45000, reason: 'Pure forest honey brewed with fresh lime and aromatic mint leaves.' }
      ]
    },
    '10': {
      name: 'Cheese Coffee - Le Thi Rieng European Vintage',
      address: '41 Le Thi Rieng, Pham Ngu Lao, District 1, HCMC',
      tags: ['Cheese Macchiato', 'European Vintage', 'Trending Check-in'],
      summary: 'Beloved European vintage cafe renowned citywide for its signature thick salted cheese macchiato foam drinks.',
      vibe: 'Classic dark timber, vintage Parisian murals, and warm chandelier lighting.',
      bestFor: ['Cheese Foam Lovers', 'Aesthetic Photography', 'Delicious Desserts'],
      fullAddress: '41 Le Thi Rieng, Pham Ngu Lao Ward, District 1, HCMC',
      parkingInfo: 'Attendant parking assistance in front',
      hoursSummary: '07:00 - 22:30 Daily',
      signatureDrinks: [
        { name: 'Signature Cheese Coffee Macchiato', price: 55000, reason: 'Thick 2cm velvety savory cheese foam layered over bold dark coffee.' }
      ]
    },
    '11': {
      name: 'Cat Flower Garden Cafe Taipei',
      address: '129 Fuhua Rd, Shilin District, Taipei',
      tags: ['Cat Cafe', 'Cozy & Healing', 'Pet Interaction'],
      summary: 'The legendary world’s first cat cafe, home to gentle friendly cats and dogs in a cozy welcoming atmosphere.',
      vibe: 'Warm wooden floors, playful cat scratching posts, and heartwarming pet interactions.',
      bestFor: ['Cat Healing Time', 'Cat Lovers Check-in', 'Family & Friends Gathering'],
      fullAddress: '129 Fuhua Rd, Shilin District, Taipei (Near MRT Zhishan)',
      parkingInfo: 'Paid parking near MRT station',
      hoursSummary: 'Tue - Sun 12:00 - 21:00'
    },
    '12': {
      name: 'Taipei Board Game Lounge',
      address: '88 Xinsheng S Rd Sec 3, Daan District, Taipei',
      tags: ['Board Games', 'Strategy Battles', 'Group Parties'],
      summary: 'Specialty tabletop cafe stocking over 500 original board games with friendly in-house game masters.',
      vibe: 'Lively group battles, spacious solid wood tables, and joyful party ambiance.',
      bestFor: ['Board Game Gatherings', 'Icebreakers & Team Building', 'Friends Hangout'],
      fullAddress: '2nd Fl, 88 Xinsheng S Rd Sec 3, Daan District, Taipei',
      parkingInfo: 'Gongguan commercial district parking',
      hoursSummary: '13:00 - 22:30 Daily'
    },
    '13': {
      name: 'Cat Cafe Mocha Shinjuku Tokyo',
      address: '5F Shinjuku Musashino Bldg, 3-31-5 Shinjuku, Tokyo',
      tags: ['Luxury Cat Cafe', 'Shinjuku Center', 'Deep Healing'],
      summary: 'Renowned luxury Japanese cat lounge featuring magnificent circular wooden treehouses and friendly purebred cats.',
      vibe: 'Exquisite wooden interior, panoramic windows, and serene fairytale atmosphere.',
      bestFor: ['Shopping Break', 'Cute Pet Therapy', 'Quiet Relaxation'],
      fullAddress: '5F Musashino Bldg, 3-31-5 Shinjuku, Tokyo',
      parkingInfo: 'Public paid parking nearby',
      hoursSummary: '10:00 - 20:00 Daily'
    },
    '14': {
      name: 'Kuro Cat Coffee Lounge & Bakery',
      address: '88 Tan Phu, Tan Phong, District 7, HCMC',
      tags: ['Black Cat Lounge', 'Vinyl Records', 'Artisan Bakery'],
      summary: 'Warm aesthetic lounge pairing friendly resident cats, soothing vintage vinyl records, and freshly baked artisanal sourdough pastries.',
      vibe: 'Soft ambient lighting, gentle Lo-Fi and Jazz vinyl melodies, and peaceful afternoon sun.',
      bestFor: ['Vinyl Music Listening', 'Artisanal Breads', 'Peaceful Afternoon Relaxation'],
      fullAddress: '88 Tan Phu, Tan Phong Ward, District 7, HCMC',
      parkingInfo: 'Spacious parking right in front',
      hoursSummary: '08:00 - 21:30 Daily'
    }
  },
  'vi': {
    '1': {
      name: 'The Workshop Coffee',
      address: '27 Ngô Đức Kế, Bến Nghé, Quận 1, TP.HCM',
      tags: ['Cà phê đặc sản', 'Yên tĩnh', 'Công nghiệp'],
      summary: 'Quán cà phê tiên phong phong cách Specialty Coffee tại trung tâm Quận 1 với kiến trúc Industrial trần cao, bàn gỗ dài mộc mạc và quầy Bar Pour-over đẳng cấp.',
      vibe: 'Không gian gạch trần vintage & kim loại hiện đại, ngập tràn ánh sáng tự nhiên từ cửa sổ vòm lớn, nhạc Jazz nhẹ tạo sự tập trung tối đa.',
      bestFor: ['Làm việc sâu & Remote Coding', 'Gặp gỡ đối tác quốc tế', 'Thưởng thức Specialty Coffee'],
      fullAddress: 'Lầu 2, 27 Ngô Đức Kế, Bến Nghé, Quận 1, TP. Hồ Chí Minh',
      parkingInfo: 'Gửi xe máy dưới sảnh toà nhà (Miễn phí có bảo vệ)',
      hoursSummary: '08:00 - 22:00 hàng ngày (Mở cửa tất cả ngày lễ)'
    },
    '2': {
      name: 'Blanc. Cafe',
      address: '158 Hai Bà Trưng, Phường 6, Quận 3, TP.HCM',
      tags: ['Thẩm mỹ', 'Bánh ngọt', 'Ngoài trời', 'Cây xanh'],
      summary: 'Không gian cà phê sân vườn phong cách Minimalist tông trắng tinh khôi kết hợp vườn cây nhiệt đới xanh mát, cực kỳ lãng mạn và ăn ảnh.',
      vibe: 'Bầu không khí thanh lịch dịu nhẹ, mùi bánh mới nướng thơm phức lan tỏa khắp gian phòng kính đón nắng dịu mát.',
      bestFor: ['Hẹn hò lãng mạn', 'Chụp ảnh Check-in thẩm mỹ', 'Thưởng thức trà chiều & bánh ngọt'],
      fullAddress: '158 Hai Bà Trưng, Phường Đa Kao, Quận 3, TP. Hồ Chí Minh',
      parkingInfo: 'Bãi giữ xe máy rộng rãi ngay trước quán có mái che',
      hoursSummary: '07:00 - 22:30 mỗi ngày'
    },
    '3': {
      name: 'SOK - Space of K',
      address: '45 Nguyễn Thái Học, Cầu Ông Lãnh, Quận 1, TP.HCM',
      tags: ['Chơi game PS5', 'Cyberpunk', 'Cú đêm', 'Board Game'],
      summary: 'Không gian giải trí thế hệ mới kết hợp máy chơi game console PS5, phong cách ánh sáng Cyberpunk hiện đại và menu nước pha chế đặc sắc.',
      vibe: 'Ánh sáng neon chuyển màu huyền ảo, ghế gaming cao cấp và màn hình 4K siêu lớn, năng động và tràn đầy năng lượng.',
      bestFor: ['Trải nghiệm game PS5', 'Tụ tập cú đêm', 'Giải trí nhóm bạn'],
      fullAddress: '45 Nguyễn Thái Học, Cầu Ông Lãnh, Quận 1, TP. Hồ Chí Minh',
      parkingInfo: 'Bãi đỗ xe máy trước cửa có nhân viên hỗ trợ dắt xe',
      hoursSummary: 'Mở cửa 24/7 xuyên đêm'
    },
    '4': {
      name: 'Là Việt Coffee Saigon',
      address: '19 Tú Xương, Phường Võ Thị Sáu, Quận 3, TP.HCM',
      tags: ['Cà phê Đà Lạt', 'Bàn làm việc lớn', 'Tối giản mộc'],
      summary: 'Thương hiệu cà phê danh tiếng từ Đà Lạt mang đến trải nghiệm cà phê rang xay thủ công nguyên bản trong không gian xưởng mộc thoáng đãng.',
      vibe: 'Trần cao thoáng đãng, hương cà phê mới rang ngập tràn, bàn dài làm việc rộng rãi lý tưởng để đọc sách và làm việc.',
      bestFor: ['Làm việc cả ngày', 'Thưởng thức cà phê Đà Lạt', 'Đọc sách yên tĩnh'],
      fullAddress: '19 Tú Xương, Phường Võ Thị Sáu, Quận 3, TP. Hồ Chí Minh',
      parkingInfo: 'Gửi xe máy miễn phí trong sân',
      hoursSummary: '07:00 - 22:00 hàng ngày'
    },
    '5': {
      name: 'Okkio Caffe - Lê Lợi',
      address: '120/1 Lê Lợi, Bến Thành, Quận 1, TP.HCM',
      tags: ['Retro gạch đỏ', 'Signature Brew', 'Ấm cúng'],
      summary: 'Quán cà phê gạch đỏ ấm cúng ẩn mình trong con hẻm nhỏ trung tâm, hòa quyện nét cổ điển với cà phê đặc sản.',
      vibe: 'Vòm gạch nung cổ điển, ánh đèn vàng ấm áp và âm nhạc đĩa than nhẹ nhàng lãng mạn.',
      bestFor: ['Hẹn hò trò chuyện', 'Đọc sách thư giãn', 'Thưởng thức cà phê trứng'],
      fullAddress: '120/1 Lê Lợi, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh',
      parkingInfo: 'Gửi xe tại bãi gửi xe gần đó',
      hoursSummary: '07:30 - 22:00 hàng ngày'
    },
    '6': {
      name: 'Cộng Cà Phê - Lý Tự Trọng',
      address: 'Lầu 1, 26 Lý Tự Trọng, Bến Nghé, Quận 1, TP.HCM',
      tags: ['Cà phê cốt dừa', 'Bao cấp hoài niệm', 'Di sản văn hóa'],
      summary: 'Quán cà phê mang đậm dấu ấn thời bao cấp hoài niệm, nổi tiếng quốc tế với món cà phê cốt dừa huyền thoại.',
      vibe: 'Tông màu xanh quân đội, bàn ghế gỗ mộc, rèm hoa chăn con công và những kỷ vật thời xưa.',
      bestFor: ['Thưởng thức cà phê cốt dừa', 'Trải nghiệm văn hóa Việt Nam', 'Gặp gỡ bạn bè'],
      fullAddress: 'Lầu 1, 26 Lý Tự Trọng, Bến Nghé, Quận 1, TP. Hồ Chí Minh',
      parkingInfo: 'Gửi xe trước sảnh toà nhà',
      hoursSummary: '07:00 - 23:00 hàng ngày'
    },
    '7': {
      name: 'Maison Marou Flagship Cafe',
      address: '167-169 Calmette, Nguyễn Thái Bình, Quận 1, TP.HCM',
      tags: ['Chocolate thủ công', 'Xưởng rang xay', 'Bánh Pháp cao cấp'],
      summary: 'Không gian xưởng chocolate thủ công nổi tiếng thế giới được vinh danh bởi The New York Times.',
      vibe: 'Xưởng mở ngắm nhìn quy trình làm chocolate trực tiếp, ngập tràn hương thơm cacao hảo hạng.',
      bestFor: ['Thưởng thức chocolate nóng đậm đặc', 'Mua quà tặng cao cấp', 'Thưởng thức bánh ngọt Pháp'],
      fullAddress: '167-169 Calmette, Nguyễn Thái Bình, Quận 1, TP. Hồ Chí Minh',
      parkingInfo: 'Có nhân viên trông xe máy trước quán',
      hoursSummary: '09:00 - 22:00 hàng ngày'
    },
    '8': {
      name: 'Rang Rang Coffee - Thảo Điền',
      address: 'Số 1 Quốc Hương, Thảo Điền, TP. Thủ Đức, TP.HCM',
      tags: ['Tối giản tương lai', 'Cold Brew chuẩn vị', 'Khu Thảo Điền'],
      summary: 'Quán cà phê phong cách tối giản tương lai với tông màu kim loại sang trọng tại trung tâm Thảo Điền.',
      vibe: 'Cửa kính lớn, kim loại sáng bóng và không gian thoáng đãng được giới chuyên gia và người nước ngoài yêu thích.',
      bestFor: ['Làm việc tự do', 'Chụp ảnh phong cách hiện đại', 'Cà phê Cold Brew'],
      fullAddress: 'Số 1 Quốc Hương, Thảo Điền, TP. Thủ Đức, TP. Hồ Chí Minh',
      parkingInfo: 'Bãi gửi xe rộng rãi dưới tầng hầm',
      hoursSummary: '07:00 - 22:30 hàng ngày'
    },
    '9': {
      name: 'Cú Trên Cây Coffee (Tree Owl Cafe)',
      address: '262 Ung Văn Khiêm, Phường 25, Bình Thạnh, TP.HCM',
      tags: ['Cây xanh nhiệt đới', 'Đọc sách yên tĩnh', 'Chủ đề Cú'],
      summary: 'Ốc đảo xanh mướt giữa lòng thành phố với ngôi nhà gỗ trên cây ngập tràn cây xanh như trong truyện cổ tích.',
      vibe: 'Cây cối rợp bóng, nhà gỗ mộc mạc, tiếng nước chảy và gió mát giúp xua tan mọi mệt mỏi.',
      bestFor: ['Nghỉ ngơi thư giãn', 'Đọc sách tĩnh tâm', 'Chụp ảnh thiên nhiên'],
      fullAddress: '262 Ung Văn Khiêm, Phường 25, Bình Thạnh, TP. Hồ Chí Minh',
      parkingInfo: 'Bãi đỗ xe máy riêng cạnh quán',
      hoursSummary: '07:30 - 22:00 hàng ngày'
    },
    '10': {
      name: 'Cheese Coffee - Lê Thị Riêng',
      address: '41 Lê Thị Riêng, Phạm Ngũ Lão, Quận 1, TP.HCM',
      tags: ['Cheese Macchiato', 'Phong cách Châu Âu', 'Check-in Hot'],
      summary: 'Chuỗi cà phê phong cách Châu Âu cổ điển nổi tiếng với lớp váng sữa phô mai béo ngậy đặc trưng.',
      vibe: 'Gỗ tối màu sang trọng, tranh tường cổ điển và đèn chùm ấm cúng theo phong cách quán cafe Paris.',
      bestFor: ['Tín đồ trà sữa váng phô mai', 'Chụp ảnh check-in', 'Thưởng thức bánh ngọt'],
      fullAddress: '41 Lê Thị Riêng, Phường Phạm Ngũ Lão, Quận 1, TP. Hồ Chí Minh',
      parkingInfo: 'Có nhân viên hỗ trợ gửi xe trước cửa',
      hoursSummary: '07:00 - 22:30 hàng ngày'
    },
    '11': {
      name: 'Cat Flower Garden Cafe Đài Bắc',
      address: '129 Đường Fuhua, Quận Sỹ Lâm, Đài Bắc',
      tags: ['Cafe Mèo', 'Ấm cúng chữa lành', 'Tương tác thú cưng'],
      summary: 'Quán cafe mèo đầu tiên trên thế giới với nhiều chú mèo và cún thân thiện, không gian ấm cúng.',
      vibe: 'Sàn gỗ ấm áp, nhiều trụ cào móng và đồ chơi cho mèo, bầu không khí chữa lành.',
      bestFor: ['Chơi với mèo', 'Check-in quán mèo', 'Gặp gỡ bạn bè'],
      fullAddress: '129 Fuhua Rd, Shilin District, Taipei',
      parkingInfo: 'Gửi xe cạnh ga tàu điện ngầm',
      hoursSummary: 'Thứ 3 - Chủ nhật 12:00 - 21:00'
    },
    '12': {
      name: 'Taipei Board Game Lounge',
      address: '88 Đường Xinsheng Nam Đoạn 3, Quận Đại An, Đài Bắc',
      tags: ['Cafe Board Game', 'Trò chơi chiến thuật', 'Tụ tập bạn bè'],
      summary: 'Quán cafe board game chuyên nghiệp với hơn 500 trò chơi bản quyền và quản trò hướng dẫn luật chơi.',
      vibe: 'Bàn chơi lớn bằng gỗ chắc chắn, không khí sôi nổi hào hứng.',
      bestFor: ['Chơi board game theo nhóm', 'Gắn kết bạn bè', 'Giải trí cuối tuần'],
      fullAddress: 'Lầu 2, 88 Xinsheng S Rd Sec 3, Daan District, Taipei',
      parkingInfo: 'Bãi gửi xe khu Công Quán',
      hoursSummary: '13:00 - 22:30 hàng ngày'
    },
    '13': {
      name: 'Cat Cafe Mocha Shinjuku Tokyo',
      address: 'Tầng 5 Tòa Musashino, 3-31-5 Shinjuku, Tokyo',
      tags: ['Cafe Mèo sang trọng', 'Trung tâm Shinjuku', 'Thư giãn tuyệt đối'],
      summary: 'Quán cafe mèo phong cách Nhật Bản cao cấp với kiến trúc gỗ tuyệt đẹp và nhiều chú mèo thuần chủng.',
      vibe: 'Nội thất gỗ tinh tế, cửa sổ lớn ngắm phố và không gian thanh tịnh.',
      bestFor: ['Nghỉ ngơi khi đi mua sắm', 'Chơi cùng các bé mèo', 'Thư giãn yên tĩnh'],
      fullAddress: 'Tầng 5 Tòa Musashino, 3-31-5 Shinjuku, Tokyo',
      parkingInfo: 'Bãi đỗ xe công cộng xung quanh Shinjuku',
      hoursSummary: '10:00 - 20:00 hàng ngày'
    },
    '14': {
      name: 'Kuro Cat Coffee Lounge & Bakery',
      address: '88 Tân Phú, Phường Tân Phong, Quận 7, TP.HCM',
      tags: ['Cafe mèo đen', 'Đĩa than cổ điển', 'Bánh mì nướng tươi'],
      summary: 'Không gian ấm cúng kết hợp mèo đen đáng yêu, âm nhạc đĩa than êm dịu và bánh mì nướng mới mỗi ngày.',
      vibe: 'Ánh đèn dịu nhẹ, giai điệu nhạc Jazz từ máy hát đĩa than và các chú mèo sưởi nắng.',
      bestFor: ['Thưởng thức nhạc đĩa than', 'Bánh mì thủ công', 'Buổi chiều thư thái'],
      fullAddress: '88 Tân Phú, Phường Tân Phong, Quận 7, TP. Hồ Chí Minh',
      parkingInfo: 'Bãi đỗ xe máy và ô tô trước quán',
      hoursSummary: '08:00 - 21:30 hàng ngày'
    }
  }
};

export const MENU_TRANSLATIONS: Record<Language, Record<string, LocalizedMenuItemData>> = {
  'zh-TW': {
    'm1': {
      name: '經典越南冰奶咖啡 (Cà Phê Sữa Đá)',
      description: '傳統深焙羅布斯塔滴漏咖啡，搭配濃醇煉乳，層次厚實香濃，越南必嚐經典。',
      category: '精品咖啡'
    },
    'm2': {
      name: '招牌特調冷萃咖啡 (Signature Cold Brew)',
      description: '嚴選大叻阿拉比卡豆低溫慢速冷萃24小時，散發熱帶花果清香與天然甘甜回甘。',
      category: '精品咖啡'
    },
    'm3': {
      name: '順化海鹽奶蓋黑咖啡 (Cà Phê Muối)',
      description: '綿密濃郁的海鹽微鹹奶蓋，覆蓋於傳統順化風味黑滴漏咖啡之上，鹹甜交融。',
      category: '精品咖啡'
    },
    'm4': {
      name: '手作杏仁燕麥拿鐵 (Almond Latte)',
      description: '濃郁義式濃縮咖啡融合手作原粒杏仁奶，綿密細緻，低脂健康無負擔。',
      category: '精品咖啡'
    },
    'm5': {
      name: '鮮橙檸檬草蜜桃冰茶 (Trà Đào Cam Sả)',
      description: '嚴選高山紅茶冷萃，加入香甜脆桃片、現榨甜橙與新鮮檸檬草，清香怡人。',
      category: '茶飲 & 果汁'
    },
    'm6': {
      name: '炭焙碳香烏龍奶茶 (Roasted Oolong Milk Tea)',
      description: '重火炭焙烏龍茶葉，揉合新鮮鮮乳，茶韻甘醇厚實，炭香回味悠長。',
      category: '茶飲 & 果汁'
    },
    'm7': {
      name: '京都宇治抹茶拿鐵 (Kyoto Uji Matcha)',
      description: '日本京都宇治特級抹茶粉現刷，搭配全脂鮮乳，翠綠濃郁，茶香四溢。',
      category: '茶飲 & 果汁'
    },
    'm8': {
      name: '法式頂級奶油可頌 (French Croissant)',
      description: '法國頂級發酵奶油烘焙，外層酥脆金黃，內層千層蓬鬆柔軟，奶香四溢。',
      category: '烘焙 & 甜點'
    },
    'm9': {
      name: '經典威尼斯提拉米蘇 (Italian Tiramisu)',
      description: '手指餅乾浸潤濃縮咖啡與利口酒，交織馬斯卡彭乳酪與頂級可可粉，入口即化。',
      category: '烘焙 & 甜點'
    }
  },
  'th': {
    'm1': {
      name: 'กาแฟนมเย็นเวียดนามแท้ (Cà Phê Sữa Đá)',
      description: 'กาแฟโรบัสต้าคั่วเข้มดริปด้วยฟิน ผสมนมข้นหวานเข้มข้นรสชาติต้นตำรับเวียดนาม',
      category: 'กาแฟสด'
    },
    'm2': {
      name: 'ซิกเนเจอร์โคลด์บริว (Signature Cold Brew)',
      description: 'กาแฟอาราบิก้าดาลัดสกัดเย็น 24 ชั่วโมง หอมกลิ่นผลไม้เมืองร้อนสดชื่น หวานปลายธรรมชาติ',
      category: 'กาแฟสด'
    },
    'm3': {
      name: 'กาแฟเกลือทะเลเว้ (Cà Phê Muối)',
      description: 'ครีมชีสเกลือทะเลรสเค็มนุ่มละมุน ท็อปบนกาแฟดำดริปสูตรต้นตำรับเมืองเว้',
      category: 'กาแฟสด'
    },
    'm4': {
      name: 'อัลมอนด์ลาเต้ (Almond Latte)',
      description: 'เอสเพรสโซเข้มข้นผสมนมอัลมอนด์แท้ตีฟองนุ่ม ละมุน ไขมันต่ำ ดีต่อสุขภาพ',
      category: 'กาแฟสด'
    },
    'm5': {
      name: 'ชาพีชส้มตะไคร้สด (Trà Đào Cam Sả)',
      description: 'ชาดำเกรดพรีเมียมผสมส้มสด ตะไคร้หอม และชิ้นพีชกรอบหวานชื่นใจ',
      category: 'ชา & น้ำผลไม้'
    },
    'm6': {
      name: 'ชานมอูหลงคั่วหอม (Roasted Oolong Milk Tea)',
      description: 'ชาอูหลงคั่วไฟกลิ่นสโมคกี้เข้มข้น ผสมนมสดแท้ หอมมัน กลมกล่อมลงตัว',
      category: 'ชา & น้ำผลไม้'
    },
    'm7': {
      name: 'มัทฉะลาเต้เกียวโต (Kyoto Uji Matcha)',
      description: 'ผงมัทฉะอุจิแท้จากเกียวโต ตีสดกับนมสด หอมเข้มข้น นุ่มละมุนลิ้น',
      category: 'ชา & น้ำผลไม้'
    },
    'm8': {
      name: 'ครัวซองต์เนยฝรั่งเศส (French Croissant)',
      description: 'ครัวซองต์เนยฝรั่งเศสพรีเมียม อบกรอบนอก นุ่มฟูฉ่ำเนยด้านใน หอมละมุน',
      category: 'เบเกอรี่ & ของหวาน'
    },
    'm9': {
      name: 'ทีรามิสุอิตาเลียนแท้ (Italian Tiramisu)',
      description: 'เลดี้ฟิงเกอร์ชุ่มเอสเพรสโซผสมมาสคาโปนชีสนุ่มเนียน โรยผงโกโก้พรีเมียม',
      category: 'เบเกอรี่ & ของหวาน'
    }
  },
  'en': {
    'm1': {
      name: 'Vietnamese Iced Milk Coffee (Ca Phe Sua Da)',
      description: 'Dark roast Robusta brewed with traditional Phin filter, blended with sweet condensed milk.',
      category: 'Artisan Coffee'
    },
    'm2': {
      name: 'Signature Cold Brew',
      description: 'Da Lat Arabica cold-steeped for 24 hours, presenting subtle tropical fruity notes and natural sweetness.',
      category: 'Artisan Coffee'
    },
    'm3': {
      name: 'Hue Sea Salt Foam Coffee',
      description: 'Rich and savory salted cream foam layered over bold traditional Hue-style dark drip coffee.',
      category: 'Artisan Coffee'
    },
    'm4': {
      name: 'Almond Milk Latte',
      description: 'Bold espresso paired with freshly steamed artisan almond milk, low-fat and nourishing.',
      category: 'Artisan Coffee'
    },
    'm5': {
      name: 'Peach Orange Lemongrass Tea',
      description: 'Premium black tea infused with juicy orange slices, fresh crushed lemongrass, and crisp sweet peach.',
      category: 'Tea & Fruit'
    },
    'm6': {
      name: 'Roasted Oolong Milk Tea',
      description: 'Charcoal-roasted oolong tea brewed with fresh milk, delivering a rich smoky finish.',
      category: 'Tea & Fruit'
    },
    'm7': {
      name: 'Kyoto Uji Matcha Latte',
      description: 'Premium ceremonial Uji matcha from Kyoto whisked with warm creamy milk.',
      category: 'Tea & Fruit'
    },
    'm8': {
      name: 'French Butter Croissant',
      description: 'Artisanal French butter croissant with a crisp golden exterior and flaky, airy layers inside.',
      category: 'Pastries & Desserts'
    },
    'm9': {
      name: 'Classic Italian Tiramisu',
      description: 'Espresso and liqueur-soaked ladyfingers enveloped in silky mascarpone and dusted with cocoa.',
      category: 'Pastries & Desserts'
    }
  },
  'vi': {
    'm1': {
      name: 'Cà phê Sữa Đá',
      description: 'Cà phê pha phin Robusta rang đậm thơm nồng, hòa quyện cùng sữa đặc béo ngậy truyền thống.',
      category: 'Cà phê'
    },
    'm2': {
      name: 'Cold Brew Signature',
      description: 'Cà phê Arabica Cầu Đất ủ lạnh 24 giờ, thoang thoảng nốt hương hoa quả thanh mát và ngọt hậu tự nhiên.',
      category: 'Cà phê'
    },
    'm3': {
      name: 'Cà phê Muối Biển',
      description: 'Lớp kem muối béo ngậy mằn mặn đặc trưng phủ trên nền cà phê đen pha phin đậm đà chuẩn vị Huế.',
      category: 'Cà phê'
    },
    'm4': {
      name: 'Latte Hạnh Nhân',
      description: 'Espresso đậm vị kết hợp sữa hạt hạnh nhân nguyên chất đánh bọt mịn, ít béo và tốt cho sức khỏe.',
      category: 'Cà phê'
    },
    'm5': {
      name: 'Trà Đào Cam Sả',
      description: 'Trà đen hảo hạng ủ lạnh cùng cam vàng mọng nước, sả tươi đập dập và đào ngâm giòn ngọt thanh tao.',
      category: 'Trà & Trái cây'
    },
    'm6': {
      name: 'Trà Sữa Oolong Nướng',
      description: 'Trà ô long rang lửa đậm hương khói nướng kết hợp sữa tươi thanh trùng, vị trà đậm đà khó quên.',
      category: 'Trà & Trái cây'
    },
    'm7': {
      name: 'Matcha Latte Nhật Bản',
      description: 'Bột trà xanh Uji Kyoto thượng hạng đánh ấm cùng sữa tươi nguyên kem, thơm ngát vị trà tươi thanh khiết.',
      category: 'Trà & Trái cây'
    },
    'm8': {
      name: 'Bánh Sừng Bò (Croissant)',
      description: 'Croissant bơ Pháp cao cấp nướng vàng giòn rụm bên ngoài, ngàn lớp mềm ẩm và thơm nức bên trong.',
      category: 'Bánh & Tráng miệng'
    },
    'm9': {
      name: 'Bánh Tiramisu Ý',
      description: 'Lớp bánh ladyfinger thấm đẫm espresso và rượu nhẹ quyện cùng phô mai Mascarpone béo mịn rắc bột cacao.',
      category: 'Bánh & Tráng miệng'
    }
  }
};

export const MOOD_TRANSLATIONS: Record<Language, Record<string, string>> = {
  'zh-TW': {
    'Làm việc / Học bài': '辦公 / 學習閱讀',
    'Hẹn hò': '情侶約會',
    'Chụp ảnh / Check-in': '拍照打卡 / 美學空間',
    'Tụ tập nhóm': '好友聚會 / 桌遊',
    'Thư giãn / Chill': '放鬆放空 / 治癒'
  },
  'th': {
    'Làm việc / Học bài': 'ทำงาน / อ่านหนังสือ',
    'Hẹn hò': 'เดทโรแมนติก',
    'Chụp ảnh / Check-in': 'ถ่ายรูป / เช็คอินมุมสวย',
    'Tụ tập nhóm': 'ปาร์ตี้ / รวมกลุ่มเพื่อน',
    'Thư giãn / Chill': 'พักผ่อน / ชิลสบาย'
  },
  'en': {
    'Làm việc / Học bài': 'Work & Study',
    'Hẹn hò': 'Romantic Date',
    'Chụp ảnh / Check-in': 'Photo & Check-in',
    'Tụ tập nhóm': 'Group Hangout',
    'Thư giãn / Chill': 'Chill & Relax'
  },
  'vi': {
    'Làm việc / Học bài': 'Làm việc / Học bài',
    'Hẹn hò': 'Hẹn hò',
    'Chụp ảnh / Check-in': 'Chụp ảnh / Check-in',
    'Tụ tập nhóm': 'Tụ tập nhóm',
    'Thư giãn / Chill': 'Thư giãn / Chill'
  }
};

export const CITY_TRANSLATIONS: Record<Language, Record<string, string>> = {
  'zh-TW': {
    'Hồ Chí Minh': '胡志明市',
    'Hà Nội': '河內',
    'Đà Nẵng': '峴港',
    'Hải Phòng': '海防',
    'Cần Thơ': '芹苴',
    'Nha Trang': '芽莊',
    'Đà Lạt': '大叻',
    'Huế': '順化',
    'Vũng Tàu': '頭頓',
    'Quy Nhơn': '歸仁',
    'Phú Quốc': '富國島',
    'Taipei': '台北',
    'Kaohsiung': '高雄',
    'Taichung': '台中',
    'Tokyo': '東京',
    'Bangkok': '曼谷',
    'Seoul': '首爾'
  },
  'th': {
    'Hồ Chí Minh': 'โฮจิมินห์',
    'Hà Nội': 'ฮานอย',
    'Đà Nẵng': 'ดานัง',
    'Hải Phòng': 'ไฮฟอง',
    'Cần Thơ': 'เกิ่นเทอ',
    'Nha Trang': 'ญาจาง',
    'Đà Lạt': 'ดาลัด',
    'Huế': 'เว้',
    'Vũng Tàu': 'หวุงเต่า',
    'Quy Nhơn': 'กวีเญิน',
    'Phú Quốc': 'ฟู้โกว๊ก',
    'Taipei': 'ไทเป',
    'Kaohsiung': 'เกาสง',
    'Taichung': 'ไทจง',
    'Tokyo': 'โตเกียว',
    'Bangkok': 'กรุงเทพฯ',
    'Seoul': 'โซล'
  },
  'en': {
    'Hồ Chí Minh': 'Ho Chi Minh City',
    'Hà Nội': 'Hanoi',
    'Đà Nẵng': 'Da Nang',
    'Hải Phòng': 'Hai Phong',
    'Cần Thơ': 'Can Tho',
    'Nha Trang': 'Nha Trang',
    'Đà Lạt': 'Da Lat',
    'Huế': 'Hue',
    'Vũng Tàu': 'Vung Tau',
    'Quy Nhơn': 'Quy Nhon',
    'Phú Quốc': 'Phu Quoc',
    'Taipei': 'Taipei',
    'Kaohsiung': 'Kaohsiung',
    'Taichung': 'Taichung',
    'Tokyo': 'Tokyo',
    'Bangkok': 'Bangkok',
    'Seoul': 'Seoul'
  },
  'vi': {
    'Hồ Chí Minh': 'Hồ Chí Minh',
    'Hà Nội': 'Hà Nội',
    'Đà Nẵng': 'Đà Nẵng',
    'Hải Phòng': 'Hải Phòng',
    'Cần Thơ': 'Cần Thơ',
    'Nha Trang': 'Nha Trang',
    'Đà Lạt': 'Đà Lạt',
    'Huế': 'Huế',
    'Vũng Tàu': 'Vũng Tàu',
    'Quy Nhơn': 'Quy Nhon',
    'Phú Quốc': 'Phú Quốc',
    'Taipei': 'Đài Bắc (Taipei)',
    'Kaohsiung': 'Cao Hùng (Kaohsiung)',
    'Taichung': 'Đài Trung (Taichung)',
    'Tokyo': 'Tokyo',
    'Bangkok': 'Bangkok',
    'Seoul': 'Seoul'
  }
};

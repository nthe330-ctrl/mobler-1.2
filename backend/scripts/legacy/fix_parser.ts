import fs from 'fs';

let content = fs.readFileSync('src/services/search/SearchIntentParser.ts', 'utf8');

const oldLocationCode = `    // 6. Handle Location Intent
    let locationType: 'near_me' | 'specified_location' | 'city' | 'global' = 'near_me';
    if (
      queryLower.includes('gần tôi') ||
      queryLower.includes('near me') ||
      queryLower.includes('nearby') ||
      queryLower.includes('附近') ||
      queryLower.includes('近く') ||
      queryLower.includes('주변')
    ) {
      locationType = 'near_me';
    } else if (resolvedLocation.city) {
      locationType = 'city';
    }`;

const newLocationCode = `    // 6. Handle Location Intent
    let locationType: 'near_me' | 'specified_location' | 'city' | 'global' = 'near_me';
    let extractedCity = '';
    
    // Check for explicit city mentions in the query
    const cityMap: Record<string, string> = {
      'taipei': 'Taipei', 'đài bắc': 'Taipei', '台北': 'Taipei',
      'kaohsiung': 'Kaohsiung', 'cao hùng': 'Kaohsiung', '高雄': 'Kaohsiung',
      'tainan': 'Tainan', 'đài nam': 'Tainan', '台南': 'Tainan',
      'chiayi': 'Chiayi', 'gia nghĩa': 'Chiayi', '嘉義': 'Chiayi',
      'taichung': 'Taichung', 'đài trung': 'Taichung', '台中': 'Taichung',
      'miaoli': 'Miaoli', '苗栗': 'Miaoli',
      'hsinchu': 'Hsinchu', 'tân trúc': 'Hsinchu', '新竹': 'Hsinchu',
      'taoyuan': 'Taoyuan', 'đào viên': 'Taoyuan', '桃園': 'Taoyuan',
      'tokyo': 'Tokyo', '東京': 'Tokyo',
      'osaka': 'Osaka', '大阪': 'Osaka',
      'kyoto': 'Kyoto', '京都': 'Kyoto',
      'seoul': 'Seoul', '서울': 'Seoul',
      'busan': 'Busan', '부산': 'Busan',
      'bangkok': 'Bangkok', 'กรุงเทพ': 'Bangkok',
      'chiang mai': 'Chiang Mai', 'เชียงใหม่': 'Chiang Mai',
      'hồ chí minh': 'Hồ Chí Minh', 'sài gòn': 'Hồ Chí Minh', 'ho chi minh': 'Hồ Chí Minh',
      'hà nội': 'Hà Nội', 'ha noi': 'Hà Nội',
      'đà nẵng': 'Đà Nẵng', 'da nang': 'Đà Nẵng',
      'đà lạt': 'Đà Lạt', 'da lat': 'Đà Lạt'
    };

    for (const [key, val] of Object.entries(cityMap)) {
      if (queryLower.includes(key)) {
        extractedCity = val;
        break;
      }
    }

    if (extractedCity) {
      locationType = 'specified_location';
    } else if (
      queryLower.includes('gần tôi') ||
      queryLower.includes('near me') ||
      queryLower.includes('nearby') ||
      queryLower.includes('附近') ||
      queryLower.includes('近く') ||
      queryLower.includes('주변')
    ) {
      locationType = 'near_me';
    } else if (resolvedLocation.city) {
      locationType = 'city';
    }`;

content = content.replace(oldLocationCode, newLocationCode);

const oldLocationIntent = `      locationIntent: {
        type: locationType,
        latitude: lat,
        longitude: lng,
        radius: 5000,
        cityName: resolvedLocation.city
      },`;

const newLocationIntent = `      locationIntent: {
        type: locationType,
        latitude: lat,
        longitude: lng,
        radius: 5000,
        cityName: extractedCity || resolvedLocation.city
      },`;

content = content.replace(oldLocationIntent, newLocationIntent);

fs.writeFileSync('src/services/search/SearchIntentParser.ts', content);

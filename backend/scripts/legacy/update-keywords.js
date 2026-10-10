import fs from 'fs';

const path = 'server/progressiveSearch.ts';
let code = fs.readFileSync(path, 'utf8');

const regex = /const SPECIALTY_KEYWORDS: Record<string, string\[\]> = \{[\s\S]*?\};\n\nconst RADII_STAGES/m;

const newKeywords = `const SPECIALTY_KEYWORDS: Record<string, string[]> = {
  'Cat Café': ['貓咪咖啡廳', '貓咖', 'Cat Cafe'],
  'Dog Café': ['狗狗咖啡廳', '狗咖', 'Dog Cafe'],
  'Board Game Café': ['桌遊咖啡廳', '桌遊店', 'Board Game Cafe'],
  'Workshop Café': ['手作工作坊', '手作教室', 'DIY Workshop'],
  'Console Gaming Café': ['電玩館', '電玩包廂', 'PS5 咖啡廳'],
  'Book Café': ['書店咖啡廳', '閱讀咖啡廳', 'Book Cafe'],
  'Plant Café': ['植栽咖啡廳', '植物咖啡廳', 'Plant Cafe'],
  'Ceramic Café': ['陶藝體驗', '陶藝咖啡廳', 'Pottery Cafe'],
  'Vinyl Café': ['黑膠唱片店', '黑膠咖啡廳', 'Vinyl Cafe'],
  'Fashion Café': ['質感選物店', '選品店', 'Select Shop'],
  'Art Toy Café': ['潮玩店', '盲盒店', 'Designer Toy'],
  'Anime Café': ['動漫咖啡廳', '動漫主題餐廳', 'Anime Cafe'],
  'VR Café': ['VR體驗館', 'VR遊戲館', 'VR Cafe'],
  'Immersive Café': ['沉浸式體驗', '光影展', 'Immersive Art'],
  'Car Workshop Café': ['老車咖啡廳', '經典車', 'Classic Car Cafe'],
  'Moto Workshop Café': ['重機咖啡廳', '機車俱樂部', 'Biker Cafe']
};

const RADII_STAGES`;

code = code.replace(regex, newKeywords);
fs.writeFileSync(path, code);

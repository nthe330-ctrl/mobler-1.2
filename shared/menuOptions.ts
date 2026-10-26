/**
 * How a stored menu option is WRITTEN for the staff member reading it, without changing
 * what is stored.
 *
 * The distinction matters more here than anywhere else in the dashboard. A menu item holds
 * `sugarOptions: ['0% (Không đường)', …]` and `defaultSugar: '70% (Chuẩn)'`, and the
 * default is matched against the list by plain string equality — in the dashboard, in the
 * API, and in the customer app, which receives these strings verbatim. Translating the
 * stored value would therefore:
 *
 *   - break the default (`'70% (Chuẩn)' !== '70% (ปกติ)'`, so no option is selected),
 *   - give one shop two categories, "Cà phê" and "Coffee", for the same drinks, and
 *   - show Thai option names to a Vietnamese guest, or the reverse.
 *
 * So the value is the identity and the label is presentation — the same rule as a currency
 * code versus its symbol. This table covers the values Mobler itself seeds. Anything a shop
 * types in is its own content and is shown exactly as typed, which is what a shop that
 * named a category "Signature Pour-over" would expect.
 *
 * Data a shop CREATES is a different case and is handled at the point of creation: the size
 * names a preset generates are written in the staff's current language, because they are new
 * content, not a translation of existing content. Once written they are stored and displayed
 * as-is, like any other shop content.
 */

export type MenuOptionLabels = Record<'vi' | 'en' | 'zh-TW' | 'th', string>;

/** Keyed by the canonical stored value, which is the Vietnamese seed text. */
export const MENU_OPTION_LABELS: Record<string, MenuOptionLabels> = {
  // ---- Sugar levels ----
  '0% (Không đường)': { vi: '0% (Không đường)', en: '0% (no sugar)', 'zh-TW': '0%（無糖）', th: '0% (ไม่หวาน)' },
  '30% (Ít ngọt)': { vi: '30% (Ít ngọt)', en: '30% (less sweet)', 'zh-TW': '30%（微糖）', th: '30% (หวานน้อย)' },
  '50% (Ngọt vừa)': { vi: '50% (Ngọt vừa)', en: '50% (half sweet)', 'zh-TW': '50%（半糖）', th: '50% (หวานปานกลาง)' },
  '70% (Chuẩn)': { vi: '70% (Chuẩn)', en: '70% (standard)', 'zh-TW': '70%（標準）', th: '70% (ปกติ)' },
  '100% (Đậm vị)': { vi: '100% (Đậm vị)', en: '100% (full sweet)', 'zh-TW': '100%（全糖）', th: '100% (หวานจัด)' },

  // ---- Ice levels ----
  'Nóng / Không đá (0%)': { vi: 'Nóng / Không đá (0%)', en: 'Hot / no ice (0%)', 'zh-TW': '熱飲／無冰（0%）', th: 'ร้อน / ไม่ใส่น้ำแข็ง (0%)' },
  'Ít đá (30%)': { vi: 'Ít đá (30%)', en: 'Light ice (30%)', 'zh-TW': '少冰（30%）', th: 'น้ำแข็งน้อย (30%)' },
  'Vừa đá (50%)': { vi: 'Vừa đá (50%)', en: 'Medium ice (50%)', 'zh-TW': '半冰（50%）', th: 'น้ำแข็งปานกลาง (50%)' },
  'Đá chuẩn (70%)': { vi: 'Đá chuẩn (70%)', en: 'Standard ice (70%)', 'zh-TW': '正常冰（70%）', th: 'น้ำแข็งปกติ (70%)' },
  'Đầy đá (100%)': { vi: 'Đầy đá (100%)', en: 'Extra ice (100%)', 'zh-TW': '多冰（100%）', th: 'น้ำแข็งเต็มแก้ว (100%)' },

  // ---- Seeded categories ----
  'Cà phê': { vi: 'Cà phê', en: 'Coffee', 'zh-TW': '咖啡', th: 'กาแฟ' },
  'Trà & Trà sữa': { vi: 'Trà & Trà sữa', en: 'Tea & milk tea', 'zh-TW': '茶與奶茶', th: 'ชาและชานม' },
  'Nước ép & Sinh tố': { vi: 'Nước ép & Sinh tố', en: 'Juice & smoothies', 'zh-TW': '果汁與冰沙', th: 'น้ำผลไม้และสมูทตี้' },
  'Đá xay & Frappe': { vi: 'Đá xay & Frappe', en: 'Blended & frappé', 'zh-TW': '冰沙與法布奇諾', th: 'ปั่นและแฟรปเป้' },
  'Bánh ngọt & Ăn kèm': { vi: 'Bánh ngọt & Ăn kèm', en: 'Pastries & sides', 'zh-TW': '甜點與配餐', th: 'ขนมอบและของทานเล่น' },
  'Đồ ăn vặt': { vi: 'Đồ ăn vặt', en: 'Snacks', 'zh-TW': '點心', th: 'ของว่าง' },
  'Khác': { vi: 'Khác', en: 'Other', 'zh-TW': '其他', th: 'อื่น ๆ' },

  // ---- Seeded item tags ----
  'Best Seller': { vi: 'Best Seller', en: 'Best seller', 'zh-TW': '熱銷', th: 'ขายดี' },
  Signature: { vi: 'Signature', en: 'Signature', 'zh-TW': '招牌', th: 'ซิกเนเจอร์' },
  'Mới': { vi: 'Mới', en: 'New', 'zh-TW': '新品', th: 'ใหม่' },
  Hot: { vi: 'Hot', en: 'Hot', 'zh-TW': '人氣', th: 'ฮอต' },
  Healthy: { vi: 'Healthy', en: 'Healthy', 'zh-TW': '健康', th: 'เพื่อสุขภาพ' },
  'Truyền thống': { vi: 'Truyền thống', en: 'Traditional', 'zh-TW': '傳統', th: 'แบบดั้งเดิม' },
  'Ít ngọt': { vi: 'Ít ngọt', en: 'Less sweet', 'zh-TW': '微糖', th: 'หวานน้อย' }
};

/**
 * The label for a stored option value. Unknown values — anything the shop typed itself —
 * come back unchanged, which is correct: that text is the shop's own, not ours to translate.
 */
export function menuOptionLabel(value: string | null | undefined, language: string | undefined): string {
  const raw = String(value ?? '');
  const entry = MENU_OPTION_LABELS[raw];
  if (!entry) return raw;
  return entry[(language || 'vi') as keyof MenuOptionLabels] || entry.vi || raw;
}

/** True for a value Mobler seeded, i.e. one this table is allowed to rewrite on screen. */
export function isSeededMenuOption(value: string | null | undefined): boolean {
  return Object.prototype.hasOwnProperty.call(MENU_OPTION_LABELS, String(value ?? ''));
}

/**
 * The option sets Mobler seeds a new menu item with.
 *
 * They live here, beside the label table, rather than in the screen that renders them: the
 * value and its translation have to be changed together, and a copy of the list inside a
 * component is a copy that drifts. `defaultSugar` and `defaultIce` are matched against
 * these arrays by string equality, so the constants below are the only correct way to refer
 * to them.
 */
export const STANDARD_SUGAR_LEVELS: string[] = [
  '0% (Không đường)',
  '30% (Ít ngọt)',
  '50% (Ngọt vừa)',
  '70% (Chuẩn)',
  '100% (Đậm vị)'
];

export const STANDARD_ICE_LEVELS: string[] = [
  'Nóng / Không đá (0%)',
  'Ít đá (30%)',
  'Vừa đá (50%)',
  'Đá chuẩn (70%)',
  'Đầy đá (100%)'
];

export const DEFAULT_CATEGORIES: string[] = [
  'Cà phê',
  'Trà & Trà sữa',
  'Nước ép & Sinh tố',
  'Đá xay & Frappe',
  'Bánh ngọt & Ăn kèm',
  'Đồ ăn vặt'
];

export const AVAILABLE_TAGS: string[] = [
  'Best Seller',
  'Signature',
  'Mới',
  'Hot',
  'Healthy',
  'Truyền thống',
  'Ít ngọt'
];

/**
 * The seeded defaults, named so no screen has to spell the canonical string out. Spelling
 * it out is how `'70% (Chuẩn)'` ended up written in six places, each one a chance to typo a
 * value that is compared by equality.
 */
export const SEEDED_DEFAULTS: Record<'sugar' | 'ice' | 'category' | 'otherCategory' | 'tag', string> = {
  sugar: '70% (Chuẩn)',
  ice: 'Đá chuẩn (70%)',
  category: 'Cà phê',
  /** Used when a shop picks "other" and leaves the custom name blank. */
  otherCategory: 'Khác',
  tag: 'Mới'
};

/**
 * Stock photos offered in the item editor. The subject is held as a dictionary key, not as
 * text, because this one is genuinely interface copy: it is the image's alt text, read by
 * whoever is choosing the photo.
 */
export const PRESET_SAMPLE_IMAGES: { labelKey: string; url: string }[] = [
  { labelKey: 'shop.sample.icedMilkCoffee', url: 'https://images.unsplash.com/photo-1610889556528-9a770e32642f?w=600&q=80' },
  { labelKey: 'shop.sample.bacXiu', url: 'https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?w=600&q=80' },
  { labelKey: 'shop.sample.coldBrew', url: 'https://images.unsplash.com/photo-1461023058943-07cb1ce8db15?w=600&q=80' },
  { labelKey: 'shop.sample.espresso', url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&q=80' },
  { labelKey: 'shop.sample.peachTea', url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&q=80' },
  { labelKey: 'shop.sample.bubbleTea', url: 'https://images.unsplash.com/photo-1558857563-b37cf5c911b3?w=600&q=80' },
  { labelKey: 'shop.sample.matchaLatte', url: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&q=80' },
  { labelKey: 'shop.sample.watermelonJuice', url: 'https://images.unsplash.com/photo-1589733955941-5eeaf752f6dd?w=600&q=80' },
  { labelKey: 'shop.sample.orangeJuice', url: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=600&q=80' },
  { labelKey: 'shop.sample.avocadoSmoothie', url: 'https://images.unsplash.com/photo-1546173159-315724a31696?w=600&q=80' },
  { labelKey: 'shop.sample.croissant', url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&q=80' },
  { labelKey: 'shop.sample.tiramisu', url: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600&q=80' }
];

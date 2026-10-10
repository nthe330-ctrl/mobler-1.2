/**
 * MOBLER SEARCH - TAXONOMY NORMALIZATION ENGINE (PHASE 2B)
 * Implements versioned term normalization, Vietnamese accent strip/indexing,
 * Chinese Traditional/Simplified mapping, and Thai character sequence normalization.
 */

export const CURRENT_NORMALIZER_VERSION = 'norm_v1.0';
export const ZH_MAPPING_TABLE_USED = 'cjk_s2t_t2s_v1';

// CJK Traditional <-> Simplified character mapping dictionary
const TRAD_TO_SIMP: Record<string, string> = {
  '廳': '厅', '館': '馆', '貓': '猫', '狗': '狗', '遊': '游', '戲': '戏',
  '靜': '静', '謐': '谧', '書': '书', '香': '香', '藝': '艺', '膠': '胶',
  '唱': '唱', '片': '片', '潮': '潮', '玩': '玩', '盲': '盲', '盒': '盒',
  '動': '动', '漫': '漫', '題': '题', '實': '实', '境': '境', '沉': '沉',
  '浸': '浸', '車': '车', '庫': '库', '俱': '俱', '樂': '乐', '部': '部',
  '網': '网', '路': '路', '線': '线', '設': '设', '備': '备', '區': '区',
  '點': '点', '評': '评', '價': '价', '薦': '荐', '飲': '饮', '啡': '啡',
  '咖': '咖', '友': '友', '善': '善', '處': '处', '座': '座', '裡': '里',
  '開': '开', '關': '关', '讀': '读', '習': '习', '電': '电', '視': '视',
  '機': '机', '檯': '台', '溫': '温', '馨': '馨', '適': '适', '放': '放',
  '鬆': '松', '懷': '怀', '舊': '旧', '純': '纯', '綠': '绿', '愛': '爱',
  '標': '标', '籤': '签', '獨': '独', '立': '立', '衛': '卫', '浴': '浴',
  '戶': '户', '外': '外', '庭': '庭', '院': '院', '廂': '厢', '選': '选',
  '品': '品', '專': '专', '注': '注', '創': '创', '作': '作', '坊': '坊',
  '複': '复', '古': '古', '極': '极', '簡': '简', '約': '约', '廠': '厂',
  '紅': '红', '磚': '砖', '鋼': '钢', '鐵': '铁', '長': '长', '桌': '桌',
  '採': '采', '光': '光', '插': '插', '頭': '头', '寵': '宠', '物': '物'
};

const SIMP_TO_TRAD: Record<string, string> = Object.entries(TRAD_TO_SIMP).reduce(
  (acc, [trad, simp]) => {
    acc[simp] = trad;
    return acc;
  },
  {} as Record<string, string>
);

/**
 * Strips Vietnamese diacritics / tone marks while handling đ/Đ correctly.
 */
export function stripVietnameseDiacritics(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

/**
 * Converts Chinese text from Traditional to Simplified.
 */
export function toSimplifiedChinese(text: string): string {
  if (!text) return '';
  return Array.from(text)
    .map(char => TRAD_TO_SIMP[char] || char)
    .join('');
}

/**
 * Converts Chinese text from Simplified to Traditional.
 */
export function toTraditionalChinese(text: string): string {
  if (!text) return '';
  return Array.from(text)
    .map(char => SIMP_TO_TRAD[char] || char)
    .join('');
}

/**
 * Normalizes any search/taxonomy term into a clean lookup key.
 * Display text is NEVER modified by this function — it produces index keys only.
 * Rules:
 * 1. Unicode NFKC normalization
 * 2. Lowercase conversion
 * 3. Collapse multiple whitespaces
 * 4. Strip punctuation and symbols (while keeping alphanumeric and CJK/Thai/Vietnamese word chars)
 */
export function normalizeTerm(term: string, version: string = CURRENT_NORMALIZER_VERSION): string {
  if (!term || typeof term !== 'string') return '';

  // Apply Unicode NFKC
  let normalized = term.normalize('NFKC').toLowerCase().trim();

  // Strip punctuation and special symbols except alphanumeric, whitespace, and non-latin alphabets/ideographs
  // Keep letters, digits, and spaces:
  normalized = normalized.replace(/[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~，。！？；：、（）「」『』《》【】]/g, ' ');

  // Collapse whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim();

  return normalized;
}

/**
 * Generates all normalized lookup variations for a term depending on language.
 * - For vi: returns accented and unaccented variations.
 * - For zh: returns original normalized, simplified, and traditional variations.
 * - For th / en / others: returns normalized base key.
 */
export function generateLookupKeys(
  term: string,
  language?: string,
  version: string = CURRENT_NORMALIZER_VERSION
): { keys: string[]; isUnaccentedVi: boolean; isSimpZh: boolean; isTradZh: boolean } {
  const baseKey = normalizeTerm(term, version);
  if (!baseKey) {
    return { keys: [], isUnaccentedVi: false, isSimpZh: false, isTradZh: false };
  }

  const keySet = new Set<string>([baseKey]);
  let isUnaccentedVi = false;
  let isSimpZh = false;
  let isTradZh = false;

  if (language === 'vi' || !language) {
    const unaccented = stripVietnameseDiacritics(baseKey);
    if (unaccented !== baseKey) {
      keySet.add(unaccented);
      isUnaccentedVi = true;
    }
  }

  if (language === 'zh-TW' || language === 'zh-CN' || language === 'zh' || !language) {
    const simp = toSimplifiedChinese(baseKey);
    const trad = toTraditionalChinese(baseKey);
    if (simp !== baseKey) {
      keySet.add(simp);
      isSimpZh = true;
    }
    if (trad !== baseKey) {
      keySet.add(trad);
      isTradZh = true;
    }
  }

  return {
    keys: Array.from(keySet),
    isUnaccentedVi,
    isSimpZh,
    isTradZh
  };
}

/**
 * MOBLER SEARCH - PHASE 4: QUERY UNDERSTANDING CONFIGURATION & RULES
 * Config-driven rules, feature flags, thresholds, and priority mappings.
 */

import { QueryUnderstandingConfig, PriorityRulesConfig } from './types';

export const QUERY_UNDERSTANDING_ENABLED = process.env.QUERY_UNDERSTANDING_ENABLED === 'true';
export const QUERY_UNDERSTANDING_AI_ENABLED = process.env.QUERY_UNDERSTANDING_AI_ENABLED === 'true';

export const DEFAULT_PRIORITY_RULES: PriorityRulesConfig = {
  place_type: 'must',
  experience: 'must',
  activity: 'should',
  attribute: 'should',
  name: 'must',
  exclude: 'must' // Exclusions are always non-negotiable must
};

export const DEFAULT_QUERY_UNDERSTANDING_CONFIG: QueryUnderstandingConfig = {
  enabled: QUERY_UNDERSTANDING_ENABLED,
  aiEnabled: QUERY_UNDERSTANDING_AI_ENABLED,
  maxQueryLength: 200,
  promptVersion: 'prompt_v1.0',
  aiModel: 'gemini-3.8-flash',
  aiTimeoutMs: 5000,
  cacheTtlMs: 300_000, // 5 minutes
  negativeCacheTtlMs: 30_000, // 30 seconds
  cacheMaxEntries: 1000,
  priorityRules: DEFAULT_PRIORITY_RULES,
  confidenceThreshold: 0.7,
  residualWordThreshold: 1
};

/**
 * Strict modifier tokens that escalate an attribute from 'should' to 'must'.
 */
export const STRICT_MODIFIER_PATTERNS = {
  en: ['must have', 'must', 'mandatory', 'required', 'needs to have', 'need', 'strictly'],
  vi: ['bắt buộc', 'cần phải có', 'cần có', 'phải có', 'nhất định', 'yêu cầu', 'cần'],
  'zh-TW': ['必須', '必须', '一定要有', '一定', '需要有', '務必', '一定要'],
  th: ['ต้องมี', 'จำเป็น', 'ต้อง', 'ต้องได้']
};

/**
 * Exclusion patterns for all 4 supported languages.
 * Thai patterns are marked as draft requiring native review.
 */
export const EXCLUSION_PATTERNS = {
  vi: [
    'không phải', 'không có', 'trừ', 'không nhận', 'đừng', 'không', 'ko', 'tránh', 'loại trừ'
  ],
  en: [
    'not a', 'not an', 'not', 'no', 'without', 'except', 'excluding', 'avoid', 'non'
  ],
  'zh-TW': [
    '不要', '不是', '無', '无', '非', '排除', '不接受', '禁止', '別', '别'
  ],
  th: [
    // Draft patterns - flagged as needs_native_review
    'ไม่ใช่', 'ไม่มี', 'ไม่เอา', 'ไม่', 'ยกเว้น'
  ]
};

/**
 * Vague/discovery phrases that fast-path cannot resolve deterministically
 * and trigger AI escalation.
 */
export const DISCOVERY_VAGUE_PHRASES = {
  vi: [
    'độc lạ', 'hidden gem', 'vibe chill', 'chill', 'sống ảo', 'chữa lành', 'quán ruột',
    'view đẹp', 'tâm sự', 'hẹn hò lãng mạn', 'quán bí mật', 'check in', 'mới mở'
  ],
  en: [
    'hidden gem', 'secret spot', 'cool vibe', 'aesthetic', 'cozy vibe', 'romantic spot',
    'chill spot', 'unique atmosphere', 'instagrammable', 'cozy date'
  ],
  'zh-TW': [
    '特色', '隱藏版', '私房', '打卡', '好拍', '療癒', '氛圍感', '文青', '秘境', '新開幕', '推薦'
  ],
  th: [
    'ลับ', 'สวย', 'ชิค', 'บรรยากาศดี', 'ถ่ายรูปสวย', 'ชิล'
  ]
};

/**
 * Common stopwords across languages that do not count towards unresolved residual text.
 */
export const COMMON_STOPWORDS = new Set<string>([
  // English
  'a', 'an', 'the', 'in', 'on', 'at', 'for', 'with', 'and', 'or', 'of', 'to', 'near', 'by', 'is', 'are', 'find', 'recommend',
  // Vietnamese
  'quán', 'tiệm', 'ở', 'tại', 'cho', 'có', 'và', 'của', 'để', 'với', 'những', 'các', 'một', 'gần', 'tìm', 'nào', 'gì',
  // Chinese
  '的', '在', '有', '和', '與', '与', '於', '于', '推薦', '推荐', '找',
  // Thai
  'ที่', 'ใน', 'มี', 'และ', 'กับ', 'หา', 'แถว'
]);

/**
 * Ambiguous query patterns that map to multiple candidate canonical IDs.
 * Fast-path MUST flag these in ambiguities array and NEVER make a silent pick.
 */
export const AMBIGUOUS_QUERY_PATTERNS: { regex: RegExp; text: string; candidate_ids: string[] }[] = [
  { regex: /\b(gaming\s+cafe|game\s+cafe)\b/i, text: 'gaming cafe', candidate_ids: ['board_game_cafe', 'console_gaming_cafe'] },
  { regex: /\b(quán\s+cafe\s+trò\s+chơi|cafe\s+trò\s+chơi)\b/i, text: 'quán cafe trò chơi', candidate_ids: ['board_game_cafe', 'console_gaming_cafe'] },
  { regex: /(遊戲咖啡廳|游戏咖啡厅)/i, text: '遊戲咖啡廳', candidate_ids: ['board_game_cafe', 'console_gaming_cafe'] },
  { regex: /(คาเฟ่\s*เกม|เกม\s*คาเฟ่)/i, text: 'คาเฟ่ เกม', candidate_ids: ['board_game_cafe', 'console_gaming_cafe'] },
  { regex: /\b(retro\s+cafe)\b/i, text: 'retro cafe', candidate_ids: ['retro_vintage', 'vinyl_cafe'] },
  { regex: /\b(quán\s+cafe\s+workshop|tiệm\s+cafe\s+workshop)\b/i, text: 'quán cafe workshop', candidate_ids: ['ceramic_cafe', 'car_workshop_cafe'] }
];

/**
 * Common shorthand nouns in cafe searches that refer to experience categories
 * (especially when preceded by negation/exclusion or used standalone).
 */
export const SHORTHAND_EXPERIENCE_ALIASES: Record<string, Record<string, string>> = {
  vi: {
    'mèo': 'cat_cafe',
    'chó': 'dog_cafe',
    'sách': 'book_cafe',
    'board game': 'board_game_cafe',
    'boardgame': 'board_game_cafe',
    'hút thuốc': 'smoking_allowed',
    'thuốc lá': 'smoking_allowed',
    'đông đúc': 'crowded',
    'đông': 'crowded'
  },
  en: {
    'cats': 'cat_cafe',
    'dogs': 'dog_cafe',
    'smoking': 'smoking_allowed',
    'smoke': 'smoking_allowed'
  },
  'zh-TW': {
    '貓咪': 'cat_cafe',
    '狗狗': 'dog_cafe',
    '吸菸': 'smoking_allowed',
    '抽菸': 'smoking_allowed'
  },
  th: {
    'แมว': 'cat_cafe',
    'หมา': 'dog_cafe',
    'สูบบุหรี่': 'smoking_allowed'
  }
};

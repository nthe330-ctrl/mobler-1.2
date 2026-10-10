/**
 * MOBLER SEARCH - PHASE 4: DETERMINISTIC LANGUAGE DETECTOR
 * Detects query language and secondary languages based on script and registry hits.
 * (2A C1: Language describes the query text only).
 */

import { SupportedQueryLanguage } from '../contract/types';

export interface LanguageDetectionResult {
  language: SupportedQueryLanguage;
  secondary_languages?: SupportedQueryLanguage[];
}

const THAI_REGEX = /[\u0E00-\u0E7F]/;
const HAN_REGEX = /[\u4E00-\u9FFF]/;
const VIETNAMESE_DIACRITICS_REGEX = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

const UNACCENTED_VIETNAMESE_WORDS = new Set<string>([
  'quan', 'ca', 'phe', 'meo', 'sach', 'yen', 'tinh', 'lam', 'viec', 'thu', 'cung',
  'cho', 'tro', 'truyen', 'tranh', 'uong', 'khong', 'gian', 'hen', 'ho', 'mua',
  'ngoi', 'hoc', 'dem', 'sang', 'chieu', 'banh', 'ngot', 'gan', 'day', 'sai', 'gon',
  'ha', 'noi', 'da', 'nang', 'binh', 'thanh', 'phu', 'nhuan', 'thao', 'dien', 'quan 1', 'quan 2', 'quan 3', 'quan 7'
]);

export function detectLanguage(text: string): LanguageDetectionResult {
  if (!text || text.trim().length === 0) {
    return { language: 'en' };
  }

  const cleanText = text.trim();
  const lowerText = cleanText.toLowerCase();

  const hasThai = THAI_REGEX.test(cleanText);
  const hasHan = HAN_REGEX.test(cleanText);
  const hasViDiacritics = VIETNAMESE_DIACRITICS_REGEX.test(cleanText);

  // Check words
  const words = lowerText.split(/[\s,._\-?!/\\+*&^%$#@~`|()[\]{}'"]+/).filter(w => w.length > 0);
  
  let unaccentedViWordHits = 0;
  for (const word of words) {
    if (UNACCENTED_VIETNAMESE_WORDS.has(word)) {
      unaccentedViWordHits++;
    }
  }

  // Check for presence of English / Latin tokens
  const latinWords = words.filter(w => /^[a-z]+$/.test(w));
  const hasLatin = latinWords.length > 0;

  // 1. Thai
  if (hasThai) {
    const secondary: SupportedQueryLanguage[] = [];
    if (hasLatin) secondary.push('en');
    return {
      language: 'th',
      secondary_languages: secondary.length > 0 ? secondary : undefined
    };
  }

  // 2. Chinese (Traditional Taiwan focus)
  if (hasHan) {
    const secondary: SupportedQueryLanguage[] = [];
    if (hasLatin) secondary.push('en');
    return {
      language: 'zh-TW',
      secondary_languages: secondary.length > 0 ? secondary : undefined
    };
  }

  // 3. Vietnamese
  if (hasViDiacritics || unaccentedViWordHits >= 2 || (unaccentedViWordHits >= 1 && (lowerText.includes('ca phe') || lowerText.includes('quan')))) {
    const secondary: SupportedQueryLanguage[] = [];
    // If there are English loanwords / words like 'cafe', 'board game', 'wifi', 'roastery'
    const englishLoanwords = words.filter(w => ['cafe', 'wifi', 'game', 'board', 'workshop', 'pet', 'cat', 'book'].includes(w));
    if (englishLoanwords.length > 0) {
      secondary.push('en');
    }
    return {
      language: 'vi',
      secondary_languages: secondary.length > 0 ? secondary : undefined
    };
  }

  // 4. Default Latin -> English
  return { language: 'en' };
}

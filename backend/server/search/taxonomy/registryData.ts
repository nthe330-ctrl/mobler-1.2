/**
 * MOBLER SEARCH - MULTILINGUAL TAXONOMY REGISTRY DATA (PHASE 2B)
 * Single Source of Truth for all canonical IDs, multilingual names, synonyms,
 * hierarchy relations, opposites, and verification bounds.
 */

import { TaxonomyEntry } from './types';
import { normalizeTerm } from './normalization';

export const CURRENT_TAXONOMY_VERSION = 'taxo_v16_canonical';

// List of tombstoned (deprecated) canonical IDs that can NEVER be reused
export const TOMBSTONED_CANONICAL_IDS: string[] = [
  'legacy_pet_cafe',
  'old_reading_space',
  'deprecated_outlet_v1'
];

/**
 * Raw definitions for all canonical taxonomy entries.
 */
export const CANONICAL_TAXONOMY_ENTRIES: TaxonomyEntry[] = [
  // =========================================================================
  // 1. PLACE TYPES
  // =========================================================================
  {
    canonical_id: 'cafe',
    type: 'place_type',
    names: {
      en: { text: 'Café', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Quán cà phê', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '咖啡廳', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'คาเฟ่', translation_status: 'draft' }
    },
    synonyms: [
      { language: 'en', term: 'cafe', normalized_term: normalizeTerm('cafe'), confidence: 1.0, provenance: 'curated' },
      { language: 'en', term: 'coffee shop', normalized_term: normalizeTerm('coffee shop'), confidence: 1.0, provenance: 'curated' },
      { language: 'vi', term: 'quán cà phê', normalized_term: normalizeTerm('quán cà phê'), confidence: 1.0, provenance: 'native_review' },
      { language: 'vi', term: 'quán cafe', normalized_term: normalizeTerm('quán cafe'), confidence: 0.98, provenance: 'deterministic' },
      { language: 'zh-TW', term: '咖啡廳', normalized_term: normalizeTerm('咖啡廳'), confidence: 1.0, provenance: 'native_review' },
      { language: 'zh-TW', term: '咖啡館', normalized_term: normalizeTerm('咖啡館'), confidence: 0.98, provenance: 'curated' },
      { language: 'th', term: 'คาเฟ่', normalized_term: normalizeTerm('คาเฟ่'), confidence: 0.85, provenance: 'imported' },
      { language: 'th', term: 'ร้านกาแฟ', normalized_term: normalizeTerm('ร้านกาแฟ'), confidence: 0.85, provenance: 'imported' }
    ],
    related_terms: ['tea_house', 'bakery_cafe'],
    exclusions: [],
    relation_type: 'is_a',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'specialty_roastery',
    type: 'place_type',
    names: {
      en: { text: 'Specialty Roastery', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Xưởng rang cà phê đặc sản', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '自家烘焙精品咖啡館', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'โรงคั่วกาแฟพิเศษ', translation_status: 'needs_native_review' }
    },
    synonyms: [
      { language: 'en', term: 'specialty roastery', normalized_term: normalizeTerm('specialty roastery'), confidence: 1.0, provenance: 'curated' },
      { language: 'en', term: 'coffee roastery', normalized_term: normalizeTerm('coffee roastery'), confidence: 0.95, provenance: 'curated' },
      { language: 'vi', term: 'xưởng rang cà phê', normalized_term: normalizeTerm('xưởng rang cà phê'), confidence: 0.95, provenance: 'native_review' },
      { language: 'zh-TW', term: '自烘咖啡', normalized_term: normalizeTerm('自烘咖啡'), confidence: 0.95, provenance: 'native_review' },
      { language: 'th', term: 'โรงคั่วกาแฟ', normalized_term: normalizeTerm('โรงคั่วกาแฟ'), confidence: 0.8, provenance: 'imported' }
    ],
    related_terms: ['cafe'],
    exclusions: [],
    parent_id: 'cafe',
    relation_type: 'is_a',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'bakery_cafe',
    type: 'place_type',
    names: {
      en: { text: 'Bakery Café', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Tiệm bánh & cà phê', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '烘焙甜點咖啡廳', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'เบเกอรี่คาเฟ่', translation_status: 'draft' }
    },
    synonyms: [
      { language: 'en', term: 'bakery cafe', normalized_term: normalizeTerm('bakery cafe'), confidence: 1.0, provenance: 'curated' },
      { language: 'vi', term: 'tiệm bánh cafe', normalized_term: normalizeTerm('tiệm bánh cafe'), confidence: 0.95, provenance: 'deterministic' },
      { language: 'zh-TW', term: '麵包咖啡廳', normalized_term: normalizeTerm('麵包咖啡廳'), confidence: 0.95, provenance: 'curated' },
      { language: 'th', term: 'คาเฟ่เบเกอรี่', normalized_term: normalizeTerm('คาเฟ่เบเกอรี่'), confidence: 0.8, provenance: 'imported' }
    ],
    related_terms: ['dessert_shop', 'cafe'],
    exclusions: [],
    parent_id: 'cafe',
    relation_type: 'is_a',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'dessert_shop',
    type: 'place_type',
    names: {
      en: { text: 'Dessert Shop', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Tiệm tráng miệng', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '甜點專賣店', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'ร้านขนมหวาน', translation_status: 'draft' }
    },
    synonyms: [
      { language: 'en', term: 'dessert shop', normalized_term: normalizeTerm('dessert shop'), confidence: 1.0, provenance: 'curated' },
      { language: 'vi', term: 'quán tráng miệng', normalized_term: normalizeTerm('quán tráng miệng'), confidence: 0.95, provenance: 'deterministic' },
      { language: 'zh-TW', term: '甜品店', normalized_term: normalizeTerm('甜品店'), confidence: 0.95, provenance: 'curated' },
      { language: 'th', term: 'ร้านของหวาน', normalized_term: normalizeTerm('ร้านของหวาน'), confidence: 0.8, provenance: 'imported' }
    ],
    related_terms: ['bakery_cafe', 'cafe'],
    exclusions: [],
    parent_id: 'cafe',
    relation_type: 'is_a',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'tea_house',
    type: 'place_type',
    names: {
      en: { text: 'Tea House', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Quán trà', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '茶館', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'ร้านน้ำชา', translation_status: 'draft' }
    },
    synonyms: [
      { language: 'en', term: 'tea house', normalized_term: normalizeTerm('tea house'), confidence: 1.0, provenance: 'curated' },
      { language: 'en', term: 'tea room', normalized_term: normalizeTerm('tea room'), confidence: 0.95, provenance: 'curated' },
      { language: 'vi', term: 'tiệm trà', normalized_term: normalizeTerm('tiệm trà'), confidence: 0.95, provenance: 'native_review' },
      { language: 'zh-TW', term: '茶坊', normalized_term: normalizeTerm('茶坊'), confidence: 0.95, provenance: 'curated' },
      { language: 'th', term: 'โรงน้ำชา', normalized_term: normalizeTerm('โรงน้ำชา'), confidence: 0.8, provenance: 'imported' }
    ],
    related_terms: ['cafe'],
    exclusions: [],
    parent_id: 'cafe',
    relation_type: 'is_a',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'bistro',
    type: 'place_type',
    names: {
      en: { text: 'Bistro', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Quán Bistro', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '小餐館', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'บิสโทร', translation_status: 'draft' }
    },
    synonyms: [
      { language: 'en', term: 'bistro', normalized_term: normalizeTerm('bistro'), confidence: 1.0, provenance: 'curated' },
      { language: 'vi', term: 'cafe bistro', normalized_term: normalizeTerm('cafe bistro'), confidence: 0.9, provenance: 'deterministic' },
      { language: 'zh-TW', term: '餐酒咖啡館', normalized_term: normalizeTerm('餐酒咖啡館'), confidence: 0.9, provenance: 'curated' }
    ],
    related_terms: ['cafe'],
    exclusions: [],
    parent_id: 'cafe',
    relation_type: 'is_a',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },

  // =========================================================================
  // 2. THE 16 CANONICAL EXPERIENCES (+ 2A golden fixture experiences)
  // =========================================================================
  {
    canonical_id: 'cat_cafe',
    type: 'experience',
    names: {
      en: { text: 'Cat Café', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Cà phê mèo', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '貓咪咖啡廳', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'คาเฟ่แมว', translation_status: 'draft' }
    },
    synonyms: [
      { language: 'en', term: 'cat cafe', normalized_term: normalizeTerm('cat cafe'), confidence: 1.0, provenance: 'curated' },
      { language: 'en', term: 'cat coffee', normalized_term: normalizeTerm('cat coffee'), confidence: 0.9, provenance: 'curated' },
      { language: 'en', term: 'feline cafe', normalized_term: normalizeTerm('feline cafe'), confidence: 0.9, provenance: 'curated' },
      { language: 'vi', term: 'cà phê mèo', normalized_term: normalizeTerm('cà phê mèo'), confidence: 1.0, provenance: 'native_review' },
      { language: 'vi', term: 'quán cà phê mèo', normalized_term: normalizeTerm('quán cà phê mèo'), confidence: 0.98, provenance: 'native_review' },
      { language: 'vi', term: 'quán mèo', normalized_term: normalizeTerm('quán mèo'), confidence: 0.9, provenance: 'deterministic' },
      { language: 'zh-TW', term: '貓咪咖啡廳', normalized_term: normalizeTerm('貓咪咖啡廳'), confidence: 1.0, provenance: 'native_review' },
      { language: 'zh-TW', term: '貓咖', normalized_term: normalizeTerm('貓咖'), confidence: 0.98, provenance: 'native_review' },
      { language: 'zh-TW', term: '貓咖啡', normalized_term: normalizeTerm('貓咖啡'), confidence: 0.95, provenance: 'curated' },
      { language: 'zh-TW', term: '擼貓咖啡', normalized_term: normalizeTerm('擼貓咖啡'), confidence: 0.92, provenance: 'curated' },
      { language: 'th', term: 'คาเฟ่แมว', normalized_term: normalizeTerm('คาเฟ่แมว'), confidence: 0.85, provenance: 'imported' },
      { language: 'th', term: 'ร้านกาแฟแมว', normalized_term: normalizeTerm('ร้านกาแฟแมว'), confidence: 0.8, provenance: 'imported' }
    ],
    related_terms: ['dog_cafe', 'pet_friendly'],
    exclusions: ['no_pets'],
    parent_id: 'cafe',
    relation_type: 'is_a',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'dog_cafe',
    type: 'experience',
    names: {
      en: { text: 'Dog Café', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Cà phê cún', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '狗狗咖啡廳', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'คาเฟ่สุนัข', translation_status: 'draft' }
    },
    synonyms: [
      { language: 'en', term: 'dog cafe', normalized_term: normalizeTerm('dog cafe'), confidence: 1.0, provenance: 'curated' },
      { language: 'en', term: 'puppy cafe', normalized_term: normalizeTerm('puppy cafe'), confidence: 0.92, provenance: 'curated' },
      { language: 'vi', term: 'cà phê cún', normalized_term: normalizeTerm('cà phê cún'), confidence: 1.0, provenance: 'native_review' },
      { language: 'vi', term: 'quán cà phê chó', normalized_term: normalizeTerm('quán cà phê chó'), confidence: 0.98, provenance: 'native_review' },
      { language: 'zh-TW', term: '狗狗咖啡廳', normalized_term: normalizeTerm('狗狗咖啡廳'), confidence: 1.0, provenance: 'native_review' },
      { language: 'zh-TW', term: '狗咖', normalized_term: normalizeTerm('狗咖'), confidence: 0.95, provenance: 'curated' },
      { language: 'th', term: 'คาเฟ่สุนัข', normalized_term: normalizeTerm('คาเฟ่สุนัข'), confidence: 0.85, provenance: 'imported' },
      { language: 'th', term: 'คาเฟ่หมา', normalized_term: normalizeTerm('คาเฟ่หมา'), confidence: 0.8, provenance: 'imported' }
    ],
    related_terms: ['cat_cafe', 'pet_friendly'],
    exclusions: ['no_pets'],
    parent_id: 'cafe',
    relation_type: 'is_a',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'board_game_cafe',
    type: 'experience',
    names: {
      en: { text: 'Board Game Café', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Cà phê Board Game', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '桌遊咖啡廳', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'คาเฟ่บอร์ดเกม', translation_status: 'draft' }
    },
    synonyms: [
      { language: 'en', term: 'board game cafe', normalized_term: normalizeTerm('board game cafe'), confidence: 1.0, provenance: 'curated' },
      { language: 'en', term: 'tabletop cafe', normalized_term: normalizeTerm('tabletop cafe'), confidence: 0.9, provenance: 'curated' },
      { language: 'vi', term: 'cà phê board game', normalized_term: normalizeTerm('cà phê board game'), confidence: 1.0, provenance: 'native_review' },
      { language: 'vi', term: 'quán board game', normalized_term: normalizeTerm('quán board game'), confidence: 0.95, provenance: 'deterministic' },
      { language: 'zh-TW', term: '桌遊咖啡廳', normalized_term: normalizeTerm('桌遊咖啡廳'), confidence: 1.0, provenance: 'native_review' },
      { language: 'zh-TW', term: '桌遊店', normalized_term: normalizeTerm('桌遊店'), confidence: 0.92, provenance: 'curated' },
      { language: 'th', term: 'คาเฟ่บอร์ดเกม', normalized_term: normalizeTerm('คาเฟ่บอร์ดเกม'), confidence: 0.85, provenance: 'imported' }
    ],
    related_terms: ['console_gaming_cafe', 'gaming'],
    exclusions: [],
    parent_id: 'cafe',
    relation_type: 'is_a',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'workshop_cafe',
    type: 'experience',
    names: {
      en: { text: 'Workshop Café', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Cà phê Workshop', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '手作工作坊', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'คาเฟ่เวิร์กช็อป', translation_status: 'draft' }
    },
    synonyms: [
      { language: 'en', term: 'workshop cafe', normalized_term: normalizeTerm('workshop cafe'), confidence: 1.0, provenance: 'curated' },
      { language: 'en', term: 'craft cafe', normalized_term: normalizeTerm('craft cafe'), confidence: 0.92, provenance: 'curated' },
      { language: 'en', term: 'diy cafe', normalized_term: normalizeTerm('diy cafe'), confidence: 0.9, provenance: 'curated' },
      { language: 'vi', term: 'cà phê workshop', normalized_term: normalizeTerm('cà phê workshop'), confidence: 1.0, provenance: 'native_review' },
      { language: 'vi', term: 'quán workshop', normalized_term: normalizeTerm('quán workshop'), confidence: 0.95, provenance: 'deterministic' },
      { language: 'zh-TW', term: '手作工作坊', normalized_term: normalizeTerm('手作工作坊'), confidence: 1.0, provenance: 'native_review' },
      { language: 'zh-TW', term: '手作咖啡館', normalized_term: normalizeTerm('手作咖啡館'), confidence: 0.95, provenance: 'curated' },
      { language: 'th', term: 'คาเฟ่เวิร์กช็อป', normalized_term: normalizeTerm('คาเฟ่เวิร์กช็อป'), confidence: 0.85, provenance: 'imported' }
    ],
    related_terms: ['ceramic_cafe', 'crafting'],
    exclusions: [],
    parent_id: 'cafe',
    relation_type: 'is_a',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'console_gaming_cafe',
    type: 'experience',
    names: {
      en: { text: 'Console Gaming Café', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Cà phê chơi game Console', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '主機電玩館', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'คาเฟ่เกมคอนโซล', translation_status: 'needs_native_review' }
    },
    synonyms: [
      { language: 'en', term: 'console gaming cafe', normalized_term: normalizeTerm('console gaming cafe'), confidence: 1.0, provenance: 'curated' },
      { language: 'en', term: 'ps5 cafe', normalized_term: normalizeTerm('ps5 cafe'), confidence: 0.95, provenance: 'curated' },
      { language: 'vi', term: 'cà phê chơi game', normalized_term: normalizeTerm('cà phê chơi game'), confidence: 1.0, provenance: 'native_review' },
      { language: 'vi', term: 'quán ps5', normalized_term: normalizeTerm('quán ps5'), confidence: 0.92, provenance: 'deterministic' },
      { language: 'zh-TW', term: '主機電玩館', normalized_term: normalizeTerm('主機電玩館'), confidence: 1.0, provenance: 'native_review' },
      { language: 'zh-TW', term: '電玩咖啡館', normalized_term: normalizeTerm('電玩咖啡館'), confidence: 0.95, provenance: 'curated' },
      { language: 'th', term: 'คาเฟ่เกมคอนโซล', normalized_term: normalizeTerm('คาเฟ่เกมคอนโซล'), confidence: 0.8, provenance: 'imported' }
    ],
    related_terms: ['board_game_cafe', 'vr_cafe', 'gaming'],
    exclusions: [],
    parent_id: 'cafe',
    relation_type: 'is_a',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'book_cafe',
    type: 'experience',
    names: {
      en: { text: 'Book Café', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Cà phê sách', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '靜謐書香館', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'คาเฟ่หนังสือ', translation_status: 'draft' }
    },
    synonyms: [
      { language: 'en', term: 'book cafe', normalized_term: normalizeTerm('book cafe'), confidence: 1.0, provenance: 'curated' },
      { language: 'en', term: 'reading cafe', normalized_term: normalizeTerm('reading cafe'), confidence: 0.95, provenance: 'curated' },
      { language: 'vi', term: 'cà phê sách', normalized_term: normalizeTerm('cà phê sách'), confidence: 1.0, provenance: 'native_review' },
      { language: 'vi', term: 'quán đọc sách', normalized_term: normalizeTerm('quán đọc sách'), confidence: 0.95, provenance: 'native_review' },
      { language: 'zh-TW', term: '靜謐書香館', normalized_term: normalizeTerm('靜謐書香館'), confidence: 1.0, provenance: 'native_review' },
      { language: 'zh-TW', term: '書店咖啡廳', normalized_term: normalizeTerm('書店咖啡廳'), confidence: 0.95, provenance: 'curated' },
      { language: 'zh-TW', term: '書香咖啡', normalized_term: normalizeTerm('書香咖啡'), confidence: 0.92, provenance: 'curated' },
      { language: 'th', term: 'คาเฟ่หนังสือ', normalized_term: normalizeTerm('คาเฟ่หนังสือ'), confidence: 0.85, provenance: 'imported' }
    ],
    related_terms: ['quiet_work', 'study'],
    exclusions: ['crowded'],
    parent_id: 'cafe',
    relation_type: 'is_a',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'plant_cafe',
    type: 'experience',
    names: {
      en: { text: 'Plant Café', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Cà phê cây cảnh', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '植栽咖啡廳', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'คาเฟ่ต้นไม้', translation_status: 'draft' }
    },
    synonyms: [
      { language: 'en', term: 'plant cafe', normalized_term: normalizeTerm('plant cafe'), confidence: 1.0, provenance: 'curated' },
      { language: 'en', term: 'botanical cafe', normalized_term: normalizeTerm('botanical cafe'), confidence: 0.95, provenance: 'curated' },
      { language: 'vi', term: 'cà phê cây xanh', normalized_term: normalizeTerm('cà phê cây xanh'), confidence: 1.0, provenance: 'native_review' },
      { language: 'vi', term: 'cà phê cây cảnh', normalized_term: normalizeTerm('cà phê cây cảnh'), confidence: 0.98, provenance: 'native_review' },
      { language: 'zh-TW', term: '植栽咖啡廳', normalized_term: normalizeTerm('植栽咖啡廳'), confidence: 1.0, provenance: 'native_review' },
      { language: 'zh-TW', term: '植物咖啡館', normalized_term: normalizeTerm('植物咖啡館'), confidence: 0.95, provenance: 'curated' },
      { language: 'th', term: 'คาเฟ่ต้นไม้', normalized_term: normalizeTerm('คาเฟ่ต้นไม้'), confidence: 0.85, provenance: 'imported' }
    ],
    related_terms: ['nature', 'outdoor_seating'],
    exclusions: [],
    parent_id: 'cafe',
    relation_type: 'is_a',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'ceramic_cafe',
    type: 'experience',
    names: {
      en: { text: 'Ceramic Café', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Cà phê gốm', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '陶藝手作館', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'คาเฟ่ปั้นเซรามิก', translation_status: 'needs_native_review' }
    },
    synonyms: [
      { language: 'en', term: 'ceramic cafe', normalized_term: normalizeTerm('ceramic cafe'), confidence: 1.0, provenance: 'curated' },
      { language: 'en', term: 'pottery cafe', normalized_term: normalizeTerm('pottery cafe'), confidence: 0.95, provenance: 'curated' },
      { language: 'vi', term: 'cà phê gốm', normalized_term: normalizeTerm('cà phê gốm'), confidence: 1.0, provenance: 'native_review' },
      { language: 'zh-TW', term: '陶藝手作館', normalized_term: normalizeTerm('陶藝手作館'), confidence: 1.0, provenance: 'native_review' },
      { language: 'zh-TW', term: '陶藝咖啡廳', normalized_term: normalizeTerm('陶藝咖啡廳'), confidence: 0.95, provenance: 'curated' },
      { language: 'th', term: 'คาเฟ่ปั้นเซรามิก', normalized_term: normalizeTerm('คาเฟ่ปั้นเซรามิก'), confidence: 0.8, provenance: 'imported' }
    ],
    related_terms: ['workshop_cafe', 'crafting'],
    exclusions: [],
    parent_id: 'cafe',
    relation_type: 'is_a',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'vinyl_cafe',
    type: 'experience',
    names: {
      en: { text: 'Vinyl Café', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Cà phê đĩa than', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '黑膠唱片館', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'คาเฟ่แผ่นเสียง', translation_status: 'draft' }
    },
    synonyms: [
      { language: 'en', term: 'vinyl cafe', normalized_term: normalizeTerm('vinyl cafe'), confidence: 1.0, provenance: 'curated' },
      { language: 'en', term: 'record cafe', normalized_term: normalizeTerm('record cafe'), confidence: 0.95, provenance: 'curated' },
      { language: 'vi', term: 'cà phê đĩa than', normalized_term: normalizeTerm('cà phê đĩa than'), confidence: 1.0, provenance: 'native_review' },
      { language: 'zh-TW', term: '黑膠唱片館', normalized_term: normalizeTerm('黑膠唱片館'), confidence: 1.0, provenance: 'native_review' },
      { language: 'zh-TW', term: '黑膠咖啡廳', normalized_term: normalizeTerm('黑膠咖啡廳'), confidence: 0.95, provenance: 'curated' },
      { language: 'th', term: 'คาเฟ่แผ่นเสียง', normalized_term: normalizeTerm('คาเฟ่แผ่นเสียง'), confidence: 0.85, provenance: 'imported' }
    ],
    related_terms: ['retro_vintage', 'relax'],
    exclusions: [],
    parent_id: 'cafe',
    relation_type: 'is_a',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'fashion_cafe',
    type: 'experience',
    names: {
      en: { text: 'Fashion Café', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Cà phê thời trang', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '時尚選品館', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'คาเฟ่แฟชั่น', translation_status: 'draft' }
    },
    synonyms: [
      { language: 'en', term: 'fashion cafe', normalized_term: normalizeTerm('fashion cafe'), confidence: 1.0, provenance: 'curated' },
      { language: 'en', term: 'boutique cafe', normalized_term: normalizeTerm('boutique cafe'), confidence: 0.92, provenance: 'curated' },
      { language: 'vi', term: 'cà phê thời trang', normalized_term: normalizeTerm('cà phê thời trang'), confidence: 1.0, provenance: 'native_review' },
      { language: 'zh-TW', term: '時尚選品館', normalized_term: normalizeTerm('時尚選品館'), confidence: 1.0, provenance: 'native_review' },
      { language: 'zh-TW', term: '選品咖啡館', normalized_term: normalizeTerm('選品咖啡館'), confidence: 0.95, provenance: 'curated' },
      { language: 'th', term: 'คาเฟ่แฟชั่น', normalized_term: normalizeTerm('คาเฟ่แฟชั่น'), confidence: 0.85, provenance: 'imported' }
    ],
    related_terms: ['shopping', 'artistic'],
    exclusions: [],
    parent_id: 'cafe',
    relation_type: 'is_a',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'art_toy_cafe',
    type: 'experience',
    names: {
      en: { text: 'Art Toy Café', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Cà phê mô hình Art Toy', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '潮玩盲盒館', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'คาเฟ่อาร์ตทอย', translation_status: 'needs_native_review' }
    },
    synonyms: [
      { language: 'en', term: 'art toy cafe', normalized_term: normalizeTerm('art toy cafe'), confidence: 1.0, provenance: 'curated' },
      { language: 'en', term: 'blind box cafe', normalized_term: normalizeTerm('blind box cafe'), confidence: 0.95, provenance: 'curated' },
      { language: 'vi', term: 'cà phê mô hình', normalized_term: normalizeTerm('cà phê mô hình'), confidence: 1.0, provenance: 'native_review' },
      { language: 'vi', term: 'quán blindbox', normalized_term: normalizeTerm('quán blindbox'), confidence: 0.9, provenance: 'deterministic' },
      { language: 'zh-TW', term: '潮玩盲盒館', normalized_term: normalizeTerm('潮玩盲盒館'), confidence: 1.0, provenance: 'native_review' },
      { language: 'zh-TW', term: '盲盒咖啡廳', normalized_term: normalizeTerm('盲盒咖啡廳'), confidence: 0.95, provenance: 'curated' },
      { language: 'th', term: 'คาเฟ่อาร์ตทอย', normalized_term: normalizeTerm('คาเฟ่อาร์ตทอย'), confidence: 0.8, provenance: 'imported' }
    ],
    related_terms: ['anime_cafe', 'shopping'],
    exclusions: [],
    parent_id: 'cafe',
    relation_type: 'is_a',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'anime_cafe',
    type: 'experience',
    names: {
      en: { text: 'Anime Café', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Cà phê Anime', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '動漫主題館', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'คาเฟ่อนิเมะ', translation_status: 'draft' }
    },
    synonyms: [
      { language: 'en', term: 'anime cafe', normalized_term: normalizeTerm('anime cafe'), confidence: 1.0, provenance: 'curated' },
      { language: 'en', term: 'manga cafe', normalized_term: normalizeTerm('manga cafe'), confidence: 0.95, provenance: 'curated' },
      { language: 'vi', term: 'cà phê anime', normalized_term: normalizeTerm('cà phê anime'), confidence: 1.0, provenance: 'native_review' },
      { language: 'zh-TW', term: '動漫主題館', normalized_term: normalizeTerm('動漫主題館'), confidence: 1.0, provenance: 'native_review' },
      { language: 'zh-TW', term: '動漫咖啡廳', normalized_term: normalizeTerm('動漫咖啡廳'), confidence: 0.95, provenance: 'curated' },
      { language: 'th', term: 'คาเฟ่อนิเมะ', normalized_term: normalizeTerm('คาเฟ่อนิเมะ'), confidence: 0.85, provenance: 'imported' }
    ],
    related_terms: ['art_toy_cafe', 'cosplay'],
    exclusions: [],
    parent_id: 'cafe',
    relation_type: 'is_a',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'vr_cafe',
    type: 'experience',
    names: {
      en: { text: 'VR Café', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Cà phê thực tế ảo VR', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: 'VR虛擬實境', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'คาเฟ่ VR', translation_status: 'draft' }
    },
    synonyms: [
      { language: 'en', term: 'vr cafe', normalized_term: normalizeTerm('vr cafe'), confidence: 1.0, provenance: 'curated' },
      { language: 'en', term: 'virtual reality cafe', normalized_term: normalizeTerm('virtual reality cafe'), confidence: 0.95, provenance: 'curated' },
      { language: 'vi', term: 'cà phê thực tế ảo', normalized_term: normalizeTerm('cà phê thực tế ảo'), confidence: 1.0, provenance: 'native_review' },
      { language: 'zh-TW', term: 'VR虛擬實境', normalized_term: normalizeTerm('VR虛擬實境'), confidence: 1.0, provenance: 'native_review' },
      { language: 'zh-TW', term: 'VR咖啡廳', normalized_term: normalizeTerm('VR咖啡廳'), confidence: 0.95, provenance: 'curated' },
      { language: 'th', term: 'คาเฟ่ VR', normalized_term: normalizeTerm('คาเฟ่ VR'), confidence: 0.85, provenance: 'imported' }
    ],
    related_terms: ['console_gaming_cafe', 'immersive_cafe'],
    exclusions: [],
    parent_id: 'cafe',
    relation_type: 'is_a',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'immersive_cafe',
    type: 'experience',
    names: {
      en: { text: 'Immersive Café', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Cà phê ánh sáng đa giác quan', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '光影沉浸館', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'คาเฟ่แสงสีอิมเมอร์ซีฟ', translation_status: 'needs_native_review' }
    },
    synonyms: [
      { language: 'en', term: 'immersive cafe', normalized_term: normalizeTerm('immersive cafe'), confidence: 1.0, provenance: 'curated' },
      { language: 'en', term: 'projection cafe', normalized_term: normalizeTerm('projection cafe'), confidence: 0.9, provenance: 'curated' },
      { language: 'vi', term: 'cà phê ánh sáng', normalized_term: normalizeTerm('cà phê ánh sáng'), confidence: 0.95, provenance: 'native_review' },
      { language: 'zh-TW', term: '光影沉浸館', normalized_term: normalizeTerm('光影沉浸館'), confidence: 1.0, provenance: 'native_review' },
      { language: 'zh-TW', term: '沉浸式咖啡廳', normalized_term: normalizeTerm('沉浸式咖啡廳'), confidence: 0.95, provenance: 'curated' },
      { language: 'th', term: 'คาเฟ่อิมเมอร์ซีฟ', normalized_term: normalizeTerm('คาเฟ่อิมเมอร์ซีฟ'), confidence: 0.8, provenance: 'imported' }
    ],
    related_terms: ['artistic', 'photography'],
    exclusions: [],
    parent_id: 'cafe',
    relation_type: 'is_a',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'car_workshop_cafe',
    type: 'experience',
    names: {
      en: { text: 'Car Workshop Café', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Cà phê Gara ô tô', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '老車車庫館', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'คาเฟ่อู่รถยนต์', translation_status: 'draft' }
    },
    synonyms: [
      { language: 'en', term: 'car workshop cafe', normalized_term: normalizeTerm('car workshop cafe'), confidence: 1.0, provenance: 'curated' },
      { language: 'en', term: 'garage cafe', normalized_term: normalizeTerm('garage cafe'), confidence: 0.95, provenance: 'curated' },
      { language: 'vi', term: 'cà phê xe hơi', normalized_term: normalizeTerm('cà phê xe hơi'), confidence: 1.0, provenance: 'native_review' },
      { language: 'zh-TW', term: '老車車庫館', normalized_term: normalizeTerm('老車車庫館'), confidence: 1.0, provenance: 'native_review' },
      { language: 'zh-TW', term: '車庫咖啡館', normalized_term: normalizeTerm('車庫咖啡館'), confidence: 0.95, provenance: 'curated' },
      { language: 'th', term: 'คาเฟ่อู่รถยนต์', normalized_term: normalizeTerm('คาเฟ่อู่รถยนต์'), confidence: 0.85, provenance: 'imported' }
    ],
    related_terms: ['moto_workshop_cafe', 'retro_vintage'],
    exclusions: [],
    parent_id: 'cafe',
    relation_type: 'is_a',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'moto_workshop_cafe',
    type: 'experience',
    names: {
      en: { text: 'Moto Workshop Café', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Cà phê Biker môtô', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '重機俱樂部', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'คาเฟ่บิ๊กไบค์', translation_status: 'draft' }
    },
    synonyms: [
      { language: 'en', term: 'moto workshop cafe', normalized_term: normalizeTerm('moto workshop cafe'), confidence: 1.0, provenance: 'curated' },
      { language: 'en', term: 'biker cafe', normalized_term: normalizeTerm('biker cafe'), confidence: 0.95, provenance: 'curated' },
      { language: 'vi', term: 'cà phê môtô', normalized_term: normalizeTerm('cà phê môtô'), confidence: 1.0, provenance: 'native_review' },
      { language: 'zh-TW', term: '重機俱樂部', normalized_term: normalizeTerm('重機俱樂部'), confidence: 1.0, provenance: 'native_review' },
      { language: 'zh-TW', term: '重機咖啡廳', normalized_term: normalizeTerm('重機咖啡廳'), confidence: 0.95, provenance: 'curated' },
      { language: 'th', term: 'คาเฟ่บิ๊กไบค์', normalized_term: normalizeTerm('คาเฟ่บิ๊กไบค์'), confidence: 0.85, provenance: 'imported' }
    ],
    related_terms: ['car_workshop_cafe', 'industrial'],
    exclusions: [],
    parent_id: 'cafe',
    relation_type: 'is_a',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },

  // Fixture & Compatibility Experiences:
  {
    canonical_id: 'quiet_work',
    type: 'experience',
    names: {
      en: { text: 'Quiet Work Space', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Yên tĩnh làm việc', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '安靜工作', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'พื้นที่ทำงานเงียบสงบ', translation_status: 'needs_native_review' }
    },
    synonyms: [
      { language: 'en', term: 'quiet work', normalized_term: normalizeTerm('quiet work'), confidence: 1.0, provenance: 'curated' },
      { language: 'vi', term: 'yên tĩnh làm việc', normalized_term: normalizeTerm('yên tĩnh làm việc'), confidence: 1.0, provenance: 'native_review' },
      { language: 'zh-TW', term: '安靜工作', normalized_term: normalizeTerm('安靜工作'), confidence: 1.0, provenance: 'native_review' }
    ],
    related_terms: ['work_friendly', 'book_cafe'],
    exclusions: ['crowded'],
    parent_id: 'cafe',
    relation_type: 'is_a',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'reading_nook',
    type: 'experience',
    names: {
      en: { text: 'Reading Nook', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Góc đọc sách thư giãn', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '閱讀角落', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'มุมอ่านหนังสือ', translation_status: 'needs_native_review' }
    },
    synonyms: [
      { language: 'en', term: 'reading nook', normalized_term: normalizeTerm('reading nook'), confidence: 1.0, provenance: 'curated' },
      { language: 'vi', term: 'góc đọc sách thư giãn', normalized_term: normalizeTerm('góc đọc sách thư giãn'), confidence: 1.0, provenance: 'native_review' },
      { language: 'zh-TW', term: '閱讀角落', normalized_term: normalizeTerm('閱讀角落'), confidence: 1.0, provenance: 'native_review' }
    ],
    related_terms: ['book_cafe'],
    exclusions: ['crowded'],
    parent_id: 'book_cafe',
    relation_type: 'is_a',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'laptop_friendly',
    type: 'experience',
    names: {
      en: { text: 'Laptop Friendly', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Thích hợp dùng laptop', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '適合筆電工作', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'เหมาะสำหรับทำงานแล็ปท็อป', translation_status: 'needs_native_review' }
    },
    synonyms: [
      { language: 'en', term: 'laptop friendly', normalized_term: normalizeTerm('laptop friendly'), confidence: 1.0, provenance: 'curated' },
      { language: 'vi', term: 'cắm laptop', normalized_term: normalizeTerm('cắm laptop'), confidence: 0.95, provenance: 'deterministic' },
      { language: 'zh-TW', term: '筆電友善', normalized_term: normalizeTerm('筆電友善'), confidence: 0.95, provenance: 'native_review' }
    ],
    related_terms: ['work_friendly', 'power_outlet'],
    exclusions: [],
    parent_id: 'quiet_work',
    relation_type: 'is_a',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'deep_focus',
    type: 'experience',
    names: {
      en: { text: 'Deep Focus', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Tập trung chuyên sâu', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '高度專注', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'มีสมาธิสูง', translation_status: 'needs_native_review' }
    },
    synonyms: [
      { language: 'en', term: 'deep focus', normalized_term: normalizeTerm('deep focus'), confidence: 1.0, provenance: 'curated' },
      { language: 'vi', term: 'tập trung', normalized_term: normalizeTerm('tập trung'), confidence: 0.95, provenance: 'native_review' },
      { language: 'zh-TW', term: '專注讀書', normalized_term: normalizeTerm('專注讀書'), confidence: 0.95, provenance: 'native_review' }
    ],
    related_terms: ['quiet_work'],
    exclusions: ['crowded'],
    parent_id: 'quiet_work',
    relation_type: 'is_a',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'dating_cozy',
    type: 'experience',
    names: {
      en: { text: 'Cozy Dating Vibe', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Hẹn hò lãng mạn ấm cúng', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '浪漫溫馨約會', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'บรรยากาศเดทอบอุ่น', translation_status: 'needs_native_review' }
    },
    synonyms: [
      { language: 'en', term: 'dating cozy', normalized_term: normalizeTerm('dating cozy'), confidence: 1.0, provenance: 'curated' },
      { language: 'vi', term: 'hẹn hò', normalized_term: normalizeTerm('hẹn hò'), confidence: 0.95, provenance: 'native_review' },
      { language: 'zh-TW', term: '約會咖啡', normalized_term: normalizeTerm('約會咖啡'), confidence: 0.95, provenance: 'native_review' }
    ],
    related_terms: ['romantic', 'date'],
    exclusions: [],
    parent_id: 'cafe',
    relation_type: 'is_a',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'social_gathering',
    type: 'experience',
    names: {
      en: { text: 'Social Gathering', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Tụ tập bạn bè', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '聚會暢聊', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'พบปะสังสรรค์', translation_status: 'needs_native_review' }
    },
    synonyms: [
      { language: 'en', term: 'social gathering', normalized_term: normalizeTerm('social gathering'), confidence: 1.0, provenance: 'curated' },
      { language: 'vi', term: 'tụ tập nhóm', normalized_term: normalizeTerm('tụ tập nhóm'), confidence: 0.95, provenance: 'native_review' },
      { language: 'zh-TW', term: '聚會聊天', normalized_term: normalizeTerm('聚會聊天'), confidence: 0.95, provenance: 'native_review' }
    ],
    related_terms: ['social'],
    exclusions: [],
    parent_id: 'cafe',
    relation_type: 'is_a',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },

  // Style / Vibe experiences from existing code
  {
    canonical_id: 'cozy_modern',
    type: 'experience',
    names: {
      en: { text: 'Cozy Modern', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Ấm cúng hiện đại', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '溫馨現代', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'อบอุ่นทันสมัย', translation_status: 'draft' }
    },
    synonyms: [
      { language: 'en', term: 'cozy modern', normalized_term: normalizeTerm('cozy modern'), confidence: 1.0, provenance: 'curated' },
      { language: 'vi', term: 'ấm cúng', normalized_term: normalizeTerm('ấm cúng'), confidence: 0.95, provenance: 'native_review' },
      { language: 'zh-TW', term: '溫馨現代', normalized_term: normalizeTerm('溫馨現代'), confidence: 1.0, provenance: 'native_review' }
    ],
    related_terms: ['relax'],
    exclusions: [],
    parent_id: 'cafe',
    relation_type: 'is_a',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'retro_vintage',
    type: 'experience',
    names: {
      en: { text: 'Retro Vintage', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Cổ điển hoài niệm', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '復古懷舊', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'วินเทจย้อนยุค', translation_status: 'draft' }
    },
    synonyms: [
      { language: 'en', term: 'retro vintage', normalized_term: normalizeTerm('retro vintage'), confidence: 1.0, provenance: 'curated' },
      { language: 'vi', term: 'cổ điển', normalized_term: normalizeTerm('cổ điển'), confidence: 0.95, provenance: 'native_review' },
      { language: 'zh-TW', term: '復古風', normalized_term: normalizeTerm('復古風'), confidence: 0.95, provenance: 'native_review' }
    ],
    related_terms: ['vinyl_cafe'],
    exclusions: [],
    parent_id: 'cafe',
    relation_type: 'is_a',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'minimalist',
    type: 'experience',
    names: {
      en: { text: 'Minimalist', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Tối giản tinh tế', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '極簡純白', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'มินิมอล', translation_status: 'draft' }
    },
    synonyms: [
      { language: 'en', term: 'minimalist', normalized_term: normalizeTerm('minimalist'), confidence: 1.0, provenance: 'curated' },
      { language: 'vi', term: 'tối giản', normalized_term: normalizeTerm('tối giản'), confidence: 0.95, provenance: 'native_review' },
      { language: 'zh-TW', term: '簡約風', normalized_term: normalizeTerm('簡約風'), confidence: 0.95, provenance: 'native_review' }
    ],
    related_terms: ['quiet_work'],
    exclusions: [],
    parent_id: 'cafe',
    relation_type: 'is_a',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'nature',
    type: 'experience',
    names: {
      en: { text: 'Nature Botanical', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Thiên nhiên xanh mát', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '大自然景觀', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'ธรรมชาติร่มรื่น', translation_status: 'draft' }
    },
    synonyms: [
      { language: 'en', term: 'nature botanical', normalized_term: normalizeTerm('nature botanical'), confidence: 1.0, provenance: 'curated' },
      { language: 'vi', term: 'thiên nhiên', normalized_term: normalizeTerm('thiên nhiên'), confidence: 0.95, provenance: 'native_review' },
      { language: 'zh-TW', term: '森林系', normalized_term: normalizeTerm('森林系'), confidence: 0.95, provenance: 'native_review' }
    ],
    related_terms: ['plant_cafe', 'outdoor_seating'],
    exclusions: [],
    parent_id: 'cafe',
    relation_type: 'is_a',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'cute',
    type: 'experience',
    names: {
      en: { text: 'Cute Aesthetic', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Dễ thương ngọt ngào', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '可愛打卡', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'น่ารักหวานแหวว', translation_status: 'draft' }
    },
    synonyms: [
      { language: 'en', term: 'cute aesthetic', normalized_term: normalizeTerm('cute aesthetic'), confidence: 1.0, provenance: 'curated' },
      { language: 'vi', term: 'dễ thương', normalized_term: normalizeTerm('dễ thương'), confidence: 0.95, provenance: 'native_review' },
      { language: 'zh-TW', term: '可愛風', normalized_term: normalizeTerm('可愛風'), confidence: 0.95, provenance: 'native_review' }
    ],
    related_terms: ['photography'],
    exclusions: [],
    parent_id: 'cafe',
    relation_type: 'is_a',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'industrial',
    type: 'experience',
    names: {
      en: { text: 'Industrial Loft', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Công nghiệp Industrial', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '工業風', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'อินดัสเทรียลลอฟท์', translation_status: 'draft' }
    },
    synonyms: [
      { language: 'en', term: 'industrial loft', normalized_term: normalizeTerm('industrial loft'), confidence: 1.0, provenance: 'curated' },
      { language: 'vi', term: 'công nghiệp', normalized_term: normalizeTerm('công nghiệp'), confidence: 0.95, provenance: 'native_review' },
      { language: 'zh-TW', term: '工業風', normalized_term: normalizeTerm('工業風'), confidence: 1.0, provenance: 'native_review' }
    ],
    related_terms: ['moto_workshop_cafe'],
    exclusions: [],
    parent_id: 'cafe',
    relation_type: 'is_a',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'artistic',
    type: 'experience',
    names: {
      en: { text: 'Artistic Gallery', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Nghệ thuật triển lãm', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '藝術藝廊', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'อาร์ตแกลเลอรี', translation_status: 'draft' }
    },
    synonyms: [
      { language: 'en', term: 'artistic gallery', normalized_term: normalizeTerm('artistic gallery'), confidence: 1.0, provenance: 'curated' },
      { language: 'vi', term: 'nghệ thuật', normalized_term: normalizeTerm('nghệ thuật'), confidence: 0.95, provenance: 'native_review' },
      { language: 'zh-TW', term: '藝廊風', normalized_term: normalizeTerm('藝廊風'), confidence: 0.95, provenance: 'native_review' }
    ],
    related_terms: ['photography', 'fashion_cafe'],
    exclusions: [],
    parent_id: 'cafe',
    relation_type: 'is_a',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'futuristic',
    type: 'experience',
    names: {
      en: { text: 'Futuristic Cyberpunk', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Tương lai Cyberpunk', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '未來感賽博龐克', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'ไซเบอร์พังก์ล้ำสมัย', translation_status: 'draft' }
    },
    synonyms: [
      { language: 'en', term: 'futuristic cyberpunk', normalized_term: normalizeTerm('futuristic cyberpunk'), confidence: 1.0, provenance: 'curated' },
      { language: 'vi', term: 'tương lai', normalized_term: normalizeTerm('tương lai'), confidence: 0.95, provenance: 'native_review' },
      { language: 'zh-TW', term: '賽博龐克', normalized_term: normalizeTerm('賽博龐克'), confidence: 0.95, provenance: 'native_review' }
    ],
    related_terms: ['vr_cafe', 'console_gaming_cafe'],
    exclusions: [],
    parent_id: 'cafe',
    relation_type: 'is_a',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },

  // =========================================================================
  // 3. ATTRIBUTES
  // =========================================================================
  {
    canonical_id: 'quiet',
    type: 'attribute',
    names: {
      en: { text: 'Quiet Environment', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Không gian yên tĩnh', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '安靜環境', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'เงียบสงบ', translation_status: 'draft' }
    },
    synonyms: [
      { language: 'en', term: 'quiet', normalized_term: normalizeTerm('quiet'), confidence: 1.0, provenance: 'curated' },
      { language: 'en', term: 'silent', normalized_term: normalizeTerm('silent'), confidence: 0.95, provenance: 'curated' },
      { language: 'vi', term: 'yên tĩnh', normalized_term: normalizeTerm('yên tĩnh'), confidence: 1.0, provenance: 'native_review' },
      { language: 'zh-TW', term: '安靜', normalized_term: normalizeTerm('安靜'), confidence: 1.0, provenance: 'native_review' },
      { language: 'th', term: 'เงียบสงบ', normalized_term: normalizeTerm('เงียบสงบ'), confidence: 0.85, provenance: 'imported' }
    ],
    related_terms: ['work_friendly', 'study_friendly'],
    exclusions: [],
    opposite_of: 'crowded',
    verifiable_by: ['mobler_review', 'mobler_shop', 'mobler_checkin'],
    verification_rules_ref: 'rule_attr_quiet_v1',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'work_friendly',
    type: 'attribute',
    names: {
      en: { text: 'Work Friendly', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Phù hợp làm việc', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '適合工作', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'เหมาะสำหรับทำงาน', translation_status: 'draft' }
    },
    synonyms: [
      { language: 'en', term: 'work friendly', normalized_term: normalizeTerm('work friendly'), confidence: 1.0, provenance: 'curated' },
      { language: 'vi', term: 'làm việc', normalized_term: normalizeTerm('làm việc'), confidence: 0.95, provenance: 'native_review' },
      { language: 'zh-TW', term: '工作友善', normalized_term: normalizeTerm('工作友善'), confidence: 0.95, provenance: 'native_review' },
      { language: 'th', term: 'นั่งทำงานได้', normalized_term: normalizeTerm('นั่งทำงานได้'), confidence: 0.85, provenance: 'imported' }
    ],
    related_terms: ['quiet', 'wifi', 'power_outlet'],
    exclusions: [],
    verifiable_by: ['mobler_review', 'mobler_shop', 'mobler_checkin'],
    verification_rules_ref: 'rule_attr_work_friendly_v1',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'study_friendly',
    type: 'attribute',
    names: {
      en: { text: 'Study Friendly', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Phù hợp học bài', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '適合讀書學習', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'เหมาะสำหรับอ่านหนังสือ', translation_status: 'draft' }
    },
    synonyms: [
      { language: 'en', term: 'study friendly', normalized_term: normalizeTerm('study friendly'), confidence: 1.0, provenance: 'curated' },
      { language: 'vi', term: 'học bài', normalized_term: normalizeTerm('học bài'), confidence: 0.95, provenance: 'native_review' },
      { language: 'zh-TW', term: '讀書友善', normalized_term: normalizeTerm('讀書友善'), confidence: 0.95, provenance: 'native_review' },
      { language: 'th', term: 'อ่านหนังสือ', normalized_term: normalizeTerm('อ่านหนังสือ'), confidence: 0.85, provenance: 'imported' }
    ],
    related_terms: ['work_friendly', 'quiet'],
    exclusions: [],
    parent_id: 'work_friendly',
    relation_type: 'is_a',
    verifiable_by: ['mobler_review', 'mobler_shop'],
    verification_rules_ref: 'rule_attr_study_v1',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'wifi',
    type: 'attribute',
    names: {
      en: { text: 'Wi-Fi Available', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Có Wi-Fi', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '提供無線網路 (Wi-Fi)', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'มี Wi-Fi', translation_status: 'draft' }
    },
    synonyms: [
      { language: 'en', term: 'wifi', normalized_term: normalizeTerm('wifi'), confidence: 1.0, provenance: 'curated' },
      { language: 'en', term: 'wi-fi', normalized_term: normalizeTerm('wi-fi'), confidence: 1.0, provenance: 'curated' },
      { language: 'vi', term: 'wifi', normalized_term: normalizeTerm('wifi'), confidence: 1.0, provenance: 'native_review' },
      { language: 'vi', term: 'wi-fi', normalized_term: normalizeTerm('wi-fi'), confidence: 1.0, provenance: 'native_review' },
      { language: 'zh-TW', term: 'wifi', normalized_term: normalizeTerm('wifi'), confidence: 1.0, provenance: 'native_review' },
      { language: 'zh-TW', term: '無線網路', normalized_term: normalizeTerm('無線網路'), confidence: 0.98, provenance: 'native_review' },
      { language: 'th', term: 'ไวไฟ', normalized_term: normalizeTerm('ไวไฟ'), confidence: 0.85, provenance: 'imported' }
    ],
    related_terms: ['good_wifi'],
    exclusions: [],
    verifiable_by: ['mobler_shop', 'mobler_review', 'mobler_tag'],
    verification_rules_ref: 'rule_attr_wifi_v1',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'good_wifi',
    type: 'attribute',
    names: {
      en: { text: 'Fast & Reliable Wi-Fi', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Wi-Fi tốc độ cao', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '高速穩定 Wi-Fi', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'Wi-Fi ความเร็วสูง', translation_status: 'needs_native_review' }
    },
    synonyms: [
      { language: 'en', term: 'good wifi', normalized_term: normalizeTerm('good wifi'), confidence: 1.0, provenance: 'curated' },
      { language: 'en', term: 'fast wifi', normalized_term: normalizeTerm('fast wifi'), confidence: 0.95, provenance: 'curated' },
      { language: 'vi', term: 'wifi tốt', normalized_term: normalizeTerm('wifi tốt'), confidence: 1.0, provenance: 'native_review' },
      { language: 'zh-TW', term: '網速快', normalized_term: normalizeTerm('網速快'), confidence: 0.95, provenance: 'native_review' },
      { language: 'th', term: 'ไวไฟเร็ว', normalized_term: normalizeTerm('ไวไฟเร็ว'), confidence: 0.8, provenance: 'imported' }
    ],
    related_terms: ['wifi'],
    exclusions: [],
    parent_id: 'wifi',
    relation_type: 'is_a',
    verifiable_by: ['mobler_review', 'mobler_checkin'],
    verification_rules_ref: 'rule_attr_good_wifi_v1',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'power_outlet',
    type: 'attribute',
    names: {
      en: { text: 'Power Outlets', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Ổ cắm điện', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '充電插座', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'ปลั๊กไฟ', translation_status: 'draft' }
    },
    synonyms: [
      { language: 'en', term: 'power outlet', normalized_term: normalizeTerm('power outlet'), confidence: 1.0, provenance: 'curated' },
      { language: 'en', term: 'power outlets', normalized_term: normalizeTerm('power outlets'), confidence: 0.98, provenance: 'deterministic' },
      { language: 'en', term: 'charging station', normalized_term: normalizeTerm('charging station'), confidence: 0.95, provenance: 'curated' },
      { language: 'vi', term: 'ổ cắm điện', normalized_term: normalizeTerm('ổ cắm điện'), confidence: 1.0, provenance: 'native_review' },
      { language: 'vi', term: 'chỗ sạc', normalized_term: normalizeTerm('chỗ sạc'), confidence: 0.95, provenance: 'native_review' },
      { language: 'zh-TW', term: '插座', normalized_term: normalizeTerm('插座'), confidence: 1.0, provenance: 'native_review' },
      { language: 'zh-TW', term: '充電座', normalized_term: normalizeTerm('充電座'), confidence: 0.98, provenance: 'native_review' },
      { language: 'th', term: 'ปลั๊กไฟ', normalized_term: normalizeTerm('ปลั๊กไฟ'), confidence: 0.85, provenance: 'imported' }
    ],
    related_terms: ['work_friendly'],
    exclusions: [],
    verifiable_by: ['mobler_shop', 'mobler_review'],
    verification_rules_ref: 'rule_attr_power_v1',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'power_outlets',
    type: 'attribute',
    names: {
      en: { text: 'Plentiful Power Outlets', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Nhiều ổ cắm điện', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '插座充足', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'มีปลั๊กไฟหลายจุด', translation_status: 'needs_native_review' }
    },
    synonyms: [
      { language: 'en', term: 'power outlets', normalized_term: normalizeTerm('power outlets'), confidence: 1.0, provenance: 'curated' },
      { language: 'vi', term: 'nhiều ổ điện', normalized_term: normalizeTerm('nhiều ổ điện'), confidence: 0.95, provenance: 'native_review' },
      { language: 'zh-TW', term: '每個座位有插座', normalized_term: normalizeTerm('每個座位有插座'), confidence: 0.95, provenance: 'native_review' }
    ],
    related_terms: ['power_outlet'],
    exclusions: [],
    parent_id: 'power_outlet',
    relation_type: 'is_a',
    verifiable_by: ['mobler_shop', 'mobler_review'],
    verification_rules_ref: 'rule_attr_power_plentiful_v1',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'outdoor_seating',
    type: 'attribute',
    names: {
      en: { text: 'Outdoor Seating', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Chỗ ngồi ngoài trời', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '戶外座位', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'ที่นั่งกลางแจ้ง', translation_status: 'draft' }
    },
    synonyms: [
      { language: 'en', term: 'outdoor seating', normalized_term: normalizeTerm('outdoor seating'), confidence: 1.0, provenance: 'curated' },
      { language: 'en', term: 'outdoor', normalized_term: normalizeTerm('outdoor'), confidence: 0.95, provenance: 'curated' },
      { language: 'vi', term: 'ngoài trời', normalized_term: normalizeTerm('ngoài trời'), confidence: 1.0, provenance: 'native_review' },
      { language: 'vi', term: 'sân vườn', normalized_term: normalizeTerm('sân vườn'), confidence: 0.9, provenance: 'native_review' },
      { language: 'zh-TW', term: '戶外座位', normalized_term: normalizeTerm('戶外座位'), confidence: 1.0, provenance: 'native_review' },
      { language: 'zh-TW', term: '露天座位', normalized_term: normalizeTerm('露天座位'), confidence: 0.95, provenance: 'curated' },
      { language: 'th', term: 'ที่นั่งกลางแจ้ง', normalized_term: normalizeTerm('ที่นั่งกลางแจ้ง'), confidence: 0.85, provenance: 'imported' }
    ],
    related_terms: ['nature'],
    exclusions: [],
    verifiable_by: ['mobler_shop', 'mobler_review'],
    verification_rules_ref: 'rule_attr_outdoor_v1',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'pet_friendly',
    type: 'attribute',
    names: {
      en: { text: 'Pet Friendly', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Cho phép thú cưng', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '寵物友善', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'สัตว์เลี้ยงเข้าได้', translation_status: 'draft' }
    },
    synonyms: [
      { language: 'en', term: 'pet friendly', normalized_term: normalizeTerm('pet friendly'), confidence: 1.0, provenance: 'curated' },
      { language: 'en', term: 'dog friendly', normalized_term: normalizeTerm('dog friendly'), confidence: 0.95, provenance: 'curated' },
      { language: 'vi', term: 'cho phép thú cưng', normalized_term: normalizeTerm('cho phép thú cưng'), confidence: 1.0, provenance: 'native_review' },
      { language: 'zh-TW', term: '寵物友善', normalized_term: normalizeTerm('寵物友善'), confidence: 1.0, provenance: 'native_review' },
      { language: 'th', term: 'สัตว์เลี้ยงเข้าได้', normalized_term: normalizeTerm('สัตว์เลี้ยงเข้าได้'), confidence: 0.85, provenance: 'imported' }
    ],
    related_terms: ['cat_cafe', 'dog_cafe'],
    exclusions: ['no_pets'],
    verifiable_by: ['mobler_shop', 'mobler_review'],
    verification_rules_ref: 'rule_attr_pet_friendly_v1',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'parking',
    type: 'attribute',
    names: {
      en: { text: 'Parking Available', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Có chỗ đỗ xe', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '提供停車位', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'มีที่จอดรถ', translation_status: 'draft' }
    },
    synonyms: [
      { language: 'en', term: 'parking', normalized_term: normalizeTerm('parking'), confidence: 1.0, provenance: 'curated' },
      { language: 'en', term: 'car park', normalized_term: normalizeTerm('car park'), confidence: 0.92, provenance: 'curated' },
      { language: 'vi', term: 'chỗ giữ xe', normalized_term: normalizeTerm('chỗ giữ xe'), confidence: 1.0, provenance: 'native_review' },
      { language: 'vi', term: 'bãi đỗ xe', normalized_term: normalizeTerm('bãi đỗ xe'), confidence: 0.98, provenance: 'native_review' },
      { language: 'zh-TW', term: '停車場', normalized_term: normalizeTerm('停車場'), confidence: 1.0, provenance: 'native_review' },
      { language: 'th', term: 'ที่จอดรถ', normalized_term: normalizeTerm('ที่จอดรถ'), confidence: 0.85, provenance: 'imported' }
    ],
    related_terms: ['parking_available'],
    exclusions: [],
    verifiable_by: ['mobler_shop', 'mobler_review'],
    verification_rules_ref: 'rule_attr_parking_v1',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'parking_available',
    type: 'attribute',
    names: {
      en: { text: 'Parking Available', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Có chỗ gửi xe', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '有停車位', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'ที่จอดรถพร้อมให้บริการ', translation_status: 'needs_native_review' }
    },
    synonyms: [
      { language: 'en', term: 'parking available', normalized_term: normalizeTerm('parking available'), confidence: 1.0, provenance: 'curated' },
      { language: 'vi', term: 'gửi xe', normalized_term: normalizeTerm('gửi xe'), confidence: 0.95, provenance: 'native_review' },
      { language: 'zh-TW', term: '好停車', normalized_term: normalizeTerm('好停車'), confidence: 0.95, provenance: 'native_review' }
    ],
    related_terms: ['parking'],
    exclusions: [],
    parent_id: 'parking',
    relation_type: 'is_a',
    verifiable_by: ['mobler_shop', 'mobler_review'],
    verification_rules_ref: 'rule_attr_parking_avail_v1',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'accessible',
    type: 'attribute',
    names: {
      en: { text: 'Wheelchair Accessible', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Lối đi xe lăn', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '無障礙友善', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'รองรับวีลแชร์', translation_status: 'draft' }
    },
    synonyms: [
      { language: 'en', term: 'accessible', normalized_term: normalizeTerm('accessible'), confidence: 1.0, provenance: 'curated' },
      { language: 'en', term: 'wheelchair accessible', normalized_term: normalizeTerm('wheelchair accessible'), confidence: 0.98, provenance: 'curated' },
      { language: 'vi', term: 'xe lăn', normalized_term: normalizeTerm('xe lăn'), confidence: 0.95, provenance: 'native_review' },
      { language: 'zh-TW', term: '無障礙', normalized_term: normalizeTerm('無障礙'), confidence: 1.0, provenance: 'native_review' },
      { language: 'th', term: 'ทางลาดวีลแชร์', normalized_term: normalizeTerm('ทางลาดวีลแชร์'), confidence: 0.85, provenance: 'imported' }
    ],
    related_terms: [],
    exclusions: [],
    verifiable_by: ['mobler_shop', 'mobler_review'],
    verification_rules_ref: 'rule_attr_access_v1',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'spacious',
    type: 'attribute',
    names: {
      en: { text: 'Spacious Interior', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Không gian rộng rãi', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '寬敞空間', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'กว้างขวาง', translation_status: 'draft' }
    },
    synonyms: [
      { language: 'en', term: 'spacious', normalized_term: normalizeTerm('spacious'), confidence: 1.0, provenance: 'curated' },
      { language: 'vi', term: 'rộng rãi', normalized_term: normalizeTerm('rộng rãi'), confidence: 1.0, provenance: 'native_review' },
      { language: 'zh-TW', term: '寬敞', normalized_term: normalizeTerm('寬敞'), confidence: 1.0, provenance: 'native_review' },
      { language: 'th', term: 'กว้างขวาง', normalized_term: normalizeTerm('กว้างขวาง'), confidence: 0.85, provenance: 'imported' }
    ],
    related_terms: [],
    exclusions: [],
    opposite_of: 'crowded',
    verifiable_by: ['mobler_review', 'mobler_shop'],
    verification_rules_ref: 'rule_attr_spacious_v1',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'crowded',
    type: 'attribute',
    names: {
      en: { text: 'Crowded / Busy', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Đông đúc', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '熱鬧擁擠', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'คนแน่น', translation_status: 'draft' }
    },
    synonyms: [
      { language: 'en', term: 'crowded', normalized_term: normalizeTerm('crowded'), confidence: 1.0, provenance: 'curated' },
      { language: 'en', term: 'busy', normalized_term: normalizeTerm('busy'), confidence: 0.9, provenance: 'curated' },
      { language: 'vi', term: 'đông đúc', normalized_term: normalizeTerm('đông đúc'), confidence: 1.0, provenance: 'native_review' },
      { language: 'vi', term: 'đông khách', normalized_term: normalizeTerm('đông khách'), confidence: 0.95, provenance: 'native_review' },
      { language: 'zh-TW', term: '擁擠', normalized_term: normalizeTerm('擁擠'), confidence: 1.0, provenance: 'native_review' },
      { language: 'zh-TW', term: '人多', normalized_term: normalizeTerm('人多'), confidence: 0.95, provenance: 'curated' },
      { language: 'th', term: 'คนเยอะ', normalized_term: normalizeTerm('คนเยอะ'), confidence: 0.85, provenance: 'imported' }
    ],
    related_terms: [],
    exclusions: [],
    opposite_of: 'quiet',
    verifiable_by: ['mobler_review', 'mobler_checkin'],
    verification_rules_ref: 'rule_attr_crowded_v1',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'romantic',
    type: 'attribute',
    names: {
      en: { text: 'Romantic Atmosphere', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Lãng mạn', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '浪漫氣氛', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'โรแมนติก', translation_status: 'draft' }
    },
    synonyms: [
      { language: 'en', term: 'romantic', normalized_term: normalizeTerm('romantic'), confidence: 1.0, provenance: 'curated' },
      { language: 'vi', term: 'lãng mạn', normalized_term: normalizeTerm('lãng mạn'), confidence: 1.0, provenance: 'native_review' },
      { language: 'zh-TW', term: '浪漫', normalized_term: normalizeTerm('浪漫'), confidence: 1.0, provenance: 'native_review' },
      { language: 'th', term: 'โรแมนติก', normalized_term: normalizeTerm('โรแมนติก'), confidence: 0.85, provenance: 'imported' }
    ],
    related_terms: ['dating_cozy'],
    exclusions: [],
    verifiable_by: ['mobler_review'],
    verification_rules_ref: 'rule_attr_romantic_v1',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'family_friendly',
    type: 'attribute',
    names: {
      en: { text: 'Family Friendly', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Thích hợp cho gia đình', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '家庭親子友善', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'เหมาะสำหรับครอบครัว', translation_status: 'draft' }
    },
    synonyms: [
      { language: 'en', term: 'family friendly', normalized_term: normalizeTerm('family friendly'), confidence: 1.0, provenance: 'curated' },
      { language: 'vi', term: 'gia đình', normalized_term: normalizeTerm('gia đình'), confidence: 0.95, provenance: 'native_review' },
      { language: 'zh-TW', term: '親子友善', normalized_term: normalizeTerm('親子友善'), confidence: 1.0, provenance: 'native_review' },
      { language: 'th', term: 'ครอบครัว', normalized_term: normalizeTerm('ครอบครัว'), confidence: 0.85, provenance: 'imported' }
    ],
    related_terms: [],
    exclusions: [],
    verifiable_by: ['mobler_review', 'mobler_shop'],
    verification_rules_ref: 'rule_attr_family_v1',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'smoking_allowed',
    type: 'attribute',
    names: {
      en: { text: 'Smoking Allowed Area', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Cho phép hút thuốc', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '吸菸區', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'พื้นที่สูบบุหรี่', translation_status: 'draft' }
    },
    synonyms: [
      { language: 'en', term: 'smoking allowed', normalized_term: normalizeTerm('smoking allowed'), confidence: 1.0, provenance: 'curated' },
      { language: 'vi', term: 'hút thuốc', normalized_term: normalizeTerm('hút thuốc'), confidence: 0.95, provenance: 'native_review' },
      { language: 'zh-TW', term: '吸菸區', normalized_term: normalizeTerm('吸菸區'), confidence: 1.0, provenance: 'native_review' },
      { language: 'th', term: 'สูบบุหรี่ได้', normalized_term: normalizeTerm('สูบบุหรี่ได้'), confidence: 0.85, provenance: 'imported' }
    ],
    related_terms: [],
    exclusions: [],
    verifiable_by: ['mobler_shop', 'mobler_review'],
    verification_rules_ref: 'rule_attr_smoking_v1',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'air_conditioned',
    type: 'attribute',
    names: {
      en: { text: 'Air Conditioned Indoor', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Phòng máy lạnh', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '冷氣開放室內', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'ห้องแอร์', translation_status: 'draft' }
    },
    synonyms: [
      { language: 'en', term: 'air conditioned', normalized_term: normalizeTerm('air conditioned'), confidence: 1.0, provenance: 'curated' },
      { language: 'vi', term: 'máy lạnh', normalized_term: normalizeTerm('máy lạnh'), confidence: 0.95, provenance: 'native_review' },
      { language: 'vi', term: 'điều hòa', normalized_term: normalizeTerm('điều hòa'), confidence: 0.95, provenance: 'native_review' },
      { language: 'zh-TW', term: '冷氣', normalized_term: normalizeTerm('冷氣'), confidence: 0.95, provenance: 'native_review' }
    ],
    related_terms: [],
    exclusions: [],
    verifiable_by: ['mobler_shop', 'mobler_review'],
    verification_rules_ref: 'rule_attr_ac_v1',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'credit_card_accepted',
    type: 'attribute',
    names: {
      en: { text: 'Credit Card Accepted', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Chấp nhận thẻ tín dụng', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '接受信用卡', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'รับบัตรเครดิต', translation_status: 'draft' }
    },
    synonyms: [
      { language: 'en', term: 'credit card', normalized_term: normalizeTerm('credit card'), confidence: 1.0, provenance: 'curated' },
      { language: 'vi', term: 'quẹt thẻ', normalized_term: normalizeTerm('quẹt thẻ'), confidence: 0.95, provenance: 'native_review' },
      { language: 'zh-TW', term: '刷卡', normalized_term: normalizeTerm('刷卡'), confidence: 0.95, provenance: 'native_review' }
    ],
    related_terms: [],
    exclusions: [],
    verifiable_by: ['mobler_shop', 'mobler_review'],
    verification_rules_ref: 'rule_attr_cc_v1',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'natural_lighting',
    type: 'attribute',
    names: {
      en: { text: 'Natural Sunlight Lighting', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Ánh sáng tự nhiên', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '採光良好', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'แสงธรรมชาติ', translation_status: 'draft' }
    },
    synonyms: [
      { language: 'en', term: 'natural light', normalized_term: normalizeTerm('natural light'), confidence: 1.0, provenance: 'curated' },
      { language: 'vi', term: 'ánh sáng tự nhiên', normalized_term: normalizeTerm('ánh sáng tự nhiên'), confidence: 1.0, provenance: 'native_review' },
      { language: 'zh-TW', term: '採光好', normalized_term: normalizeTerm('採光好'), confidence: 0.95, provenance: 'native_review' }
    ],
    related_terms: ['photography'],
    exclusions: [],
    verifiable_by: ['mobler_review'],
    verification_rules_ref: 'rule_attr_light_v1',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },

  // =========================================================================
  // 4. ACTIVITIES (User Goals, Separate from Experiences)
  // =========================================================================
  {
    canonical_id: 'work',
    type: 'activity',
    names: {
      en: { text: 'Work on Laptop', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Làm việc', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '筆電工作', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'ทำงาน', translation_status: 'draft' }
    },
    synonyms: [
      { language: 'en', term: 'work', normalized_term: normalizeTerm('work'), confidence: 1.0, provenance: 'curated' },
      { language: 'vi', term: 'làm việc', normalized_term: normalizeTerm('làm việc'), confidence: 1.0, provenance: 'native_review' },
      { language: 'zh-TW', term: '工作', normalized_term: normalizeTerm('工作'), confidence: 1.0, provenance: 'native_review' },
      { language: 'th', term: 'ทำงาน', normalized_term: normalizeTerm('ทำงาน'), confidence: 0.85, provenance: 'imported' }
    ],
    related_terms: ['study', 'work_friendly'],
    exclusions: [],
    relation_type: 'is_a',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'study',
    type: 'activity',
    names: {
      en: { text: 'Study & Exam Prep', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Học bài', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '讀書溫習', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'อ่านหนังสือเรียน', translation_status: 'draft' }
    },
    synonyms: [
      { language: 'en', term: 'study', normalized_term: normalizeTerm('study'), confidence: 1.0, provenance: 'curated' },
      { language: 'vi', term: 'học bài', normalized_term: normalizeTerm('học bài'), confidence: 1.0, provenance: 'native_review' },
      { language: 'zh-TW', term: '讀書', normalized_term: normalizeTerm('讀書'), confidence: 1.0, provenance: 'native_review' },
      { language: 'th', term: 'เรียนหนังสือ', normalized_term: normalizeTerm('เรียนหนังสือ'), confidence: 0.85, provenance: 'imported' }
    ],
    related_terms: ['work', 'study_friendly'],
    exclusions: [],
    parent_id: 'work',
    relation_type: 'is_a',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'work_study',
    type: 'activity',
    names: {
      en: { text: 'Work and Study', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Học tập & Làm việc', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '工作學習', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'ทำงานและอ่านหนังสือ', translation_status: 'needs_native_review' }
    },
    synonyms: [
      { language: 'en', term: 'work and study', normalized_term: normalizeTerm('work and study'), confidence: 1.0, provenance: 'curated' },
      { language: 'vi', term: 'học tập làm việc', normalized_term: normalizeTerm('học tập làm việc'), confidence: 0.95, provenance: 'native_review' },
      { language: 'zh-TW', term: '工作讀書', normalized_term: normalizeTerm('工作讀書'), confidence: 0.95, provenance: 'native_review' }
    ],
    related_terms: ['work', 'study'],
    exclusions: [],
    parent_id: 'work',
    relation_type: 'is_a',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'date',
    type: 'activity',
    names: {
      en: { text: 'Couple Date', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Hẹn hò cặp đôi', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '情侶約會', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'ออกเดท', translation_status: 'draft' }
    },
    synonyms: [
      { language: 'en', term: 'date', normalized_term: normalizeTerm('date'), confidence: 1.0, provenance: 'curated' },
      { language: 'vi', term: 'hẹn hò', normalized_term: normalizeTerm('hẹn hò'), confidence: 1.0, provenance: 'native_review' },
      { language: 'zh-TW', term: '約會', normalized_term: normalizeTerm('約會'), confidence: 1.0, provenance: 'native_review' },
      { language: 'th', term: 'เดท', normalized_term: normalizeTerm('เดท'), confidence: 0.85, provenance: 'imported' }
    ],
    related_terms: ['romantic', 'dating_cozy'],
    exclusions: [],
    relation_type: 'is_a',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'meeting',
    type: 'activity',
    names: {
      en: { text: 'Business Meeting', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Gặp gỡ đối tác / Họp nhóm', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '商務會面開會', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'ประชุมธุรกิจ', translation_status: 'draft' }
    },
    synonyms: [
      { language: 'en', term: 'meeting', normalized_term: normalizeTerm('meeting'), confidence: 1.0, provenance: 'curated' },
      { language: 'vi', term: 'họp nhóm', normalized_term: normalizeTerm('họp nhóm'), confidence: 0.95, provenance: 'native_review' },
      { language: 'zh-TW', term: '開會', normalized_term: normalizeTerm('開會'), confidence: 0.95, provenance: 'native_review' },
      { language: 'th', term: 'ประชุม', normalized_term: normalizeTerm('ประชุม'), confidence: 0.85, provenance: 'imported' }
    ],
    related_terms: ['work'],
    exclusions: [],
    relation_type: 'is_a',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'relax',
    type: 'activity',
    names: {
      en: { text: 'Relax & Chill', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Thư giãn nghỉ ngơi', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '放鬆休閒', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'พักผ่อนหย่อนใจ', translation_status: 'draft' }
    },
    synonyms: [
      { language: 'en', term: 'relax', normalized_term: normalizeTerm('relax'), confidence: 1.0, provenance: 'curated' },
      { language: 'vi', term: 'thư giãn', normalized_term: normalizeTerm('thư giãn'), confidence: 1.0, provenance: 'native_review' },
      { language: 'zh-TW', term: '放鬆', normalized_term: normalizeTerm('放鬆'), confidence: 1.0, provenance: 'native_review' },
      { language: 'th', term: 'ชิลล์', normalized_term: normalizeTerm('ชิลล์'), confidence: 0.85, provenance: 'imported' }
    ],
    related_terms: ['cozy_modern'],
    exclusions: [],
    relation_type: 'is_a',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'social',
    type: 'activity',
    names: {
      en: { text: 'Socialize & Hangout', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Tán gẫu bạn bè', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '朋友聚會暢談', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'สังสรรค์เพื่อนฝูง', translation_status: 'draft' }
    },
    synonyms: [
      { language: 'en', term: 'social', normalized_term: normalizeTerm('social'), confidence: 1.0, provenance: 'curated' },
      { language: 'vi', term: 'tụ tập', normalized_term: normalizeTerm('tụ tập'), confidence: 0.95, provenance: 'native_review' },
      { language: 'zh-TW', term: '聚會', normalized_term: normalizeTerm('聚會'), confidence: 1.0, provenance: 'native_review' },
      { language: 'th', term: 'พบปะ', normalized_term: normalizeTerm('พบปะ'), confidence: 0.85, provenance: 'imported' }
    ],
    related_terms: ['casual_chat'],
    exclusions: [],
    relation_type: 'is_a',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'casual_chat',
    type: 'activity',
    names: {
      en: { text: 'Casual Chat', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Trò chuyện nhẹ nhàng', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '休閒閒聊', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'พูดคุยชิลล์ๆ', translation_status: 'needs_native_review' }
    },
    synonyms: [
      { language: 'en', term: 'casual chat', normalized_term: normalizeTerm('casual chat'), confidence: 1.0, provenance: 'curated' },
      { language: 'vi', term: 'tán gẫu', normalized_term: normalizeTerm('tán gẫu'), confidence: 0.95, provenance: 'native_review' },
      { language: 'zh-TW', term: '閒聊', normalized_term: normalizeTerm('閒聊'), confidence: 0.95, provenance: 'native_review' }
    ],
    related_terms: ['social'],
    exclusions: [],
    parent_id: 'social',
    relation_type: 'is_a',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'gaming',
    type: 'activity',
    names: {
      en: { text: 'Gaming & Play', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Chơi game giải trí', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '電玩遊戲', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'เล่นเกม', translation_status: 'draft' }
    },
    synonyms: [
      { language: 'en', term: 'gaming', normalized_term: normalizeTerm('gaming'), confidence: 1.0, provenance: 'curated' },
      { language: 'vi', term: 'chơi game', normalized_term: normalizeTerm('chơi game'), confidence: 1.0, provenance: 'native_review' },
      { language: 'zh-TW', term: '玩遊戲', normalized_term: normalizeTerm('玩遊戲'), confidence: 1.0, provenance: 'native_review' },
      { language: 'th', term: 'เล่นเกม', normalized_term: normalizeTerm('เล่นเกม'), confidence: 0.85, provenance: 'imported' }
    ],
    related_terms: ['board_games', 'console_gaming_cafe', 'board_game_cafe'],
    exclusions: [],
    relation_type: 'is_a',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'board_games',
    type: 'activity',
    names: {
      en: { text: 'Playing Board Games', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Chơi board game', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '玩桌上遊戲', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'เล่นบอร์ดเกม', translation_status: 'needs_native_review' }
    },
    synonyms: [
      { language: 'en', term: 'board games', normalized_term: normalizeTerm('board games'), confidence: 1.0, provenance: 'curated' },
      { language: 'vi', term: 'chơi boardgame', normalized_term: normalizeTerm('chơi boardgame'), confidence: 0.95, provenance: 'native_review' },
      { language: 'zh-TW', term: '玩桌遊', normalized_term: normalizeTerm('玩桌遊'), confidence: 0.95, provenance: 'native_review' }
    ],
    related_terms: ['gaming', 'board_game_cafe'],
    exclusions: [],
    parent_id: 'gaming',
    relation_type: 'is_a',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'shopping',
    type: 'activity',
    names: {
      en: { text: 'Shopping & Browse', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Mua sắm & Xem đồ', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '逛街選品購物', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'ช้อปปิ้ง', translation_status: 'draft' }
    },
    synonyms: [
      { language: 'en', term: 'shopping', normalized_term: normalizeTerm('shopping'), confidence: 1.0, provenance: 'curated' },
      { language: 'vi', term: 'mua sắm', normalized_term: normalizeTerm('mua sắm'), confidence: 1.0, provenance: 'native_review' },
      { language: 'zh-TW', term: '購物', normalized_term: normalizeTerm('購物'), confidence: 1.0, provenance: 'native_review' },
      { language: 'th', term: 'ซื้อของ', normalized_term: normalizeTerm('ซื้อของ'), confidence: 0.85, provenance: 'imported' }
    ],
    related_terms: ['fashion_cafe', 'art_toy_cafe'],
    exclusions: [],
    relation_type: 'is_a',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'crafting',
    type: 'activity',
    names: {
      en: { text: 'DIY & Crafting', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Làm đồ thủ công DIY', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '手作體驗 DIY', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'งานฝีมือ DIY', translation_status: 'draft' }
    },
    synonyms: [
      { language: 'en', term: 'crafting', normalized_term: normalizeTerm('crafting'), confidence: 1.0, provenance: 'curated' },
      { language: 'en', term: 'diy', normalized_term: normalizeTerm('diy'), confidence: 0.95, provenance: 'curated' },
      { language: 'vi', term: 'thủ công', normalized_term: normalizeTerm('thủ công'), confidence: 1.0, provenance: 'native_review' },
      { language: 'zh-TW', term: '手作DIY', normalized_term: normalizeTerm('手作DIY'), confidence: 1.0, provenance: 'native_review' },
      { language: 'th', term: 'งานคราฟต์', normalized_term: normalizeTerm('งานคราฟต์'), confidence: 0.85, provenance: 'imported' }
    ],
    related_terms: ['workshop_cafe', 'ceramic_cafe'],
    exclusions: [],
    relation_type: 'is_a',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'photography',
    type: 'activity',
    names: {
      en: { text: 'Photography & Check-in', translation_status: 'verified', reviewer: 'curated_team' },
      vi: { text: 'Chụp ảnh & Check-in', translation_status: 'verified', reviewer: 'native_reviewer_vi' },
      'zh-TW': { text: '拍照打卡', translation_status: 'verified', reviewer: 'native_reviewer_tw' },
      th: { text: 'ถ่ายรูปเช็คอิน', translation_status: 'draft' }
    },
    synonyms: [
      { language: 'en', term: 'photography', normalized_term: normalizeTerm('photography'), confidence: 1.0, provenance: 'curated' },
      { language: 'en', term: 'check-in photo', normalized_term: normalizeTerm('check-in photo'), confidence: 0.95, provenance: 'curated' },
      { language: 'vi', term: 'chụp ảnh', normalized_term: normalizeTerm('chụp ảnh'), confidence: 1.0, provenance: 'native_review' },
      { language: 'vi', term: 'check-in', normalized_term: normalizeTerm('check-in'), confidence: 0.95, provenance: 'deterministic' },
      { language: 'zh-TW', term: '拍照', normalized_term: normalizeTerm('拍照'), confidence: 1.0, provenance: 'native_review' },
      { language: 'zh-TW', term: '打卡', normalized_term: normalizeTerm('打卡'), confidence: 0.98, provenance: 'native_review' },
      { language: 'th', term: 'ถ่ายรูป', normalized_term: normalizeTerm('ถ่ายรูป'), confidence: 0.85, provenance: 'imported' }
    ],
    related_terms: ['cute', 'immersive_cafe', 'artistic'],
    exclusions: [],
    relation_type: 'is_a',
    deprecated: false,
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },

  // =========================================================================
  // 5. TOMBSTONED (DEPRECATED) ENTRIES FOR IMMUTABILITY
  // =========================================================================
  {
    canonical_id: 'legacy_pet_cafe',
    type: 'experience',
    names: {
      en: { text: 'Pet Café (Deprecated)', translation_status: 'draft' },
      vi: { text: 'Cà phê thú cưng (Cũ)', translation_status: 'draft' },
      'zh-TW': { text: '寵物咖啡廳（已廢棄）', translation_status: 'draft' },
      th: { text: 'คาเฟ่สัตว์เลี้ยง (ยกเลิก)', translation_status: 'draft' }
    },
    synonyms: [],
    related_terms: ['cat_cafe', 'dog_cafe'],
    exclusions: [],
    deprecated: true,
    deprecated_by: 'cat_cafe',
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'old_reading_space',
    type: 'experience',
    names: {
      en: { text: 'Old Reading Space (Deprecated)', translation_status: 'draft' },
      vi: { text: 'Không gian đọc cũ (Cũ)', translation_status: 'draft' },
      'zh-TW': { text: '舊閱讀空間（已廢棄）', translation_status: 'draft' },
      th: { text: 'พื้นที่อ่านเดิม (ยกเลิก)', translation_status: 'draft' }
    },
    synonyms: [],
    related_terms: ['book_cafe'],
    exclusions: [],
    deprecated: true,
    deprecated_by: 'book_cafe',
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  },
  {
    canonical_id: 'deprecated_outlet_v1',
    type: 'attribute',
    names: {
      en: { text: 'Outlet v1 (Deprecated)', translation_status: 'draft' },
      vi: { text: 'Ổ điện v1 (Cũ)', translation_status: 'draft' },
      'zh-TW': { text: '插座舊版（已廢棄）', translation_status: 'draft' },
      th: { text: 'ปลั๊กไฟ v1 (ยกเลิก)', translation_status: 'draft' }
    },
    synonyms: [],
    related_terms: ['power_outlet'],
    exclusions: [],
    deprecated: true,
    deprecated_by: 'power_outlet',
    taxonomy_version: CURRENT_TAXONOMY_VERSION
  }
];

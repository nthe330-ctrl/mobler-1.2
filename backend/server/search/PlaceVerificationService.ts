import { 
  ParsedSearchQuery, 
  PlaceVerificationResult, 
  VerifiedEvidenceItem 
} from './types';

export class PlaceVerificationService {
  /**
   * Verifies candidate venue against user search requirements using verifiable evidence
   */
  public static verifyPlace(place: any, parsedQuery: ParsedSearchQuery): PlaceVerificationResult {
    const placeId = place.id || place.placeId || 'unknown';
    const name = (place.displayName?.text || place.name || '').toLowerCase();
    const address = (place.formattedAddress || place.address || '').toLowerCase();
    const types: string[] = (place.types || []).map((t: string) => t.toLowerCase());
    const editorialSummary = (place.editorialSummary?.text || place.description || '').toLowerCase();
    const amenities: string[] = (place.amenities || []).map((a: string) => a.toLowerCase());
    const specialModels: string[] = (place.specialModels || []).map((m: string) => m.toLowerCase());
    const styles: string[] = (place.styles || []).map((s: string) => s.toLowerCase());

    const reviewTexts: string[] = (place.reviews || []).map((r: any) =>
      (r.text?.text || r.originalText?.text || r.content || '').toLowerCase()
    );

    const allCorpus = [
      name,
      address,
      ...types,
      editorialSummary,
      ...amenities,
      ...specialModels,
      ...styles,
      ...reviewTexts
    ].join(' ');

    const verifiedFeatures: string[] = [];
    const evidenceList: VerifiedEvidenceItem[] = [];
    const missingMustHaves: string[] = [];
    const violatedConstraints: string[] = [];

    // Helper for adding evidence
    const addEvidence = (feature: string, text: string, source: 'name' | 'reviews' | 'types' | 'attributes', conf: number = 0.9) => {
      verifiedFeatures.push(feature);
      evidenceList.push({
        feature,
        evidenceText: text,
        source,
        confidence: conf,
        isMustHaveSatisfied: parsedQuery.requirements.mustHave.includes(feature)
      });
    };

    // 1. Cat Cafe Verification
    if (parsedQuery.requirements.mustHave.includes('cat_cafe') || parsedQuery.experienceModes.includes('cat_cafe')) {
      const isNameMatch = name.includes('mèo') || name.includes('cat') || name.includes('猫') || name.includes('แมว');
      const isReviewMatch = reviewTexts.some(r => r.includes('mèo') || r.includes('cat') || r.includes('bé mèo') || r.includes('vuốt mèo') || r.includes('猫') || r.includes('แมว'));
      if (isNameMatch) {
        addEvidence('cat_cafe', `Tên quán "${place.displayName?.text || place.name}" xác nhận mô hình Cà phê Mèo.`, 'name', 0.98);
      } else if (isReviewMatch) {
        addEvidence('cat_cafe', 'Đánh giá thực tế từ khách hàng xác nhận có các bé mèo tại quán.', 'reviews', 0.92);
      } else if (specialModels.some(m => m.includes('cat') || m.includes('mèo'))) {
        addEvidence('cat_cafe', 'Danh mục đặc biệt xác nhận mô hình Cà phê Mèo.', 'attributes', 0.95);
      } else {
        missingMustHaves.push('cat_cafe');
      }
    }

    // 2. Dog Cafe Verification
    if (parsedQuery.requirements.mustHave.includes('dog_cafe') || parsedQuery.experienceModes.includes('dog_cafe')) {
      const isNameMatch = name.includes('cún') || name.includes('chó') || name.includes('dog') || name.includes('puppy') || name.includes('狗') || name.includes('犬') || name.includes('หมา');
      const isReviewMatch = reviewTexts.some(r => r.includes('cún') || r.includes('chó') || r.includes('dog') || r.includes('chú cún') || r.includes('狗') || r.includes('หมา'));
      if (isNameMatch) {
        addEvidence('dog_cafe', `Tên quán "${place.displayName?.text || place.name}" xác nhận mô hình Cà phê Cún.`, 'name', 0.98);
      } else if (isReviewMatch) {
        addEvidence('dog_cafe', 'Khách hàng trong đánh giá nhắc đến các bé cún thân thiện.', 'reviews', 0.92);
      } else {
        missingMustHaves.push('dog_cafe');
      }
    }

    // 3. Board Game Cafe Verification
    if (parsedQuery.requirements.mustHave.includes('board_game_cafe') || parsedQuery.experienceModes.includes('board_game_cafe')) {
      const isMatch = allCorpus.includes('board game') || allCorpus.includes('boardgame') || allCorpus.includes('trò chơi bàn') || allCorpus.includes('桌遊') || allCorpus.includes('บอร์ดเกม');
      if (isMatch) {
        addEvidence('board_game_cafe', 'Quán cung cấp đa dạng trò chơi Board Game cho nhóm bạn.', 'reviews', 0.94);
      } else {
        missingMustHaves.push('board_game_cafe');
      }
    }

    // 4. Reading / Book Cafe
    if (parsedQuery.requirements.mustHave.includes('quiet_reading_cafe') || parsedQuery.experienceModes.includes('quiet_reading_cafe')) {
      const isMatch = allCorpus.includes('sách') || allCorpus.includes('book') || allCorpus.includes('reading') || allCorpus.includes('đọc sách') || allCorpus.includes('書') || allCorpus.includes('หนังสือ');
      if (isMatch) {
        addEvidence('quiet_reading_cafe', 'Không gian có nhiều đầu sách và bầu không khí lý tưởng để đọc sách.', 'reviews', 0.93);
      } else {
        missingMustHaves.push('quiet_reading_cafe');
      }
    }

    // 5. Work-Friendly & Power Outlets
    if (parsedQuery.requirements.activities.includes('laptop_work') || parsedQuery.requirements.shouldHave.includes('power_outlets')) {
      const hasPlug = amenities.some(a => a.includes('sạc') || a.includes('plug') || a.includes('outlet')) ||
        reviewTexts.some(r => r.includes('ổ cắm') || r.includes('chỗ cắm') || r.includes('cắm sạc') || r.includes('power') || r.includes('outlet') || r.includes('插座') || r.includes('ปลั๊ก'));
      const hasWifi = amenities.some(a => a.includes('wi-fi') || a.includes('wifi')) ||
        reviewTexts.some(r => r.includes('wifi') || r.includes('mạng'));

      if (hasPlug && hasWifi) {
        addEvidence('work_friendly', 'Đầy đủ ổ cắm điện tại bàn và kết nối Wi-Fi tốc độ cao cho laptop.', 'attributes', 0.95);
      } else if (hasPlug || hasWifi) {
        addEvidence('work_friendly', 'Trang bị tiện ích hỗ trợ ngồi làm việc và học tập.', 'reviews', 0.85);
      }
    }

    // 6. Quiet Atmosphere
    if (parsedQuery.requirements.atmosphereVibes.includes('quiet') || parsedQuery.requirements.shouldHave.includes('quiet_atmosphere')) {
      const hasQuiet = reviewTexts.some(r => 
        r.includes('yên tĩnh') || r.includes('yen tinh') || r.includes('ít ồn') || r.includes('im lặng') || 
        r.includes('quiet') || r.includes('peaceful') || r.includes('không gian yên') || r.includes('安靜') || r.includes('เงียบ')
      );
      if (hasQuiet) {
        addEvidence('quiet', 'Nhiều đánh giá khen ngợi không gian yên tĩnh, không ồn ào.', 'reviews', 0.92);
      }
    }

    // 7. Negative Constraints Check (Violations)
    for (const neg of parsedQuery.requirements.negativeConstraints) {
      if (neg === 'no_loud_music' || neg === 'no_noisy_crowd') {
        const hasNoiseComplaints = reviewTexts.some(r => 
          r.includes('nhạc quá to') || r.includes('rất ồn') || r.includes('quá ồn ào') || r.includes('nhạc ầm ĩ') || r.includes('too loud') || r.includes('noisy')
        );
        if (hasNoiseComplaints) {
          violatedConstraints.push(neg);
        }
      }
      if (neg === 'no_smoking') {
        const hasSmokeComplaints = reviewTexts.some(r => 
          r.includes('nhiều khói thuốc') || r.includes('mùi thuốc lá nồng') || r.includes('hút thuốc bừa bãi')
        );
        if (hasSmokeComplaints) {
          violatedConstraints.push(neg);
        }
      }
    }

    const isMustHaveSatisfied = missingMustHaves.length === 0;
    const hasNegativeConstraintViolation = violatedConstraints.length > 0;

    // Calculate match confidence (0.0 to 1.0)
    let matchConfidence = 0.7;
    if (isMustHaveSatisfied) matchConfidence += 0.2;
    if (!hasNegativeConstraintViolation) matchConfidence += 0.1;
    if (evidenceList.length >= 2) matchConfidence += 0.1;
    matchConfidence = Math.min(1.0, matchConfidence);

    // Build multilingual match reasons
    const shopDisplayName = place.displayName?.text || place.name || 'Quán';
    const topFeature = verifiedFeatures[0] || 'không gian quán';

    const matchReason = {
      vi: isMustHaveSatisfied
        ? `Đã xác thực phù hợp với nhu cầu tìm kiếm của bạn (${evidenceList.length} bằng chứng thực tế).`
        : `Quán có không gian tốt nhưng chưa đầy đủ bằng chứng cho tiêu chí ${missingMustHaves.join(', ')}.`,
      'zh-TW': isMustHaveSatisfied
        ? `已根據真實數據完成驗證，高度符合您的搜尋需求（具備 ${evidenceList.length} 項實證）。`
        : `店家環境優質，但部分指定特色尚待更多評論驗證。`,
      en: isMustHaveSatisfied
        ? `Verified match for your search criteria with ${evidenceList.length} verified evidence points.`
        : `Great coffee shop though pending further evidence for ${missingMustHaves.join(', ')}.`,
      th: isMustHaveSatisfied
        ? `ยืนยันความตรงกับความต้องการของคุณ พร้อม ${evidenceList.length} หลักฐานยืนยันจริง`
        : `ร้านบรรยากาศดี แต่อาจยังขาดข้อมูลยืนยันบางประการ`
    };

    return {
      placeId,
      isMustHaveSatisfied,
      missingMustHaves,
      hasNegativeConstraintViolation,
      violatedConstraints,
      verifiedFeatures: Array.from(new Set(verifiedFeatures)),
      evidenceList,
      matchConfidence,
      matchReason
    };
  }
}

import React from 'react';
import { ReviewIntelligence } from '@shared/types';
import { Loader2, ThumbsUp, ThumbsDown, TrendingUp, TrendingDown, Minus, AlertTriangle, Sparkles, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@shared/context/LanguageContext';

interface Props {
  shopReviewCount?: number;
  intelligence?: ReviewIntelligence | null;
  isLight?: boolean;
  isLoading?: boolean;
}

export default function ReviewIntelligenceDashboard({ intelligence, isLight = true, isLoading = false, shopReviewCount = 0 }: Props) {
  const { language } = useLanguage();

  const labels = {
    'zh-TW': {
      loadingTitle: 'AI 正在深度分析真實顧客評價...',
      loadingSubtitle: '匯總 Google Maps 評價與評分數據',
      noData: 'Google Maps 尚未有足夠的顧客文字評論供 AI 深度分析。',
      dataFrom: (analyzed: number, total: number) => `綜合分析自 ${analyzed} 則詳細評論 / 共 ${total} 次評分`,
      satisfactionRate: '整體滿意度：',
      positive: '好評',
      neutral: '中性',
      feedback: '建議',
      overview: '⭐ 綜合評語',
      ratingExcellent: '口碑極佳・廣受推薦',
      ratingGood: '表現穩定・中規中矩',
      ratingNeedsImprovement: '存在較多改進建議',
      positivePoints: '顧客讚譽亮點',
      noDetail: '暫無詳細數據',
      negativePoints: '顧客建議與注意',
      noComplaints: '✓ 未發現顯著不滿意評價',
      aiTrends: 'AI 動態趨勢',
      trendImproving: '持續優化提升：',
      trendDeclining: '需多加留意：',
      trendStable: '維持穩定：',
      dataNote: '數據備註',
    },
    'th': {
      loadingTitle: 'AI กำลังวิเคราะห์ความคิดเห็นจริง...',
      loadingSubtitle: 'รวบรวมข้อมูลรีวิวและคะแนนจาก Google Maps',
      noData: 'ยังมีข้อมูลรีวิวไม่เพียงพอสำหรับให้ AI วิเคราะห์สำหรับร้านนี้',
      dataFrom: (analyzed: number, total: number) => `รวบรวมจาก ${analyzed} รีวิว / ${total} การให้คะแนน`,
      satisfactionRate: 'อัตราความพึงพอใจโดยรวม:',
      positive: 'ประทับใจ',
      neutral: 'ปานกลาง',
      feedback: 'ข้อเสนอแนะ',
      overview: '⭐ ภาพรวม',
      ratingExcellent: 'ยอดเยี่ยมและน่าเชื่อถือ',
      ratingGood: 'คุณภาพปานกลาง / ใช้ได้',
      ratingNeedsImprovement: 'มีข้อที่ควรปรับปรุงหลายจุด',
      positivePoints: 'จุดเด่นที่น่าประทับใจ',
      noDetail: 'ไม่มีข้อมูลรายละเอียด',
      negativePoints: 'ข้อควรระวัง / ข้อเสนอแนะ',
      noComplaints: '✓ ไม่พบข้อร้องเรียนที่เด่นชัด',
      aiTrends: 'แนวโน้ม AI',
      trendImproving: 'พัฒนาดีขึ้น: ',
      trendDeclining: 'ควรปรับปรุง: ',
      trendStable: 'คงที่: ',
      dataNote: 'หมายเหตุข้อมูล',
    },
    'en': {
      loadingTitle: 'AI is analyzing verified customer reviews...',
      loadingSubtitle: 'Aggregating rating and review intelligence from Google Maps',
      noData: 'Not enough verified reviews available on Google Maps for full AI analysis.',
      dataFrom: (analyzed: number, total: number) => `Synthesized from ${analyzed} reviews / ${total} total ratings`,
      satisfactionRate: 'Overall Satisfaction:',
      positive: 'Positive',
      neutral: 'Neutral',
      feedback: 'Feedback',
      overview: '⭐ Summary',
      ratingExcellent: 'Highly Rated & Recommended',
      ratingGood: 'Good / Moderate Quality',
      ratingNeedsImprovement: 'Needs Noticeable Improvements',
      positivePoints: 'Top Commendations',
      noDetail: 'No detailed breakdown available',
      negativePoints: 'Points of Note / Feedback',
      noComplaints: '✓ No prominent complaints recorded',
      aiTrends: 'AI Trends',
      trendImproving: 'Improving Trend: ',
      trendDeclining: 'Needs Attention: ',
      trendStable: 'Stable: ',
      dataNote: 'Data Notes',
    },
    'vi': {
      loadingTitle: 'AI đang phân tích đánh giá thực tế...',
      loadingSubtitle: 'Tổng hợp dữ liệu review và xếp hạng từ Google Maps',
      noData: 'Chưa có đủ dữ liệu đánh giá thực tế từ Google Maps để AI phân tích cho quán này.',
      dataFrom: (analyzed: number, total: number) => `Dữ liệu tổng hợp từ ${analyzed} đánh giá / ${total} lượt xếp hạng`,
      satisfactionRate: 'Tỷ lệ hài lòng chung:',
      positive: 'Tích cực',
      neutral: 'Trung tính',
      feedback: 'Góp ý',
      overview: '⭐ Tổng quan',
      ratingExcellent: 'Đánh giá Rất Tốt & Uy Tín',
      ratingGood: 'Chất lượng Khá / Trung Bình',
      ratingNeedsImprovement: 'Nhiều ý kiến cần cải thiện',
      positivePoints: 'Điểm khen ngợi',
      noDetail: 'Không có dữ liệu chi tiết',
      negativePoints: 'Điểm cần lưu ý',
      noComplaints: '✓ Không ghi nhận phàn nàn nổi bật',
      aiTrends: 'Xu hướng AI',
      trendImproving: 'Xu hướng Cải Thiện: ',
      trendDeclining: 'Cần Chú Ý: ',
      trendStable: 'Ổn định: ',
      dataNote: 'Ghi chú dữ liệu',
    }
  };

  const l = labels[language as keyof typeof labels] || labels.vi;

  if (isLoading) {
    return (
      <div className={`p-6 flex flex-col items-center justify-center gap-3 border rounded-xl text-xs ${
        isLight ? 'bg-white border-slate-200 text-slate-700 shadow-sm' : 'bg-[#1E1813] border-[#3D3024] text-[#E0D5CC]'
      }`}>
        <Loader2 className="animate-spin text-amber-500" size={24} />
        <p className="font-bold text-sm text-slate-900 dark:text-white">{l.loadingTitle}</p>
        <p className="text-slate-500 dark:text-slate-400 text-xs">{l.loadingSubtitle}</p>
      </div>
    );
  }

  if (!intelligence || !intelligence.dataset) {
    return (
      <div className={`p-5 text-center border rounded-xl text-xs ${
        isLight ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-[#181310] border-[#3D3024] text-[#C5B7A8]'
      }`}>
        {l.noData}
      </div>
    );
  }

  const positiveScore = intelligence.overallSentiment?.positive ?? 80;
  const neutralScore = intelligence.overallSentiment?.neutral ?? 15;
  const negativeScore = intelligence.overallSentiment?.negative ?? 5;

  return (
    <div className={`overflow-hidden rounded-xl border transition-all ${
      isLight 
        ? 'bg-white border-slate-300 shadow-sm text-slate-900' 
        : 'bg-[#181310] border-[#423427] text-[#F3EDE6]'
    }`}>
      {/* Table Header */}
      <div className={`px-4 py-3 border-b flex flex-wrap justify-between items-center gap-2 ${
        isLight ? 'bg-slate-100/90 border-slate-200 text-slate-900' : 'bg-[#241C16] border-[#3D3024] text-white'
      }`}>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-bold text-xs tracking-wide">
            {l.dataFrom(intelligence.dataset.reviewsAnalyzed || 0, shopReviewCount || intelligence.dataset.totalReviewsAvailable || 0)}
          </span>
        </div>
        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] tracking-wider uppercase border ${
          isLight ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-emerald-950 text-emerald-300 border-emerald-700'
        }`}>
          Google Verified
        </span>
      </div>

      {/* Sentiment Ratio Bar */}
      <div className={`px-3 sm:px-4 py-2.5 sm:py-3 border-b ${isLight ? 'bg-slate-50/60 border-slate-200' : 'bg-[#1D1612] border-[#3D3024]'}`}>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1.5 text-xs font-bold mb-1.5">
          <span className="text-slate-700 dark:text-slate-300 text-[11px] sm:text-xs">{l.satisfactionRate}</span>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] sm:text-[11px]">
            <span className="text-emerald-700 dark:text-emerald-400 font-extrabold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              {l.positive}: {positiveScore}%
            </span>
            <span className="text-slate-600 dark:text-slate-400 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
              {l.neutral}: {neutralScore}%
            </span>
            {negativeScore > 0 && (
              <span className="text-rose-700 dark:text-rose-400 font-extrabold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                {l.feedback}: {negativeScore}%
              </span>
            )}
          </div>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex shadow-inner">
          <div style={{ width: `${positiveScore}%` }} className="bg-emerald-500 h-full transition-all duration-500" />
          <div style={{ width: `${neutralScore}%` }} className="bg-slate-400 h-full transition-all duration-500" />
          <div style={{ width: `${negativeScore}%` }} className="bg-rose-500 h-full transition-all duration-500" />
        </div>
      </div>

      {/* Main Intelligence: Mobile Cards (<sm) / Desktop Table (>=sm) */}
      
      {/* Mobile Stacked Card Layout */}
      <div className={`sm:hidden divide-y text-xs ${isLight ? 'divide-slate-200' : 'divide-[#33281E]'}`}>
        {/* Section 1: Tổng quan */}
        <div className="p-3 space-y-1.5">
          <div className={`font-bold text-[11px] uppercase tracking-wider ${
            isLight ? 'text-slate-600' : 'text-amber-200/90'
          }`}>
            {l.overview}
          </div>
          <div>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${
              positiveScore >= 75
                ? isLight ? 'bg-emerald-100 text-emerald-950 border-emerald-300' : 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                : positiveScore >= 50
                  ? isLight ? 'bg-amber-100 text-amber-950 border-amber-300' : 'bg-amber-950/80 text-amber-300 border-amber-700'
                  : isLight ? 'bg-rose-100 text-rose-950 border-rose-300' : 'bg-rose-950/80 text-rose-300 border-rose-700'
            }`}>
              <CheckCircle2 size={13} className="shrink-0" />
              {positiveScore >= 75 
                ? l.ratingExcellent
                : positiveScore >= 50 
                  ? l.ratingGood 
                  : l.ratingNeedsImprovement}
            </span>
          </div>
        </div>

        {/* Section 2: Điểm khen ngợi */}
        <div className="p-3 space-y-1.5">
          <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold text-[11px] uppercase tracking-wider">
            <ThumbsUp size={13} />
            <span>{l.positivePoints}</span>
          </div>
          <div>
            {intelligence.topPositiveTopics && intelligence.topPositiveTopics.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {intelligence.topPositiveTopics.map((t: any, idx: number) => {
                  const text = typeof t === 'string' ? t : t.topic || '';
                  return (
                    <span 
                      key={idx} 
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border leading-snug ${
                        isLight 
                          ? 'bg-emerald-50 text-emerald-950 border-emerald-300 shadow-2xs' 
                          : 'bg-emerald-950/60 text-emerald-200 border-emerald-700/80'
                      }`}
                    >
                      ✓ {text}
                    </span>
                  );
                })}
              </div>
            ) : (
              <span className="text-slate-500 dark:text-slate-400 italic text-xs">{l.noDetail}</span>
            )}
          </div>
        </div>

        {/* Section 3: Điểm cần lưu ý */}
        <div className="p-3 space-y-1.5">
          <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 font-bold text-[11px] uppercase tracking-wider">
            <ThumbsDown size={13} />
            <span>{l.negativePoints}</span>
          </div>
          <div>
            {intelligence.topNegativeTopics && intelligence.topNegativeTopics.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {intelligence.topNegativeTopics.map((t: any, idx: number) => {
                  const text = typeof t === 'string' ? t : t.topic || '';
                  return (
                    <span 
                      key={idx} 
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border leading-snug ${
                        isLight 
                          ? 'bg-rose-50 text-rose-950 border-rose-300 shadow-2xs' 
                          : 'bg-rose-950/60 text-rose-200 border-rose-700/80'
                      }`}
                    >
                      • {text}
                    </span>
                  );
                })}
              </div>
            ) : (
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                isLight ? 'text-emerald-800 bg-emerald-50' : 'text-emerald-300 bg-emerald-950/40'
              }`}>
                {l.noComplaints}
              </span>
            )}
          </div>
        </div>

        {/* Section 4: Xu hướng AI */}
        <div className="p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-400 font-bold text-[11px] uppercase tracking-wider">
            <TrendingUp size={13} />
            <span>{l.aiTrends}</span>
          </div>
          
          {intelligence.improvementSignals && intelligence.improvementSignals.length > 0 && (
            <div className="space-y-1.5">
              {intelligence.improvementSignals.map((sig, i) => (
                <div 
                  key={i} 
                  className={`p-2 rounded-lg border flex items-start gap-2 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#201914] border-[#3D3024]'
                  }`}
                >
                  <span className="shrink-0 mt-0.5">
                    {sig.trend === 'IMPROVING' ? (
                      <TrendingUp size={13} className="text-emerald-600" />
                    ) : sig.trend === 'DECLINING' ? (
                      <TrendingDown size={13} className="text-rose-600" />
                    ) : (
                      <Minus size={13} className="text-slate-500" />
                    )}
                  </span>
                  <div className="text-[11px]">
                    <span className={`font-bold mr-1 ${
                      sig.trend === 'IMPROVING' 
                        ? 'text-emerald-800 dark:text-emerald-300' 
                        : sig.trend === 'DECLINING' 
                          ? 'text-rose-800 dark:text-rose-300' 
                          : 'text-slate-700 dark:text-slate-300'
                    }`}>
                      {sig.trend === 'IMPROVING' ? l.trendImproving : sig.trend === 'DECLINING' ? l.trendDeclining : l.trendStable}
                    </span>
                    <span className="text-slate-800 dark:text-[#EDE4DC] font-medium leading-relaxed">{sig.description}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* AI Summary Highlight */}
          {intelligence.aiSummary && (
            <div className={`p-2.5 rounded-lg border flex items-start gap-2 ${
              isLight 
                ? 'bg-amber-50/80 border-amber-300/80 text-amber-950' 
                : 'bg-amber-950/30 border-amber-800/50 text-amber-200'
            }`}>
              <Sparkles size={13} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[11px] font-semibold leading-relaxed">
                "{intelligence.aiSummary}"
              </p>
            </div>
          )}
        </div>

        {/* Section 5: Ghi chú dữ liệu nếu có */}
        {(intelligence.limitations && intelligence.limitations.length > 0) && (
          <div className={`p-2.5 text-[11px] font-medium flex items-start gap-1.5 ${
            isLight ? 'bg-amber-50/70 text-amber-900' : 'bg-amber-950/20 text-amber-200'
          }`}>
            <AlertTriangle size={12} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              {intelligence.limitations.map((lim, i) => (
                <div key={i}>{lim}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Desktop Table View (>=sm) */}
      <table className="hidden sm:table w-full text-left border-collapse text-xs">
        <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-[#33281E]'}`}>
          {/* Row 1: Tổng quan */}
          <tr className={isLight ? 'hover:bg-slate-50/50' : 'hover:bg-white/5'}>
            <td className={`px-4 py-3 font-bold align-top w-1/3 sm:w-1/4 ${
              isLight ? 'text-slate-900 bg-slate-50/40' : 'text-amber-200/90 bg-[#201813]/60'
            }`}>
              {l.overview}
            </td>
            <td className="px-4 py-3 align-top font-semibold">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${
                positiveScore >= 75
                  ? isLight ? 'bg-emerald-100 text-emerald-950 border-emerald-300' : 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                  : positiveScore >= 50
                    ? isLight ? 'bg-amber-100 text-amber-950 border-amber-300' : 'bg-amber-950/80 text-amber-300 border-amber-700'
                    : isLight ? 'bg-rose-100 text-rose-950 border-rose-300' : 'bg-rose-950/80 text-rose-300 border-rose-700'
              }`}>
                <CheckCircle2 size={13} className="shrink-0" />
                {positiveScore >= 75 
                  ? l.ratingExcellent
                  : positiveScore >= 50 
                    ? l.ratingGood 
                    : l.ratingNeedsImprovement}
              </span>
            </td>
          </tr>

          {/* Row 2: Điểm mạnh */}
          <tr className={isLight ? 'hover:bg-slate-50/50' : 'hover:bg-white/5'}>
            <td className={`px-4 py-3 font-bold align-top ${
              isLight ? 'text-slate-900 bg-slate-50/40' : 'text-amber-200/90 bg-[#201813]/60'
            }`}>
              <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                <ThumbsUp size={13} />
                <span>{l.positivePoints}</span>
              </div>
            </td>
            <td className="px-4 py-3 align-top">
              {intelligence.topPositiveTopics && intelligence.topPositiveTopics.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {intelligence.topPositiveTopics.map((t: any, idx: number) => {
                    const text = typeof t === 'string' ? t : t.topic || '';
                    return (
                      <span 
                        key={idx} 
                        className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border ${
                          isLight 
                            ? 'bg-emerald-50 text-emerald-950 border-emerald-300 shadow-xs' 
                            : 'bg-emerald-950/60 text-emerald-200 border-emerald-700/80'
                        }`}
                      >
                        ✓ {text}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <span className="text-slate-500 dark:text-slate-400 italic">{l.noDetail}</span>
              )}
            </td>
          </tr>

          {/* Row 3: Điểm cần lưu ý / Góp ý */}
          <tr className={isLight ? 'hover:bg-slate-50/50' : 'hover:bg-white/5'}>
            <td className={`px-4 py-3 font-bold align-top ${
              isLight ? 'text-slate-900 bg-slate-50/40' : 'text-amber-200/90 bg-[#201813]/60'
            }`}>
              <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400">
                <ThumbsDown size={13} />
                <span>{l.negativePoints}</span>
              </div>
            </td>
            <td className="px-4 py-3 align-top">
              {intelligence.topNegativeTopics && intelligence.topNegativeTopics.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {intelligence.topNegativeTopics.map((t: any, idx: number) => {
                    const text = typeof t === 'string' ? t : t.topic || '';
                    return (
                      <span 
                        key={idx} 
                        className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border ${
                          isLight 
                            ? 'bg-rose-50 text-rose-950 border-rose-300 shadow-xs' 
                            : 'bg-rose-950/60 text-rose-200 border-rose-700/80'
                        }`}
                      >
                        • {text}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                  isLight ? 'text-emerald-800 bg-emerald-50' : 'text-emerald-300 bg-emerald-950/40'
                }`}>
                  {l.noComplaints}
                </span>
              )}
            </td>
          </tr>

          {/* Row 4: Xu hướng & Tín hiệu */}
          <tr className={isLight ? 'hover:bg-slate-50/50' : 'hover:bg-white/5'}>
            <td className={`px-4 py-3 font-bold align-top ${
              isLight ? 'text-slate-900 bg-slate-50/40' : 'text-amber-200/90 bg-[#201813]/60'
            }`}>
              <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-400">
                <TrendingUp size={13} />
                <span>{l.aiTrends}</span>
              </div>
            </td>
            <td className="px-4 py-3 align-top space-y-2">
              {intelligence.improvementSignals && intelligence.improvementSignals.length > 0 && (
                <div className="space-y-1.5">
                  {intelligence.improvementSignals.map((sig, i) => (
                    <div 
                      key={i} 
                      className={`p-2 rounded-lg border flex items-start gap-2 ${
                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#201914] border-[#3D3024]'
                      }`}
                    >
                      <span className="shrink-0 mt-0.5">
                        {sig.trend === 'IMPROVING' ? (
                          <TrendingUp size={14} className="text-emerald-600" />
                        ) : sig.trend === 'DECLINING' ? (
                          <TrendingDown size={14} className="text-rose-600" />
                        ) : (
                          <Minus size={14} className="text-slate-500" />
                        )}
                      </span>
                      <div className="text-xs">
                        <span className={`font-bold ${
                          sig.trend === 'IMPROVING' 
                            ? 'text-emerald-800 dark:text-emerald-300' 
                            : sig.trend === 'DECLINING' 
                              ? 'text-rose-800 dark:text-rose-300' 
                              : 'text-slate-700 dark:text-slate-300'
                        }`}>
                          {sig.trend === 'IMPROVING' ? l.trendImproving : sig.trend === 'DECLINING' ? l.trendDeclining : l.trendStable}
                        </span>
                        <span className="text-slate-800 dark:text-[#EDE4DC] font-medium">{sig.description}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* AI Summary Highlight */}
              {intelligence.aiSummary && (
                <div className={`p-2.5 rounded-lg border mt-2 flex items-start gap-2 ${
                  isLight 
                    ? 'bg-amber-50/80 border-amber-300/80 text-amber-950' 
                    : 'bg-amber-950/30 border-amber-800/50 text-amber-200'
                }`}>
                  <Sparkles size={14} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs font-semibold leading-relaxed">
                    "{intelligence.aiSummary}"
                  </p>
                </div>
              )}
            </td>
          </tr>

          {/* Row 5: Lưu ý dữ liệu nếu có */}
          {(intelligence.limitations && intelligence.limitations.length > 0) && (
            <tr className={isLight ? 'bg-amber-50/60' : 'bg-amber-950/20'}>
              <td className={`px-4 py-2.5 font-bold align-top text-xs ${
                isLight ? 'text-amber-900' : 'text-amber-300'
              }`}>
                <div className="flex items-center gap-1">
                  <AlertTriangle size={12} className="text-amber-600" />
                  <span>{l.dataNote}</span>
                </div>
              </td>
              <td className={`px-4 py-2.5 text-xs font-medium ${
                isLight ? 'text-amber-900' : 'text-amber-200'
              }`}>
                {intelligence.limitations.map((lim, i) => (
                  <div key={i}>• {lim}</div>
                ))}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}


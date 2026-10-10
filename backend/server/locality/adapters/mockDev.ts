import crypto from 'crypto';
import { localityConfig } from '../config';
import { AdapterJob, AdapterResult, RawCandidate, SourceAdapter } from './types';

/**
 * Development-only source. Generates a deterministic set of places per cell so the
 * whole pipeline (quality gate → admin review → publish → reuse) can be exercised
 * without any third-party data. It deliberately includes places that must FAIL:
 * a restaurant, a café with 2 photos, a café with 6 reviews and an unclear category.
 * Never active when NODE_ENV=production.
 */
function rand(seed: string) {
  let h = crypto.createHash('sha1').update(seed).digest();
  let i = 0;
  return () => {
    if (i >= h.length - 4) {
      h = crypto.createHash('sha1').update(h).digest();
      i = 0;
    }
    const v = h.readUInt32BE(i) / 0xffffffff;
    i += 4;
    return v;
  };
}

const NAMES = ['Mộc Coffee', 'Sương Café', 'The Lantern Roastery', 'Gác Nhỏ Cà Phê', 'Bơ & Bánh Bakery Café', 'Hiên Nhà Coffee'];
const REVIEW_TEXTS = [
  'Không gian yên tĩnh, cà phê đậm vị.', 'Nhân viên thân thiện, wifi mạnh.', 'Cold brew ngon, giá hợp lý.',
  'Hơi đông vào cuối tuần nhưng vẫn ổn.', 'Có ổ cắm điện, ngồi làm việc tốt.', 'Bánh croissant giòn, thơm bơ.',
  'Nhạc nhẹ, ánh sáng đẹp.', 'Gửi xe tiện, chỗ ngồi rộng.', 'Cà phê muối rất đáng thử.', 'Sẽ quay lại lần nữa.',
  'Phục vụ nhanh.', 'View ban công thoáng.'
];

function makePlace(job: AdapterJob, idx: number, r: () => number, opts: { name: string; categories: string[]; photos: number; reviews: number }): RawCandidate {
  const { south, west, north, east } = job.bounds;
  const lat = south + (north - south) * (0.15 + r() * 0.7);
  const lng = west + (east - west) * (0.15 + r() * 0.7);
  const seed = `${job.cell_id}-${idx}`;
  return {
    source_ref: `mock:${seed}`,
    name: opts.name,
    address: `${10 + Math.floor(r() * 200)} Đường Số ${1 + idx}, ô ${job.cell_id}`,
    lat,
    lng,
    categories: opts.categories,
    phone: `028${Math.floor(10000000 + r() * 89999999)}`,
    opening_hours: '07:00 - 22:00',
    rating_avg: Math.round((3.8 + r() * 1.1) * 10) / 10,
    photos: Array.from({ length: opts.photos }, (_, i) => ({ url: `https://picsum.photos/seed/${seed}-${i}/800/600`, attribution: 'Ảnh mẫu (picsum.photos)' })),
    reviews: Array.from({ length: opts.reviews }, (_, i) => ({
      rating: 3 + Math.floor(r() * 3),
      text: REVIEW_TEXTS[(i + idx) % REVIEW_TEXTS.length],
      date: new Date(Date.now() - Math.floor(r() * 200) * 86400000).toISOString().slice(0, 10),
      language: 'vi',
      author: `Khách mẫu ${i + 1}`
    }))
  };
}

export const mockDevAdapter: SourceAdapter = {
  id: 'mock_dev',
  label: 'Dữ liệu mẫu (dev)',
  status() {
    if (!localityConfig.devMockEnabled) return { enabled: false, reason: 'Chỉ bật ở môi trường phát triển (LOCALITY_DEV_MOCK)' };
    return { enabled: true };
  },
  async fetch(job: AdapterJob): Promise<AdapterResult> {
    const r = rand(job.cell_id);
    const base = Math.floor(r() * NAMES.length);
    const name = (i: number) => NAMES[(base + i) % NAMES.length];
    return {
      origin: 'mock_dev',
      candidates: [
        makePlace(job, 0, r, { name: name(0), categories: ['cafe', 'coffee shop'], photos: 4, reviews: 12 }),
        makePlace(job, 1, r, { name: name(1), categories: ['specialty coffee'], photos: 3, reviews: 10 }),
        makePlace(job, 2, r, { name: 'Quán Cơm Tấm Mẫu', categories: ['restaurant'], photos: 5, reviews: 30 }),
        makePlace(job, 3, r, { name: name(2), categories: ['cafe'], photos: 2, reviews: 15 }),
        makePlace(job, 4, r, { name: name(3), categories: ['cafe'], photos: 4, reviews: 6 }),
        makePlace(job, 5, r, { name: name(4), categories: ['point of interest'], photos: 4, reviews: 12 })
      ]
    };
  }
};

/** Unit tests for shop opening-hours parsing.  npm run test:hours */
import {
  openWindowFor, isWithinOpeningHours, formatOpenWindow, isPastTime, toMinutes,
  TIME_CHOICES, DEFAULT_OPEN_RANGE, EVERY_DAY_LABEL, parseOpenRange, formatOpenRange
} from '../../shared/openingHours';
let pass = 0, fail = 0;
const check = (n: string, c: unknown, extra?: unknown) => { if (c) pass++; else { fail++; console.error('  ✗', n, extra ?? ''); } };

const weekday = [{ day: 'Thứ 2 - Thứ 6', time: '08:00 - 22:00' }, { day: 'Thứ 7 - CN', time: '07:30 - 23:00' }];
const allWeek = [{ day: 'Thứ 2 - CN', time: '07:00 - 22:30' }];
// 2026-10-26 is a Monday, 2026-10-24 a Saturday, 2026-10-25 a Sunday.
check('thứ 2 dùng khung ngày thường', openWindowFor(weekday, '2026-10-26')?.open === '08:00', openWindowFor(weekday, '2026-10-26'));
check('thứ 7 dùng khung cuối tuần', openWindowFor(weekday, '2026-10-24')?.open === '07:30', openWindowFor(weekday, '2026-10-24'));
check('chủ nhật vẫn thuộc "Thứ 7 - CN" (vắt qua tuần)', openWindowFor(weekday, '2026-10-25')?.close === '23:00', openWindowFor(weekday, '2026-10-25'));
check('"Thứ 2 - CN" phủ mọi ngày', ['2026-10-24','2026-10-26','2026-10-28'].every(d => openWindowFor(allWeek, d)?.close === '22:30'));

check('chuỗi đơn cũng đọc được', openWindowFor('07:00 - 22:00', '2026-10-26')?.open === '07:00');
check('en dash chấp nhận', openWindowFor('07:00 – 22:00', '2026-10-26')?.close === '22:00');
check('không có dữ liệu → null', openWindowFor(undefined, '2026-10-26') === null && openWindowFor([], '2026-10-26') === null);
check('rác → null', openWindowFor('mở cả ngày', '2026-10-26') === null);

check('trong giờ mở cửa', isWithinOpeningHours(allWeek, '2026-10-26', '10:00'));
check('đúng giờ mở là hợp lệ', isWithinOpeningHours(allWeek, '2026-10-26', '07:00'));
check('trước giờ mở bị chặn', !isWithinOpeningHours(allWeek, '2026-10-26', '06:30'));
check('đúng giờ đóng bị chặn', !isWithinOpeningHours(allWeek, '2026-10-26', '22:30'));
check('sau giờ đóng bị chặn', !isWithinOpeningHours(allWeek, '2026-10-26', '23:00'));
check('giờ không đọc được → không chặn', isWithinOpeningHours(undefined, '2026-10-26', '03:00'));
check('quán qua nửa đêm: 01:00 vẫn mở', isWithinOpeningHours('18:00 - 02:00', '2026-10-26', '01:00'));
check('quán qua nửa đêm: 17:00 đã đóng', !isWithinOpeningHours('18:00 - 02:00', '2026-10-26', '17:00'));
check('24:00 là nửa đêm cuối ngày', isWithinOpeningHours('08:00 - 24:00', '2026-10-26', '23:30'));

check('hiển thị khung giờ', formatOpenWindow(allWeek, '2026-10-26') === '07:00 – 22:30', formatOpenWindow(allWeek, '2026-10-26'));
check('không rõ giờ → không hiển thị', formatOpenWindow(undefined, '2026-10-26') === null);

const now = new Date('2026-10-26T14:30:00');
check('hôm nay: giờ đã qua bị chặn', isPastTime('2026-10-26', '13:00', now));
check('hôm nay: đúng phút hiện tại coi như đã qua', isPastTime('2026-10-26', '14:30', now));
check('hôm nay: giờ sắp tới hợp lệ', !isPastTime('2026-10-26', '15:00', now));
check('ngày khác không bị chặn bởi giờ hiện tại', !isPastTime('2026-10-27', '08:00', now));
check('toMinutes', toMinutes('08:30') === 510 && toMinutes('bậy') === null);

// --- what the shop's dropdowns can produce -------------------------------------------
// The picker replaced a free-text box, and the whole point is that it can only emit
// strings this parser reads. So every choice it offers is round-tripped here: if a value
// in TIME_CHOICES ever stopped parsing, the shop would save hours that silently disable
// the booking-time check instead of enforcing it.
check('the picker offers half-hour marks across the day', TIME_CHOICES.length === 49, TIME_CHOICES.length);
check('it starts at midnight and ends at 24:00',
  TIME_CHOICES[0] === '00:00' && TIME_CHOICES[TIME_CHOICES.length - 1] === '24:00');
check('every mark is a readable time', TIME_CHOICES.every(x => toMinutes(x) !== null));

{
  // Every open/close pair the dropdowns allow must survive save → read.
  const broken: string[] = [];
  for (const open of TIME_CHOICES) {
    for (const close of TIME_CHOICES) {
      const stored = formatOpenRange({ open, close });
      const back = parseOpenRange(stored);
      if (!back || back.open !== open || back.close !== close) broken.push(stored);
    }
  }
  check('every pair the picker can produce parses back identically', broken.length === 0, broken.slice(0, 5));
}

check('a hand-typed value the old box allowed is rejected, not half-read',
  parseOpenRange('7h - 22h') === null && parseOpenRange('Mở cả ngày') === null);
check('an empty value is rejected rather than guessed', parseOpenRange('') === null && parseOpenRange(undefined) === null);
check('the default is a real window', parseOpenRange(formatOpenRange(DEFAULT_OPEN_RANGE))?.open === '07:00');
check('the stored day label is a constant, not a translation', EVERY_DAY_LABEL === 'Hằng ngày');
check('that label applies to every weekday',
  ['2026-10-24', '2026-10-26', '2026-10-28'].every(d =>
    openWindowFor([{ day: EVERY_DAY_LABEL, time: '08:00 - 20:00' }], d)?.open === '08:00'));
// A label saved in another language must still mean "every day" rather than silently
// narrowing the window to nothing.
check('a non-Vietnamese day label still covers every day',
  openWindowFor([{ day: '每天', time: '08:00 - 20:00' }], '2026-10-26')?.close === '20:00');

console.log(`\nopening-hours: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);

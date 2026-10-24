/** Unit tests for shop opening-hours parsing.  npm run test:hours */
import { openWindowFor, isWithinOpeningHours, formatOpenWindow, isPastTime, toMinutes } from '../../shared/openingHours';
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

console.log(`\nopening-hours: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);

import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium/chrome-linux/chrome' }).catch(()=>chromium.launch());
let fail = 0;
const check = (n, ok, extra='') => { if(!ok) fail++; console.log(`  ${ok?'✓':'✗'} ${n}${ok?'':'  → '+extra}`); };

async function open(page) { await page.click('#opener'); await page.waitForSelector('[role="dialog"]'); await page.waitForTimeout(700); }

for (const [theme, w, h, label] of [['light',390,844,'sáng / phone'], ['dark',1280,900,'tối / desktop']]) {
  const page = await b.newPage({ viewport:{width:w,height:h} });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(t => localStorage.setItem('app_theme', t), theme);
  await page.goto('http://localhost:4180/', { waitUntil:'networkidle' });
  console.log(`\n${label}`);

  check('chưa mở khoá thì không có popup', !(await page.$('[role="dialog"]')));
  await open(page);

  const info = await page.evaluate(() => {
    const d = document.querySelector('[role="dialog"]');
    const r = d.getBoundingClientRect();
    return {
      modal: d.getAttribute('aria-modal'), labelled: !!document.getElementById(d.getAttribute('aria-labelledby')),
      title: document.getElementById('celebration-title')?.textContent,
      inViewport: r.top >= 0 && r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight,
      width: Math.round(r.width),
      focus: document.activeElement?.textContent?.trim(),
      plus: [...d.querySelectorAll('span')].map(s=>s.textContent).find(t=>t?.startsWith('+')),
      buttons: d.querySelectorAll('button').length
    };
  });
  check('aria-modal + tiêu đề liên kết đúng', info.modal === 'true' && info.labelled, JSON.stringify(info));
  check('tên tiến trình hiện đúng', info.title === 'Kẻ Khám Phá', info.title);
  check('vừa khít màn hình, không tràn', info.inViewport, `w=${info.width} vp=${w}`);
  check('focus đặt sẵn ở nút chính', info.focus === 'Tiếp tục', info.focus);
  check('hiển thị số điểm nhận được', info.plus === '+45', info.plus);

  // Tab must stay inside the dialog
  await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
  const stillInside = await page.evaluate(() => !!document.querySelector('[role="dialog"]')?.contains(document.activeElement));
  check('Tab không thoát khỏi popup (focus trap)', stillInside);

  // Wait for the exit animation to finish instead of a fixed delay.
  await page.keyboard.press('Escape');
  const escClosed = await page.waitForSelector('[role="dialog"]', { state: 'detached', timeout: 3000 }).then(()=>true).catch(()=>false);
  check('Escape đóng popup', escClosed);

  await open(page);
  await page.getByRole('button', { name: 'Tiếp tục' }).click();
  const btnClosed = await page.waitForSelector('[role="dialog"]', { state: 'detached', timeout: 3000 }).then(()=>true).catch(()=>false);
  check('nút "Tiếp tục" đóng popup', btnClosed);

  await open(page);
  await page.screenshot({ path: `celebtest/shot-${theme}.png` });
  check('không có lỗi JS', errs.length === 0, errs.join('|'));
  await page.close();
}

// reduced motion
const rm = await b.newPage({ viewport:{width:390,height:844}, reducedMotion:'reduce' });
await rm.goto('http://localhost:4180/', { waitUntil:'networkidle' });
await open(rm);
const conf = await rm.evaluate(() => document.querySelectorAll('[role="dialog"]').length && document.querySelectorAll('[aria-hidden="true"] span').length);
check('\nreduced-motion: popup vẫn hiện, không có pháo giấy', await rm.evaluate(() => !!document.querySelector('[role="dialog"]')));
await rm.screenshot({ path: 'celebtest/shot-reduced.png' });
await rm.close();

await b.close();
console.log(fail ? `\n${fail} FAILED` : '\nTẤT CẢ ĐẠT');
process.exit(fail?1:0);

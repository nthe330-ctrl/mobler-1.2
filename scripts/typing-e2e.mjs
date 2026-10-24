import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium/chrome-linux/chrome' }).catch(()=>chromium.launch());
let fail = 0;
const check = (name, got, want) => {
  const ok = got === want;
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(42)} got=${JSON.stringify(got)}${ok ? '' : `  want=${JSON.stringify(want)}`}`);
};

// 1) fresh visitor, nothing in localStorage -> default language
let page = await b.newPage({ viewport: { width: 420, height: 900 } });
await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
check('default language (fresh visitor)',
  await page.evaluate(() => document.querySelector('h1')?.textContent),
  'Quán ngon, bàn sẵn sàng');
check('localStorage untouched before choice',
  await page.evaluate(() => localStorage.getItem('app_language')), null);

// 2) TYPING — press one key at a time, like a real person
const PHONE = '0900000001', PASS = 'demo1234';
const phone = page.locator('input[autocomplete="username"]');
await phone.click();
for (const ch of PHONE) await page.keyboard.press(ch === '0' ? 'Digit0' : `Digit${ch}`);
check('phone field after typing 10 keys', await phone.inputValue(), PHONE);

const pass = page.locator('input[autocomplete="current-password"]');
await pass.click();
await page.keyboard.type(PASS, { delay: 40 });
check('password field after typing 8 keys', await pass.inputValue(), PASS);

// focus must survive every keystroke — that is the actual bug
check('focus still on password input',
  await page.evaluate(() => document.activeElement?.getAttribute('autocomplete')), 'current-password');

// 3) the same on the register tab (5 fields)
await page.getByRole('button', { name: /Tạo tài khoản/ }).first().click();
await page.waitForTimeout(400);
const name = page.locator('input[autocomplete="name"]');
await name.click();
await page.keyboard.type('Nguyễn Văn A', { delay: 30 });
check('register: full-name field', await name.inputValue(), 'Nguyễn Văn A');

// 4) a saved Chinese choice must still be honoured (we only changed the DEFAULT)
await page.evaluate(() => localStorage.setItem('app_language', 'zh-TW'));
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(700);
const zh = await page.evaluate(() => document.querySelector('h1')?.textContent);
check('explicit zh-TW choice still respected', zh, '好咖啡館，座位已備妥');

await b.close();
console.log(fail ? `\n${fail} CHECK(S) FAILED` : '\nALL CHECKS PASS');
process.exit(fail ? 1 : 0);

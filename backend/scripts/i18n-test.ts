/**
 * The dashboard's translations, checked as data rather than by looking at screens.
 *
 * A missing key does not crash anything — `t()` quietly falls through to English and then
 * Vietnamese — which is exactly why it needs a test. A half-translated screen looks fine
 * to whoever added the key and wrong to everybody reading in another language.
 *
 * Note the fallback ORDER, because it decides what "missing" costs: active language →
 * English → Vietnamese → the literal fallback. A key present in `en` but absent from `vi`
 * therefore shows ENGLISH to Vietnamese staff, the product's primary audience. So the
 * Vietnamese dictionary is not optional, and this suite treats a gap there like any other.
 *
 *   npm run test:i18n
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Repo root, independent of where npm was invoked from (scripts run with cwd = backend/). */
const REPO = fileURLToPath(new URL('../../', import.meta.url));
import { SHOP_UI_TRANSLATIONS, SHOP_TRANSLATION_KEYS } from '../../shared/context/shopTranslations';
import { SUPPORTED_LANGUAGES } from '../../shared/context/LanguageContext';

let passed = 0;
let failed = 0;

/** Every file under `dir` matching `pattern`, recursively. */
function listFiles(dir: string, pattern: RegExp): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...listFiles(full, pattern));
    else if (pattern.test(name)) out.push(full);
  }
  return out;
}

/**
 * Blank out `//` and block comments so a check for leftover text does not flag the notes
 * explaining the code. Quotes inside a comment are irrelevant once the comment is gone,
 * and a `//` inside a string (a URL) blanks the rest of that line — acceptable here,
 * because the only thing read afterwards is whether Vietnamese letters remain.
 */
function stripComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '))
    .replace(/^(.*?)\/\/.*$/gm, (_m, head: string) => head);
}

/**
 * Blank out regions a file marks as deliberately canonical Vietnamese.
 *
 * Not every Vietnamese string in a screen is a missed translation. A menu item's stored
 * sugar level IS the Vietnamese text `'70% (Chuẩn)'` — that is its identity, matched by
 * string equality in the API and sent verbatim to the customer app, and `menuOptionLabel`
 * translates only how it is written on screen. Rewriting the stored value would break the
 * default and give one shop two names for the same thing.
 *
 * So a file wraps such a region in
 *
 *   // i18n-exempt-start: <why>
 *   …
 *   // i18n-exempt-end
 *
 * and the reason is right there next to the data for whoever reads it next. An unclosed
 * marker is reported rather than silently swallowing the rest of the file.
 *
 * This runs BEFORE comments are blanked, because the markers are comments themselves.
 */
function stripExemptRegions(text: string, rel: string): string {
  const lines = text.split('\n');
  let inside = false;
  let openedAt = 0;
  const out = lines.map((line, i) => {
    if (/i18n-exempt-start/.test(line)) { inside = true; openedAt = i + 1; return ''; }
    if (/i18n-exempt-end/.test(line)) { inside = false; return ''; }
    return inside ? '' : line;
  });
  if (inside) {
    console.log(`  ✗ ${rel}: i18n-exempt-start at line ${openedAt} is never closed`);
    failed++;
  }
  return out.join('\n');
}

function check(name: string, cond: unknown, extra?: unknown) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}`, extra ?? '');
  }
}

const LANGS = ['vi', 'en', 'zh-TW', 'th'] as const;

console.log('\nEvery language carries every key');
{
  const reference = new Set(SHOP_TRANSLATION_KEYS);
  check('the key list is not empty', reference.size > 0, reference.size);
  check('all four interface languages are supported',
    LANGS.every(l => SUPPORTED_LANGUAGES.some(s => s.code === l)), SUPPORTED_LANGUAGES.map(s => s.code));

  for (const lang of LANGS) {
    const dict = SHOP_UI_TRANSLATIONS[lang];
    const missing = [...reference].filter(k => !dict[k]);
    const extra = Object.keys(dict).filter(k => !reference.has(k));
    check(`${lang}: no missing keys`, missing.length === 0, missing.slice(0, 8));
    check(`${lang}: no keys the other languages lack`, extra.length === 0, extra.slice(0, 8));
  }
}

console.log('\nNo value is left as a placeholder');
{
  for (const lang of LANGS) {
    const dict = SHOP_UI_TRANSLATIONS[lang];
    const blank = Object.entries(dict).filter(([, v]) => !v || !String(v).trim());
    check(`${lang}: no blank strings`, blank.length === 0, blank.slice(0, 5).map(([k]) => k));

    // A value identical to its own key means someone pasted the key in as a stand-in.
    const echoed = Object.entries(dict).filter(([k, v]) => v === k);
    check(`${lang}: no value is just the key`, echoed.length === 0, echoed.slice(0, 5).map(([k]) => k));
  }
}

console.log('\nThe non-Vietnamese dictionaries were actually translated');
{
  // Catching the copy-paste case: a translator's file where rows were duplicated from
  // Vietnamese and never touched. Proper nouns legitimately repeat ("Mobler Shop — …"),
  // so this allows a small overlap rather than demanding zero.
  const vi = SHOP_UI_TRANSLATIONS.vi;
  for (const lang of ['en', 'zh-TW', 'th'] as const) {
    const dict = SHOP_UI_TRANSLATIONS[lang];
    const same = SHOP_TRANSLATION_KEYS.filter(k => dict[k] === vi[k]);
    check(`${lang}: fewer than 5% of values are byte-identical to Vietnamese`,
      same.length / SHOP_TRANSLATION_KEYS.length < 0.05,
      `${same.length}/${SHOP_TRANSLATION_KEYS.length}: ${same.slice(0, 5).join(', ')}`);
  }

  // Each language should look like itself. A Thai dictionary with no Thai script, or a
  // Chinese one with no Han characters, means the wrong text landed in the wrong column.
  const thai = Object.values(SHOP_UI_TRANSLATIONS.th).filter(v => /[฀-๿]/.test(v)).length;
  check('th: most values contain Thai script', thai / SHOP_TRANSLATION_KEYS.length > 0.8, thai);
  const han = Object.values(SHOP_UI_TRANSLATIONS['zh-TW']).filter(v => /[一-鿿]/.test(v)).length;
  check('zh-TW: most values contain Han characters', han / SHOP_TRANSLATION_KEYS.length > 0.8, han);
  // Vietnamese without a single diacritic across the whole file would be a red flag too.
  const viDia = Object.values(vi).filter(v => /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(v)).length;
  check('vi: values carry Vietnamese diacritics', viDia / SHOP_TRANSLATION_KEYS.length > 0.5, viDia);
}

console.log('\nPlaceholders survive translation');
{
  // `{max}` and `{n}` are substituted at render time. A translation that drops or renames
  // one produces a sentence with a hole in it, in that language only.
  for (const key of SHOP_TRANSLATION_KEYS) {
    const want = (SHOP_UI_TRANSLATIONS.vi[key].match(/\{[a-z]+\}/g) || []).sort().join(',');
    if (!want) continue;
    for (const lang of ['en', 'zh-TW', 'th'] as const) {
      const got = (SHOP_UI_TRANSLATIONS[lang][key].match(/\{[a-z]+\}/g) || []).sort().join(',');
      check(`${key} keeps ${want} in ${lang}`, got === want, got || '(none)');
    }
  }
}

console.log('\nThe dictionary source has no duplicate entries');
{
  // `Object.keys` cannot see this: a literal with the same key twice silently keeps the
  // last one, so a duplicate is invisible to every check above while quietly overriding a
  // translation. One run of the key-adding helper inserted sixteen of them.
  const src = readFileSync(join(REPO, 'shared/context/shopTranslations.ts'), 'utf8');
  const BLOCKS: [string, string][] = [
    ['vi', 'const vi: Dict = {'],
    ['en', 'const en: Dict = {'],
    ['zh-TW', 'const zhTW: Dict = {'],
    ['th', 'const th: Dict = {']
  ];
  for (const [lang, decl] of BLOCKS) {
    const start = src.indexOf(decl);
    const end = src.indexOf('\n};', start);
    const body = start >= 0 && end > start ? src.slice(start, end) : '';
    const keys = [...body.matchAll(/^\s*(['"])([^'"]+)\1\s*:/gm)].map(m => m[2]);
    const dups = keys.filter((k, i) => keys.indexOf(k) !== i);
    check(`${lang}: block found and parsed`, keys.length > 0, keys.length);
    check(`${lang}: no duplicate keys in the source`, dups.length === 0, [...new Set(dups)].slice(0, 8));
  }
}

console.log('\nEvery key the Dashboard asks for exists');
{
  // The other direction from the checks above: a screen can reference a key that was never
  // added, and `t()` then renders the key itself on screen. Scanning the source is the only
  // way to see that without opening every screen in every language.
  const known = new Set(SHOP_TRANSLATION_KEYS);
  const files = listFiles(join(REPO, 'apps/shop/src'), /\.tsx?$/);
  const referenced = new Map<string, string>();
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(/['"`](shop\.[A-Za-z0-9_.]+)['"`]/g)) {
      if (!referenced.has(m[1])) referenced.set(m[1], file);
    }
  }
  check('the scan found key references', referenced.size > 0, referenced.size);
  const unknown = [...referenced].filter(([k]) => !known.has(k));
  check('no screen references a key the dictionary lacks', unknown.length === 0,
    unknown.slice(0, 8).map(([k, f]) => `${k} (${f.split('/apps/')[1]})`));

  // Every booking status needs a label, or the status badge renders "shop.status.no_show".
  for (const status of ['pending', 'confirmed', 'arrived', 'completed', 'cancelled', 'rejected', 'no_show']) {
    check(`shop.status.${status} exists`, known.has(`shop.status.${status}`));
  }
}

console.log('\nLocalized screens keep no Vietnamese text in code');
{
  // A regression gate, not a sweep: only screens already converted are listed, so finishing
  // a screen means adding it here and the suite holds it that way. Comments are exempt —
  // they are for whoever maintains the code, not for the staff reading the dashboard.
  const DONE = [
    'apps/shop/src/views/LiveBookingsView.tsx',
    'apps/shop/src/views/ShopAuthScreen.tsx',
    'apps/shop/src/views/ShopProfileView.tsx',
    'apps/shop/src/components/dashboard/DashboardLayout.tsx',
    'apps/shop/src/components/dashboard/ShopLanguagePicker.tsx',
    'apps/shop/src/components/dashboard/MenuManagerView.tsx',
    'apps/shop/src/components/dashboard/PromotionsVoucherView.tsx',
    'apps/shop/src/components/dashboard/OverviewView.tsx',
    'apps/shop/src/components/dashboard/AnalyticsView.tsx',
    'apps/shop/src/components/dashboard/CustomerInsightsView.tsx',
    'apps/shop/src/components/dashboard/CustomerAvatar.tsx',
    'apps/shop/src/components/dashboard/ReviewsManagerView.tsx',
    'apps/shop/src/components/dashboard/IncomingOrderModal.tsx',
    'apps/shop/src/components/dashboard/QrScannerModal.tsx',
    'apps/shop/src/components/dashboard/NotificationBell.tsx',
    'apps/shop/src/App.tsx'
  ];
  const DIACRITIC = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
  for (const rel of DONE) {
    const offenders = stripComments(stripExemptRegions(readFileSync(join(REPO, rel), 'utf8'), rel))
      .split('\n')
      .map((line, i) => [i + 1, line] as const)
      .filter(([, line]) => DIACRITIC.test(line));
    check(`${rel.split('/').pop()}: no Vietnamese literals left`, offenders.length === 0,
      offenders.slice(0, 4).map(([n, l]) => `L${n}: ${l.trim().slice(0, 60)}`));
  }
}

console.log(`\ni18n: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

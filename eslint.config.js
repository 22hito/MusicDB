const fs = require('fs');
const path = require('path');
const globals = require('globals');

// Фронтенд — звичайні <script> з wwwroot/js/*.js (без збирача): верхньорівневі
// function/let/const одного файлу доступні іншим (спільна глобальна область),
// а функції викликаються ще й з onclick="..." у index.html. ESLint бачить лише
// один файл, тож для кожного модуля передаємо як глобальні імена оголошення
// ІНШИХ модулів — no-undef і далі ловить справжні опечатки.
const JS_DIR = path.join(__dirname, 'wwwroot', 'js');
const files = fs.existsSync(JS_DIR) ? fs.readdirSync(JS_DIR).filter((f) => f.endsWith('.js')) : [];
const TOP_FN = /^(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)/gm;
const TOP_VAR = /^(?:let|const|var)\s+/gm;

// "let a = [1, 2], b = { c: 3 }, d;" → a, b, d: ділимо на оголошення лише по комах
// поза дужками й беремо ім'я перед "=" (або все, якщо ініціалізатора немає).
function namesFromDeclaration(src, start) {
  const names = [];
  let depth = 0, part = '', inStr = null;
  for (let i = start; i < src.length; i++) {
    const ch = src[i];
    if (inStr) { part += ch; if (ch === '\\') { part += src[++i] ?? ''; } else if (ch === inStr) inStr = null; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; part += ch; continue; }
    if ('([{'.includes(ch)) depth++;
    if (')]}'.includes(ch)) depth--;
    const end = depth === 0 && (ch === ';' || ch === '\n' && !/[,=]\s*$/.test(part) && !/^\s*$/.test(part) && !/[([{,]\s*$/.test(part.trimEnd()));
    if ((depth === 0 && ch === ',') || end || i === src.length - 1) {
      const id = part.split('=')[0].trim();
      if (/^[A-Za-z_$][\w$]*$/.test(id)) names.push(id);
      part = '';
      if (end) break;
      continue;
    }
    part += ch;
  }
  return names;
}

function declaredNames(file) {
  const src = fs.readFileSync(path.join(JS_DIR, file), 'utf8').replace(/\r\n/g, '\n');
  const names = new Set();
  for (const m of src.matchAll(TOP_FN)) names.add(m[1]);
  for (const m of src.matchAll(TOP_VAR)) for (const n of namesFromDeclaration(src, m.index + m[0].length)) names.add(n);
  return names;
}
const byFile = Object.fromEntries(files.map((f) => [f, declaredNames(f)]));

const rules = {
  // vars:'local' — не чіпаємо верхньорівневі декларації: їх викликають інші модулі
  // та onclick="..." у index.html, лінтер цього не бачить.
  // args:'none' — те саме для catch(e){} з порожнім тілом (усюди в коді).
  'no-unused-vars': ['warn', { vars: 'local', args: 'none', caughtErrors: 'none' }],
  'no-undef': 'error',
  'no-redeclare': 'warn',
  'no-var': 'warn',
};

module.exports = [
  ...files.map((f) => {
    const shared = {};
    for (const [other, names] of Object.entries(byFile)) {
      if (other === f) continue;
      for (const n of names) if (!byFile[f].has(n)) shared[n] = 'writable';
    }
    return {
      files: [`wwwroot/js/${f}`],
      languageOptions: {
        ecmaVersion: 2021,
        sourceType: 'script',
        globals: { ...globals.browser, YT: 'readonly', signalR: 'readonly', ...shared },
      },
      rules,
    };
  }),
  {
    files: ['wwwroot/sw.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'script',
      globals: { ...globals.serviceworker },
    },
  },
];

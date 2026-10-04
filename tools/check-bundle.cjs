// Чи можна склеїти defer-скрипти index.html в один файл (так їх віддає прод — див. Services/StaticAssetVersions.cs)
// без зміни поведінки. Окремі <script> і один склеєний відрізняються в трьох місцях — їх і ловимо:
//  1. однакове верхньорівневе ім'я у двох файлах: let/const — SyntaxError на ВЕСЬ пакет, function — перемагає
//     пізніша одразу, ще до виконання ранішого файлу;
//  2. код, що виконується під час завантаження файлу (верхній рівень, IIFE, колбеки forEach/map…, і транзитивно
//     функції, які він викликає), звертається до імені з ПІЗНІШОГО файлу: окремо такого імені ще нема
//     (typeof дає 'undefined'), а в пакеті функції вже підняті, а let/const — у TDZ (typeof кидає помилку);
//  3. присвоєння під час завантаження імені, яке пізніший файл оголошує як function, — у пакеті підйом
//     функції стався раніше, і присвоєння її затре.
// Чужий код (js/vendor) не перевіряємо — StaticAssetVersions загортає його у власну функцію.
const fs = require('fs');
const path = require('path');
const espree = require('espree');
const eslintScope = require('eslint-scope');

const WWW = path.join(__dirname, '..', 'wwwroot');
const html = fs.readFileSync(path.join(WWW, 'index.html'), 'utf8');
const files = [...html.matchAll(/<script defer src="(\/js\/[\w./-]+\.js)"/g)].map((m) => m[1]).filter((f) => !f.startsWith('/js/vendor/'));
// Колбеки, які виконуються одразу, — частина коду завантаження. Решта (addEventListener, setTimeout, then…) — пізніше.
const SYNC = new Set(['forEach', 'map', 'filter', 'some', 'every', 'reduce', 'find', 'findIndex', 'sort', 'flatMap', 'replace']);

const decl = new Map(); // ім'я → [{ file, idx, kind }]
const add = (name, file, idx, kind) => { if (!decl.has(name)) decl.set(name, []); decl.get(name).push({ file, idx, kind }); };
const patternNames = (p) => {
  if (!p) return [];
  switch (p.type) {
    case 'Identifier': return [p.name];
    case 'ObjectPattern': return p.properties.flatMap((x) => patternNames(x.value || x.argument));
    case 'ArrayPattern': return p.elements.flatMap(patternNames);
    case 'AssignmentPattern': return patternNames(p.left);
    case 'RestElement': return patternNames(p.argument);
    default: return [];
  }
};

const info = files.map((file, idx) => {
  const src = fs.readFileSync(path.join(WWW, file), 'utf8');
  const ast = espree.parse(src, { ecmaVersion: 'latest', sourceType: 'script', range: true, loc: true });
  const parent = new Map();
  (function walk(node, par) {
    if (!node || typeof node.type !== 'string') return;
    parent.set(node, par);
    for (const key of Object.keys(node)) {
      if (key === 'parent') continue;
      const v = node[key];
      if (Array.isArray(v)) v.forEach((c) => walk(c, node));
      else if (v && typeof v.type === 'string') walk(v, node);
    }
  })(ast, null);
  for (const st of ast.body) {
    if (st.type === 'FunctionDeclaration') add(st.id.name, file, idx, 'function');
    else if (st.type === 'ClassDeclaration') add(st.id.name, file, idx, 'class');
    else if (st.type === 'VariableDeclaration') st.declarations.forEach((d) => patternNames(d.id).forEach((n) => add(n, file, idx, st.kind)));
  }
  const runsInline = (fn) => {
    const par = parent.get(fn);
    if (!par || par.type !== 'CallExpression') return false;
    if (par.callee === fn) return true;
    return par.callee.type === 'MemberExpression' && !par.callee.computed && SYNC.has(par.callee.property.name);
  };
  // Кому належить посилання: верхньорівнева функція, '#load' (код завантаження) або null (виконається пізніше).
  const owner = (scope) => {
    let top = '#load';
    for (let s = scope; s && s.type !== 'global'; s = s.upper) {
      if (s.type !== 'function') continue;
      const fn = s.block;
      if (fn.type === 'FunctionDeclaration' && ast.body.includes(fn)) top = fn.id.name;
      else if (!runsInline(fn)) return null;
    }
    return top;
  };
  const refs = new Map();
  const sm = eslintScope.analyze(ast, { ecmaVersion: 2022, sourceType: 'script' });
  (function visit(scope) {
    for (const r of scope.references) {
      if (r.resolved && r.resolved.scope.type !== 'global') continue;
      const o = owner(scope);
      if (!o) continue;
      const id = r.identifier;
      const par = parent.get(id);
      if (!refs.has(o)) refs.set(o, []);
      refs.get(o).push({
        name: id.name, line: id.loc.start.line, write: r.isWrite(),
        call: !!par && (par.type === 'CallExpression' || par.type === 'NewExpression') && par.callee === id,
      });
    }
    scope.childScopes.forEach(visit);
  })(sm.globalScope);
  return { file, idx, refs };
});

const problems = [];
for (const [name, list] of decl) {
  if (list.length > 1) problems.push(`однакове ім'я «${name}»: ${list.map((x) => `${x.file} (${x.kind})`).join(', ')}`);
}
for (const fi of info) {
  const seen = new Set();
  const queue = [[fi.idx, '#load', []]];
  while (queue.length) {
    const [idx, fn, trail] = queue.shift();
    if (seen.has(idx + ':' + fn)) continue;
    seen.add(idx + ':' + fn);
    const via = fn === '#load' ? trail : [...trail, fn];
    for (const r of info[idx].refs.get(fn) || []) {
      const d = decl.get(r.name);
      if (!d) continue; // браузерні глобальні
      if (r.write && fn === '#load' && d.some((x) => x.kind === 'function' && x.idx > fi.idx)) {
        problems.push(`${fi.file}:${r.line} під час завантаження присвоює «${r.name}», а ${d.find((x) => x.idx > fi.idx).file} оголошує її як function`);
      }
      const target = d[d.length - 1];
      if (target.idx > fi.idx) {
        problems.push(`${info[idx].file}:${r.line} — «${r.name}» з пізнішого ${target.file} використовується під час завантаження ${fi.file}${via.length ? ` (через ${via.join(' → ')})` : ''}`);
      } else if (target.kind === 'function' && r.call) {
        queue.push([target.idx, r.name, via]);
      }
    }
  }
}
if (problems.length) {
  console.error(`Скрипти не можна безпечно склеїти в /js/bundle.js (див. tools/check-bundle.cjs):\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(`check-bundle: ${files.length} скриптів можна склеювати`);

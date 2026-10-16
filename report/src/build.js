#!/usr/bin/env node
/*
 * Sahur Protocol report builder.
 *   node src/build.js            -> HTML + PDF + DOCX
 *   node src/build.js --html     -> HTML only
 *   node src/build.js --pdf      -> HTML + PDF (+ page PNGs with --pages)
 *   node src/build.js --docx     -> DOCX only
 *   --pages                      -> also screenshot every PDF page to build/pages/
 *   --only=05,06                 -> build only content files starting with these prefixes (plus front/back)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const MarkdownIt = require('markdown-it');
const mdContainer = require('markdown-it-container');

const ROOT = path.resolve(__dirname, '..');
const CONTENT = path.join(ROOT, 'content');
const ASSETS = path.join(ROOT, 'assets');
const _argOut = (process.argv.find((x) => x.startsWith('--outdir=')) || '').split('=')[1];
const BUILD = path.join(ROOT, _argOut || 'build');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT_NAME = 'Sahur_Protocol_SE_Report';

const argv = process.argv.slice(2);
const flag = (f) => argv.includes(f);
const optVal = (k) => { const a = argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : null; };
const wantAll = !flag('--html') && !flag('--pdf') && !flag('--docx');
const WANT = { html: true, pdf: wantAll || flag('--pdf'), docx: wantAll || flag('--docx'), pages: flag('--pages') };
const ONLY = optVal('only') ? optVal('only').split(',') : null;

const warnings = [];
const warn = (m) => { warnings.push(m); console.warn('WARN:', m); };

// ---------------------------------------------------------------- helpers
const read = (p) => fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '');
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pad2 = (n) => (/^\d+$/.test(String(n)) ? String(n).padStart(2, '0') : String(n));
const unq = (s) => { s = s.trim(); if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) return s.slice(1, -1); return s; };

function parseFront(src) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { meta: {}, body: src };
  const meta = {}; let cur = null;
  for (const line of m[1].split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const li = line.match(/^\s+-\s+(.*)$/);
    if (li && cur) { if (!Array.isArray(meta[cur])) meta[cur] = []; meta[cur].push(unq(li[1])); continue; }
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (kv) { cur = kv[1]; meta[cur] = kv[2] === '' ? [] : unq(kv[2]); }
  }
  return { meta, body: src.slice(m[0].length) };
}

function parseAttrs(s) {
  const a = {}; const re = /([\w-]+)="([^"]*)"/g; let m;
  while ((m = re.exec(s || ''))) a[m[1]] = m[2];
  return a;
}

/** Prefer a compressed web copy of an asset when one exists (assets/web/<same path>.jpg|.png). */
function assetPath(rel) {
  const base = rel.replace(/\.(png|jpe?g)$/i, '');
  for (const ext of ['.jpg', '.png']) {
    const w = path.join(ASSETS, 'web', base + ext);
    if (fs.existsSync(w)) return 'web/' + base + ext;
  }
  if (!fs.existsSync(path.join(ASSETS, rel))) warn(`missing asset: ${rel}`);
  return rel;
}

function imgSize(buf) {
  if (buf[0] === 0x89 && buf[1] === 0x50) return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20), type: 'png' };
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let o = 2;
    while (o < buf.length) {
      if (buf[o] !== 0xff) { o++; continue; }
      const marker = buf[o + 1]; const len = buf.readUInt16BE(o + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { h: buf.readUInt16BE(o + 5), w: buf.readUInt16BE(o + 7), type: 'jpg' };
      o += 2 + len;
    }
  }
  throw new Error('unknown image format');
}

function compressNums(nums) {
  const out = []; let i = 0;
  while (i < nums.length) {
    let j = i; while (j + 1 < nums.length && nums[j + 1] === nums[j] + 1) j++;
    if (j - i >= 2) out.push(`\\[${nums[i]}\\]–\\[${nums[j]}\\]`); else for (let k = i; k <= j; k++) out.push(`\\[${nums[k]}\\]`);
    i = j + 1;
  }
  return out.join(', ');
}

// ---------------------------------------------------------------- load content
const config = JSON.parse(read(path.join(CONTENT, 'config.json')));
const refs = JSON.parse(read(path.join(CONTENT, 'refs.json')));
for (const f of fs.readdirSync(CONTENT).filter((x) => /^refs-.+\.json$/.test(x))) {
  const extra = JSON.parse(read(path.join(CONTENT, f)));
  for (const [k, v] of Object.entries(extra)) { if (refs[k] && refs[k] !== v) warn(`ref key @${k} in ${f} clashes with an existing key`); else refs[k] = v; }
}
let files = fs.readdirSync(CONTENT).filter((f) => /^\d\d.*\.md$/.test(f)).sort();
let docs = files.map((f) => { const { meta, body } = parseFront(read(path.join(CONTENT, f))); return { file: f, meta, body, type: meta.type || 'chapter' }; });
if (ONLY) docs = docs.filter((d) => d.type !== 'chapter' || ONLY.some((p) => d.file.startsWith(p)));

let chapAuto = 0, appAuto = 0;
for (const d of docs) {
  if (d.type === 'chapter') d.prefix = String(d.meta.num || ++chapAuto);
  else if (d.type === 'appendix') d.prefix = d.meta.letter || 'ABCDEFGH'[appAuto++];
  else d.prefix = null;
}

// numbering pre-scan (figures + tables) so cross-references resolve before parsing
const figIds = {}, tblIds = {};
for (const d of docs) {
  d.figNums = []; d.tblNums = [];
  let fi = 0, ti = 0; let m;
  const figRe = /^:{3,}\s*figure\b(.*)$/gm;
  while ((m = figRe.exec(d.body))) { fi++; const num = d.prefix ? `${d.prefix}.${fi}` : `${fi}`; d.figNums.push(num); const a = parseAttrs(m[1]); if (a.id) { if (figIds[a.id]) warn(`duplicate fig id ${a.id}`); figIds[a.id] = num; } }
  const tblRe = /^Table:\s*(.*?)\s*(?:\{#tbl:([\w-]+)\})?\s*$/gm;
  while ((m = tblRe.exec(d.body))) { ti++; const num = d.prefix ? `${d.prefix}.${ti}` : `${ti}`; d.tblNums.push(num); if (m[2]) { if (tblIds[m[2]]) warn(`duplicate tbl id ${m[2]}`); tblIds[m[2]] = num; } }
}

// citations in order of first appearance
const citeRe = /\[((?:@[\w-]+[;,\s]*)+)\]/g;
const citeNum = {}; const citeOrder = [];
for (const d of docs) {
  let m; citeRe.lastIndex = 0;
  while ((m = citeRe.exec(d.body))) {
    for (const k of m[1].match(/@[\w-]+/g).map((x) => x.slice(1))) {
      if (!refs[k]) { warn(`unknown citation key @${k} in ${d.file}`); continue; }
      if (!(k in citeNum)) citeNum[k] = citeOrder.push(k);
    }
  }
}

function resolveRefs(text, file) {
  return String(text)
    .replace(citeRe, (all, inner) => {
      const nums = [...new Set(inner.match(/@[\w-]+/g).map((x) => citeNum[x.slice(1)]).filter(Boolean))].sort((a, b) => a - b);
      if (!nums.length) return all;
      return `[${compressNums(nums)}](#ref-${nums[0]})`;
    })
    .replace(/@(fig|tbl):([\w-]+)/g, (all, kind, id) => {
      const num = kind === 'fig' ? figIds[id] : tblIds[id];
      if (!num) { warn(`unresolved cross-ref ${all} in ${file}`); return kind === 'fig' ? 'Fig. ??' : 'Table ??'; }
      return `[${kind === 'fig' ? 'Fig.' : 'Table'} ${num}](#${kind}-${id})`;
    });
}
for (const d of docs) {
  d.src = resolveRefs(d.body, d.file);
  if (Array.isArray(d.meta.objectives)) d.meta.objectives = d.meta.objectives.map((o) => resolveRefs(o, d.file));
}

// ---------------------------------------------------------------- markdown setup
const CONTAINERS = ['figure', 'gallery', 'plain', 'theory', 'aside', 'cleared', 'patch', 'cards', 'card', 'stats', 'story', 'columns', 'col', 'pagebreak'];

function makeMd() {
  const md = new MarkdownIt({ html: false, typographer: true, linkify: false });

  // [[KEY]] -> keyboard key
  md.inline.ruler.before('link', 'kbd', (state, silent) => {
    const s = state.src, p = state.pos;
    if (s.charCodeAt(p) !== 0x5b || s.charCodeAt(p + 1) !== 0x5b) return false;
    const end = s.indexOf(']]', p + 2); if (end < 0) return false;
    const content = s.slice(p + 2, end);
    if (!content || content.length > 28 || /[\n\[]/.test(content)) return false;
    if (!silent) { const t = state.push('kbd', 'kbd', 0); t.content = content; }
    state.pos = end + 2; return true;
  });
  md.renderer.rules.kbd = (tokens, idx) => `<kbd>${esc(tokens[idx].content)}</kbd>`;

  for (const name of CONTAINERS) md.use(mdContainer, name, { render: () => '' });

  // numbering + structural transforms
  md.core.ruler.push('sp_struct', (state) => {
    const T = state.tokens; const env = state.env; const d = env.doc;
    // table captions
    for (let i = 0; i < T.length; i++) {
      if (T[i].type === 'paragraph_open' && T[i + 1] && T[i + 1].type === 'inline' && /^Table:\s/.test(T[i + 1].content) && T[i + 3] && T[i + 3].type === 'table_open') {
        const m = T[i + 1].content.match(/^Table:\s*([\s\S]*?)\s*(?:\{#tbl:([\w-]+)\})?\s*$/);
        T[i + 3].meta = { caption: m[1], id: m[2] || null, num: d.tblNums[env.tblCount++] };
        T.splice(i, 3); i--;
      }
    }
    // headings
    let h2 = 0, h3 = 0;
    for (let i = 0; i < T.length; i++) {
      const t = T[i]; if (t.type !== 'heading_open') continue;
      const inl = T[i + 1]; let text = inl.content; let numbered = !!d.prefix && (t.tag === 'h2' || t.tag === 'h3');
      if (/\s*\{-\}\s*$/.test(text)) { numbered = false; text = text.replace(/\s*\{-\}\s*$/, ''); inl.content = text; inl.children = state.md.parseInline(text, env)[0].children; }
      if (t.tag === 'h1') t.tag = 'h2';
      let num = null;
      if (numbered && t.tag === 'h2') { h2++; h3 = 0; num = `${d.prefix}.${h2}`; }
      else if (numbered && t.tag === 'h3') { h3++; num = `${d.prefix}.${h2}.${h3}`; }
      T[i + 2].tag = t.tag;
      const id = num ? `sec-${num.replace(/\./g, '-')}` : `h-${d.file.slice(0, 2)}-${i}`;
      t.attrSet('id', id); t.meta = { num, text };
      if (t.tag === 'h2') env.toc.push({ num, text, id });
    }
    // stats -> data
    for (let i = 0; i < T.length; i++) {
      if (T[i].type !== 'container_stats_open') continue;
      let j = i; while (T[j].type !== 'container_stats_close') j++;
      const items = [];
      for (let k = i; k < j; k++) if (T[k].type === 'inline') { const [v, ...rest] = T[k].content.split('|'); items.push({ v: v.trim(), k: rest.join('|').trim() }); }
      const html = `<div class="stats">${items.map((x) => `<div class="stat"><span class="v">${esc(x.v)}</span><span class="k">${state.md.renderInline(x.k)}</span></div>`).join('')}</div>`;
      const tok = new state.Token('html_block', '', 0); tok.content = html; tok.meta = { stats: items };
      T.splice(i, j - i + 1, tok);
    }
  });

  // ---- HTML renderers
  const R = md.renderer.rules;
  R.heading_open = (tokens, idx) => {
    const t = tokens[idx]; const num = t.meta && t.meta.num;
    return `<${t.tag} id="${t.attrGet('id')}">${num ? `<span class="secno">${num}</span>` : ''}${t.tag === 'h2' ? '<span class="ht">' : ''}`;
  };
  R.heading_close = (tokens, idx) => `${tokens[idx].tag === 'h2' ? '</span>' : ''}</${tokens[idx].tag}>\n`;
  R.table_open = (tokens, idx, o, env) => {
    const m = tokens[idx].meta;
    if (!m) return '<table>\n';
    const id = m.id ? `tbl-${m.id}` : `tbl-${m.num.replace(/\./g, '-')}`;
    env.tbls.push({ num: m.num, id, caption: md.renderInline(m.caption, env) });
    return `<figure class="tbl" id="${id}"><figcaption><span class="lab">TABLE ${m.num}</span>${md.renderInline(m.caption, env)}</figcaption><table>\n`;
  };
  R.table_close = (tokens, idx) => {
    let k = idx; while (k >= 0 && tokens[k].type !== 'table_open') k--;
    return tokens[k] && tokens[k].meta ? '</table></figure>\n' : '</table>\n';
  };
  const defaultLink = R.link_open || ((tokens, idx, o, env, self) => self.renderToken(tokens, idx, o));
  R.link_open = (tokens, idx, o, env, self) => {
    const href = tokens[idx].attrGet('href') || '';
    if (href.startsWith('#ref-')) tokens[idx].attrSet('class', 'cite');
    else if (href.startsWith('#fig-') || href.startsWith('#tbl-')) tokens[idx].attrSet('class', 'xref');
    return defaultLink(tokens, idx, o, env, self);
  };

  const C = (name, open, close) => {
    R[`container_${name}_open`] = (tokens, idx, o, env) => open(parseAttrs(tokens[idx].info), tokens, idx, env);
    R[`container_${name}_close`] = (tokens, idx, o, env) => (typeof close === 'function' ? close(tokens, idx, env) : close);
  };
  C('figure', (a, tokens, idx, env) => {
    const d = env.doc; const num = d.figNums[env.figCount++] || '?';
    const id = a.id ? `fig-${a.id}` : `fig-${String(num).replace(/\./g, '-')}`;
    const cap = tokens[idx + 2] && tokens[idx + 2].type === 'inline' ? tokens[idx + 2].content : '';
    env.figs.push({ num, id, caption: md.renderInline(cap, env) });
    const src = `../assets/${assetPath(a.src)}`;
    const img = `<img src="${src}" alt="">`;
    const frame = a.frame || 'plain';
    const framed = frame === 'crt' ? `<div class="crt"><div class="screen">${img}</div></div>`
      : frame === 'polaroid' ? `<div class="polaroid">${img}</div>`
      : frame === 'none' ? img : `<div class="plain">${img}</div>`;
    const size = a.size || 'full';
    if (size === 'rotate') return `<figure class="fig rot" id="${id}"><div class="rot-inner">${framed}<figcaption><span class="lab">FIG ${num}</span>`;
    return `<figure class="fig size-${size}${a.tall ? ' tallfig' : ''}" id="${id}">${framed}<figcaption><span class="lab">FIG ${num}</span>`;
  }, (tokens, idx) => {
    let k = idx; while (k >= 0 && tokens[k].type !== 'container_figure_open') k--;
    const rot = parseAttrs(tokens[k].info).size === 'rotate';
    return rot ? '</figcaption></div></figure>\n' : '</figcaption></figure>\n';
  });
  C('gallery', (a) => `<div class="gallery cols-${a.cols || 2}">`, '</div>\n');
  C('plain', (a) => `<aside class="plainwords"><span class="pw-label">${esc(a.label || 'In plain words')}</span>`, '</aside>\n');
  C('theory', (a) => `<div class="theory${a.long ? ' long' : ''}"><span class="tab">THEORY${a.title ? `<span class="t2">${esc(a.title)}</span>` : ''}</span>`, '</div>\n');
  C('aside', (a) => `<div class="aside"><span class="tab">${esc(a.title || 'NOTE')}</span>`, '</div>\n');
  C('cleared', (a) => `<div class="cleared"><div class="banner"><span>${esc(a.title || 'LEVEL CLEARED')}</span><span class="stars">★★★</span></div><div class="inner">`, '</div></div>\n');
  C('patch', (a) => `<div class="patch"><span class="tab">${esc(a.title || 'PATCH NOTES')}</span>`, '</div>\n');
  C('cards', (a) => `<div class="cards cols-${a.cols || 3}">`, '</div>\n');
  C('card', (a) => `<div class="card c-${a.color || 'magenta'}"><div class="c-head">${a.tag ? `<span class="c-tag">${esc(a.tag)}</span>` : ''}<span class="c-title">${esc(a.title || '')}</span></div>${a.img ? `<div class="c-img"><img src="../assets/${assetPath(a.img)}" alt=""></div>` : ''}<div class="c-body">`, '</div></div>\n');
  C('story', (a) => `<div class="story"><div class="s-head"><span class="s-id">${esc(a.id || '')}</span><span class="s-title">${esc(a.title || '')}</span>${a.tag ? `<span class="s-tag">${esc(a.tag)}</span>` : ''}</div><div class="s-body">`, '</div></div>\n');
  C('columns', () => '<div class="columns">', '</div>\n');
  C('col', () => '<div class="col">', '</div>\n');
  C('pagebreak', () => '<div class="pagebreak"></div>', '');
  return md;
}

const md = makeMd();

// parse every doc once
for (const d of docs) {
  d.env = { doc: d, figCount: 0, tblCount: 0, toc: [], figs: [], tbls: [] };
  d.tokens = md.parse(d.src, d.env);
  const captioned = d.tokens.filter((t) => t.type === 'table_open' && t.meta).length;
  if (captioned !== d.tblNums.length) warn(`${d.file}: ${d.tblNums.length} "Table:" lines but ${captioned} captioned tables`);
}

// ---------------------------------------------------------------- HTML
function chapterOpener(d) {
  const m = d.meta;
  const isApp = d.type === 'appendix';
  const lvl = isApp ? `BONUS ${d.prefix}` : `LEVEL ${pad2(d.prefix)}`;
  const shot = m.shot ? `<figure class="crt"><div class="screen"><img src="../assets/${assetPath(m.shot)}" alt=""></div></figure>` : '';
  const objectives = Array.isArray(m.objectives) && m.objectives.length
    ? `<div class="quest"><div class="qlabel">${isApp ? 'INSIDE' : 'QUEST LOG'}</div><ul>${m.objectives.map((o) => `<li>${md.renderInline(o)}</li>`).join('')}</ul></div>` : '';
  return `<header class="opener"><div class="op-top"><span class="lvl">${lvl}</span>${m.exp ? `<span class="exp">${esc(m.exp)}</span>` : ''}<span class="bar"></span></div>
<h1><span class="t">${esc(m.title)}</span></h1>${m.kicker ? `<p class="kicker">${esc(m.kicker)}</p>` : ''}
${shot || objectives ? `<div class="op-grid${shot ? '' : ' noshot'}">${shot}${objectives}</div>` : ''}</header>`;
}

function buildHtml() {
  const parts = [];
  // body first so lists can be gathered
  let firstChapter = true;
  const bodyParts = []; const frontDocs = []; const tocItems = [];
  const allFigs = [], allTbls = [];
  let refsInserted = false;
  const refsHtml = () => `<section class="backmatter refs" id="refs"><header class="opener"><div class="op-top"><span class="lvl">CREDITS</span><span class="bar"></span></div><h1><span class="t">References</span></h1><p class="kicker">Every source this report leans on, IEEE style.</p></header>
<ol>${citeOrder.map((k, i) => `<li id="ref-${i + 1}"><span>${md.renderInline(refs[k])}</span></li>`).join('\n')}</ol></section>`;

  for (const d of docs) {
    const inner = md.renderer.render(d.tokens, md.options, d.env);
    if (d.type === 'front') { frontDocs.push({ d, inner }); continue; }
    if (d.type === 'appendix' && !refsInserted) { bodyParts.push(refsHtml()); tocItems.push({ lv: 1, fm: true, num: 'CREDITS', text: 'References', id: 'refs' }); refsInserted = true; }
    const id = `ch-${d.prefix}`;
    bodyParts.push(`<section class="${d.type === 'appendix' ? 'appendix' : 'chapter'}${d.type === 'chapter' && firstChapter ? ' first' : ''}" id="${id}">${chapterOpener(d)}\n${inner}</section>`);
    if (d.type === 'chapter') firstChapter = false;
    tocItems.push({ lv: 1, num: d.type === 'appendix' ? `BONUS ${d.prefix}` : `LVL ${pad2(d.prefix)}`, text: d.meta.title, id, exp: d.meta.exp });
    for (const h of d.env.toc) if (h.num) tocItems.push({ lv: 2, num: h.num, text: h.text, id: h.id });
    allFigs.push(...d.env.figs); allTbls.push(...d.env.tbls);
  }
  if (!refsInserted) { bodyParts.push(refsHtml()); tocItems.push({ lv: 1, fm: true, num: 'CREDITS', text: 'References', id: 'refs' }); }

  // front matter
  const c = config;
  const coverShot = fs.existsSync(path.join(ASSETS, c.coverShot)) ? `<div class="cover-shot"><figure class="crt"><div class="screen"><img src="../assets/${assetPath(c.coverShot)}" alt=""></div></figure></div>` : '';
  parts.push(`<section class="cover"><div class="cover-page"><div class="stars"></div><div class="sun"></div><div class="grid"></div>
<div class="cover-top"><div><div class="ins">${esc(c.university.toUpperCase())}</div><div>${esc(c.school.toUpperCase())}</div><div>${esc(c.department.toUpperCase())}</div></div><div class="r">${esc(c.course.toUpperCase())}<br>${esc(c.semester.toUpperCase())} · ${esc(c.classBatch.toUpperCase())}<br>${esc(c.year.replace('Academic Year', 'AY').toUpperCase())}</div></div>
<div class="cover-title"><div class="pre">★ ${esc(c.reportType.toUpperCase())} ★</div><h1>SAHUR<br>PROTOCOL</h1><div class="sub">${esc(c.subtitle)}</div></div>
${coverShot}
<div class="cover-press">PRESS <span>START</span> TO READ</div>
<div class="cover-players">${c.members.map((m, i) => `<div class="pl"><span class="p">PLAYER ${i + 1}</span><span class="n">${esc(m.name)}</span><span class="r">${esc(m.roll)}</span></div>`).join('')}</div>
<div class="cover-foot"><span>${esc(c.repo.toUpperCase())}</span><span>${esc(c.date.toUpperCase())}</span></div>
</div></section>`);

  parts.push(`<section class="front cert" id="fm-cert"><div class="cert-frame"><div class="inner">
<div class="cert-inst"><div class="u">${esc(c.university)}</div><div class="s">${esc(c.school)}</div><div class="d">${esc(c.department.toUpperCase())}</div></div>
<div class="cert-head">CERTIFICATE</div><div class="cert-sub">★ ACHIEVEMENT UNLOCKED ★</div>
<div class="cert-body"><p>This is to certify that the students listed below, of ${esc(c.semester)} (${esc(c.classBatch)}), ${esc(c.department)}, have satisfactorily carried out the ${esc(c.course)} mini-project titled <strong>“${esc(c.title)}: ${esc(c.subtitle)}”</strong> and have submitted this report as part of the term work for the course during the ${esc(c.year)}.</p></div>
<table class="cert-names"><tbody>${c.members.map((m) => `<tr><td>${esc(m.name)}</td><td class="r">${esc(m.roll)}</td></tr>`).join('')}</tbody></table>
<div class="cert-sign"><div>Faculty In-charge<small>${esc(c.course)}</small></div><div>Head of Department<small>Computer Engineering</small></div><div>Date of Submission<small>&nbsp;</small></div></div>
</div></div></section>`);

  for (const { d, inner } of frontDocs) {
    const id = `fm-${d.file.replace(/\.md$/, '')}`;
    parts.push(`<section class="front" id="${id}"><h1 class="front-title"><small>${esc(d.meta.kicker || '')}</small><span class="t">${esc(d.meta.title)}</span></h1>${inner}</section>`);
  }
  const fmToc = frontDocs.map(({ d }) => ({ lv: 1, fm: true, num: d.meta.tocLabel || 'INTRO', text: d.meta.title, id: `fm-${d.file.replace(/\.md$/, '')}` }));
  const listsToc = [{ lv: 1, fm: true, num: 'INDEX', text: 'List of Figures', id: 'fm-lof' }, { lv: 1, fm: true, num: 'INDEX', text: 'List of Tables', id: 'fm-lot' }];
  const allToc = [...fmToc, ...listsToc, ...tocItems];
  parts.push(`<nav class="front toc" id="fm-toc"><h1 class="front-title"><small>SELECT YOUR LEVEL</small>Contents</h1><ol>${allToc.map((t) => `<li class="lv${t.lv}${t.fm ? ' fm' : ''}"><a href="#${t.id}"><span class="num">${esc(t.num)}</span><span class="tx">${md.renderInline(t.text)}${t.exp ? ` <span class="exp-badge">${esc(t.exp.toUpperCase())}</span>` : ''}</span><span class="dots"></span><span class="pg"></span></a></li>`).join('\n')}</ol></nav>`);
  parts.push(`<section class="front lof" id="fm-lof"><h1 class="front-title"><small>SCREENSHOTS &amp; DIAGRAMS</small>List of Figures</h1><ol>${allFigs.map((f) => `<li><a href="#${f.id}"><span class="num">FIG ${f.num}</span><span class="cap">${shortCap(f.caption)}</span><span class="dots"></span><span class="pg"></span></a></li>`).join('\n')}</ol></section>`);
  parts.push(`<section class="front lof" id="fm-lot"><h1 class="front-title"><small>DATA &amp; STATS</small>List of Tables</h1><ol>${allTbls.map((f) => `<li><a href="#${f.id}"><span class="num">TABLE ${f.num}</span><span class="cap">${shortCap(f.caption)}</span><span class="dots"></span><span class="pg"></span></a></li>`).join('\n')}</ol></section>`);

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${esc(c.title)} — ${esc(c.reportType)}</title>
<link rel="icon" href="data:,">
<link rel="stylesheet" href="../src/report.css">
<script>
window.PagedConfig = {
  before: async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map(img => img.complete ? null : new Promise(r => { img.onload = img.onerror = r; })));
  },
  after: () => {
    // Page labels: roman numerals for front matter, arabic restarting at 1 from the first chapter.
    const pages = [...document.querySelectorAll('.pagedjs_page')];
    let first = pages.findIndex((p) => p.querySelector('.chapter.first'));
    if (first < 0) first = pages.length;
    const roman = (n) => { const m = [[10,'x'],[9,'ix'],[5,'v'],[4,'iv'],[1,'i']]; let r = ''; for (const [v, s] of m) while (n >= v) { r += s; n -= v; } return r; };
    const label = (i) => (i < first ? roman(i + 1) : String(i - first + 1));
    const css = pages.map((p, i) => '#' + p.id + ' .pagedjs_margin-bottom-right .pagedjs_margin-content::after { content: "P.' + label(i) + '" !important; }').join(' ');
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    for (const a of document.querySelectorAll('.toc a, .lof a')) {
      const id = decodeURIComponent(a.getAttribute('href').slice(1));
      const t = document.getElementById(id); const pg = t && t.closest('.pagedjs_page');
      const slot = a.querySelector('.pg'); if (slot) slot.textContent = pg ? label(pages.indexOf(pg)) : '?';
    }
    window.__pagedDone = true;
  }
};
</script>
<script src="../node_modules/pagedjs/dist/paged.polyfill.js"></script>
</head><body>
${parts.join('\n')}
${bodyParts.join('\n')}
</body></html>`;
  fs.mkdirSync(BUILD, { recursive: true });
  const out = path.join(BUILD, 'report.html');
  fs.writeFileSync(out, html);
  console.log('HTML ->', path.relative(ROOT, out), `(${allFigs.length} figures, ${allTbls.length} tables, ${citeOrder.length} refs)`);
  return { allFigs, allTbls };
}
function stripTags(s) { return String(s).replace(/<[^>]+>/g, ''); }
/** First sentence of a caption, for the lists of figures and tables. */
function shortCap(html) {
  const t = stripTags(html).trim();
  const m = t.match(/^(.+?[.!?])(\s|$)/);
  let out = m && m[1].length >= 18 ? m[1] : t;
  if (out.length > 120) out = out.slice(0, 117).replace(/\s+\S*$/, '') + '…';
  return out.replace(/[.]$/, '');
}

// ---------------------------------------------------------------- PDF
function serve(root) {
  const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.ttf': 'font/ttf', '.svg': 'image/svg+xml', '.json': 'application/json' };
  return new Promise((resolve) => {
    const s = http.createServer((req, res) => {
      const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      const fp = path.join(root, u);
      if (!fp.startsWith(root)) { res.writeHead(403); return res.end(); }
      fs.readFile(fp, (e, b) => {
        if (e) { res.writeHead(404); return res.end(); }
        res.writeHead(200, { 'Content-Type': types[path.extname(fp).toLowerCase()] || 'application/octet-stream' }); res.end(b);
      });
    });
    s.listen(0, '127.0.0.1', () => resolve(s));
  });
}

async function buildPdf() {
  const puppeteer = require('puppeteer-core');
  const server = await serve(ROOT);
  const port = server.address().port;
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--font-render-hinting=none', '--allow-file-access-from-files'] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1000, height: 1300, deviceScaleFactor: WANT.pages ? 1.4 : 1 });
    page.on('pageerror', (e) => warn(`[pageerror] ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') warn(`[console] ${m.text()}`); });
    page.on('requestfailed', (r) => warn(`[requestfailed] ${r.url()}`));
    page.on('response', (r) => { if (r.status() >= 400) warn(`[http ${r.status()}] ${r.url()}`); });
    await page.goto(`http://127.0.0.1:${port}/${path.basename(BUILD)}/report.html`, { waitUntil: 'load', timeout: 180000 });
    await page.waitForFunction(() => window.__pagedDone === true, { timeout: 600000, polling: 500 });
    const n = await page.$$eval('.pagedjs_page', (els) => els.length);
    // overflow check: content taller than its page area
    const over = await page.$$eval('.pagedjs_page', (els) => els.map((el, i) => {
      const area = el.querySelector('.pagedjs_page_content'); if (!area) return null;
      return area.scrollHeight > area.clientHeight + 4 ? i + 1 : null;
    }).filter(Boolean));
    if (over.length) warn(`pages with overflowing content: ${over.join(', ')}`);
    if (WANT.pages) {
      const dir = path.join(BUILD, 'pages'); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
      const els = await page.$$('.pagedjs_page');
      for (let i = 0; i < els.length; i++) await els[i].screenshot({ path: path.join(dir, `p${String(i + 1).padStart(3, '0')}.png`) });
      console.log(`pages -> ${path.basename(BUILD)}/pages (${els.length})`);
    }
    const out = path.join(BUILD, `${OUT_NAME}.pdf`);
    await page.pdf({ path: out, printBackground: true, preferCSSPageSize: true, timeout: 0 });
    console.log('PDF  ->', path.relative(ROOT, out), `(${n} pages, ${(fs.statSync(out).size / 1048576).toFixed(1)} MB)`);
  } finally {
    await browser.close(); server.close();
  }
}

// ---------------------------------------------------------------- DOCX
function buildDocx() {
  const D = require('docx');
  const { Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle, AlignmentType,
    HeadingLevel, PageBreak, Header, Footer, PageNumber, LevelFormat, TableOfContents, ExternalHyperlink, PageOrientation, SectionType, VerticalAlign } = D;

  const FONT_BODY = 'Cambria', FONT_HEAD = 'Arial', FONT_MONO = 'Consolas';
  const INK = '16121F', MAGENTA = 'C2185B', VIOLET = '5B2BB5', CYAN = '0277BD', MIST = 'F4F2FA', LINE = 'D9D5E6';
  const PAGE_W = 11906, PAGE_H = 16838, MARGIN = 1134; const CONTENT_W = PAGE_W - 2 * MARGIN; // 9638 dxa
  const CONTENT_PX = 642; // ~CONTENT_W at 96 dpi

  const close = (T, i) => { const t = T[i]; const ct = t.type.replace(/_open$/, '_close'); for (let j = i + 1; j < T.length; j++) if (T[j].type === ct && T[j].level === t.level) return j; return T.length - 1; };
  let listInst = 0;

  function runs(inline, base = {}) {
    const out = []; let b = 0, it = 0; let link = null; let linkRuns = null;
    const push = (text, extra = {}) => {
      if (!text) return;
      const r = new TextRun({ text, bold: b > 0 || base.bold, italics: it > 0 || base.italics, font: base.font, size: base.size, color: base.color, ...extra });
      if (linkRuns) linkRuns.push(r); else out.push(r);
    };
    for (const t of (inline && inline.children) || []) {
      switch (t.type) {
        case 'text': push(t.content, link && link.startsWith('#') ? { color: VIOLET } : {}); break;
        case 'code_inline': push(t.content, { font: FONT_MONO, size: Math.round((base.size || 22) * 0.9), shading: { type: ShadingType.CLEAR, fill: 'EFEDF6', color: 'auto' } }); break;
        case 'kbd': push(` ${t.content} `, { font: FONT_MONO, bold: true, size: Math.round((base.size || 22) * 0.85), shading: { type: ShadingType.CLEAR, fill: 'E6E3EF', color: 'auto' } }); break;
        case 'softbreak': push(' '); break;
        case 'hardbreak': out.push(new TextRun({ break: 1 })); break;
        case 'strong_open': b++; break; case 'strong_close': b--; break;
        case 'em_open': it++; break; case 'em_close': it--; break;
        case 'link_open': link = t.attrGet('href'); if (!link.startsWith('#')) linkRuns = []; break;
        case 'link_close':
          if (linkRuns) { out.push(new ExternalHyperlink({ link, children: linkRuns.map((r) => r) })); linkRuns = null; }
          link = null; break;
        default: if (t.content) push(t.content);
      }
    }
    return out;
  }
  const P = (children, opts = {}) => new Paragraph({ children, spacing: { after: 120, line: 288 }, ...opts });
  const plainText = (s) => String(s).replace(/\*\*|__|\*|_|`/g, '').replace(/\[\[([^\]]+)\]\]/g, '$1').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\\\[/g, '[').replace(/\\\]/g, ']');
  const inlineOf = (text) => md.parseInline(text, {})[0];

  const thin = { style: BorderStyle.SINGLE, size: 6, color: LINE };
  const strong = { style: BorderStyle.SINGLE, size: 12, color: INK };
  const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };

  function imagePara(rel, widthPx, align = AlignmentType.CENTER, maxH = 860) {
    const ap = assetPath(rel); const buf = fs.readFileSync(path.join(ASSETS, ap)); const sz = imgSize(buf);
    let w = widthPx, h = Math.round((sz.h / sz.w) * w);
    if (h > maxH) { h = maxH; w = Math.round((sz.w / sz.h) * h); }
    return new Paragraph({ alignment: align, keepNext: true, spacing: { before: 120, after: 60 }, children: [new ImageRun({ type: sz.type, data: buf, transformation: { width: w, height: h } })] });
  }
  const caption = (label, inline) => new Paragraph({ alignment: AlignmentType.LEFT, spacing: { after: 220 }, children: [new TextRun({ text: `${label}  `, bold: true, font: FONT_HEAD, size: 18, color: MAGENTA }), ...runs(inline, { italics: true, size: 19, color: '3B3550' })] });

  function boxTable(children, { fill = 'FFFFFF', border = INK, width = CONTENT_W, borderSize = 12 } = {}) {
    const bd = { style: BorderStyle.SINGLE, size: borderSize, color: border };
    return new Table({ width: { size: width, type: WidthType.DXA }, columnWidths: [width], borders: { top: bd, bottom: bd, left: bd, right: bd, insideHorizontal: none, insideVertical: none },
      rows: [new TableRow({ cantSplit: false, children: [new TableCell({ width: { size: width, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, fill, color: 'auto' }, margins: { top: 140, bottom: 100, left: 200, right: 200 }, children: children.length ? children : [P([])] })] })] });
  }
  const label = (text, color = MAGENTA) => new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: text.toUpperCase(), bold: true, font: FONT_HEAD, size: 17, color, characterSpacing: 20 })] });
  const spacer = () => new Paragraph({ spacing: { after: 80 }, children: [] });

  function mdTable(T, i, j, ctx) {
    const rows = []; let cur = null; let header = false;
    for (let k = i + 1; k < j; k++) {
      const t = T[k];
      if (t.type === 'thead_open') header = true; else if (t.type === 'thead_close') header = false;
      else if (t.type === 'tr_open') cur = { header, cells: [] };
      else if (t.type === 'tr_close') rows.push(cur);
      else if (t.type === 'th_open' || t.type === 'td_open') cur.cells.push(T[k + 1]);
    }
    const n = Math.max(...rows.map((r) => r.cells.length));
    const width = ctx.width || CONTENT_W;
    const lens = Array.from({ length: n }, (_, c) => Math.min(70, Math.max(7, ...rows.map((r) => (r.cells[c] ? plainText(r.cells[c].content).length : 0)))));
    const sum = lens.reduce((a, b) => a + b, 0);
    const widths = lens.map((l) => Math.floor((l / sum) * width)); widths[n - 1] += width - widths.reduce((a, b) => a + b, 0);
    return new Table({
      width: { size: width, type: WidthType.DXA }, columnWidths: widths,
      borders: { top: strong, bottom: strong, left: strong, right: strong, insideHorizontal: thin, insideVertical: thin },
      rows: rows.map((r, ri) => new TableRow({ tableHeader: r.header, cantSplit: true, children: Array.from({ length: n }, (_, c) => new TableCell({
        width: { size: widths[c], type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: r.header ? INK : (ri % 2 === 0 ? MIST : 'FFFFFF') },
        margins: { top: 70, bottom: 70, left: 110, right: 110 },
        children: [new Paragraph({ spacing: { after: 0, line: 252 }, children: r.cells[c] ? runs(r.cells[c], r.header ? { bold: true, color: 'FFFFFF', font: FONT_HEAD, size: 17 } : { size: 18, font: FONT_HEAD }) : [] })],
      })) })),
    });
  }

  function list(T, i, j, ctx, level) {
    const ordered = T[i].type === 'ordered_list_open'; const inst = ordered ? ++listInst : 0; const out = [];
    for (let k = i + 1; k < j;) {
      if (T[k].type !== 'list_item_open') { k++; continue; }
      const e = close(T, k); let first = true;
      for (let m = k + 1; m < e;) {
        const tt = T[m];
        if (tt.type === 'paragraph_open') {
          out.push(new Paragraph({ children: runs(T[m + 1], ctx.run), spacing: { after: 60, line: 276 },
            ...(first ? { numbering: ordered ? { reference: 'num', level, instance: inst } : { reference: 'bul', level } } : { indent: { left: 360 * (level + 1) } }) }));
          first = false; m += 3;
        } else if (tt.type === 'bullet_list_open' || tt.type === 'ordered_list_open') { const e2 = close(T, m); out.push(...list(T, m, e2, ctx, level + 1)); m = e2 + 1; }
        else m++;
      }
      k = e + 1;
    }
    out.push(new Paragraph({ spacing: { after: 60 }, children: [] }));
    return out;
  }

  // sections: an array of { landscape, children }
  function blocks(T, i0, i1, ctx) {
    const out = [];
    for (let i = i0; i < i1;) {
      const t = T[i];
      if (t.type === 'heading_open') {
        const lvl = { h2: HeadingLevel.HEADING_2, h3: HeadingLevel.HEADING_3, h4: HeadingLevel.HEADING_4 }[t.tag] || HeadingLevel.HEADING_4;
        out.push(new Paragraph({ heading: lvl, keepNext: true, children: [...(t.meta && t.meta.num ? [new TextRun({ text: `${t.meta.num}   ` })] : []), ...runs(T[i + 1])] }));
        i += 3; continue;
      }
      if (t.type === 'paragraph_open') {
        out.push(new Paragraph({ children: runs(T[i + 1], ctx.run), alignment: ctx.align || AlignmentType.JUSTIFIED, spacing: { after: ctx.after ?? 120, line: ctx.line || 288 } }));
        i += 3; continue;
      }
      if (t.type === 'bullet_list_open' || t.type === 'ordered_list_open') { const j = close(T, i); out.push(...list(T, i, j, ctx, 0)); i = j + 1; continue; }
      if (t.type === 'table_open') {
        const j = close(T, i); const m = t.meta;
        if (m) out.push(new Paragraph({ keepNext: true, spacing: { before: 120, after: 80 }, children: [new TextRun({ text: `Table ${m.num}  `, bold: true, font: FONT_HEAD, size: 18, color: MAGENTA }), ...runs(inlineOf(m.caption), { bold: true, font: FONT_HEAD, size: 18 })] }));
        out.push(mdTable(T, i, j, ctx)); out.push(spacer()); i = j + 1; continue;
      }
      if (t.type === 'html_block' && t.meta && t.meta.stats) {
        const items = t.meta.stats; const w = Math.floor(CONTENT_W / items.length);
        out.push(new Table({ width: { size: w * items.length, type: WidthType.DXA }, columnWidths: items.map(() => w), borders: { top: strong, bottom: strong, left: strong, right: strong, insideHorizontal: none, insideVertical: strong },
          rows: [new TableRow({ children: items.map((x) => new TableCell({ width: { size: w, type: WidthType.DXA }, margins: { top: 100, bottom: 100, left: 120, right: 120 }, children: [
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 20 }, children: [new TextRun({ text: x.v, bold: true, font: 'Arial Black', size: 32, color: INK })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: runs(inlineOf(x.k), { size: 15, font: FONT_HEAD, color: '3B3550' }) }),
          ] })) })] }));
        out.push(spacer()); i++; continue;
      }
      if (t.type === 'blockquote_open') { const j = close(T, i); out.push(...blocks(T, i + 1, j, { ...ctx, run: { italics: true } })); i = j + 1; continue; }
      if (t.type === 'hr') { out.push(new Paragraph({ border: { bottom: { style: BorderStyle.DASHED, size: 6, color: LINE, space: 1 } }, children: [] })); i++; continue; }
      if (t.type === 'fence' || t.type === 'code_block') { for (const line of t.content.replace(/\n$/, '').split('\n')) out.push(new Paragraph({ spacing: { after: 0 }, shading: { type: ShadingType.CLEAR, fill: 'F4F2FA', color: 'auto' }, children: [new TextRun({ text: line || ' ', font: FONT_MONO, size: 17 })] })); out.push(spacer()); i++; continue; }
      const cm = t.type.match(/^container_(\w+)_open$/);
      if (cm) {
        const j = close(T, i); const a = parseAttrs(t.info); const name = cm[1];
        if (name === 'figure') {
          const num = ctx.doc.figNums[ctx.figI++] || '?';
          const capTok = T[i + 2] && T[i + 2].type === 'inline' ? T[i + 2] : inlineOf('');
          const widthPx = { full: CONTENT_PX, rotate: CONTENT_PX, wide: 590, large: 520, half: 380, small: 280 }[a.size || 'full'] || CONTENT_PX;
          if (a.size === 'rotate' && ctx.onLandscape) { ctx.onLandscape([imagePara(a.src, 940, AlignmentType.CENTER, 560), caption(`Fig. ${num}`, capTok)]); }
          else { out.push(imagePara(a.src, ctx.imgW ? Math.min(ctx.imgW, widthPx) : widthPx)); out.push(caption(`Fig. ${num}`, capTok)); }
        } else if (name === 'gallery' || name === 'cards' || name === 'columns') {
          const kids = []; for (let k = i + 1; k < j;) { if (/^container_(figure|card|col)_open$/.test(T[k].type)) { const e = close(T, k); kids.push([k, e]); k = e + 1; } else k++; }
          const cols = name === 'columns' ? 2 : Number(a.cols || (name === 'gallery' ? 2 : 3));
          const w = Math.floor(CONTENT_W / cols); const imgW = Math.floor(CONTENT_PX / cols) - 22;
          const rowsArr = []; for (let r = 0; r < kids.length; r += cols) rowsArr.push(kids.slice(r, r + cols));
          out.push(new Table({ width: { size: w * cols, type: WidthType.DXA }, columnWidths: Array(cols).fill(w),
            borders: name === 'cards' ? { top: strong, bottom: strong, left: strong, right: strong, insideHorizontal: strong, insideVertical: strong } : { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none },
            rows: rowsArr.map((row) => new TableRow({ cantSplit: true, children: Array.from({ length: cols }, (_, c) => {
              const kid = row[c]; let children = [P([])];
              if (kid) {
                const [ks, ke] = kid; const ka = parseAttrs(T[ks].info);
                if (T[ks].type === 'container_card_open') {
                  children = [];
                  if (ka.tag) children.push(new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: ka.tag.toUpperCase(), font: FONT_HEAD, size: 14, bold: true, color: MAGENTA })] }));
                  children.push(new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: ka.title || '', font: 'Arial Black', size: 21, color: INK })] }));
                  if (ka.img) children.push(imagePara(ka.img, imgW));
                  children.push(...blocks(T, ks + 1, ke, { ...ctx, run: { size: 18, font: FONT_HEAD }, align: AlignmentType.LEFT, after: 60, line: 252, imgW }));
                } else children = blocks(T, ks, ke + 1, { ...ctx, imgW, align: AlignmentType.LEFT });
              }
              return new TableCell({ width: { size: w, type: WidthType.DXA }, margins: { top: 100, bottom: 80, left: 120, right: 120 }, verticalAlign: VerticalAlign.TOP, children });
            }) })),
          }));
          out.push(spacer());
        } else if (name === 'col' || name === 'card') {
          out.push(...blocks(T, i + 1, j, ctx));
        } else if (name === 'pagebreak') {
          out.push(new Paragraph({ children: [new PageBreak()] }));
        } else {
          const spec = {
            plain: { lab: a.label || 'In plain words', fill: 'FFF6C2', border: 'E0B400', color: MAGENTA, run: { font: 'Segoe Print', size: 19 } },
            theory: { lab: `Theory${a.title ? ' — ' + a.title : ''}`, fill: 'EEFAFF', border: INK, color: CYAN },
            aside: { lab: a.title || 'Note', fill: 'F5F0FF', border: VIOLET, color: VIOLET },
            cleared: { lab: `★ ${a.title || 'Level cleared'} ★`, fill: 'F1FCF5', border: INK, color: '1AA860' },
            patch: { lab: a.title || 'Patch notes', fill: 'FFF6EC', border: 'FF8A1F', color: 'E07000' },
            story: { lab: `${a.id || ''}  ·  ${a.title || ''}${a.tag ? '  [' + a.tag + ']' : ''}`, fill: 'FFFFFF', border: INK, color: VIOLET },
          }[name] || { lab: name, fill: 'FFFFFF', border: INK, color: INK };
          const inner = [label(spec.lab, spec.color), ...blocks(T, i + 1, j, { ...ctx, run: { ...(ctx.run || {}), ...(spec.run || {}) }, align: name === 'plain' ? AlignmentType.LEFT : ctx.align, width: CONTENT_W - 500 })];
          out.push(boxTable(inner, { fill: spec.fill, border: spec.border }));
          out.push(spacer());
        }
        i = j + 1; continue;
      }
      i++;
    }
    return out;
  }

  // ---- assemble
  const c = config;
  const portraitProps = (extra = {}) => ({ page: { size: { width: PAGE_W, height: PAGE_H }, margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } }, ...extra });
  const header = () => new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: MAGENTA, space: 4 } }, children: [new TextRun({ text: `${c.title.toUpperCase()}  //  ${c.reportType}`, font: FONT_HEAD, size: 15, color: '6B6584' })] })] });
  const footer = () => new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${c.members.map((m) => m.roll).join(' · ')}     |     Page `, font: FONT_HEAD, size: 15, color: '6B6584' }), new TextRun({ children: [PageNumber.CURRENT], font: FONT_HEAD, size: 15, bold: true })] })] });

  const sections = []; let cur = [];
  const flush = (extraProps = {}) => { if (cur.length) sections.push({ properties: { ...portraitProps(), type: SectionType.NEXT_PAGE, ...extraProps }, headers: { default: header() }, footers: { default: footer() }, children: cur }); cur = []; };
  const ctxBase = { onLandscape: (kids) => { flush(); sections.push({ properties: { page: { size: { width: PAGE_W, height: PAGE_H, orientation: PageOrientation.LANDSCAPE }, margin: { top: 900, bottom: 900, left: 1000, right: 1000 } }, type: SectionType.NEXT_PAGE }, headers: { default: header() }, footers: { default: footer() }, children: kids }); } };

  // cover
  const cover = [];
  const center = (text, o = {}) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: o.after ?? 80 }, children: [new TextRun({ text, font: o.font || FONT_HEAD, size: o.size || 22, bold: o.bold, color: o.color || INK, characterSpacing: o.cs })] });
  cover.push(center(c.university, { size: 26, bold: true }), center(c.school, { size: 22 }), center(c.department, { size: 20, color: MAGENTA, after: 500 }));
  cover.push(center(c.reportType.toUpperCase(), { size: 18, color: VIOLET, cs: 40, after: 160 }));
  cover.push(center(c.title.toUpperCase(), { font: 'Arial Black', size: 64, after: 120 }));
  cover.push(center(c.subtitle, { size: 26, color: '3B3550', after: 300 }));
  if (fs.existsSync(path.join(ASSETS, c.coverShot))) cover.push(imagePara(c.coverShot, 520));
  cover.push(center(`${c.course}  ·  ${c.semester}  ·  ${c.classBatch}  ·  ${c.year}`, { size: 19, after: 260 }));
  cover.push(center('SUBMITTED BY', { size: 16, color: MAGENTA, cs: 40, bold: true, after: 100 }));
  const mw = 3200;
  cover.push(new Table({ alignment: AlignmentType.CENTER, width: { size: mw * 2, type: WidthType.DXA }, columnWidths: [mw, mw], borders: { top: strong, bottom: strong, left: strong, right: strong, insideHorizontal: thin, insideVertical: thin },
    rows: c.members.map((m) => new TableRow({ children: [
      new TableCell({ width: { size: mw, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 160, right: 160 }, children: [new Paragraph({ children: [new TextRun({ text: m.name, font: FONT_HEAD, size: 22, bold: true })] })] }),
      new TableCell({ width: { size: mw, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 160, right: 160 }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: m.roll, font: FONT_MONO, size: 22, bold: true, color: MAGENTA })] })] }),
    ] })) }));
  cover.push(center('', { after: 200 }), center(`${c.repo}   ·   ${c.date}`, { size: 17, color: '6B6584' }));
  sections.push({ properties: portraitProps(), children: cover });

  // certificate + front docs + toc + lists
  cur.push(center(c.university, { size: 24, bold: true }), center(c.school, { size: 20 }), center(c.department, { size: 18, color: MAGENTA, after: 500 }));
  cur.push(center('CERTIFICATE', { font: 'Arial Black', size: 44, after: 400 }));
  cur.push(new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 300, line: 360 }, children: [new TextRun({ text: `This is to certify that the students listed below, of ${c.semester} (${c.classBatch}), ${c.department}, have satisfactorily carried out the ${c.course} mini-project titled `, size: 23 }), new TextRun({ text: `“${c.title}: ${c.subtitle}”`, bold: true, size: 23 }), new TextRun({ text: ` and have submitted this report as part of the term work for the course during the ${c.year}.`, size: 23 })] }));
  for (const m of c.members) cur.push(center(`${m.name}   (${m.roll})`, { size: 23, bold: true, after: 60 }));
  cur.push(center('', { after: 1400 }));
  const sw = Math.floor(CONTENT_W / 3);
  cur.push(new Table({ width: { size: sw * 3, type: WidthType.DXA }, columnWidths: [sw, sw, sw], borders: { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none },
    rows: [new TableRow({ children: ['Faculty In-charge', 'Head of Department', 'Date of Submission'].map((s) => new TableCell({ width: { size: sw, type: WidthType.DXA }, margins: { left: 200, right: 200 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, border: { top: { style: BorderStyle.SINGLE, size: 8, color: INK, space: 6 } }, children: [new TextRun({ text: s, font: FONT_HEAD, size: 19 })] })] })) })] }));
  cur.push(new Paragraph({ children: [new PageBreak()] }));

  for (const d of docs.filter((x) => x.type === 'front')) {
    cur.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(d.meta.title)] }));
    cur.push(...blocks(d.tokens, 0, d.tokens.length, { ...ctxBase, doc: d, figI: 0 }));
    cur.push(new Paragraph({ children: [new PageBreak()] }));
  }
  cur.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Contents')] }));
  cur.push(new TableOfContents('Contents', { hyperlink: true, headingStyleRange: '1-2' }));
  cur.push(new Paragraph({ spacing: { before: 200 }, children: [new TextRun({ text: '(If the contents list is empty, right-click here and choose “Update Field”.)', italics: true, size: 17, color: '6B6584' })] }));
  cur.push(new Paragraph({ children: [new PageBreak()] }));
  const listPage = (title, items, lab) => {
    cur.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(title)] }));
    for (const f of items) cur.push(new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: `${lab} ${f.num}   `, bold: true, font: FONT_HEAD, size: 18, color: MAGENTA }), new TextRun({ text: shortCap(f.caption).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'"), size: 20 })] }));
    cur.push(new Paragraph({ children: [new PageBreak()] }));
  };
  const allFigs = docs.flatMap((d) => d.env.figs); const allTbls = docs.flatMap((d) => d.env.tbls);
  listPage('List of Figures', allFigs, 'Fig.'); listPage('List of Tables', allTbls, 'Table');
  // remove trailing page break before first chapter section
  cur.pop();
  flush();

  let refsDone = false;
  const refsSection = () => {
    cur.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('References')] }));
    citeOrder.forEach((k, i) => cur.push(new Paragraph({ spacing: { after: 100 }, indent: { left: 640, hanging: 640 }, children: [new TextRun({ text: `[${i + 1}]\t`, bold: true, color: MAGENTA }), ...runs(inlineOf(refs[k]), { size: 20 })] })));
    flush();
  };
  for (const d of docs.filter((x) => x.type !== 'front')) {
    if (d.type === 'appendix' && !refsDone) { refsSection(); refsDone = true; }
    const m = d.meta; const isApp = d.type === 'appendix';
    cur.push(new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: `${isApp ? 'APPENDIX ' + d.prefix : 'CHAPTER ' + d.prefix}${m.exp ? '   ·   ' + m.exp.toUpperCase() : ''}`, font: FONT_HEAD, bold: true, size: 18, color: MAGENTA, characterSpacing: 30 })] }));
    cur.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(`${isApp ? 'Appendix ' + d.prefix + ': ' : d.prefix + '. '}${m.title}`)] }));
    if (m.kicker) cur.push(new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: m.kicker, italics: true, size: 24, color: '3B3550' })] }));
    if (m.shot) cur.push(imagePara(m.shot, 460));
    if (Array.isArray(m.objectives) && m.objectives.length) {
      const inner = [label(isApp ? 'Inside' : 'Chapter objectives', VIOLET), ...m.objectives.map((o) => new Paragraph({ numbering: { reference: 'bul', level: 0 }, spacing: { after: 40 }, children: runs(inlineOf(o), { size: 20 }) }))];
      cur.push(boxTable(inner, { fill: MIST, border: INK })); cur.push(spacer());
    }
    cur.push(...blocks(d.tokens, 0, d.tokens.length, { ...ctxBase, doc: d, figI: 0 }));
    flush();
  }
  if (!refsDone) refsSection();

  const doc = new Document({
    creator: c.members.map((m) => m.name).join(', '), title: `${c.title} — ${c.reportType}`, description: c.subtitle,
    styles: {
      default: { document: { run: { font: FONT_BODY, size: 22 } } },
      paragraphStyles: [
        { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: 'Arial Black', size: 40, color: INK }, paragraph: { spacing: { before: 120, after: 160 }, keepNext: true, outlineLevel: 0 } },
        { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT_HEAD, size: 28, bold: true, color: INK }, paragraph: { spacing: { before: 320, after: 120 }, keepNext: true, outlineLevel: 1, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: MAGENTA, space: 3 } } } },
        { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT_HEAD, size: 23, bold: true, color: VIOLET }, paragraph: { spacing: { before: 240, after: 100 }, keepNext: true, outlineLevel: 2 } },
        { id: 'Heading4', name: 'Heading 4', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT_HEAD, size: 19, bold: true, color: MAGENTA, allCaps: true }, paragraph: { spacing: { before: 180, after: 80 }, keepNext: true, outlineLevel: 3 } },
      ],
    },
    numbering: { config: [
      { reference: 'bul', levels: [0, 1, 2].map((l) => ({ level: l, format: LevelFormat.BULLET, text: ['•', '◦', '▪'][l], alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360 * (l + 1), hanging: 260 } } } })) },
      { reference: 'num', levels: [0, 1, 2].map((l) => ({ level: l, format: [LevelFormat.DECIMAL, LevelFormat.LOWER_LETTER, LevelFormat.LOWER_ROMAN][l], text: `%${l + 1}.`, alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360 * (l + 1), hanging: 300 } } } })) },
    ] },
    sections,
  });
  return Packer.toBuffer(doc).then((buf) => {
    fs.mkdirSync(BUILD, { recursive: true });
    const raw = path.join(BUILD, '_raw.docx'); fs.writeFileSync(raw, buf);
    const out = path.join(BUILD, `${OUT_NAME}.docx`);
    // Let Word fill in the table of contents (page numbers) and save the final file.
    const { spawnSync } = require('child_process');
    for (const f of fs.readdirSync(BUILD)) if (f.startsWith('~$')) fs.rmSync(path.join(BUILD, f), { force: true }); // stale Word lock files
    fs.rmSync(out, { force: true }); if (flag('--docx-pdf')) fs.rmSync(path.join(BUILD, `${OUT_NAME}.docx.pdf`), { force: true });
    const args = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, 'docx_finalize.ps1'), '-Docx', raw, '-Out', out];
    if (flag('--docx-pdf')) args.push('-PdfOut', path.join(BUILD, `${OUT_NAME}.docx.pdf`));
    const started = new Date();
    const r = flag('--no-word') ? { status: 1, stdout: '', stderr: 'skipped' } : spawnSync('powershell', args, { encoding: 'utf8', timeout: 300000 });
    if (!flag('--no-word')) {
      // tidy up any hidden Word instance this run started (Word can linger after dropping the COM link)
      try { require('child_process').execSync(`powershell -NoProfile -Command "Get-Process WINWORD -ErrorAction SilentlyContinue | Where-Object { $_.StartTime -ge [datetime]'${started.toISOString()}'.ToLocalTime().AddSeconds(-2) -and $_.MainWindowHandle -eq 0 } | Stop-Process -Force; exit 0"`); } catch {}
      for (const f of fs.readdirSync(BUILD)) if (f.startsWith('~$')) fs.rmSync(path.join(BUILD, f), { force: true });
    }
    if (fs.existsSync(out) && fs.statSync(out).size > 0) console.log((r.stdout || '').trim() || 'Word: saved');
    else { warn(`Word finalisation failed (${(r.stderr || r.stdout || '').trim().slice(0, 200)}); writing DOCX without page numbers in the contents`); fs.copyFileSync(raw, out); }
    console.log('DOCX ->', path.relative(ROOT, out), `(${(fs.statSync(out).size / 1048576).toFixed(1)} MB)`);
  });
}

// ---------------------------------------------------------------- main
(async () => {
  buildHtml();
  if (WANT.docx) await buildDocx();
  if (WANT.pdf) await buildPdf();
  if (warnings.length) console.log(`\n${warnings.length} warning(s).`);
})().catch((e) => { console.error(e); process.exit(1); });

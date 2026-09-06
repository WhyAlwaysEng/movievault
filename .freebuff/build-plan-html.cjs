// One-off converter: docs/MASTER_PLAN_v2.md -> .freebuff/preview/plan.html (standalone, no external deps)
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = path.join(root, 'docs', 'MASTER_PLAN_v2.md');
const previewDir = path.join(__dirname, 'preview');
const out = path.join(previewDir, 'plan.html');

const md = fs.readFileSync(src, 'utf8');
const lines = md.split(/\r?\n/);

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function inline(s) {
  let out = esc(s);
  out = out.replace(/`([^`]+)`/g, (m, c) => '<code>' + c + '</code>'); // content already escaped
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return out;
}

function build() {
  const out = [];
  const para = [];
  let inCode = false;
  let listStack = [];

  function closePara() {
    if (para.length) {
      out.push('<p>' + para.map(inline).join(' ') + '</p>');
      para.length = 0;
    }
  }
  function closeListsTo(indent, tag) {
    while (listStack.length && listStack[listStack.length - 1].indent > indent) {
      out.push('</' + listStack.pop().tag + '>');
    }
    const top = listStack[listStack.length - 1];
    if (top && top.indent === indent && tag && top.tag !== tag) {
      out.push('</' + listStack.pop().tag + '>');
    }
    if (tag && (!listStack.length || listStack[listStack.length - 1].indent < indent)) {
      out.push('<' + tag + '>');
      listStack.push({ tag, indent });
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^```/.test(line)) {
      closePara();
      closeListsTo(-1);
      if (!inCode) {
        inCode = true;
        out.push('<pre><code>');
      } else {
        inCode = false;
        out.push('</code></pre>');
      }
      continue;
    }
    if (inCode) {
      out.push(esc(line));
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      closePara();
      continue;
    }

    // table (requires a separator row on the next line)
    if (trimmed.startsWith('|')) {
      const next = lines[i + 1] ? lines[i + 1].trim() : '';
      if (/^\|[\s\-:|]+\|?\s*$/.test(next)) {
        closePara();
        closeListsTo(-1);
        const rows = [];
        while (i < lines.length && lines[i].trim().startsWith('|')) {
          const cells = lines[i].trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
          rows.push(cells);
          i++;
        }
        i--;
        const header = rows[0];
        const body = rows.slice(2);
        let t = '<table><thead><tr>' + header.map((c) => '<th>' + inline(c) + '</th>').join('') + '</tr></thead><tbody>';
        t += body.map((r) => '<tr>' + r.map((c) => '<td>' + inline(c) + '</td>').join('') + '</tr>').join('');
        t += '</tbody></table>';
        out.push(t);
        continue;
      }
    }

    const h = trimmed.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      closePara();
      closeListsTo(-1);
      out.push('<h' + h[1].length + '>' + inline(h[2]) + '</h' + h[1].length + '>');
      continue;
    }

    if (/^-{3,}$/.test(trimmed)) {
      closePara();
      closeListsTo(-1);
      out.push('<hr>');
      continue;
    }

    if (trimmed.startsWith('>')) {
      closePara();
      closeListsTo(-1);
      const q = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        q.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      i--;
      out.push('<blockquote><p>' + q.map(inline).join(' ') + '</p></blockquote>');
      continue;
    }

    const indent = (line.match(/^ */) || [''])[0].length;
    const ulMatch = trimmed.match(/^[-*]\s+(.*)$/);
    if (ulMatch) {
      closePara();
      closeListsTo(indent, 'ul');
      let content = ulMatch[1];
      const cb = content.match(/^\[( |x)\]\s+(.*)$/);
      if (cb) {
        content = '<input type="checkbox" disabled' + (cb[1] === 'x' ? ' checked' : '') + '>' + cb[2];
      }
      out.push('<li>' + inline(content) + '</li>');
      continue;
    }
    const olMatch = trimmed.match(/^\d+\.\s+(.*)$/);
    if (olMatch) {
      closePara();
      closeListsTo(indent, 'ol');
      out.push('<li>' + inline(olMatch[1]) + '</li>');
      continue;
    }

    closeListsTo(-1);
    para.push(trimmed);
  }
  closePara();
  while (listStack.length) out.push('</' + listStack.pop().tag + '>');
  return out.join('\n');
}

const body = build();

const css = `
:root { --bg:#0a0b0e; --border:rgba(255,255,255,.1); --cyan:#00f2fe; --pink:#ff007f; --text:#e2e8f0; --muted:#94a3b8; }
* { box-sizing:border-box; }
html { scroll-behavior:smooth; }
body { margin:0; background:var(--bg); color:var(--text); font:16px/1.65 "Segoe UI", system-ui, -apple-system, sans-serif; -webkit-font-smoothing:antialiased; }
main { max-width:940px; margin:0 auto; padding:44px 26px 80px; }
::selection { background:rgba(0,242,254,.25); }
h1 { font-size:2.05rem; line-height:1.3; margin:0 0 14px; background:linear-gradient(92deg,#00f2fe,#ff007f); -webkit-background-clip:text; background-clip:text; color:transparent; filter:drop-shadow(0 0 18px rgba(0,242,254,.25)); }
h2 { color:var(--cyan); font-size:1.42rem; margin:3rem 0 1rem; padding-bottom:.45rem; border-bottom:1px solid var(--border); position:relative; }
h2::before { content:""; position:absolute; left:-16px; top:2px; bottom:2px; width:3px; border-radius:2px; background:linear-gradient(180deg,var(--cyan),var(--pink)); }
h3 { color:#fff; font-size:1.13rem; margin:2rem 0 .7rem; }
h4 { color:var(--muted); text-transform:uppercase; font-size:.78rem; letter-spacing:.09em; margin:1.6rem 0 .5rem; }
p { margin:.6rem 0; }
a { color:var(--cyan); text-decoration:none; }
a:hover { text-decoration:underline; }
ul, ol { padding-left:1.5rem; margin:.6rem 0; }
li { margin:.32rem 0; }
ul > li::marker { color:var(--cyan); }
ol > li::marker { color:var(--muted); font-weight:600; }
code { background:rgba(255,255,255,.09); border:1px solid rgba(255,255,255,.08); color:#7dd3fc; padding:1px 6px; border-radius:5px; font:13px/1.5 Consolas, "Cascadia Code", "Courier New", monospace; }
pre { background:#0d1117; border:1px solid rgba(255,255,255,.09); border-radius:10px; padding:14px 16px; overflow-x:auto; margin:1rem 0; box-shadow:0 0 26px rgba(0,242,254,.05); }
pre code { background:none; border:none; color:#c9d1d9; padding:0; font-size:13px; line-height:1.55; }
blockquote { margin:1rem 0; padding:.65rem 1rem; background:rgba(255,0,127,.06); border-left:3px solid var(--pink); border-radius:0 8px 8px 0; }
blockquote p { margin:.25rem 0; color:var(--muted); }
table { width:100%; border-collapse:collapse; margin:1.1rem 0; font-size:.92rem; background:rgba(255,255,255,.03); border:1px solid var(--border); border-radius:10px; overflow:hidden; }
th { background:rgba(255,255,255,.06); color:#fff; text-align:left; padding:9px 12px; border-bottom:1px solid var(--border); font-size:.85rem; letter-spacing:.03em; }
td { padding:8px 12px; border-bottom:1px solid rgba(255,255,255,.05); vertical-align:top; }
tr:last-child td { border-bottom:none; }
tbody tr:nth-child(even) { background:rgba(255,255,255,.02); }
hr { border:none; border-top:1px solid var(--border); margin:2.5rem 0; }
input[type=checkbox] { accent-color:var(--cyan); margin-right:.4rem; }
footer { margin-top:4rem; padding-top:1.1rem; border-top:1px solid var(--border); color:var(--muted); font-size:.85rem; }
@media (max-width:640px) { main { padding:28px 16px 60px; } h1 { font-size:1.6rem; } }
`;

const htmlDoc = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="dark">
<title>Cyberpunk Neo-Noir Media Vault — Master Project Plan v2</title>
<style>${css}</style>
</head>
<body>
<main>
${body}
<footer>Rendered from <code>docs/MASTER_PLAN_v2.md</code> · Cyberpunk Neo-Noir Media Vault · Master Project Plan v2</footer>
</main>
</body>
</html>`;

fs.mkdirSync(previewDir, { recursive: true });
fs.writeFileSync(out, htmlDoc, 'utf8');

// sanity checks
const fences = (md.match(/^```/gm) || []).length;
const pres = (htmlDoc.match(/<pre>/g) || []).length;
const boldLeft = (htmlDoc.match(/\*\*/g) || []).length;
const ulOpen = (htmlDoc.match(/<ul>/g) || []).length;
const ulClose = (htmlDoc.match(/<\/ul>/g) || []).length;
const olOpen = (htmlDoc.match(/<ol>/g) || []).length;
const olClose = (htmlDoc.match(/<\/ol>/g) || []).length;
console.log('wrote', out, 'bytes:', htmlDoc.length);
console.log('fences', fences, '| <pre>', pres, '| stray **', boldLeft, '| ul', ulOpen + '/' + ulClose, '| ol', olOpen + '/' + olClose);
if (fences !== pres) console.error('WARN: fence/pre mismatch');
if (boldLeft) console.error('WARN: stray ** in output');
if (ulOpen !== ulClose || olOpen !== olClose) console.error('WARN: unbalanced lists');
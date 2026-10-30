import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { intro, sections, stageReference, troubleshooting } from './guide.mjs';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const image = section => `images/guide/${section.id}.png`;
const table = rows => '| Component | What it does |\n| --- | --- |\n' + rows.map(row => `| ${row.join(' | ')} |`).join('\n');
const htmlTable = rows => `<table><thead><tr><th>Component</th><th>What it does</th></tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${escape(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;

export async function renderGuide() {
  for (const section of sections) await fs.access(path.join(root, 'docs', image(section)));
  const markdown = [
    '# Using Image Forensics Analysis',
    '[Frontend installation](../README.md) · [Backend installation](https://github.com/In-dialog/image-forensics-backend#readme) · [Refresh these screenshots](SCREENSHOTS.md)',
    ...intro,
    '## Find a task',
    sections.map(section => `- [${section.title}](#${section.id})`).join('\n'),
  ];
  // Explicit anchors stay stable when an editor changes a heading.
  for (const section of sections) markdown.push(
    `<a id="${section.id}"></a>\n\n## ${section.title}`,
    section.action,
    `![${section.title}. Numbered controls are explained below.](${image(section)})`,
    ...(section.demonstration ? ['*Illustrative run state; no analysis is started to capture this screen.*'] : []),
    section.marks.map((mark, index) => `${index + 1}. **${mark.title}.** ${mark.text}`).join('\n'),
    ...section.notes,
  );
  markdown.push('## Stage reference', 'Use the Executor checkboxes to select these stages. A view appears only when its corresponding output exists.', table(stageReference),
    '## When something needs attention', table(troubleshooting),
    '## Keep this guide current', 'The images and this page are generated from one editable guide definition. See [Screenshot workflow](SCREENSHOTS.md) to capture new UI images and rebuild the GitHub page and local HTML preview.');
  await fs.writeFile(path.join(root, 'docs/USER_GUIDE.md'), markdown.join('\n\n') + '\n');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Image Forensics Analysis — User guide</title><style>
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;color:#1f2924;background:#f5f6f5;font:17px/1.65 system-ui,sans-serif}a{color:#16604c}header,main,footer{max-width:1120px;margin:auto;padding:32px}header{padding-top:60px}h1{font-size:clamp(28px,5vw,46px);line-height:1.15;letter-spacing:-.03em}h2{font-size:28px;line-height:1.3;margin-top:0}p{max-width:90ch}.eyebrow{font:12px ui-monospace,monospace;letter-spacing:.14em;color:#496055;text-transform:uppercase}nav{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px;border-top:1px solid #cfd8d1;padding-top:24px}section{margin:0 0 56px;padding-top:30px;border-top:1px solid #cfd8d1;scroll-margin-top:24px}figure{margin:24px 0}figure a{display:block}img{display:block;width:100%;height:auto;border:1px solid #52655b;background:#0e1310}figcaption,.note{font-size:14px;color:#526159}ol{padding-left:28px}li{padding:0 0 14px 8px}li::marker{font-weight:700;color:#16604c}table{border-collapse:collapse;width:100%;font-size:15px}td,th{border-bottom:1px solid #cfd8d1;text-align:left;vertical-align:top;padding:14px 10px}td:first-child{width:28%;font-weight:650}.action{font-weight:550}footer{font-size:14px}@media(max-width:650px){header,main,footer{padding:24px 18px}li{padding-left:2px}td,th{padding:10px 6px}table{font-size:14px}}@media print{body{background:white;font-size:11pt}nav{display:none}section{break-inside:auto}figure{break-inside:avoid}a{color:inherit}}
</style></head><body><header><p class="eyebrow">Image Forensics Analysis / Field guide</p><h1>From image to evidence</h1>${intro.map(p => `<p>${escape(p)}</p>`).join('')}<nav aria-label="Guide contents">${sections.map((section, index) => `<a href="#${section.id}">${String(index + 1).padStart(2, '0')} / ${escape(section.title)}</a>`).join('')}</nav></header><main>${sections.map(section => `<section id="${section.id}"><h2>${escape(section.title)}</h2><p class="action">${escape(section.action)}</p><figure><a href="${image(section)}" title="Open full-size screenshot"><img src="${image(section)}" alt="${escape(section.title)}. Numbered controls are explained below." loading="lazy"></a><figcaption>${section.demonstration ? 'Illustrative run state. ' : ''}Select the image to inspect it at full resolution.</figcaption></figure><ol>${section.marks.map(mark => `<li><strong>${escape(mark.title)}.</strong> ${escape(mark.text)}</li>`).join('')}</ol>${section.notes.map(note => `<p>${escape(note)}</p>`).join('')}</section>`).join('')}<section id="stages"><h2>Stage reference</h2>${htmlTable(stageReference)}</section><section id="help"><h2>When something needs attention</h2>${htmlTable(troubleshooting)}</section></main><footer>Generated from scripts/docs/guide.mjs. See docs/SCREENSHOTS.md for the repeatable capture workflow.</footer></body></html>`;
  await fs.writeFile(path.join(root, 'docs/user-guide.html'), html);
  console.log('Generated docs/USER_GUIDE.md and docs/user-guide.html');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await renderGuide();

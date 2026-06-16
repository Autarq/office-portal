import { FILE_TYPES } from "./file-types.js";

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function jsonScript(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function layout({ title, body, fullScreen = false }) {
  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${escapeHtml(title)}</title>
  <style>${styles(fullScreen)}</style>
</head>
<body>
${body}
</body>
</html>`;
}

export function homePage(files) {
  const fileRows = files.length
    ? files.map(fileCard).join("")
    : `<section class="empty">
        <div class="empty-mark">Q</div>
        <h2>Noch keine Dateien</h2>
        <p>Erstelle ein Dokument oder lade eine vorhandene Office-Datei hoch.</p>
      </section>`;

  return layout({
    title: "AUTARQ Office",
    body: `<main class="shell">
      <header class="topbar">
        <div class="brand">
          <div class="brand-mark">Q</div>
          <div>
            <h1>AUTARQ Office</h1>
            <p>${files.length} Dateien</p>
          </div>
        </div>
        <form class="upload" action="/api/files/upload" method="post" enctype="multipart/form-data">
          <label class="upload-label">
            <input type="file" name="file" accept=".docx,.xlsx,.pptx,.pdf" onchange="this.form.submit()">
            Upload
          </label>
        </form>
      </header>

      <section class="actions" aria-label="Neue Datei erstellen">
        ${newButton("docx", "Write")}
        ${newButton("xlsx", "Sheets")}
        ${newButton("pptx", "Slides")}
        ${newButton("pdf", "PDF")}
      </section>

      <section class="file-grid" aria-label="Dateien">
        ${fileRows}
      </section>
    </main>`
  });
}

export function editorPage({ file, config, documentServerUrl }) {
  return layout({
    title: `${file.name} - AUTARQ Office`,
    fullScreen: true,
    body: `<div class="editor-shell">
      <nav class="editor-bar">
        <a href="/" aria-label="Zurueck">Back</a>
        <strong>${escapeHtml(file.name)}</strong>
      </nav>
      <div id="editor"></div>
    </div>
    <script src="${escapeHtml(documentServerUrl)}/web-apps/apps/api/documents/api.js"></script>
    <script>
      const config = ${jsonScript(config)};
      window.docEditor = new DocsAPI.DocEditor("editor", config);
    </script>`
  });
}

function newButton(ext, label) {
  const type = FILE_TYPES[ext];
  return `<form action="/api/files/new" method="post">
    <input type="hidden" name="type" value="${ext}">
    <button class="new-button ${type.className}" type="submit">
      <span>${escapeHtml(label[0])}</span>
      <strong>${escapeHtml(label)}</strong>
    </button>
  </form>`;
}

function fileCard(file) {
  const type = FILE_TYPES[file.ext] || { label: file.ext.toUpperCase(), className: "file" };
  return `<article class="file-card">
    <a href="/editor/${encodeURIComponent(file.id)}">
      <span class="type-chip ${type.className}">${escapeHtml(type.label)}</span>
      <h2>${escapeHtml(file.name)}</h2>
      <p>${escapeHtml(formatBytes(file.size))} · Version ${file.version}</p>
      <time datetime="${escapeHtml(file.updatedAt)}">${escapeHtml(formatDate(file.updatedAt))}</time>
    </a>
    <form class="delete-form" action="/api/files/${encodeURIComponent(file.id)}/delete" method="post">
      <button type="submit" aria-label="${escapeHtml(file.name)} loeschen">Delete</button>
    </form>
  </article>`;
}

function formatBytes(size) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function styles(fullScreen) {
  return `
:root {
  color-scheme: light;
  --ink: #14221d;
  --muted: #62716b;
  --line: #d9e2dd;
  --paper: #f7faf8;
  --panel: #ffffff;
  --autarq: #14271f;
  --lime: #d5ff7a;
  --blue: #0969e8;
  --green: #007a4d;
  --orange: #ec5b17;
  --red: #d51c27;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: ui-sans-serif, "Aptos", "Segoe UI", sans-serif;
  color: var(--ink);
  background: ${fullScreen ? "#fff" : "var(--paper)"};
}
.shell {
  width: min(1180px, calc(100vw - 32px));
  margin: 0 auto;
  padding: max(22px, env(safe-area-inset-top)) 0 48px;
}
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 14px 0 22px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 14px;
}
.brand-mark {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: 14px;
  color: var(--lime);
  background: var(--autarq);
  font-size: 34px;
  font-weight: 800;
  line-height: 1;
}
h1 {
  margin: 0;
  font-size: clamp(28px, 5vw, 46px);
  letter-spacing: 0;
}
.brand p, .file-card p, .empty p {
  margin: 4px 0 0;
  color: var(--muted);
}
.upload-label, button, .editor-bar a {
  appearance: none;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fff;
  color: var(--ink);
  font: inherit;
  font-weight: 750;
  padding: 10px 14px;
  cursor: pointer;
  text-decoration: none;
}
.upload input { display: none; }
.actions {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin: 4px 0 22px;
}
.new-button {
  width: 100%;
  min-height: 76px;
  display: flex;
  align-items: center;
  gap: 12px;
  text-align: left;
  background: var(--panel);
}
.new-button span {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 8px;
  color: #fff;
  font-weight: 850;
}
.new-button.word span, .type-chip.word { background: var(--blue); }
.new-button.sheet span, .type-chip.sheet { background: var(--green); }
.new-button.slide span, .type-chip.slide { background: var(--orange); }
.new-button.pdf span, .type-chip.pdf { background: var(--red); }
.file-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 12px;
}
.file-card {
  position: relative;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
  overflow: hidden;
}
.file-card a {
  display: block;
  min-height: 166px;
  padding: 16px;
  color: inherit;
  text-decoration: none;
}
.file-card:hover {
  border-color: #9bb0a7;
  box-shadow: 0 10px 24px rgba(20, 34, 29, 0.08);
}
.type-chip {
  display: inline-flex;
  align-items: center;
  min-width: 56px;
  height: 26px;
  padding: 0 9px;
  border-radius: 6px;
  color: #fff;
  font-size: 12px;
  font-weight: 800;
}
.file-card h2 {
  margin: 24px 0 8px;
  min-height: 48px;
  font-size: 18px;
  line-height: 1.3;
  overflow-wrap: anywhere;
}
.file-card time {
  display: block;
  margin-top: 16px;
  color: var(--muted);
  font-size: 13px;
}
.delete-form {
  position: absolute;
  top: 12px;
  right: 12px;
}
.delete-form button {
  padding: 5px 8px;
  min-width: 0;
  color: #7a1f26;
  background: #fff8f8;
  border-color: #efc4c8;
  font-size: 12px;
}
.empty {
  grid-column: 1 / -1;
  border: 1px dashed #b8c7c0;
  border-radius: 8px;
  padding: 48px 20px;
  text-align: center;
  background: #fff;
}
.empty-mark {
  margin: 0 auto 16px;
  display: grid;
  place-items: center;
  width: 74px;
  height: 74px;
  border-radius: 18px;
  background: var(--autarq);
  color: var(--lime);
  font-size: 48px;
  font-weight: 900;
}
.editor-shell {
  height: 100vh;
  height: 100dvh;
  display: grid;
  grid-template-rows: auto 1fr;
}
.editor-bar {
  height: max(54px, calc(54px + env(safe-area-inset-top)));
  padding: env(safe-area-inset-top) 12px 8px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid var(--line);
  background: #fff;
}
.editor-bar strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
#editor {
  min-width: 0;
  min-height: 0;
}
@media (max-width: 720px) {
  .shell { width: min(100vw - 20px, 1180px); }
  .topbar { align-items: flex-start; }
  .actions { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .brand-mark { width: 46px; height: 46px; font-size: 30px; }
}
`;
}

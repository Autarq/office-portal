import assert from "node:assert/strict";
import test from "node:test";
import JSZip from "jszip";
import { createBlankFile } from "../src/templates.js";

test("creates a blank docx package", async () => {
  const zip = await JSZip.loadAsync(await createBlankFile("docx"));
  assert.ok(zip.file("word/document.xml"));
});

test("creates a blank xlsx package", async () => {
  const zip = await JSZip.loadAsync(await createBlankFile("xlsx"));
  assert.ok(zip.file("xl/workbook.xml"));
  assert.ok(zip.file("xl/worksheets/sheet1.xml"));
});

test("creates a blank pptx package", async () => {
  const zip = await JSZip.loadAsync(await createBlankFile("pptx"));
  assert.ok(zip.file("ppt/presentation.xml"));
  assert.ok(zip.file("ppt/slides/slide1.xml"));
});

test("creates a blank pdf", async () => {
  const pdf = await createBlankFile("pdf");
  assert.ok(pdf.toString("utf8").startsWith("%PDF-1.4"));
});

import { createRequire } from "node:module";

// Reuse PDFKit's installed font reader and Unicode line breaker. Font selection,
// measurement and drawing share the same runs; no transliteration or data edits.
const require = createRequire(import.meta.url);
type FontFace = { unitsPerEm: number; ascent: number; descent: number; lineGap: number; hasGlyphForCodePoint(code: number): boolean };
const fontkit = require("fontkit") as { openSync(file: string): FontFace };
const LineBreaker = require("linebreak") as new(text: string) => { nextBreak(): {position: number; required: boolean} | null };
const faces = new Map<string, FontFace>();
const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });
const ignorable = /\p{Default_Ignorable_Code_Point}/u;

type Run = { text: string; font: string; width: number };
export type ReportTextLine = { runs: Run[]; width: number; ascent: number; height: number };
export type ReportTextLayout = { lines: ReportTextLine[]; height: number; size: number };

export function createReportText(doc: PDFKit.PDFDocument, fontFiles: string[]) {
  const files = [...new Set(fontFiles)];
  const face = (file: string) => {
    if (!faces.has(file)) faces.set(file, fontkit.openSync(file));
    return faces.get(file)!;
  };
  const fontFor = (cluster: string) => {
    const visible = [...cluster].filter(char => !ignorable.test(char));
    const file = files.find(file => visible.every(char => face(file).hasGlyphForCodePoint(char.codePointAt(0)!)));
    if (!file) throw new Error(`Report font coverage unavailable: ${visible.map(c => `U+${c.codePointAt(0)!.toString(16)}`).join(" ")}`);
    return file;
  };
  const lineFor = (text: string, size: number): ReportTextLine => {
    const runs: Run[] = [];
    for (const { segment } of graphemes.segment(text)) {
      const font = fontFor(segment);
      if (runs.at(-1)?.font === font) runs.at(-1)!.text += segment;
      else runs.push({ text: segment, font, width: 0 });
    }
    let ascent = 0, descent = 0, gap = 0;
    for (const run of runs) {
      run.width = doc.font(run.font).fontSize(size).widthOfString(run.text);
      const f = face(run.font), scale = size / f.unitsPerEm;
      ascent = Math.max(ascent, f.ascent * scale);
      descent = Math.max(descent, -f.descent * scale);
      gap = Math.max(gap, f.lineGap * scale);
    }
    if (!runs.length) {
      const f = face(files[0]), scale = size / f.unitsPerEm;
      ascent = f.ascent * scale; descent = -f.descent * scale; gap = f.lineGap * scale;
    }
    return { runs, width: runs.reduce((sum, run) => sum + run.width, 0), ascent, height: ascent + descent + gap };
  };
  const layout = (text: string, width: number, size: number): ReportTextLayout => {
    if (!Number.isFinite(width) || width <= 0) throw new Error("Report text width must be positive");
    const lines: ReportTextLine[] = [];
    for (const paragraph of text.replace(/\r\n?/g, "\n").split("\n")) {
      const breaker = new LineBreaker(paragraph);
      let previous = 0, pending = "", point;
      const flush = () => { lines.push(lineFor(pending.trimEnd(), size)); pending = ""; };
      while ((point = breaker.nextBreak())) {
        const token = paragraph.slice(previous, point.position); previous = point.position;
        if (lineFor(pending + token, size).width <= width + 0.001) { pending += token; continue; }
        if (pending.trim()) flush();
        const next = token.trimStart();
        // Long URLs/words may have no suitable word boundary; split only at
        // grapheme boundaries, preserving combining marks and Arabic shaping.
        for (const { segment } of graphemes.segment(next)) {
          if (pending && lineFor(pending + segment, size).width > width + 0.001) flush();
          pending += segment;
        }
      }
      if (pending || !paragraph) flush();
    }
    return { lines, height: lines.reduce((sum, line) => sum + line.height, 0), size };
  };
  const drawLine = (line: ReportTextLine, size: number, x: number, y: number) => {
    for (const run of line.runs) {
      // All fonts share a measured alphabetic baseline; omit width so PDFKit
      // cannot independently wrap, clip or create an extra page.
      doc.font(run.font).fontSize(size).text(run.text, x, y + line.ascent, { lineBreak: false, baseline: "alphabetic" });
      x += run.width;
    }
  };
  const draw = (value: ReportTextLayout, x: number, y: number) => {
    for (const line of value.lines) { drawLine(line, value.size, x, y); y += line.height; }
  };
  return { layout, drawLine, draw };
}

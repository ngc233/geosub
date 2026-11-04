#!/usr/bin/env node
// T05: classification and references only; neither a marker nor a pending
// historical record grants permission. Human review establishes classification.
import { readFileSync, realpathSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const POLICY_FILES = ['docs/DATA_POLICY.md', 'docs/SEO_POLICY.md'];
const REGISTER = 'docs/APPROVALS.md';
const COLUMNS = ['编号', '日期', '原话', '范围', '不包括', '关联 PR', '追认状态', '关联提交'];
const KEYWORD = /批准|授权|approved|authorized/i;
const VALID_ID = /^APR-H-\d{4,}$/;
const isHistoricalId = value => VALID_ID.test(value) && /[1-9]/.test(value);

// Preserve line numbers while removing comments, including commented markers.
function visibleLines(markdown) {
  const text = markdown.replace(/\r\n?/g, '\n').replace(/<!--[\s\S]*?(?:-->|$)/g,
    comment => comment.replace(/[^\n]/g, ' '));
  let fence = null;
  return text.split('\n').map((raw, index) => {
    const quoted = /^\s{0,3}>/.test(raw);
    const text = raw.replace(/^\s{0,3}(?:>\s?)+/, '');
    if (fence) {
      const close = text.match(/^ {0,3}(`{3,}|~{3,})\s*$/);
      if (close && close[1][0] === fence.char && close[1].length >= fence.length) fence = null;
      return { text: '', line: index + 1, quoted };
    }
    const open = text.match(/^ {0,3}(`{3,}|~{3,})/);
    if (open) {
      fence = { char: open[1][0], length: open[1].length };
      return { text: '', line: index + 1, quoted };
    }
    return { text, line: index + 1, quoted };
  });
}

function tableCells(line) {
  let text = line.trim();
  if (!text.includes('|')) return null;
  if (text.startsWith('|')) text = text.slice(1);
  if (text.endsWith('|') && !text.endsWith('\\|')) text = text.slice(0, -1);
  const cells = [''];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\\' && i + 1 < text.length && /[\\|]/.test(text[i + 1])) {
      cells[cells.length - 1] += text[++i];
    } else if (text[i] === '|') cells.push('');
    else cells[cells.length - 1] += text[i];
  }
  return cells.map(cell => cell.trim());
}

const isSeparator = cells => cells && cells.length > 1 && cells.every(cell => /^:?-{3,}:?$/.test(cell));

// Markdown prose paragraphs, each list item and table row have separate marker
// scope. Headings and fenced/indented examples are not approval statements.
export function paragraphs(markdown) {
  const lines = visibleLines(markdown);
  const result = [];
  let current = null;
  let inTable = false;
  const flush = () => { if (current) result.push(current); current = null; };
  for (let i = 0; i < lines.length; i++) {
    const { text, line } = lines[i];
    if (i && lines[i].quoted !== lines[i - 1].quoted) { flush(); inTable = false; }
    if (!text.trim() || /^ {0,3}#{1,6}(?:\s|$)/.test(text) || /^ {0,3}(?:[-*_]\s*){3,}$/.test(text)) {
      flush(); inTable = false; continue;
    }
    if (lines[i + 1] && /^ {0,3}(?:=+|-+)\s*$/.test(lines[i + 1].text)) {
      flush(); i++; continue;
    }
    const cells = tableCells(text);
    if (isSeparator(cells)) { flush(); continue; }
    const tableHeader = cells && isSeparator(tableCells(lines[i + 1]?.text ?? ''));
    if (cells && (inTable || text.trimStart().startsWith('|') || tableHeader)) {
      flush();
      inTable = true;
      if (!tableHeader) result.push({ line, text });
      continue;
    }
    inTable = false;
    const list = /^\s*(?:[-+*]|\d+[.)])\s+/.test(text);
    if (list) flush();
    if (!current && /^(?: {4}|\t)/.test(text) && !list) continue;
    if (!current) current = { line, text };
    else current.text += '\n' + text;
  }
  flush();
  return result;
}

function readRegister(markdown) {
  const ids = new Set();
  const findings = [];
  if (markdown === null) return { ids, findings };
  const lines = visibleLines(markdown);
  let tables = 0;
  for (let i = 0; i < lines.length; i++) {
    const header = tableCells(lines[i].text);
    if (!header || header.length !== COLUMNS.length || !header.every((cell, n) => cell === COLUMNS[n]) ||
        !isSeparator(tableCells(lines[i + 1]?.text ?? ''))) continue;
    tables++;
    i += 2;
    for (; i < lines.length; i++) {
      const cells = tableCells(lines[i].text);
      if (!cells) break;
      const id = cells[0].replace(/^`([^`]+)`$/, '$1');
      if (cells.length !== COLUMNS.length || cells.some(cell => !cell) || !isHistoricalId(id)) {
        findings.push({ file: REGISTER, line: lines[i].line, code: 'invalid-record', message: '登记行必须有八个非空字段，编号须为 APR-H-0001 起的历史编号。' });
      } else if (ids.has(id)) {
        findings.push({ file: REGISTER, line: lines[i].line, code: 'duplicate-id', message: `重复历史编号：${id}` });
      } else ids.add(id);
    }
  }
  if (tables === 0) findings.push({ file: REGISTER, line: 1, code: 'invalid-register', message: '未找到包含编号、日期、原话、范围、不包括、关联 PR、追认状态、关联提交的登记表。' });
  return { ids, findings };
}

export function checkApprovals(documents, registerMarkdown = null) {
  const { ids, findings } = readRegister(registerMarkdown);
  for (const file of POLICY_FILES) {
    if (typeof documents[file] !== 'string') throw new Error(`缺少必需规范：${file}`);
    for (const paragraph of paragraphs(documents[file])) {
      const references = [...paragraph.text.matchAll(/(?<![A-Za-z0-9_-])APR-[A-Za-z0-9_-]+/g)].map(match => match[0]);
      const historical = references.filter(isHistoricalId);
      const classification = /(?<!\\)\[(?:REQ|BND)\](?![A-Za-z0-9_-])/.test(paragraph.text);
      const report = (code, message) => findings.push({ file, line: paragraph.line, code, message });
      if (KEYWORD.test(paragraph.text) && !historical.length && !classification) {
        report('missing-marker', '命中批准/授权关键词，但同一段落没有 APR-H 编号、[REQ] 或 [BND]。');
      }
      for (const id of new Set(references)) {
        if (!isHistoricalId(id)) report('invalid-id', `无效历史编号：${id}`);
        else if (!ids.has(id)) report('unregistered-id', `历史编号未在 ${REGISTER} 的编号栏找到有效记录：${id}`);
      }
    }
  }
  return findings;
}

export function checkRepository(root) {
  const read = (file, optional = false) => {
    try { return readFileSync(resolve(root, file), 'utf8'); }
    catch (error) {
      if (optional && error.code === 'ENOENT') return null;
      throw new Error(`无法读取 ${file}（${error.code ?? 'read error'}）。`);
    }
  };
  const documents = Object.fromEntries(POLICY_FILES.map(file => [file, read(file)]));
  return checkApprovals(documents, read(REGISTER, true));
}

export function main(args = process.argv.slice(2), log = console.log) {
  try {
    let mode = 'error';
    let root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
    const seen = new Set();
    for (let i = 0; i < args.length; i++) {
      const match = args[i].match(/^--(mode|root)(?:=(.*))?$/);
      if (!match || seen.has(match[1])) throw new Error('Usage: --mode=warn|error [--root <repository>]');
      seen.add(match[1]);
      const value = match[2] ?? args[++i];
      if (!value || value.startsWith('--')) throw new Error('选项缺少值。');
      if (match[1] === 'mode') mode = value;
      else root = resolve(value);
    }
    if (!['warn', 'error'].includes(mode)) throw new Error('mode 必须为 warn 或 error。');
    const findings = checkRepository(root);
    for (const finding of findings) log(`${mode === 'warn' ? 'WARNING' : 'ERROR'} ${finding.file}:${finding.line} [${finding.code}] ${finding.message}`);
    log(`Approval references: ${findings.length} issue(s); mode=${mode}; scanned ${POLICY_FILES.join(', ')}.`);
    return mode === 'error' && findings.length ? 1 : 0;
  } catch (error) {
    log(`Approval references ERROR: ${error.message}`);
    return 2;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  process.exitCode = main();
}

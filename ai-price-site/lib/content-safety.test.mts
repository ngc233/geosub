import assert from "node:assert/strict";
import test from "node:test";
import sanitizeHtml from "sanitize-html";
import { sanitizeArticleHtml } from "./content-safety.ts";
import { serializeJsonLd } from "./json-ld.ts";

test("article HTML keeps editorial markup and removes executable content", () => {
  const html = sanitizeArticleHtml(`
    <h2 id="answer" onclick="alert(1)">Answer</h2>
    <p>Safe <strong>content</strong>.</p>
    <script>alert(1)</script>
    <img src="https://cdn.example.com/image.png" onerror="alert(2)">
  `);

  assert.match(html, /<h2 id="answer">Answer<\/h2>/);
  assert.match(html, /<strong>content<\/strong>/);
  assert.match(html, /loading="lazy"/);
  assert.doesNotMatch(html, /script|onclick|onerror|alert\(/i);
});

test("article HTML rejects unsafe links and hardens external links", () => {
  const html = sanitizeArticleHtml(`
    <a href="javascript:alert(1)">Bad</a>
    <a href="/zh/guides/safe">Internal</a>
    <a href="https://example.com/source">External</a>
  `);

  assert.match(html, /<a>Bad<\/a>/);
  assert.match(html, /href="\/zh\/guides\/safe"/);
  assert.match(html, /href="https:\/\/example\.com\/source"/);
  assert.match(html, /rel="nofollow noopener noreferrer"/);
  assert.doesNotMatch(html, /javascript:/i);
});

test("JSON-LD cannot terminate its script element", () => {
  const output = serializeJsonLd({
    headline: "</script><script>alert('xss')</script>",
    note: "A&B",
  });

  assert.doesNotMatch(output, /<|>|&/);
  assert.match(output, /\\u003c\/script\\u003e/);
  assert.match(output, /A\\u0026B/);
});

test("patched sanitizer keeps a malformed noscript discard region closed", () => {
  // GHSA-x3q4-9hxx-gx8m: an implied ancestor close must not leak an image.
  const html = sanitizeHtml('<div><noscript></div><img src="https://example.com/leaked.png"></noscript>', {
    allowedTags: ["div", "img"],
    allowedAttributes: { img: ["src"] },
    nonTextTags: ["script", "style", "textarea", "option", "noscript"],
  });
  assert.equal(html, "<div></div>");
});

test("article allowlist still rejects refresh and namespaced SVG URL payloads", () => {
  const html = sanitizeArticleHtml('<p>Safe article</p><meta http-equiv="refresh" content="0;url=javascript:alert(1)"><svg><svg:animate attributeName="href" values="#safe;javascript:alert(1)" /></svg>');
  assert.equal(html, "<p>Safe article</p>");
});

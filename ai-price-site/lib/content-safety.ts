import sanitizeHtml from "sanitize-html";

const articleTags = [
  ...sanitizeHtml.defaults.allowedTags,
  "figure",
  "figcaption",
  "img",
  "mark",
  "section",
];

export function sanitizeArticleHtml(value: string | null | undefined) {
  return sanitizeHtml(String(value || ""), {
    allowedTags: articleTags,
    allowedAttributes: {
      a: ["href", "name", "target", "rel", "aria-label"],
      blockquote: ["cite"],
      code: ["class"],
      h1: ["id"],
      h2: ["id"],
      h3: ["id"],
      h4: ["id"],
      img: ["src", "alt", "title", "width", "height", "loading", "decoding"],
      td: ["colspan", "rowspan"],
      th: ["colspan", "rowspan", "scope"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    transformTags: {
      a: (tagName, attributes) => {
        const href = attributes.href || "";
        if (!/^https?:\/\//i.test(href)) {
          return { tagName, attribs: attributes };
        }

        return {
          tagName,
          attribs: {
            ...attributes,
            target: "_blank",
            rel: "nofollow noopener noreferrer",
          },
        };
      },
      img: (tagName, attributes) => ({
        tagName,
        attribs: {
          ...attributes,
          loading: attributes.loading === "eager" ? "eager" : "lazy",
          decoding: "async",
        },
      }),
    },
  });
}

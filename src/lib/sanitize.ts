import sanitizeHtml from "sanitize-html";

const options: sanitizeHtml.IOptions = {
  allowedTags: [
    "h1", "h2", "h3", "h4", "h5", "h6", "p", "br", "hr", "blockquote", "pre", "code",
    "strong", "b", "em", "i", "u", "s", "mark", "sub", "sup", "small",
    "ul", "ol", "li", "a", "img", "figure", "figcaption",
    "table", "thead", "tbody", "tr", "th", "td", "span", "div",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "width", "height", "loading"],
    th: ["colspan", "rowspan"],
    td: ["colspan", "rowspan"],
    "*": ["class"],
  },
  allowedClasses: {
    "*": ["text-left", "text-center", "text-right", "lead"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesAppliedToAttributes: ["href", "src"],
  allowProtocolRelative: false,
  transformTags: {
    a: (tagName, attribs) => {
      const external = /^https?:\/\//i.test(attribs.href ?? "");
      return {
        tagName,
        attribs: external
          ? { ...attribs, target: "_blank", rel: "noopener noreferrer" }
          : attribs,
      };
    },
    img: (tagName, attribs) => ({ tagName, attribs: { ...attribs, loading: "lazy" } }),
  },
};

/** Strip everything that could execute script from admin-authored rich text. */
export function sanitizeRichText(html: string) {
  return sanitizeHtml(html ?? "", options);
}

export function stripHtml(html: string) {
  return sanitizeHtml(html ?? "", { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim();
}

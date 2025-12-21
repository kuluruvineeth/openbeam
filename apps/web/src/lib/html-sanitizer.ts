import DOMPurify from "dompurify";

const ALLOWED_TAGS = [
  "p",
  "br",
  "div",
  "span",
  "a",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "ul",
  "ol",
  "li",
  "blockquote",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "img",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "pre",
  "code",
  "hr",
];

const ALLOWED_ATTR = [
  "href",
  "src",
  "alt",
  "title",
  "target",
  "rel",
  "width",
  "height",
];

const FORBID_TAGS = ["script", "style", "iframe", "form", "input", "button"];

export function sanitizeEmailHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    FORBID_TAGS,
    ADD_ATTR: ["target"],
    FORCE_BODY: true,
  });
}

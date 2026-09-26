/** Only allow http(s) or site-relative image sources from stored JSON. */
export function safeImage(src: unknown) {
  return typeof src === "string" && /^(https?:\/\/|\/(?!\/))/i.test(src) ? src : "";
}

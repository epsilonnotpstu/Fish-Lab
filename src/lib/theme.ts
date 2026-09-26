const HEX = /^#[0-9a-fA-F]{6}$/;

export function safeHex(value: string | null | undefined, fallback: string) {
  return value && HEX.test(value) ? value : fallback;
}

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Pick black-ish or white text for the best contrast on a background colour. */
export function readableOn(hex: string) {
  return luminance(hex) > 0.4 ? "#0b1220" : "#ffffff";
}

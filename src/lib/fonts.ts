import {
  DM_Sans,
  Inter,
  Lora,
  Manrope,
  Merriweather,
  Playfair_Display,
  Plus_Jakarta_Sans,
  Poppins,
  Source_Serif_4,
} from "next/font/google";

// next/font needs static declarations, so the admin chooses from this set.
const inter = Inter({ subsets: ["latin"], variable: "--ff-inter", display: "swap" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--ff-jakarta", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], variable: "--ff-manrope", display: "swap" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--ff-dmsans", display: "swap" });
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--ff-poppins", display: "swap" });
const sourceSerif = Source_Serif_4({ subsets: ["latin"], variable: "--ff-sourceserif", display: "swap" });
const merriweather = Merriweather({ subsets: ["latin"], weight: ["400", "700"], variable: "--ff-merriweather", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--ff-playfair", display: "swap" });
const lora = Lora({ subsets: ["latin"], variable: "--ff-lora", display: "swap" });

export const fontVariables = [inter, jakarta, manrope, dmSans, poppins, sourceSerif, merriweather, playfair, lora]
  .map((f) => f.variable)
  .join(" ");

const FONT_VARS: Record<string, string> = {
  Inter: "--ff-inter",
  "Plus Jakarta Sans": "--ff-jakarta",
  Manrope: "--ff-manrope",
  "DM Sans": "--ff-dmsans",
  Poppins: "--ff-poppins",
  "Source Serif 4": "--ff-sourceserif",
  Merriweather: "--ff-merriweather",
  "Playfair Display": "--ff-playfair",
  Lora: "--ff-lora",
};

export function fontVar(name: string, fallback: string) {
  return `var(${FONT_VARS[name] ?? FONT_VARS[fallback]})`;
}

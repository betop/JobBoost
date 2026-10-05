/**
 * Per-template look for the Word export. Colors are taken from swiftcv/pdfGenerator.js
 * (_applyTemplateTheme) and the header/section styles from its _renderTemplate_N methods,
 * so a template id means the same thing in the PDF and in the .docx. Hex values have no '#'.
 */

export type ColorKey = "accent" | "dark" | "medium" | "rule" | "body" | "white";
export type HeaderLayout =
  | "plain"     // stacked paragraphs, optional bottom rule
  | "band"      // full-width filled block with white text (contact inside when contactInBand)
  | "twotone"   // dark / accent split block (template 16)
  | "split"     // name+title left, contact right (template 12)
  | "sidebar"   // dark left column with name/contact, content in right column (template 8)
  | "framed";   // boxed header (template 19)

export interface HeaderStyle {
  layout: HeaderLayout;
  align: "left" | "center" | "right";
  nameSize: number;            // pt
  nameColor: ColorKey;
  nameCase: "upper" | "lower";
  titleSize: number;           // pt
  titleColor: ColorKey;
  titleBold?: boolean;
  titleItalic?: boolean;
  titleUpper?: boolean;
  titleBullet?: boolean;       // "●" before title (template 10)
  contactSize: number;         // pt
  contactColor: "gray" | "white";
  contactInBand?: boolean;
  bandFill?: ColorKey;
  /** Bottom rule under the header: color, width in eighths of a point, style. */
  rule?: { color: ColorKey; size: number; style?: "single" | "dashed" | "double" };
  topBar?: { color: ColorKey; size: number };   // thick bar above the name (13, 20)
  secondRule?: ColorKey;                        // thin rule after the main rule (13)
  leftBar?: ColorKey;                           // vertical bar beside the header (4)
}

export type SectionDecor = "none" | "pill" | "boxed" | "square" | "dot" | "triangle" | "shortline";

export interface SectionStyle {
  size: number;                // pt
  color: ColorKey;
  align?: "left" | "center";
  rule: ColorKey | null;       // full-width rule under the title
  ruleSize?: number;           // eighths of a point
  decor: SectionDecor;
}

export interface DocxTemplateStyle {
  name: string;
  accent: string; dark: string; medium: string; rule: string;
  header: HeaderStyle;
  section: SectionStyle;
}

const BODY_HEX = "18181B";

const hex = (r: number, g: number, b: number) =>
  [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();

// [accent, dark, medium, rule] straight from swiftcv _applyTemplateTheme
const PALETTE: Record<number, [string, string, string, string]> = {
  1:  [hex(37,99,235),   hex(17,24,39),    hex(55,65,81),    hex(209,213,219)],
  2:  [hex(5,150,105),   hex(6,78,59),     hex(52,211,153),  hex(167,243,208)],
  3:  [hex(124,58,237),  hex(46,16,101),   hex(109,40,217),  hex(221,214,254)],
  4:  [hex(220,38,38),   hex(127,29,29),   hex(185,28,28),   hex(254,202,202)],
  5:  [hex(2,132,199),   hex(12,74,110),   hex(3,105,161),   hex(186,230,253)],
  6:  [hex(180,83,9),    hex(120,53,15),   hex(217,119,6),   hex(253,230,138)],
  7:  [hex(15,118,110),  hex(19,78,74),    hex(13,148,136),  hex(153,246,228)],
  8:  [hex(79,70,229),   hex(30,27,75),    hex(67,56,202),   hex(199,210,254)],
  9:  [hex(236,72,153),  hex(131,24,67),   hex(219,39,119),  hex(251,207,232)],
  10: [hex(100,116,139), hex(15,23,42),    hex(71,85,105),   hex(203,213,225)],
  11: [hex(0,0,0),       hex(0,0,0),       hex(0,0,0),       hex(0,0,0)],
  12: [hex(22,163,74),   hex(20,83,45),    hex(34,197,94),   hex(187,247,208)],
  13: [hex(30,64,175),   hex(30,58,138),   hex(59,130,246),  hex(191,219,254)],
  14: [hex(51,65,85),    hex(15,23,42),    hex(71,85,105),   hex(203,213,225)],
  15: [hex(154,52,18),   hex(67,20,7),     hex(194,65,12),   hex(254,215,170)],
  16: [hex(8,145,178),   hex(21,94,117),   hex(6,182,212),   hex(165,243,252)],
  17: [hex(71,85,105),   hex(30,41,59),    hex(100,116,139), hex(226,232,240)],
  18: [hex(212,160,23),  hex(17,24,39),    hex(245,158,11),  hex(253,230,138)],
  19: [hex(139,92,246),  hex(49,46,129),   hex(167,139,250), hex(221,214,254)],
  20: [hex(37,99,235),   hex(30,58,138),   hex(96,165,250),  hex(191,219,254)],
};

const NAMES: Record<number, string> = {
  1: "Classic Blue", 2: "Emerald Modern", 3: "Royal Purple", 4: "Bold Red", 5: "Sky Blue",
  6: "Amber Warm", 7: "Teal Minimal", 8: "Indigo Sidebar", 9: "Rose Pink", 10: "Slate Professional",
  11: "STAR Method Plain", 12: "Forest Executive", 13: "Navy Command", 14: "Charcoal Tech",
  15: "Copper Editorial", 16: "Ocean Split", 17: "Graphite Compact", 18: "Midnight Gold",
  19: "Violet Frame", 20: "Cobalt Edge",
};

function h(over: Partial<HeaderStyle> & Pick<HeaderStyle, "nameSize" | "nameColor" | "titleSize" | "titleColor" | "contactSize">): HeaderStyle {
  return { layout: "plain", align: "left", nameCase: "upper", contactColor: "gray", ...over };
}
const sec = (size: number, color: ColorKey, rule: ColorKey | null, decor: SectionDecor = "none", align?: "left" | "center", ruleSize?: number): SectionStyle =>
  ({ size, color, rule, decor, align, ruleSize });

const HEADERS: Record<number, HeaderStyle> = {
  1:  h({ nameSize: 22, nameColor: "body", titleSize: 11, titleColor: "accent", contactSize: 9, rule: { color: "accent", size: 12 } }),
  2:  h({ nameSize: 26, nameColor: "accent", titleSize: 12, titleColor: "dark", contactSize: 9, rule: { color: "accent", size: 24 } }),
  3:  h({ align: "center", nameSize: 24, nameColor: "dark", titleSize: 11, titleColor: "accent", contactSize: 9, rule: { color: "accent", size: 6, style: "double" } }),
  4:  h({ nameSize: 24, nameColor: "dark", titleSize: 11, titleColor: "accent", titleBold: true, contactSize: 9, leftBar: "accent", rule: { color: "rule", size: 6 } }),
  5:  h({ layout: "band", bandFill: "dark", nameSize: 22, nameColor: "white", titleSize: 10.5, titleColor: "white", contactSize: 8.5, contactColor: "white", contactInBand: true }),
  6:  h({ nameSize: 24, nameColor: "dark", titleSize: 11, titleColor: "accent", contactSize: 9, rule: { color: "accent", size: 8, style: "dashed" } }),
  7:  h({ nameCase: "lower", nameSize: 28, nameColor: "accent", titleSize: 10, titleColor: "dark", contactSize: 8.5, rule: { color: "rule", size: 4 } }),
  8:  h({ layout: "sidebar", bandFill: "dark", nameSize: 13, nameColor: "white", titleSize: 8.5, titleColor: "white", contactSize: 7.5, contactColor: "white", contactInBand: true }),
  9:  h({ layout: "band", bandFill: "accent", nameSize: 22, nameColor: "white", titleSize: 10, titleColor: "white", contactSize: 8.5, rule: { color: "rule", size: 4 } }),
  10: h({ nameSize: 26, nameColor: "dark", titleSize: 11, titleColor: "medium", titleBullet: true, contactSize: 9, rule: { color: "rule", size: 6 } }),
  11: h({ align: "center", nameSize: 15, nameColor: "dark", titleSize: 10, titleColor: "dark", contactSize: 9 }),
  12: h({ layout: "split", nameSize: 22, nameColor: "dark", titleSize: 11, titleColor: "accent", contactSize: 8, rule: { color: "accent", size: 24 } }),
  13: h({ topBar: { color: "dark", size: 72 }, nameSize: 23, nameColor: "dark", titleSize: 11, titleColor: "accent", titleBold: true, titleUpper: true, contactSize: 9, rule: { color: "dark", size: 24 }, secondRule: "accent" }),
  14: h({ nameSize: 20, nameColor: "dark", titleSize: 10.5, titleColor: "medium", contactSize: 8.5, rule: { color: "dark", size: 24 } }),
  15: h({ align: "right", nameSize: 22, nameColor: "dark", titleSize: 11, titleColor: "accent", titleItalic: true, contactSize: 8.5, rule: { color: "accent", size: 6 } }),
  16: h({ layout: "twotone", bandFill: "dark", nameSize: 20, nameColor: "white", titleSize: 10, titleColor: "white", contactSize: 8.5, rule: { color: "accent", size: 8 } }),
  17: h({ nameSize: 16, nameColor: "dark", titleSize: 9.5, titleColor: "medium", contactSize: 8, rule: { color: "medium", size: 4 } }),
  18: h({ layout: "band", bandFill: "dark", nameSize: 22, nameColor: "white", titleSize: 10.5, titleColor: "accent", contactSize: 8.5, rule: { color: "accent", size: 10 } }),
  19: h({ layout: "framed", align: "center", nameSize: 20, nameColor: "dark", titleSize: 10, titleColor: "accent", contactSize: 8.5 }),
  20: h({ topBar: { color: "dark", size: 96 }, nameSize: 22, nameColor: "dark", titleSize: 10.5, titleColor: "accent", contactSize: 8.5, rule: { color: "rule", size: 6 } }),
};

const SECTIONS: Record<number, SectionStyle> = {
  1:  sec(8.5, "accent", "rule", "none", undefined, 6),
  2:  sec(8, "white", null, "pill"),
  3:  sec(9, "accent", "rule", "none", "center", 6),
  4:  sec(9.5, "dark", "rule", "square", undefined, 6),
  5:  sec(9, "accent", "accent", "none", undefined, 8),
  6:  sec(9, "accent", "rule", "none", undefined, 6),
  7:  sec(9, "dark", "rule", "dot", undefined, 4),
  8:  sec(8.5, "accent", "rule", "none", undefined, 6),
  9:  sec(9, "accent", "accent", "none", undefined, 6),
  10: sec(9, "accent", "rule", "none", undefined, 6),
  11: sec(11, "dark", "dark", "none", undefined, 6),
  12: sec(9, "accent", null, "shortline"),
  13: sec(9, "dark", "accent", "none", undefined, 8),
  14: sec(8, "white", null, "boxed"),
  15: sec(10, "accent", "rule", "none", undefined, 4),
  16: sec(9, "dark", "accent", "none", undefined, 8),
  17: sec(8, "medium", "rule", "none", undefined, 4),
  18: sec(9, "accent", "rule", "none", undefined, 4),
  19: sec(9, "accent", "rule", "none", "center", 4),
  20: sec(9, "dark", "rule", "triangle", undefined, 4),
};

export function getDocxTemplateStyle(templateId: number): DocxTemplateStyle {
  const id = PALETTE[templateId] ? templateId : 11; // swiftcv falls back to template 11
  const [accent, dark, medium, rule] = PALETTE[id];
  return { name: NAMES[id], accent, dark, medium, rule, header: HEADERS[id], section: SECTIONS[id] };
}

export function resolveColor(style: DocxTemplateStyle, key: ColorKey): string {
  switch (key) {
    case "accent": return style.accent;
    case "dark": return style.dark;
    case "medium": return style.medium;
    case "rule": return style.rule;
    case "white": return "FFFFFF";
    default: return BODY_HEX;
  }
}

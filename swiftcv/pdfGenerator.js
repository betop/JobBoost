// ATS-Compliant PDF Generator — spec v2
// US Letter · Inter-fallback-Helvetica · inline marker parser · real link annotations

/**
 * Robustly extract and parse a JSON object from a string that may be
 * wrapped in markdown code fences (```json, ``` json, ```, etc.),
 * contain leading/trailing prose, or be a bare JSON string.
 * Returns the parsed object, or null if no valid JSON is found.
 */
function _extractJSON(raw) {
  if (!raw || typeof raw !== "string") return null;

  // 1. Strip any opening code fence: ```json, ``` json, ```JSON, ``` , ``` etc.
  //    Also handle fences with spaces before the language tag.
  let s = raw.replace(/^[ \t]*`{3,}[ \t]*(?:json)?[ \t]*\r?\n?/im, "");

  // 2. Strip any closing code fence at the end.
  s = s.replace(/[ \t]*`{3,}[ \t]*$/, "").trim();

  // 3. Try parsing directly after fence removal.
  try { return JSON.parse(s); } catch (_) { /* continue */ }

  // 4. Find the first '{' and last '}' and try to parse that slice.
  //    Handles cases where prose surrounds the JSON block.
  const start = s.indexOf("{");
  const end   = s.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try { return JSON.parse(s.slice(start, end + 1)); } catch (_) { /* continue */ }
  }

  // 5. Last resort: try the original raw string untouched.
  try { return JSON.parse(raw.trim()); } catch (_) { /* continue */ }

  // 6. Truncation recovery: if the JSON was cut off (e.g. max_tokens hit),
  //    try to extract just the "resume" object by finding its balanced braces.
  const resumeKey = s.indexOf('"resume"');
  if (resumeKey !== -1) {
    const objStart = s.indexOf("{", resumeKey);
    if (objStart !== -1) {
      // Walk forward counting braces to find the matching close brace
      let depth = 0, i = objStart, found = -1;
      while (i < s.length) {
        const ch = s[i];
        if (ch === "{") depth++;
        else if (ch === "}") { depth--; if (depth === 0) { found = i; break; } }
        i++;
      }
      const resumeSlice = found !== -1
        ? s.slice(objStart, found + 1)
        : s.slice(objStart).replace(/,\s*"[^"]*"\s*:\s*[^,}\]]*$/, "") + "}"; // strip trailing incomplete field
      try {
        const resumeObj = JSON.parse(resumeSlice);
        console.warn("[_extractJSON] Used truncation recovery — resume only, no cover_letter");
        return { resume: resumeObj };
      } catch (_) { /* continue */ }
    }
  }

  return null;
}

// Expose globally so offscreen.js (loaded as a separate <script>) can call it
if (typeof self !== "undefined") self._extractJSON = _extractJSON;
if (typeof window !== "undefined") window._extractJSON = _extractJSON;

class PDFGenerator {
  constructor() {
    this.jsPDF = null;

    // ── Page geometry (US Letter in mm) ────────────────────────────────────
    this.pageWidth  = 215.9;   // 8.5 in
    this.pageHeight = 279.4;   // 11 in
    this.marginTop  = 14;
    this.marginBot  = 14;
    this.marginH    = 18;      // left & right
    this.contentWidth = this.pageWidth - this.marginH * 2;  // 179.9 mm

    // ── Colour palette ─────────────────────────────────────────────────────
    // Stored as [R,G,B] 0-255
    this.C = {
      accent: [37,  99,  235],   // #2563EB
      dark:   [17,  24,  39 ],   // #111827
      medium: [55,  65,  81 ],   // #374151
      body:   [24,  24,  27 ],   // near-black for primary content text
      bodyMuted: [63,  63,  70], // darker muted neutral for secondary content text
      gray:   [82,  82,  91],    // #52525B more visible gray for supporting text
      rule:   [209, 213, 219],   // #D1D5DB  section rules
      page:   [255, 255, 255],
    };

    // ── Spacing constants (mm — converted from px at 3.78 px/mm) ──────────
    this.SP = {
      beforeSection:  8.0,   // breathing room above every section title
      afterRule:      4.5,   // gap between rule line and first content item
      betweenJobs:    3.7,   // 14px
      betweenEdu:     2.1,   // 8px
      betweenCert:    2.1,
      betweenProject: 2.6,   // 10px
      betweenAward:   2.1,
      betweenBullets: 0.8,   // 3px
      afterBullets:   2.1,   // 8px before tech stack
      skillsRow:      0.8,   // 3px
      companySumTop:  1.1,   // 4px
      companySumBot:  1.6,   // 6px
      techStackTop:   2.1,   // 8px
    };

    // ── Line heights (mm per line at given pt size) ────────────────────────
    this.LH = {
      base:  4.5,   // 10pt × 1.45
      sm:    4.1,   // 9pt
      xsm:   3.8,   // 8.5pt
    };

    this.currentY = this.marginTop;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Init
  // ═══════════════════════════════════════════════════════════════════════════

  async init() {
    await this._waitForJsPDF();
    const ctx = typeof window !== "undefined" ? window : self;
    this.jsPDF = ctx.jspdf.jsPDF;
  }

  _waitForJsPDF() {
    const ctx = typeof window !== "undefined" ? window : self;
    return new Promise((resolve) => {
      if (ctx.jspdf) { resolve(); return; }
      const t = setInterval(() => { if (ctx.jspdf) { clearInterval(t); resolve(); } }, 100);
    });
  }

  _base64ToVfsString(base64Str) {
    // For jsPDF, we need to convert base64 to a string that jsPDF expects
    // jsPDF's VFS format expects the data as a string of binary characters
    const binaryStr = atob(base64Str);
    
    // Create a string array with proper format for jsPDF
    let result = '';
    for (let i = 0; i < binaryStr.length; i++) {
      result += String.fromCharCode(binaryStr.charCodeAt(i));
    }
    return result;
  }

  _registerFontsOnDocument(doc, onlyFont = null) {
    const ctx = typeof window !== 'undefined' ? window : self;
    
    const fonts = [
      { file: 'Montserrat-Regular.ttf',      name: 'Montserrat',      weight: 'normal', data: ctx.montserratRegularFont },
      { file: 'Montserrat-Bold.ttf',         name: 'Montserrat',      weight: 'bold',   data: ctx.montserratBoldFont },
      { file: 'Lato-Regular.ttf',            name: 'Lato',            weight: 'normal', data: ctx.latoRegularFont },
      { file: 'Lato-Bold.ttf',               name: 'Lato',            weight: 'bold',   data: ctx.latoBoldFont },
      { file: 'Roboto-Regular.ttf',          name: 'Roboto',          weight: 'normal', data: ctx.robotoRegularFont },
      { file: 'Roboto-Bold.ttf',             name: 'Roboto',          weight: 'bold',   data: ctx.robotoBoldFont },
      { file: 'Poppins-Regular.ttf',         name: 'Poppins',         weight: 'normal', data: ctx.poppinsRegularFont },
      { file: 'Poppins-Bold.ttf',            name: 'Poppins',         weight: 'bold',   data: ctx.poppinsBoldFont },
      { file: 'Inter-Regular.ttf',           name: 'Inter',           weight: 'normal', data: ctx.interRegularFont },
      { file: 'Inter-Bold.ttf',              name: 'Inter',           weight: 'bold',   data: ctx.interBoldFont },
      { file: 'SourceSans3-Regular.ttf',     name: 'SourceSans3',     weight: 'normal', data: ctx.sourceSans3RegularFont },
      { file: 'SourceSans3-Bold.ttf',        name: 'SourceSans3',     weight: 'bold',   data: ctx.sourceSans3BoldFont },
      { file: 'DMSans-Regular.ttf',          name: 'DMSans',          weight: 'normal', data: ctx.dmSansRegularFont },
      { file: 'DMSans-Bold.ttf',             name: 'DMSans',          weight: 'bold',   data: ctx.dmSansBoldFont },
      { file: 'IBMPlexSans-Regular.ttf',     name: 'IBMPlexSans',     weight: 'normal', data: ctx.ibmPlexSansRegularFont },
      { file: 'IBMPlexSans-Bold.ttf',        name: 'IBMPlexSans',     weight: 'bold',   data: ctx.ibmPlexSansBoldFont },
      { file: 'Outfit-Regular.ttf',          name: 'Outfit',          weight: 'normal', data: ctx.outfitRegularFont },
      { file: 'Outfit-Bold.ttf',             name: 'Outfit',          weight: 'bold',   data: ctx.outfitBoldFont },
      { file: 'PlusJakartaSans-Regular.ttf', name: 'PlusJakartaSans', weight: 'normal', data: ctx.plusJakartaSansRegularFont },
      { file: 'PlusJakartaSans-Bold.ttf',    name: 'PlusJakartaSans', weight: 'bold',   data: ctx.plusJakartaSansBoldFont },
    ];

    // Check that font data globals actually exist
    const fontsToRegister = onlyFont ? fonts.filter(f => f.name === onlyFont) : fonts;
    const missing = fontsToRegister.filter(f => !f.data);
    if (missing.length === fontsToRegister.length) {
      console.warn('[PDFGen] No font data globals found — resume_fonts.js not loaded yet');
      return false;
    }
    if (missing.length > 0) {
      console.warn('[PDFGen] Missing font data for:', missing.map(f => f.file).join(', '));
    }

    let registered = 0;
    fontsToRegister.forEach(font => {
      if (!font.data) return;
      try {
        const vfsString = this._base64ToVfsString(font.data);
        doc.addFileToVFS(font.file, vfsString);
        doc.addFont(font.file, font.name, font.weight);
        registered++;
      } catch (e) {
        console.warn(`[PDFGen] Failed to register font ${font.file}:`, e.message);
      }
    });

    console.log(`[PDFGen] Registered ${registered}/${fonts.length} fonts`);
    return registered > 0;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Public entry points
  // ═══════════════════════════════════════════════════════════════════════════

  generateResumePDF(input, filename, templateId) {
    // Parse input: accept object directly or JSON string
    let raw = this._parseInput(input);
    const doc  = this._newDoc();
    this.currentY = this.marginTop;

    const inputType    = typeof input;
    const inputPreview = inputType === "string" ? input.slice(0, 300) : JSON.stringify(input).slice(0, 300);
    console.log("[PDFGen] generateResumePDF — inputType:", inputType,
      "| templateId:", templateId,
      "| parsedKeys:", raw ? Object.keys(raw) : "null",
      "| preview:", inputPreview);

    // Unwrap envelope: {resume: {...}} → {header, summary, ...}
    let data = raw;
    if (data && data.resume && typeof data.resume === "object") {
      data = data.resume;
    }

    // Normalize new schema: flatten header sub-object to root so templates work
    if (data && data.header && typeof data.header === "object") {
      data = Object.assign({}, data.header, data);
    }

    if (data && (data.name || data.summary)) {
      try {
        const tid = parseInt(templateId, 10) || 1;
        this._applyTemplateTheme(tid);
        const renderFn = this[`_renderTemplate_${tid}`];
        if (renderFn) {
          renderFn.call(this, doc, data);
        } else {
          this._renderTemplate_1(doc, data); // fallback
        }
      } catch (renderErr) {
        console.error("[PDFGen] CRASH in template render:", renderErr.message, "\n", renderErr.stack);
        this.currentY = this.marginTop;
        const errText = "PDF RENDER ERROR\n\n" + renderErr.message + "\n\n" + (renderErr.stack || "");
        this._renderLegacyText(doc, errText);
      }
    } else {
      const reason = !data ? "JSON parse failed" : "no name/summary key";
      console.warn("[PDFGen] FALLBACK — reason:", reason, "| inputType:", inputType);
      const fallbackText =
        "[DEBUG] PDF generator could not render a structured resume.\n\n" +
        "Reason: " + reason + "\n" +
        "Input type: " + inputType + "\n\n" +
        "First 500 chars of input:\n" + inputPreview.slice(0, 500) + "\n\n" +
        "(Reload the extension and try again — if this persists, check the Xano API response)";
      this._renderLegacyText(doc, fallbackText);
    }

    return { dataUri: doc.output("datauristring"), filename };
  }

  generateCoverLetterPDF(input, filename) {
    const doc  = this._newDoc();
    this.currentY = this.marginTop;

    // input can be:
    //  1. full envelope: {resume: {header, summary, ...}, cover_letter: "<html>..."}
    //  2. legacy: {cover_letter: {...paragraphs}, resume: {...}}
    //  3. just the cover letter HTML string directly
    let raw = this._parseInput(input);

    // If input is a plain HTML string (cover_letter passed directly)
    const inputStr = typeof input === "string" ? input : null;
    const isHtmlString = inputStr && (inputStr.trim().startsWith("<") || /<html|<body|<div/i.test(inputStr.slice(0, 200)));

    console.log("[PDFGen] generateCoverLetterPDF — parsedKeys:", raw ? Object.keys(raw) : "null",
      "| isHtmlString:", isHtmlString);

    if (isHtmlString) {
      // Render HTML cover letter as legacy text (plain text extraction)
      const stripped = inputStr
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, "")
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n\n")
        .replace(/<\/div>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&#39;/g, "'").replace(/&quot;/g, '"')
        .replace(/\r\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
      this._renderLegacyText(doc, stripped);
      return { dataUri: doc.output("datauristring"), filename };
    }

    if (!raw) {
      console.warn("[PDFGen] cover letter FALLBACK — parse failed");
      this._renderLegacyText(doc, "[DEBUG] Cover letter data not found.");
      return { dataUri: doc.output("datauristring"), filename };
    }

    // Unwrap cover_letter field (may be HTML string or legacy object)
    const coverLetter = raw.cover_letter;
    // Get resume header for name/contact line
    let resumeData = raw.resume || raw;
    if (resumeData.header && typeof resumeData.header === "object") {
      resumeData = Object.assign({}, resumeData.header, resumeData);
    }

    if (coverLetter && typeof coverLetter === "string") {
      // HTML cover letter — strip tags, normalise whitespace, render as paragraphs
      try {
        const plainText = coverLetter
          // Remove entire <style>, <head>, <script> blocks including their content
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
          .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, "")
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
          // Block-level tags → newlines
          .replace(/<br\s*\/?>/gi, "\n")
          .replace(/<\/p>/gi, "\n\n")
          .replace(/<\/div>/gi, "\n")
          .replace(/<\/li>/gi, "\n")
          .replace(/<li[^>]*>/gi, "\u2022 ")
          // Strip all remaining tags (body, html, span, etc.)
          .replace(/<[^>]+>/g, "")
          // Decode HTML entities
          .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&#39;/g, "'").replace(/&quot;/g, '"')
          .replace(/\r\n/g, "\n")
          .trim();

        // Split on blank lines to get paragraphs
        const rawParas = plainText.split(/\n{2,}/);
        const paragraphs = [];
        for (const block of rawParas) {
          const trimmed = block.trim();
          if (!trimmed) continue;
          // Preserve internal line breaks for signature blocks (short lines like "Best regards,\nName")
          // A block is a "signature block" if it has \n and all lines are short (< 60 chars)
          const lines = trimmed.split("\n").map(l => l.trim()).filter(Boolean);
          const isSignatureBlock = lines.length > 1 && lines.every(l => l.length < 60);
          if (isSignatureBlock) {
            // Push each line as its own paragraph so they render on separate lines
            lines.forEach(l => paragraphs.push(l));
          } else {
            paragraphs.push(trimmed.replace(/\n/g, " "));
          }
        }

        this._renderCoverLetterTemplate(doc, { paragraphs }, resumeData);
      } catch (renderErr) {
        console.error("[PDFGen] CRASH in _renderCoverLetterTemplate:", renderErr.message);
        this._renderLegacyText(doc, "PDF RENDER ERROR\n\n" + renderErr.message);
      }
    } else if (coverLetter && typeof coverLetter === "object") {
      // Legacy object cover letter
      try {
        this._renderCoverLetterTemplate(doc, coverLetter, resumeData);
      } catch (renderErr) {
        console.error("[PDFGen] CRASH in _renderCoverLetterTemplate:", renderErr.message);
        this._renderLegacyText(doc, "PDF RENDER ERROR\n\n" + renderErr.message);
      }
    } else {
      console.warn("[PDFGen] cover letter FALLBACK — no cover_letter key");
      const clPreview = typeof input === "string" ? input.slice(0, 500) : JSON.stringify(input).slice(0, 500);
      this._renderLegacyText(doc, "[DEBUG] Cover letter data not found.\n\nInput preview:\n" + clPreview);
    }

    return { dataUri: doc.output("datauristring"), filename };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Input / doc helpers
  // ═══════════════════════════════════════════════════════════════════════════

  _newDoc() {
    const doc = new this.jsPDF({ unit: "mm", format: [this.pageWidth, this.pageHeight] });

    // Pick the font first so we only embed the 2 weights we actually need
    const availableFonts = [
      "Lato", "Roboto", "Inter", "SourceSans3", "Poppins", "Montserrat",
      "DMSans", "IBMPlexSans", "Outfit", "PlusJakartaSans",
    ];
    const chosen = availableFonts[Math.floor(Math.random() * availableFonts.length)];

    // Register only the chosen font's 2 weights (regular + bold)
    const fontsLoaded = this._registerFontsOnDocument(doc, chosen);

    if (fontsLoaded) {
      this._activeFont = chosen;

      // Verify both weights of the chosen font actually work
      try {
        doc.setFont(this._activeFont, "normal");
        doc.getTextWidth("test");
        doc.setFont(this._activeFont, "bold");
        doc.getTextWidth("test");
      } catch (e) {
        console.warn("[PDFGen] Custom font test failed, falling back to helvetica:", e.message);
        this._activeFont = "helvetica";
        doc.setFont("helvetica", "normal");
      }
    } else {
      console.warn("[PDFGen] Font registration failed — using helvetica");
      this._activeFont = "helvetica";
      doc.setFont("helvetica", "normal");
    }
    
    return doc;
  }

  _parseInput(input) {
    if (input && typeof input === "object") return input;
    if (typeof input !== "string") return null;
    return _extractJSON(input);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Inline marker parser
  //  Returns [{ text, bold, italic }, ...]
  // ═══════════════════════════════════════════════════════════════════════════

  _parseMarkers(raw, forceItalic = false) {
    if (!raw) return [];
    const str = String(raw);

    // Detect full-string italic wrap: *...* but NOT **...**
    const isItalic = forceItalic ||
      (str.startsWith("*") && !str.startsWith("**") &&
       str.endsWith("*")   && !str.endsWith("**"));
    const inner = isItalic ? str.slice(1, -1) : str;

    // Use regex exec loop to correctly identify bold vs plain segments
    // regardless of whether text starts with a bold marker or not.
    const re = /\*\*(.+?)\*\*/gs;
    const segments = [];
    let lastIndex = 0;
    let match;
    while ((match = re.exec(inner)) !== null) {
      // Plain text before this bold marker
      if (match.index > lastIndex) {
        segments.push({ text: inner.slice(lastIndex, match.index), bold: false, italic: isItalic });
      }
      // Bold text (captured group)
      segments.push({ text: match[1], bold: true, italic: isItalic });
      lastIndex = re.lastIndex;
    }
    // Remaining plain text after last bold marker
    if (lastIndex < inner.length) {
      segments.push({ text: inner.slice(lastIndex), bold: false, italic: isItalic });
    }

    const result = segments.filter(s => s.text.length > 0);
    console.log("[PDFGen] _parseMarkers →", result.map(s =>
      `${s.bold ? "BOLD" : "plain"}${s.italic ? "+italic" : ""}: "${s.text.slice(0, 60)}${s.text.length > 60 ? "…" : ""}"`
    ));
    return result;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Segment-aware text renderer
  //  Renders a single logical line of mixed bold/italic segments, wrapping
  //  across lines.  Returns the final Y after rendering.
  // ═══════════════════════════════════════════════════════════════════════════

  _renderSegments(doc, segments, x, startY, maxWidth, basePtSize, baseColor, lineH) {
    if (!segments || !segments.length) return startY;

    // Build a flat string for splitTextToSize, then re-apply segment styles
    // per-word. jsPDF doesn't natively support mixed styles per line, so we
    // lay out word-by-word, tracking X position and wrapping manually.

    const mm = (pt) => pt * 0.352778;  // pt → mm for font size
    const spaceW = (ptSize) => {
      doc.setFontSize(ptSize);
      return doc.getTextWidth(" ");
    };

    let curX = x;
    let curY = startY;

    segments.forEach(({ text, bold, italic }) => {
      // Same font throughout — "bold" weight for emphasis, "normal" for regular text
      const weight = bold ? "bold" : "normal";
      try {
        doc.setFont(this._activeFont, weight);
      } catch (e) {
        console.warn(`[PDFGen] Font ${this._activeFont}/${weight} not available, using helvetica`);
        doc.setFont("helvetica", weight);
      }
      doc.setFontSize(basePtSize);
      doc.setTextColor(...baseColor);

      // Split segment into words, preserve spaces
      const words = text.split(/(\s+)/);
      words.forEach((word) => {
        if (!word) return;
        if (/^\s+$/.test(word)) {
          try { curX += spaceW(basePtSize); } catch(e) { curX += 2; }
          return;
        }
        let ww;
        try {
          ww = doc.getTextWidth(word);
        } catch (e) {
          // Font metrics unavailable — fall back to helvetica and retry
          try {
            doc.setFont("helvetica", "normal");
            ww = doc.getTextWidth(word);
          } catch (e2) {
            ww = word.length * basePtSize * 0.18; // rough estimate
          }
        }
        if (curX > x && curX + ww > x + maxWidth) {
          // Wrap
          curY += lineH;
          curX = x;
        }
        try { doc.text(word, curX, curY); } catch(e) { /* skip unprintable */ }
        curX += ww;
      });
    });

    return curY;
  }

  // Simpler: render plain (single-style) text with wrapping, return final Y
  _renderText(doc, text, x, y, maxWidth, ptSize, color, style, lineH) {
    // style may be "bold" or "normal" — always use the same _activeFont
    doc.setFont(this._activeFont, style === "bold" ? "bold" : "normal");
    doc.setFontSize(ptSize);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(String(text || ""), maxWidth);
    doc.text(lines, x, y);
    return y + (lines.length - 1) * lineH;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Section header
  // ═══════════════════════════════════════════════════════════════════════════

  _sectionHeader(doc, title) {
    this.currentY += this.SP.beforeSection;
    this._checkPageBreak(doc, 14);

    // Title — 8.5pt ACCENT UPPERCASE bold
    doc.setFont(this._activeFont, "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...this.C.accent);
    doc.text(title.toUpperCase(), this.marginH, this.currentY);

    // Rule — 0.75pt #D1D5DB full width, below title
    this.currentY += 1.5;
    doc.setDrawColor(...this.C.rule);
    doc.setLineWidth(0.265);  // 0.75pt in mm
    doc.line(this.marginH, this.currentY, this.pageWidth - this.marginH, this.currentY);
    this.currentY += this.SP.afterRule;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Template theme applicator — sets colours per template ID
  // ═══════════════════════════════════════════════════════════════════════════

  _applyTemplateTheme(tid) {
    const themes = {
      1:  { accent: [37,  99,  235], dark: [17,  24,  39],  medium: [55,  65,  81],  gray: [107,114,128], rule: [209,213,219], sidebar: null },
      2:  { accent: [5,   150, 105], dark: [6,   78,  59],  medium: [52,  211,153],  gray: [107,114,128], rule: [167,243,208], sidebar: null },
      3:  { accent: [124, 58,  237], dark: [46,  16,  101], medium: [109, 40,  217], gray: [156,163,175], rule: [221,214,254], sidebar: null },
      4:  { accent: [220, 38,  38],  dark: [127, 29,  29],  medium: [185, 28,  28],  gray: [156,163,175], rule: [254,202,202], sidebar: null },
      5:  { accent: [2,   132, 199], dark: [12,  74,  110], medium: [3,   105,161],  gray: [148,163,184], rule: [186,230,253], sidebar: null },
      6:  { accent: [180, 83,  9],   dark: [120, 53,  15],  medium: [217, 119, 6],   gray: [156,163,175], rule: [253,230,138], sidebar: null },
      7:  { accent: [15,  118, 110], dark: [19,  78,  74],  medium: [13,  148,136],  gray: [148,163,184], rule: [153,246,228], sidebar: null },
      8:  { accent: [79,  70,  229], dark: [30,  27,  75],  medium: [67,  56,  202], gray: [148,163,184], rule: [199,210,254], sidebar: [30,27,75] },
      9:  { accent: [236, 72,  153], dark: [131, 24,  67],  medium: [219, 39,  119], gray: [156,163,175], rule: [251,207,232], sidebar: null },
      10: { accent: [100, 116, 139], dark: [15,  23,  42],  medium: [71,  85,  105], gray: [148,163,184], rule: [203,213,225], sidebar: null },
    };
    const t = themes[tid] || themes[1];
    this.C = {
      ...t,
      body: [24, 24, 27],
      bodyMuted: [63, 63, 70],
      gray: [82, 82, 91],
      page: [255,255,255],
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Template 1 — Classic Blue (original)
  // ═══════════════════════════════════════════════════════════════════════════

  _renderTemplate_1(doc, r) {
    return this._renderResumeTemplate(doc, r);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Template 2 — Emerald Modern (green, pill section badges)
  // ═══════════════════════════════════════════════════════════════════════════

  _renderTemplate_2(doc, r) {
    const m = this.marginH; const cw = this.contentWidth;
    // Name — large, colored
    doc.setFont(this._activeFont, "bold");
    doc.setFontSize(26);
    doc.setTextColor(...this.C.accent);
    doc.text((r.name || "").toUpperCase(), m, this.currentY);
    this.currentY += 9;
    if (r.title) {
      doc.setFont(this._activeFont, "normal"); doc.setFontSize(12); doc.setTextColor(...this.C.dark);
      doc.text(r.title, m, this.currentY); this.currentY += 6;
    }
    this._renderContactLine(doc, r, 9);
    // Thick bottom border
    this.currentY += 2;
    doc.setDrawColor(...this.C.accent); doc.setLineWidth(1.2);
    doc.line(m, this.currentY, this.pageWidth - m, this.currentY);
    this.currentY += 6;
    this._renderCommonSections(doc, r, (d, title) => {
      this.currentY += this.SP.beforeSection;
      this._checkPageBreak(d, 14);
      // Pill badge background
      doc.setFillColor(...this.C.accent);
      doc.roundedRect(m, this.currentY - 3.5, doc.getTextWidth(title.toUpperCase()) + 5, 5.5, 1.5, 1.5, "F");
      doc.setFont(this._activeFont, "bold"); doc.setFontSize(8); doc.setTextColor(255,255,255);
      doc.text(title.toUpperCase(), m + 2.5, this.currentY);
      this.currentY += this.SP.afterRule + 1;
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Template 3 — Royal Purple (centered name, double rule)
  // ═══════════════════════════════════════════════════════════════════════════

  _renderTemplate_3(doc, r) {
    const m = this.marginH; const cw = this.contentWidth;
    // Centered name
    doc.setFont(this._activeFont, "bold"); doc.setFontSize(24); doc.setTextColor(...this.C.dark);
    const nameW = doc.getTextWidth((r.name || "").toUpperCase());
    doc.text((r.name || "").toUpperCase(), (this.pageWidth - nameW) / 2, this.currentY);
    this.currentY += 8;
    if (r.title) {
      doc.setFont(this._activeFont, "normal"); doc.setFontSize(11); doc.setTextColor(...this.C.accent);
      const tW = doc.getTextWidth(r.title);
      doc.text(r.title, (this.pageWidth - tW) / 2, this.currentY); this.currentY += 5.5;
    }
    this._renderContactLine(doc, r, 9, true); // centered
    // Double rule
    this.currentY += 2;
    doc.setDrawColor(...this.C.accent); doc.setLineWidth(0.8);
    doc.line(m, this.currentY, this.pageWidth - m, this.currentY);
    this.currentY += 1.5;
    doc.setLineWidth(0.25);
    doc.line(m, this.currentY, this.pageWidth - m, this.currentY);
    this.currentY += 6;
    this._renderCommonSections(doc, r, (d, title) => {
      this.currentY += this.SP.beforeSection;
      this._checkPageBreak(d, 14);
      // Centered underlined header
      doc.setFont(this._activeFont, "bold"); doc.setFontSize(9); doc.setTextColor(...this.C.accent);
      const tw = doc.getTextWidth(title.toUpperCase());
      doc.text(title.toUpperCase(), (this.pageWidth - tw) / 2, this.currentY);
      this.currentY += 1.8;
      doc.setDrawColor(...this.C.rule); doc.setLineWidth(0.265);
      doc.line(m, this.currentY, this.pageWidth - m, this.currentY);
      this.currentY += this.SP.afterRule;
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Template 4 — Bold Red (left bar accent on name)
  // ═══════════════════════════════════════════════════════════════════════════

  _renderTemplate_4(doc, r) {
    const m = this.marginH; const cw = this.contentWidth;
    // Left colored bar
    doc.setFillColor(...this.C.accent);
    doc.rect(0, 0, 4, this.pageHeight, "F");
    // Name
    doc.setFont(this._activeFont, "bold"); doc.setFontSize(24); doc.setTextColor(...this.C.dark);
    doc.text((r.name || "").toUpperCase(), m, this.currentY); this.currentY += 8.5;
    if (r.title) {
      doc.setFont(this._activeFont, "bold"); doc.setFontSize(11); doc.setTextColor(...this.C.accent);
      doc.text(r.title, m, this.currentY); this.currentY += 6;
    }
    this._renderContactLine(doc, r, 9);
    this.currentY += 2;
    doc.setDrawColor(...this.C.rule); doc.setLineWidth(0.4);
    doc.line(m, this.currentY, this.pageWidth - m, this.currentY);
    this.currentY += 6;
    this._renderCommonSections(doc, r, (d, title) => {
      this.currentY += this.SP.beforeSection;
      this._checkPageBreak(d, 14);
      // Bold left-border section title
      doc.setFillColor(...this.C.accent);
      doc.rect(m, this.currentY - 3.5, 2, 5.5, "F");
      doc.setFont(this._activeFont, "bold"); doc.setFontSize(9.5); doc.setTextColor(...this.C.dark);
      doc.text(title.toUpperCase(), m + 4, this.currentY);
      this.currentY += 2;
      doc.setDrawColor(...this.C.rule); doc.setLineWidth(0.265);
      doc.line(m, this.currentY, this.pageWidth - m, this.currentY);
      this.currentY += this.SP.afterRule;
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Template 5 — Sky Blue (name on coloured header band)
  // ═══════════════════════════════════════════════════════════════════════════

  _renderTemplate_5(doc, r) {
    const m = this.marginH; const cw = this.contentWidth;
    const bandH = 36;
    // Header band
    doc.setFillColor(...this.C.dark);
    doc.rect(0, 0, this.pageWidth, bandH, "F");
    // Name in white
    doc.setFont(this._activeFont, "bold"); doc.setFontSize(22); doc.setTextColor(255,255,255);
    doc.text((r.name || "").toUpperCase(), m, 14);
    if (r.title) {
      doc.setFont(this._activeFont, "normal"); doc.setFontSize(10.5); doc.setTextColor(255,255,255);
      doc.text(r.title, m, 22);
    }
    // Contact in band — use shared renderer with white text/links
    this.currentY = 30;
    this._renderContactLine(doc, r, 8.5, false, { textColor: [255,255,255], linkColor: [255,255,255] });
    this.currentY = bandH + 10;
    this._renderCommonSections(doc, r, (d, title) => {
      this.currentY += this.SP.beforeSection;
      this._checkPageBreak(d, 14);
      doc.setFont(this._activeFont, "bold"); doc.setFontSize(9); doc.setTextColor(...this.C.accent);
      doc.text(title.toUpperCase(), m, this.currentY);
      this.currentY += 1.8;
      doc.setDrawColor(...this.C.accent); doc.setLineWidth(0.5);
      doc.line(m, this.currentY, this.pageWidth - m, this.currentY);
      this.currentY += this.SP.afterRule;
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Template 6 — Amber / Warm (soft amber tones, dash-rule)
  // ═══════════════════════════════════════════════════════════════════════════

  _renderTemplate_6(doc, r) {
    const m = this.marginH; const cw = this.contentWidth;
    doc.setFont(this._activeFont, "bold"); doc.setFontSize(24); doc.setTextColor(...this.C.dark);
    doc.text((r.name || "").toUpperCase(), m, this.currentY); this.currentY += 8;
    if (r.title) {
      doc.setFont(this._activeFont, "normal"); doc.setFontSize(11); doc.setTextColor(...this.C.accent);
      doc.text(r.title, m, this.currentY); this.currentY += 5.5;
    }
    this._renderContactLine(doc, r, 9);
    // Warm dashed rule
    this.currentY += 2;
    doc.setDrawColor(...this.C.accent); doc.setLineWidth(0.6);
    doc.setLineDashPattern([2, 1.5], 0);
    doc.line(m, this.currentY, this.pageWidth - m, this.currentY);
    doc.setLineDashPattern([], 0);
    this.currentY += 6;
    this._renderCommonSections(doc, r, (d, title) => {
      this.currentY += this.SP.beforeSection;
      this._checkPageBreak(d, 14);
      // Title + warm underline
      doc.setFont(this._activeFont, "bold"); doc.setFontSize(9); doc.setTextColor(...this.C.accent);
      doc.text(title.toUpperCase(), m, this.currentY);
      this.currentY += 2;
      doc.setDrawColor(...this.C.accent); doc.setLineWidth(0.8);
      doc.line(m, this.currentY, m + 18, this.currentY); // short accent underline
      doc.setDrawColor(...this.C.rule); doc.setLineWidth(0.265);
      doc.line(m + 19, this.currentY, this.pageWidth - m, this.currentY);
      this.currentY += this.SP.afterRule;
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Template 7 — Teal Minimal (all lowercase name, thin rules)
  // ═══════════════════════════════════════════════════════════════════════════

  _renderTemplate_7(doc, r) {
    const m = this.marginH; const cw = this.contentWidth;
    // Lowercase name — modern minimal look
    doc.setFont(this._activeFont, "bold"); doc.setFontSize(28); doc.setTextColor(...this.C.accent);
    doc.text((r.name || "").toLowerCase(), m, this.currentY); this.currentY += 9;
    if (r.title) {
      doc.setFont(this._activeFont, "normal"); doc.setFontSize(10); doc.setTextColor(...this.C.dark);
      doc.text(r.title, m, this.currentY); this.currentY += 5.5;
    }
    this._renderContactLine(doc, r, 8.5);
    this.currentY += 3;
    doc.setDrawColor(...this.C.rule); doc.setLineWidth(0.2);
    doc.line(m, this.currentY, this.pageWidth - m, this.currentY);
    this.currentY += 6;
    this._renderCommonSections(doc, r, (d, title) => {
      this.currentY += this.SP.beforeSection;
      this._checkPageBreak(d, 14);
      // Minimal: just a colored dot + title
      doc.setFillColor(...this.C.accent);
      doc.circle(m + 1, this.currentY - 1, 1.2, "F");
      doc.setFont(this._activeFont, "bold"); doc.setFontSize(9); doc.setTextColor(...this.C.dark);
      doc.text(title.toUpperCase(), m + 4, this.currentY);
      this.currentY += 2;
      doc.setDrawColor(...this.C.rule); doc.setLineWidth(0.2);
      doc.line(m, this.currentY, this.pageWidth - m, this.currentY);
      this.currentY += this.SP.afterRule;
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Template 8 — Indigo Sidebar (dark left sidebar with name + contact)
  // ═══════════════════════════════════════════════════════════════════════════

  _renderTemplate_8(doc, r) {
    const sideW = 58;
    const contentX = sideW + 8;
    const cw = this.pageWidth - contentX - 12;
    const m = contentX;

    // Draw sidebar background
    doc.setFillColor(...this.C.dark);
    doc.rect(0, 0, sideW, this.pageHeight, "F");

    // Sidebar: name (white)
    doc.setFont(this._activeFont, "bold"); doc.setFontSize(13); doc.setTextColor(255,255,255);
    const nameLines = doc.splitTextToSize((r.name || "").toUpperCase(), sideW - 12);
    let sy = 14;
    nameLines.forEach(ln => { doc.text(ln, 7, sy); sy += 5.5; });
    sy += 2;
    if (r.title) {
      doc.setFont(this._activeFont, "normal"); doc.setFontSize(8.5); doc.setTextColor(255,255,255);
      const tLines = doc.splitTextToSize(r.title, sideW - 12);
      tLines.forEach(ln => { doc.text(ln, 7, sy); sy += 4.5; });
      sy += 3;
    }
    // Sidebar divider
    doc.setDrawColor(...this.C.accent); doc.setLineWidth(0.5);
    doc.line(7, sy, sideW - 7, sy); sy += 5;
    // Sidebar contact items (ensure visible on dark sidebar)
    doc.setFont(this._activeFont, "normal"); doc.setFontSize(7.5); doc.setTextColor(255,255,255);
    const sideItems = [];
    if (r.email) sideItems.push(r.email);
    if (r.phone) sideItems.push(r.phone);
    if (r.location) sideItems.push(r.location);
    if (r.linkedin) sideItems.push(typeof r.linkedin === "object" ? r.linkedin.display : r.linkedin);
    sideItems.forEach(item => {
      const ls = doc.splitTextToSize(item, sideW - 12);
      ls.forEach(l => { doc.text(l, 7, sy); sy += 4; });
      sy += 1;
    });

    // Main content area
    this.marginH = contentX;
    this.contentWidth = cw;
    this.currentY = 14;

    if (r.summary) {
      this._sectionHeader(doc, "PROFILE");
      const segs = this._parseMarkers(r.summary);
      const endY = this._renderSegments(doc, segs, m, this.currentY, cw, 10, this.C.body, this.LH.base);
      this.currentY = endY + this.LH.base + 1;
    }
    this._renderCommonSections(doc, r, (d, title) => {
      this.currentY += this.SP.beforeSection;
      this._checkPageBreak(d, 14);
      doc.setFont(this._activeFont, "bold"); doc.setFontSize(8.5); doc.setTextColor(...this.C.accent);
      doc.text(title.toUpperCase(), m, this.currentY);
      this.currentY += 1.8;
      doc.setDrawColor(...this.C.rule); doc.setLineWidth(0.265);
      doc.line(m, this.currentY, this.pageWidth - 12, this.currentY);
      this.currentY += this.SP.afterRule;
    }, true /* skip summary — already rendered */);

    // Restore margins for subsequent pages
    this.marginH = 18;
    this.contentWidth = this.pageWidth - 18 * 2;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Template 9 — Rose / Bold Pink (name in white on accent header)
  // ═══════════════════════════════════════════════════════════════════════════

  _renderTemplate_9(doc, r) {
    const m = this.marginH; const cw = this.contentWidth;
    // Full-width accent header
    const hh = r.title ? 30 : 24;
    doc.setFillColor(...this.C.accent);
    doc.rect(0, 0, this.pageWidth, hh, "F");
    doc.setFont(this._activeFont, "bold"); doc.setFontSize(22); doc.setTextColor(255,255,255);
    doc.text((r.name || "").toUpperCase(), m, 13);
    if (r.title) {
      doc.setFont(this._activeFont, "normal"); doc.setFontSize(10); doc.setTextColor(255,255,255);
      doc.text(r.title, m, 21);
    }
    this.currentY = hh + 6;
    this._renderContactLine(doc, r, 8.5);
    this.currentY += 2;
    doc.setDrawColor(...this.C.rule); doc.setLineWidth(0.25);
    doc.line(m, this.currentY, this.pageWidth - m, this.currentY);
    this.currentY += 5;
    this._renderCommonSections(doc, r, (d, title) => {
      this.currentY += this.SP.beforeSection;
      this._checkPageBreak(d, 14);
      doc.setFont(this._activeFont, "bold"); doc.setFontSize(9); doc.setTextColor(...this.C.accent);
      doc.text(title.toUpperCase(), m, this.currentY);
      this.currentY += 2;
      doc.setDrawColor(...this.C.accent); doc.setLineWidth(0.4);
      doc.line(m, this.currentY, this.pageWidth - m, this.currentY);
      this.currentY += this.SP.afterRule;
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Template 10 — Slate Professional (clean, two-line name block)
  // ═══════════════════════════════════════════════════════════════════════════

  _renderTemplate_10(doc, r) {
    const m = this.marginH; const cw = this.contentWidth;
    // Name — slate dark
    doc.setFont(this._activeFont, "bold"); doc.setFontSize(26); doc.setTextColor(...this.C.dark);
    doc.text((r.name || "").toUpperCase(), m, this.currentY); this.currentY += 8.5;
    // Title + accent dot
    if (r.title) {
      doc.setFillColor(...this.C.accent);
      doc.circle(m + 1, this.currentY - 1.2, 1.0, "F");
      doc.setFont(this._activeFont, "normal"); doc.setFontSize(11); doc.setTextColor(...this.C.medium);
      doc.text(r.title, m + 4, this.currentY); this.currentY += 6;
    }
    this._renderContactLine(doc, r, 9);
    this.currentY += 2;
    // Triple dot separator
    doc.setFillColor(...this.C.accent);
    doc.circle(m, this.currentY, 1, "F");
    doc.circle(m + 4, this.currentY, 1, "F");
    doc.circle(m + 8, this.currentY, 1, "F");
    doc.setDrawColor(...this.C.rule); doc.setLineWidth(0.265);
    doc.line(m + 12, this.currentY, this.pageWidth - m, this.currentY);
    this.currentY += 6;
    this._renderCommonSections(doc, r, (d, title) => {
      this.currentY += this.SP.beforeSection;
      this._checkPageBreak(d, 14);
      doc.setFont(this._activeFont, "bold"); doc.setFontSize(9); doc.setTextColor(...this.C.accent);
      doc.text(title.toUpperCase(), m, this.currentY);
      this.currentY += 1.8;
      doc.setDrawColor(...this.C.rule); doc.setLineWidth(0.265);
      doc.line(m, this.currentY, this.pageWidth - m, this.currentY);
      this.currentY += this.SP.afterRule;
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Shared section renderer used by templates 2-10
  //  sectionHeaderFn(doc, title) — called instead of _sectionHeader
  //  skipSummary — if true, skip summary (used by template 8 sidebar)
  // ═══════════════════════════════════════════════════════════════════════════

  _renderCommonSections(doc, r, sectionHeaderFn, skipSummary) {
    const m  = this.marginH;
    const cw = this.contentWidth;

    if (!skipSummary && r.summary) {
      sectionHeaderFn(doc, "SUMMARY");
      const segs = this._parseMarkers(r.summary);
      const endY = this._renderSegments(doc, segs, m, this.currentY, cw, 10, this.C.body, this.LH.base);
      this.currentY = endY + this.LH.base + 1;
    }

    if (r.skills && r.skills.length) {
      sectionHeaderFn(doc, "SKILLS");
      r.skills.forEach(() => {});
      r.skills.forEach((row) => {
        this._checkPageBreak(doc, 10);
        this._renderSkillsRow(doc, row.category, row.values);
        this.currentY += this.LH.base + this.SP.skillsRow;
      });
      this.currentY += 1;
    }

    const jobs = r.career_breakdowns || r.experience || [];
    if (jobs.length) {
      sectionHeaderFn(doc, "EXPERIENCE");
      jobs.forEach((job, idx) => {
        this._renderCareerEntry(doc, job);
        if (idx < jobs.length - 1) this.currentY += this.SP.betweenJobs;
      });
    }

    if (r.education && r.education.length) {
      sectionHeaderFn(doc, "EDUCATION");
      r.education.forEach((edu, idx) => {
        this._renderEducationEntry(doc, edu);
        if (idx < r.education.length - 1) this.currentY += this.SP.betweenEdu;
      });
    }

    if (r.certifications && r.certifications.length) {
      sectionHeaderFn(doc, "CERTIFICATIONS");
      r.certifications.forEach((cert, idx) => {
        this._renderCertEntry(doc, cert);
        if (idx < r.certifications.length - 1) this.currentY += this.SP.betweenCert;
      });
    }

    if (r.key_projects && r.key_projects.length) {
      sectionHeaderFn(doc, "KEY PROJECTS");
      r.key_projects.forEach((proj, idx) => {
        this._renderProjectEntry(doc, proj);
        if (idx < r.key_projects.length - 1) this.currentY += this.SP.betweenProject;
      });
    }

    if (r.awards_recognition && r.awards_recognition.length) {
      sectionHeaderFn(doc, "AWARDS & RECOGNITION");
      r.awards_recognition.forEach((award, idx) => {
        this._renderAwardEntry(doc, award);
        if (idx < r.awards_recognition.length - 1) this.currentY += this.SP.betweenAward;
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Shared contact line renderer
  // ═══════════════════════════════════════════════════════════════════════════

  _renderContactLine(doc, r, ptSize, centered, opts) {
    const m = this.marginH;
    const contactParts = [];
    if (r.location) contactParts.push({ text: r.location, url: null });
    if (r.email)    contactParts.push({ text: r.email,    url: `mailto:${r.email}` });
    if (r.phone)    contactParts.push({ text: r.phone,    url: null });
    if (r.linkedin) {
      const li = typeof r.linkedin === "object" ? r.linkedin : { display: r.linkedin, url: r.linkedin };
      if (li.display) contactParts.push({ text: li.display, url: li.url });
    }
    if (!contactParts.length) return;

    doc.setFont(this._activeFont, "normal");
    doc.setFontSize(ptSize || 9);
    const textColor = opts && opts.textColor ? opts.textColor : this.C.gray;
    const linkColor = opts && opts.linkColor ? opts.linkColor : this.C.accent;
    doc.setTextColor(...textColor);
    const sep = " \u00B7 ";
    const totalW = contactParts.reduce((acc, p, i) => acc + doc.getTextWidth(p.text) + (i > 0 ? doc.getTextWidth(sep) : 0), 0);
    let cx = centered ? (this.pageWidth - totalW) / 2 : m;
    contactParts.forEach((part, i) => {
      if (i > 0) { doc.text(sep, cx, this.currentY); cx += doc.getTextWidth(sep); }
      if (part.url) {
        doc.setTextColor(...linkColor);
        doc.textWithLink(part.text, cx, this.currentY, { url: part.url });
        doc.setTextColor(...textColor);
      } else {
        doc.text(part.text, cx, this.currentY);
      }
      cx += doc.getTextWidth(part.text);
    });
    this.currentY += 5;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Resume template (Template 1 — original, kept for backward compat)
  // ═══════════════════════════════════════════════════════════════════════════

  _renderResumeTemplate(doc, r) {
    const m  = this.marginH;
    const cw = this.contentWidth;

    // ── Name ────────────────────────────────────────────────────────────────
    doc.setFont(this._activeFont, "bold");
    doc.setFontSize(22);
    doc.setTextColor(...this.C.body);
    doc.text((r.name || "").toUpperCase(), m, this.currentY);
    this.currentY += 7.5;

    // ── Professional title ──────────────────────────────────────────────────
    if (r.title) {
      doc.setFont(this._activeFont, "normal");
      doc.setFontSize(11);
      doc.setTextColor(...this.C.accent);
      doc.text(r.title, m, this.currentY);
      this.currentY += 5.5;
    }

    // ── Contact line ─────────────────────────────────────────────────────────
    // Build parts; handle linkedin as object {display, url}
    const contactParts = [];
    if (r.location) contactParts.push({ text: r.location, url: null });
    if (r.email)    contactParts.push({ text: r.email,    url: `mailto:${r.email}` });
    if (r.phone)    contactParts.push({ text: r.phone,    url: null });
    if (r.linkedin) {
      const li = typeof r.linkedin === "object" ? r.linkedin : { display: r.linkedin, url: r.linkedin };
      contactParts.push({ text: li.display, url: li.url });
    }

    if (contactParts.length) {
      doc.setFont(this._activeFont, "normal");
      doc.setFontSize(9);
      doc.setTextColor(...this.C.gray);
      const sep = " \u00B7 ";  // middle dot
      let cx = m;
      contactParts.forEach((part, i) => {
        if (i > 0) {
          doc.text(sep, cx, this.currentY);
          cx += doc.getTextWidth(sep);
        }
        if (part.url) {
          doc.setTextColor(...this.C.accent);
          doc.textWithLink(part.text, cx, this.currentY, { url: part.url });
          doc.setTextColor(...this.C.gray);
        } else {
          doc.text(part.text, cx, this.currentY);
        }
        cx += doc.getTextWidth(part.text);
      });
      this.currentY += 5;
    }

    // ── Accent rule under header ─────────────────────────────────────────────
    this.currentY += 1.5;
    doc.setDrawColor(...this.C.accent);
    doc.setLineWidth(0.53);  // 1.5pt
    doc.line(m, this.currentY, this.pageWidth - m, this.currentY);
    this.currentY += 3;

    // ── Summary ─────────────────────────────────────────────────
    if (r.summary) {
      this._sectionHeader(doc, "SUMMARY");
      const segs = this._parseMarkers(r.summary);
      const endY = this._renderSegments(doc, segs, m, this.currentY, cw, 10, this.C.dark, this.LH.base);
      this.currentY = endY + this.LH.base + 1;
    }

    // ── Skills ───────────────────────────────────────────────────────────────
    if (r.skills && r.skills.length) {
      this._sectionHeader(doc, "SKILLS");
      r.skills.forEach((row) => {
        this._checkPageBreak(doc, 10);
        const labelW = this._renderSkillsRow(doc, row.category, row.values);
        this.currentY += this.LH.base + this.SP.skillsRow;
      });
      this.currentY += 1;
    }

    // ── Experience ─────────────────────────────────────────────────────
    const jobs = r.career_breakdowns || r.experience || [];
    if (jobs.length) {
      this._sectionHeader(doc, "EXPERIENCE");
      jobs.forEach((job, idx) => {
        this._renderCareerEntry(doc, job);
        if (idx < jobs.length - 1) this.currentY += this.SP.betweenJobs;
      });
    }

    // ── Education ────────────────────────────────────────────────────────────
    if (r.education && r.education.length) {
      this._sectionHeader(doc, "Education");
      r.education.forEach((edu, idx) => {
        this._renderEducationEntry(doc, edu);
        if (idx < r.education.length - 1) this.currentY += this.SP.betweenEdu;
      });
    }

    // ── Certifications ───────────────────────────────────────────────────────
    if (r.certifications && r.certifications.length) {
      this._sectionHeader(doc, "CERTIFICATIONS");
      r.certifications.forEach((cert, idx) => {
        this._renderCertEntry(doc, cert);
        if (idx < r.certifications.length - 1) this.currentY += this.SP.betweenCert;
      });
    }

    // ── Key Projects ─────────────────────────────────────────────────────────
    if (r.key_projects && r.key_projects.length) {
      this._sectionHeader(doc, "KEY PROJECTS");
      r.key_projects.forEach((proj, idx) => {
        this._renderProjectEntry(doc, proj);
        if (idx < r.key_projects.length - 1) this.currentY += this.SP.betweenProject;
      });
    }

    // ── Awards & Recognition ─────────────────────────────────────────────────
    if (r.awards_recognition && r.awards_recognition.length) {
      this._sectionHeader(doc, "AWARDS & RECOGNITION");
      r.awards_recognition.forEach((award, idx) => {
        this._renderAwardEntry(doc, award);
        if (idx < r.awards_recognition.length - 1) this.currentY += this.SP.betweenAward;
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Skills row
  // ═══════════════════════════════════════════════════════════════════════════

  _renderSkillsRow(doc, category, values) {
    const m  = this.marginH;
    const cw = this.contentWidth;
    const y  = this.currentY;

    // Category label — 9.5pt bold
    doc.setFont(this._activeFont, "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...this.C.body);
    const labelText = (category || "") + ":";
    doc.text(labelText, m, y);
    const labelW = doc.getTextWidth(labelText) + 2; // 2mm gap

    // Values — 9.5pt normal
    doc.setFont(this._activeFont, "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...this.C.body);
    const valStr = Array.isArray(values) ? values.join(", ") : (values || "");

    // Split the full value string into words and lay out manually:
    // first line starts after the label, continuation lines start at left margin
    const words = valStr.split(" ");
    let lineX = m + labelW;
    let lineMaxW = cw - labelW;
    let currentLine = "";
    let lineY = y;
    let totalExtraLines = 0;

    words.forEach((word) => {
      const test = currentLine ? currentLine + " " + word : word;
      const testW = doc.getTextWidth(test);
      if (testW > lineMaxW && currentLine) {
        // Flush current line
        doc.text(currentLine, lineX, lineY);
        // Move to next line at left margin
        lineY += this.LH.sm;
        lineX = m;
        lineMaxW = cw;
        currentLine = word;
        totalExtraLines++;
      } else {
        currentLine = test;
      }
    });
    // Flush last line
    if (currentLine) doc.text(currentLine, lineX, lineY);

    // Advance Y by continuation lines only (first line shares Y with label)
    this.currentY += totalExtraLines * this.LH.sm;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Career entry
  // ═══════════════════════════════════════════════════════════════════════════

  _renderCareerEntry(doc, job) {
    const m  = this.marginH;
    const cw = this.contentWidth;

    // Page-break guard: keep title + company + summary together
    this._checkPageBreak(doc, 40);

    // Row 1: Job title (left) + date range (right)
    const dateStr = job.date_range || [job.start, job.end || "Present"].filter(Boolean).join(" – ");
    doc.setFont(this._activeFont, "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...this.C.dark);
    doc.text(job.title || job.job_title || "", m, this.currentY);

    doc.setFont(this._activeFont, "normal");
    doc.setFontSize(9);
    doc.setTextColor(...this.C.gray);
    const dw = doc.getTextWidth(dateStr);
    doc.text(dateStr, this.pageWidth - m - dw, this.currentY);
    this.currentY += this.LH.base + 0.5;

    // Row 2: Company (left) + promotion note or location (right)
    const company  = job.company || "";
    // Priority: show promotion_note if it exists, otherwise show location
    const displayText = job.promotion_note || job.location || "";
    doc.setFont(this._activeFont, "normal");
    doc.setFontSize(10);
    doc.setTextColor(...this.C.bodyMuted);
    doc.text(company, m, this.currentY);

    if (displayText) {
      doc.setFont(this._activeFont, "normal");
      doc.setFontSize(8);
      doc.setTextColor(...this.C.gray);
      const lw = doc.getTextWidth(displayText);
      doc.text(displayText, this.pageWidth - m - lw, this.currentY);
    }
    this.currentY += this.LH.base + 0.5;

    // Company summary — italic gray, parsed for inner **bold**
    const summary = job.company_summary || job.summary || "";
    if (summary) {
      this.currentY += this.SP.companySumTop;
      const segs = this._parseMarkers(summary);
      const endY = this._renderSegments(doc, segs, m, this.currentY, cw, 9.5, this.C.bodyMuted, this.LH.sm);
      this.currentY = endY + this.LH.sm + this.SP.companySumBot;
    }

    // Bullets
    const bullets = job.highlights || job.bullets || [];
    bullets.forEach((bullet, bi) => {
      const bx = m + 3.5;
      const bw = cw - 3.5;

      // Pre-calculate how many lines this bullet needs, then page-break if necessary
      doc.setFont(this._activeFont, "normal");
      doc.setFontSize(10);
      const bulletLines = doc.splitTextToSize(String(bullet || "").replace(/\*\*/g, ""), bw);
      const bulletHeight = bulletLines.length * this.LH.base + this.SP.betweenBullets + 2;
      this._checkPageBreak(doc, bulletHeight);

      // Bullet char
      doc.setTextColor(...this.C.body);
      doc.text("\u2022", m, this.currentY);  // • U+2022

      // Parse and render bullet text
      const segs = this._parseMarkers(bullet);
      const endY = this._renderSegments(doc, segs, bx, this.currentY, bw, 10, this.C.body, this.LH.base);
      this.currentY = endY + this.LH.base + this.SP.betweenBullets;

      if (bi === bullets.length - 1) {
        this.currentY += this.SP.afterBullets - this.SP.betweenBullets;
      }
    });

    // Tech Stack
    const tech = job.tech_stack || job.tech || [];
    if (tech.length) {
      this.currentY += this.SP.techStackTop;
      this._checkPageBreak(doc, 8);
      doc.setFont(this._activeFont, "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(...this.C.accent);
      const label = "Tech Stack:  ";
      doc.text(label, m, this.currentY);
      const lw = doc.getTextWidth(label);

      doc.setFont(this._activeFont, "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(...this.C.gray);
      const techStr = Array.isArray(tech) ? tech.join(", ") : tech;
      const techLines = doc.splitTextToSize(techStr, cw - lw);
      doc.text(techLines, m + lw, this.currentY);
      this.currentY += (techLines.length - 1) * this.LH.sm + this.LH.sm;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Education entry
  // ═══════════════════════════════════════════════════════════════════════════

  _renderEducationEntry(doc, edu) {
    const m = this.marginH;
    this._checkPageBreak(doc, 14);

    const year = edu.year || edu.end || "";
    doc.setFont(this._activeFont, "bold");
    doc.setFontSize(10);
    doc.setTextColor(...this.C.body);
    doc.text(edu.degree || edu.degree_name || "", m, this.currentY);

    doc.setFont(this._activeFont, "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...this.C.gray);
    const yw = doc.getTextWidth(year);
    doc.text(year, this.pageWidth - m - yw, this.currentY);
    this.currentY += this.LH.base + 0.5;

    const institution = edu.school || edu.institution || "";
    if (institution) {
      doc.setFont(this._activeFont, "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(...this.C.bodyMuted);
      doc.text(institution, m, this.currentY);
      this.currentY += this.LH.sm + 0.5;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Certification entry
  // ═══════════════════════════════════════════════════════════════════════════

  _renderCertEntry(doc, cert) {
    const m  = this.marginH;
    const cw = this.contentWidth;
    this._checkPageBreak(doc, 14);

    // Name · Issuer on one line
    const name   = cert.name || cert.cert_name || "";
    const issuer = cert.issuer || "";
    doc.setFont(this._activeFont, "bold");
    doc.setFontSize(10);
    doc.setTextColor(...this.C.body);
    doc.text(name, m, this.currentY);

    if (issuer) {
      const nw  = doc.getTextWidth(name);
      const sep = "  \u00B7  ";
      doc.setFont(this._activeFont, "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(...this.C.bodyMuted);
      doc.text(sep + issuer, m + nw, this.currentY);
    }
    this.currentY += this.LH.base + 0.5;

    // Value proposition — italic gray
    const vp = cert.value_proposition || cert.description || "";
    if (vp) {
      doc.setFont(this._activeFont, "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(...this.C.bodyMuted);
      const lines = doc.splitTextToSize(vp, cw);
      doc.text(lines, m, this.currentY);
      this.currentY += (lines.length - 1) * this.LH.sm + this.LH.sm + 0.5;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Key Project entry
  // ═══════════════════════════════════════════════════════════════════════════

  _renderProjectEntry(doc, proj) {
    const m  = this.marginH;
    const cw = this.contentWidth;
    this._checkPageBreak(doc, 18);

    // Name (left) + Company | Year (right)
    const name    = proj.name || proj.project_name || "";
    const context = [proj.company, proj.year].filter(Boolean).join("  |  ");
    doc.setFont(this._activeFont, "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...this.C.dark);
    doc.text(name, m, this.currentY);

    if (context) {
      doc.setFont(this._activeFont, "normal");
      doc.setFontSize(9);
      doc.setTextColor(...this.C.gray);
      const cxw = doc.getTextWidth(context);
      doc.text(context, this.pageWidth - m - cxw, this.currentY);
    }
    this.currentY += this.LH.base + 0.5;

    // Description with **bold**
    const desc = proj.description || "";
    if (desc) {
      const segs = this._parseMarkers(desc);
      const endY = this._renderSegments(doc, segs, m, this.currentY, cw, 10, this.C.body, this.LH.base);
      this.currentY = endY + this.LH.base + 0.8;
    }

    // Tech line
    const tech = proj.tech || proj.tech_stack || [];
    if (tech.length) {
      this.currentY += this.SP.techStackTop - 1;
      doc.setFont(this._activeFont, "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(...this.C.accent);
      const label = "Tech:  ";
      doc.text(label, m, this.currentY);
      const lw = doc.getTextWidth(label);

      doc.setFont(this._activeFont, "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(...this.C.bodyMuted);
      const techStr = Array.isArray(tech) ? tech.join(", ") : tech;
      const tlines = doc.splitTextToSize(techStr, cw - lw);
      doc.text(tlines, m + lw, this.currentY);
      this.currentY += (tlines.length - 1) * this.LH.sm + this.LH.sm;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Award entry
  // ═══════════════════════════════════════════════════════════════════════════

  _renderAwardEntry(doc, award) {
    const m  = this.marginH;
    const cw = this.contentWidth;
    this._checkPageBreak(doc, 14);

    const name    = award.name || award.award_name || "";
    const context = [award.company, award.year].filter(Boolean).join("  |  ");
    doc.setFont(this._activeFont, "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...this.C.body);
    doc.text(name, m, this.currentY);

    if (context) {
      doc.setFont(this._activeFont, "normal");
      doc.setFontSize(9);
      doc.setTextColor(...this.C.gray);
      const cxw = doc.getTextWidth(context);
      doc.text(context, this.pageWidth - m - cxw, this.currentY);
    }
    this.currentY += this.LH.base + 0.5;

    const desc = award.description || "";
    if (desc) {
      const segs = this._parseMarkers(desc);
      const endY = this._renderSegments(doc, segs, m, this.currentY, cw, 10, this.C.body, this.LH.base);
      this.currentY = endY + this.LH.base + 0.5;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Cover letter template
  // ═══════════════════════════════════════════════════════════════════════════

  _renderCoverLetterTemplate(doc, cl, resume) {
    const m  = this.marginH;
    const cw = this.contentWidth;
    this.currentY = this.marginTop;

    // ── Name ─────────────────────────────────────────────────────────────────
    doc.setFont(this._activeFont, "bold");
    doc.setFontSize(22);
    doc.setTextColor(...this.C.dark);
    doc.text((resume.name || "").toUpperCase(), m, this.currentY);
    this.currentY += 7.5;

    // ── Professional title (if present) ──────────────────────────────────────
    if (resume.title) {
      doc.setFont(this._activeFont, "normal");
      doc.setFontSize(11);
      doc.setTextColor(...this.C.accent);
      doc.text(resume.title, m, this.currentY);
      this.currentY += 5.5;
    }

    // ── Contact line ─────────────────────────────────────────────────────────
    const contactParts = [];
    if (resume.location) contactParts.push({ text: resume.location, url: null });
    if (resume.email)    contactParts.push({ text: resume.email,    url: `mailto:${resume.email}` });
    if (resume.phone)    contactParts.push({ text: resume.phone,    url: null });
    if (resume.linkedin) {
      const li = typeof resume.linkedin === "object"
        ? resume.linkedin
        : { display: resume.linkedin, url: resume.linkedin };
      if (li.display) contactParts.push({ text: li.display, url: li.url });
    }

    if (contactParts.length) {
      doc.setFont(this._activeFont, "normal");
      doc.setFontSize(9);
      doc.setTextColor(...this.C.gray);
      const sep = " \u00B7 ";
      let cx = m;
      contactParts.forEach((part, i) => {
        if (i > 0) { doc.text(sep, cx, this.currentY); cx += doc.getTextWidth(sep); }
        if (part.url) {
          doc.setTextColor(...this.C.accent);
          doc.textWithLink(part.text, cx, this.currentY, { url: part.url });
          doc.setTextColor(...this.C.gray);
        } else {
          doc.text(part.text, cx, this.currentY);
        }
        cx += doc.getTextWidth(part.text);
      });
      this.currentY += 5;
    }

    // ── Accent rule ───────────────────────────────────────────────────────────
    this.currentY += 1.5;
    doc.setDrawColor(...this.C.accent);
    doc.setLineWidth(0.53);
    doc.line(m, this.currentY, this.pageWidth - m, this.currentY);
    this.currentY += 8;

    // ── Date ──────────────────────────────────────────────────────────────────
    const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    doc.setFont(this._activeFont, "normal");
    doc.setFontSize(9);
    doc.setTextColor(...this.C.gray);
    doc.text(today, m, this.currentY);
    this.currentY += 10;

    // ── Body paragraphs ───────────────────────────────────────────────────────
    // AI response already includes salutation, body, and closing — render as-is.
    // Paragraphs may contain **bold** markers; render with inline bold support.
    // Filter out standalone phone/email lines — they're already shown in the header.
    const phoneRegex = /^[\d\s\+\-\(\)\.]{7,20}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const allParagraphs = cl.paragraphs || cl.body || [];
    const paragraphs = allParagraphs.filter(p => {
      const t = (p || "").trim();
      return !phoneRegex.test(t) && !emailRegex.test(t);
    });
    paragraphs.forEach((para) => {
      if (!para || !para.trim()) return;
      const trimmed = para.trim();
      this._checkPageBreak(doc, 20);

      const segs = this._parseMarkers(trimmed);
      const hasMarkup = segs.some(s => s.bold);

      if (hasMarkup) {
        const endY = this._renderSegments(doc, segs, m, this.currentY, cw, 10.5, this.C.body, this.LH.base);
        this.currentY = endY + this.LH.base + 5;
      } else {
        doc.setFont(this._activeFont, "normal");
        doc.setFontSize(10.5);
        doc.setTextColor(...this.C.body);
        const lines = doc.splitTextToSize(trimmed, cw);
        lines.forEach((line) => {
          this._checkPageBreak(doc, 8);
          doc.text(line, m, this.currentY);
          this.currentY += this.LH.base;
        });
        this.currentY += 5;
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Legacy plain-text fallback (for unstructured responses)
  // ═══════════════════════════════════════════════════════════════════════════

  _renderLegacyText(doc, text) {
    this.currentY = this.marginTop;
    const paragraphs = text.split(/\n+/).filter(Boolean);  // split on every newline
    paragraphs.forEach((para) => {
      this._checkPageBreak(doc, 15);
      doc.setFont(this._activeFont, "normal");
      doc.setFontSize(9);
      doc.setTextColor(...this.C.body);
      const lines = doc.splitTextToSize(para.trim(), this.contentWidth);
      // Render line by line with page breaks
      lines.forEach((line) => {
        this._checkPageBreak(doc, 6);
        doc.text(line, this.marginH, this.currentY);
        this.currentY += this.LH.sm;
      });
      this.currentY += 3;  // paragraph gap
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Utility
  // ═══════════════════════════════════════════════════════════════════════════

  _checkPageBreak(doc, spaceNeeded = 20) {
    if (this.currentY > this.pageHeight - this.marginBot - spaceNeeded) {
      doc.addPage();
      this.currentY = this.marginTop;
    }
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = PDFGenerator;
}

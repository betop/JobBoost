# Quick Reference: Font System

## Current Fonts Ready to Use

### Resume Body & Headings
```javascript
// In pdfGenerator.js → _newDoc():
this._activeFont  = "Inter-Regular";   // ✅ Body text, paragraphs
this._headingFont = "Inter-Bold";      // ✅ Section titles, emphasis
```

### Loaded in offscreen.html
```html
<script type="module" src="fonts/Inter/static/Inter-Regular-normal.js"></script>
<script type="module" src="fonts/Inter/static/Inter-Bold-normal.js"></script>
<script type="module" src="fonts/Poppins-Bold-normal.js"></script>
```

## Usage in PDF Generation

### Set Font Before Writing
```javascript
// For body text
doc.setFont("Inter-Regular", "normal");
doc.text("Your text here", 10, 50);

// For headings
doc.setFont("Inter-Bold", "normal");
doc.text("Section Title", 10, 40);

// For lists/emphasis
doc.setFont("Inter-Bold", "normal");
doc.text("• Important point", 15, 60);
```

## Add More Fonts

### Step 1: Convert TTF to JS
```bash
cd /Users/administrator/Documents/Work/resume\ extension/resume-extension
node convert-fonts.js fonts/Inter/static/Inter_18pt-SemiBold.ttf Inter-SemiBold Inter-SemiBold normal
```

### Step 2: Add to offscreen.html
```html
<script type="module" src="fonts/Inter/static/Inter-SemiBold.js"></script>
```

### Step 3: Use in PDF
```javascript
doc.setFont("Inter-SemiBold", "normal");
doc.text("Semi-bold text", 10, 50);
```

## File Locations

| File | Location | Purpose |
|------|----------|---------|
| Script | `resume-extension/convert-fonts.js` | TTF → JS converter |
| Font: Regular | `resume-extension/fonts/Inter/static/Inter-Regular-normal.js` | Body text |
| Font: Bold | `resume-extension/fonts/Inter/static/Inter-Bold-normal.js` | Headings |
| HTML | `resume-extension/offscreen.html` | Font loader |
| PDF Gen | `resume-extension/pdfGenerator.js` | PDF generation |
| Guide | `FONT_CONVERSION_GUIDE.md` | Full documentation |

## Quick Copy-Paste Templates

### Resume Section with Heading + Body
```javascript
// Section heading
doc.setFont("Inter-Bold", "normal");
doc.fontSize(14);
doc.text("EXPERIENCE", marginH, currentY);
currentY += 8;

// Job entry
doc.setFont("Inter-Regular", "normal");
doc.fontSize(10);
doc.text("Senior Developer | Tech Corp", marginH, currentY);
currentY += 5;

doc.fontSize(9);
doc.text("2020 - Present", marginH, currentY);
currentY += 4;

// Description
doc.fontSize(10);
const description = "Led development of key features...";
const lines = doc.splitTextToSize(description, contentWidth);
doc.text(lines, marginH, currentY);
currentY += lines.length * 4 + 2;
```

### List with Bullets
```javascript
doc.setFont("Inter-Regular", "normal");
doc.fontSize(10);

const bullets = [
  "Improved performance by 40%",
  "Mentored 3 junior developers",
  "Delivered 15+ features on time"
];

bullets.forEach(bullet => {
  doc.text(`• ${bullet}`, marginH + 3, currentY);
  currentY += 5;
});
```

## Troubleshooting Fonts

**Fonts not showing?**
1. Check offscreen.html has the font import
2. Verify font name matches exactly: `"Inter-Regular"` not `"inter-regular"`
3. Check browser console for errors
4. Try fallback: `doc.setFont("helvetica")`

**Want different fonts for different sections?**
- Resume: Inter-Regular (body), Inter-Bold (headings)
- Cover Letter: Inter-Regular (all), Poppins-Bold (optional emphasis)
- Headers/Footers: Keep simple with Inter-Bold

**Need italic or different weights?**
Run: `node convert-fonts.js fonts/Inter/static/Inter_18pt-Italic.ttf Inter-Italic Inter-Italic italic`

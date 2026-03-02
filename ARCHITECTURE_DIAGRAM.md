# Font Loading Architecture — New Approach

## Before vs After Comparison

### BEFORE: Async TTF Fetching
```
User Action (Generate Resume)
           ↓
background.js → offscreen.html
           ↓
pdfGenerator.init()
    ↓
_waitForJsPDF()  ← Async wait for jsPDF library
    ↓
new PDFGenerator()
    ↓
generateResumePDF(input) [ASYNC]
    ↓
await _newDoc() [ASYNC]  ← SLOW ASYNC OPERATION
    ├─ new jsPDF()
    ├─ For each font:
    │   ├─ await fetch(chrome.runtime.getURL(fontPath))
    │   ├─ Convert ArrayBuffer to binary string  [SYNC conversion]
    │   └─ doc.addFileToVFS(filename, binary)    [Manual add]
    ├─ doc.addFont(...)                          [Manual register]
    ├─ doc.addFont(...)                          [Manual register]
    └─ doc.addFont(...)                          [Manual register]
    ↓
_renderResumeTemplate(doc, data) [SYNC]
    ↓
doc.output("datauristring")
    ↓
downloadBlob()
    ↓
User downloads Resume.pdf
```

**Issues:**
- ❌ Multiple async/await chains
- ❌ Font fetch overhead
- ❌ Manual registration for each font
- ❌ Binary conversion on client side
- ❌ Complex error handling

---

### AFTER: JS Module Auto-Registration
```
offscreen.html loads
    ↓
<script src="jspdf.umd.min.js"></script>  [SYNC library load]
    ↓
<script type="module" src="fonts/Poppins-Bold-normal.js"></script>  [SYNC module load]
    ├─ Module imports jsPDF
    ├─ Module defines base64 font data
    └─ Module registers callback:
       jsPDF.API.events.push(['addFonts', callAddFont])
    ↓
pdfGenerator.js loads
    ↓
offscreen.js loads
    ↓
User Action (Generate Resume)
    ↓
background.js → offscreen.html (already loaded)
    ↓
generateResumePDF(input) [SYNC]  ← NO ASYNC!
    ↓
_newDoc() [SYNC]  ← FAST SYNC OPERATION
    ├─ new jsPDF()
    │   ├─ jsPDF constructor fires events
    │   └─ Callbacks execute automatically
    │       └─ callAddFont() from Poppins-Bold-normal.js executes
    │           ├─ this.addFileToVFS('Poppins-Bold-normal.ttf', font)
    │           └─ this.addFont('Poppins-Bold-normal.ttf', 'Poppins-Bold', 'normal')
    └─ doc.setFont('Poppins-Bold', 'normal')
    ↓
_renderResumeTemplate(doc, data) [SYNC]
    ↓
doc.output("datauristring")
    ↓
downloadBlob()
    ↓
User downloads Resume.pdf  [FASTER]
```

**Advantages:**
- ✅ Fully synchronous pipeline
- ✅ Font data pre-embedded in JS
- ✅ No network overhead
- ✅ Automatic registration via events
- ✅ Simpler error handling
- ✅ Better performance

---

## File Loading Timeline

### Offscreen HTML Initialization
```
1. Page Load: offscreen.html
   ├─ <script src="jspdf.umd.min.js"></script>
   │  └─ window.jspdf.jsPDF is available
   │
   ├─ <script type="module" src="fonts/Poppins-Bold-normal.js"></script>
   │  └─ Font module executes:
   │     1. Imports jsPDF from "jspdf"
   │     2. Registers callback: jsPDF.API.events.push(['addFonts', fn])
   │     3. Module done (font ready in memory)
   │
   ├─ <script src="pdfGenerator.js"></script>
   │  └─ window.PDFGenerator class available
   │
   └─ <script src="offscreen.js"></script>
      └─ Listener ready for messages from background.js
```

### PDF Generation Timeline
```
2. When background.js sends message to generate PDF:
   
   a) Create generator:
      new PDFGenerator()
      
   b) Initialize:
      generator.init()
      └─ Waits for window.jspdf (already loaded)
      └─ Stores jsPDF class
      
   c) Generate resume:
      generator.generateResumePDF(input, filename)
      
   d) Create doc:
      _newDoc()
      ├─ new jsPDF()  ← Font callback fires HERE
      │  └─ Poppins-Bold callback registers font
      └─ return doc with font ready
      
   e) Render template:
      _renderResumeTemplate(doc, data)
      ├─ Use Poppins-Bold for headings
      ├─ Use Poppins-Bold for all text
      └─ Generate content
      
   f) Output:
      doc.output("datauristring")
      
   g) Download:
      downloadBlob(dataUri, filename)
```

---

## Code Path Comparison

### Old (Async) Path
```javascript
async generateResumePDF(input, filename) {
  const doc = await this._newDoc();  ← AWAIT (blocks here)
  // ...rendering...
  return { dataUri: doc.output("datauristring"), filename };
}

async _newDoc() {
  const doc = new this.jsPDF({...});
  for (const [filename, fontPath] of Object.entries(this._fontPaths)) {
    const fontBinary = await this._loadFontFromPath(filename, fontPath);  ← AWAIT (network call)
    doc.addFileToVFS(filename, fontBinary);  ← Manual add
  }
  doc.addFont(...);  ← Manual register (repeated)
  return doc;
}

async _loadFontFromPath(filename, fontPath) {
  const url = chrome.runtime.getURL(fontPath);
  const response = await fetch(url);  ← ASYNC (slowest part)
  const arrayBuffer = await response.arrayBuffer();  ← AWAIT
  // Convert ArrayBuffer to binary string
  return binary;  ← Return after conversion
}
```

**Bottleneck**: `_loadFontFromPath()` with fetch() for each font

### New (Sync) Path
```javascript
generateResumePDF(input, filename) {
  const doc = this._newDoc();  ← NO AWAIT (instant)
  // ...rendering...
  return { dataUri: doc.output("datauristring"), filename };
}

_newDoc() {
  const doc = new this.jsPDF({...});
  // Font already registered by module!
  // Just set which font to use
  this._activeFont = "Poppins-Bold";
  doc.setFont(this._activeFont, "normal");  ← Instant, font ready
  return doc;
}

// Font loading happens in offscreen.html module:
// jsPDF.API.events.push(['addFonts', callAddFont])
// Automatic! When new jsPDF() is called, callback fires.
```

**Advantage**: No async operations, instant font availability

---

## Data Flow Diagram

### Module Auto-Registration Flow
```
Poppins-Bold-normal.js (ES6 Module)
│
├─ import { jsPDF } from "jspdf"
│  └─ Get reference to jsPDF constructor
│
├─ var font = "JjU0NyE1IT...base64...AAAA"
│  └─ Font data embedded in module
│
├─ var callAddFont = function() { ... }
│  └─ Registration callback definition
│
└─ jsPDF.API.events.push(['addFonts', callAddFont])
   └─ Hook into jsPDF's event system
      └─ When new jsPDF() is created:
         ├─ Constructor fires 'addFonts' event
         ├─ All registered callbacks execute
         ├─ callAddFont() runs with this = new doc
         │  ├─ this.addFileToVFS('Poppins-Bold-normal.ttf', font)
         │  └─ this.addFont('Poppins-Bold-normal.ttf', 'Poppins-Bold', 'normal')
         └─ Font is registered on that instance
```

---

## Performance Improvement

### Timing Comparison (Estimated)

| Operation | Before (ms) | After (ms) | Improvement |
|-----------|-------------|-----------|-------------|
| Load jsPDF | 50-100 | 50-100 | No change |
| Load font module | N/A | 5-10 | ✨ New (instant) |
| Fetch font file | 100-300 | 0 | **Eliminated** |
| Convert ArrayBuffer | 20-50 | 0 | **Eliminated** |
| Register fonts | 10-20 | Automatic | Faster |
| **Total for _newDoc()** | **180-470ms** | **50-110ms** | **🚀 3-5x faster** |

---

## Module Loading Order

```
1. jspdf.umd.min.js loads first
   └─ window.jspdf.jsPDF is available

2. Poppins-Bold-normal.js loads as module
   └─ Imports jsPDF from library
   └─ Registers callback with jsPDF.API.events

3. pdfGenerator.js loads
   └─ Can access window.jsPDF later

4. offscreen.js loads
   └─ Can use PDFGenerator class

5. When PDF generation happens:
   └─ All fonts already hooked into jsPDF
   └─ No additional loading needed
```

---

## Summary

The new architecture is:
- **Simpler**: No async chains
- **Faster**: No network overhead
- **More Reliable**: Automatic registration
- **Cleaner**: Less manual code

The key insight: Move font data and registration into pre-converted JS modules that auto-hook into jsPDF's event system, eliminating the need for async operations entirely.

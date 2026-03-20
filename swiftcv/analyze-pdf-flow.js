#!/usr/bin/env node

/**
 * PDF Render Flow Analysis
 * Traces the complete path from PDF creation through font registration to rendering
 */

const fs = require('fs');
const path = require('path');

console.log('\n' + '='.repeat(70));
console.log('PDF RENDER FLOW ANALYSIS');
console.log('='.repeat(70) + '\n');

// Step 1: Check popup.js - Entry point
console.log('STEP 1: Analyzing popup.js (Entry Point)');
console.log('-'.repeat(70));
const popupPath = path.join(__dirname, 'popup.js');
if (fs.existsSync(popupPath)) {
  const popupCode = fs.readFileSync(popupPath, 'utf-8');
  const checks = [
    { name: 'resumeGenerator.generatePDF', pattern: /generatePDF/ },
    { name: 'pdfGenerator loaded', pattern: /pdfGenerator|new PDFGenerator/ },
    { name: 'Event listeners', pattern: /addEventListener|onclick/ },
    { name: 'Download functionality', pattern: /download|createObjectURL/ }
  ];
  
  checks.forEach(check => {
    if (check.pattern.test(popupCode)) {
      console.log(`✅ ${check.name}`);
    } else {
      console.log(`⚠️  ${check.name}`);
    }
  });
} else {
  console.log(`❌ popup.js not found`);
}
console.log();

// Step 2: Check content.js - Job data extraction
console.log('STEP 2: Analyzing content.js (Job Data Extraction)');
console.log('-'.repeat(70));
const contentPath = path.join(__dirname, 'content.js');
if (fs.existsSync(contentPath)) {
  const contentCode = fs.readFileSync(contentPath, 'utf-8');
  const checks = [
    { name: 'Job title extraction', pattern: /job.*title|title.*job/i },
    { name: 'Company extraction', pattern: /company/ },
    { name: 'Job description extraction', pattern: /description|skills|requirements/i },
    { name: 'Message sending', pattern: /chrome.runtime.sendMessage|postMessage/ }
  ];
  
  checks.forEach(check => {
    if (check.pattern.test(contentCode)) {
      console.log(`✅ ${check.name}`);
    } else {
      console.log(`⚠️  ${check.name}`);
    }
  });
} else {
  console.log(`❌ content.js not found`);
}
console.log();

// Step 3: Check pdfGenerator.js - Core PDF logic
console.log('STEP 3: Analyzing pdfGenerator.js (Core PDF Logic)');
console.log('-'.repeat(70));
const pdfGenPath = path.join(__dirname, 'pdfGenerator.js');
if (fs.existsSync(pdfGenPath)) {
  const pdfCode = fs.readFileSync(pdfGenPath, 'utf-8');
  
  // Parse the constructor and methods
  const constructorMatch = pdfCode.match(/constructor\s*\([^)]*\)/);
  const methodMatches = pdfCode.match(/^[\s]*([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)\s*\{/gm) || [];
  
  console.log('Class Methods:');
  const methods = methodMatches
    .map(m => m.match(/([a-zA-Z_][a-zA-Z0-9_]*)/)[1])
    .filter((m, i, arr) => arr.indexOf(m) === i);
  
  const criticalMethods = [
    'constructor',
    '_newDoc',
    '_registerFontsOnDocument',
    '_base64ToVfsString',
    'generatePDF',
    '_addHeader',
    '_addSummary',
    '_addSkills',
    '_addExperience',
    '_addEducation'
  ];
  
  criticalMethods.forEach(method => {
    if (methods.includes(method)) {
      console.log(`  ✅ ${method}()`);
    } else {
      console.log(`  ⚠️  ${method}() - Missing or not found`);
    }
  });
  
  console.log('\nFont Registration Flow:');
  const fontFlowChecks = [
    { name: 'Font data loaded from global context', pattern: /ctx\.(montserrat|lato|roboto|poppins|inter|sourceSans)/i },
    { name: '_base64ToVfsString() implemented', pattern: /_base64ToVfsString\s*\([^)]*\)/ },
    { name: 'doc.addFileToVFS() called', pattern: /doc\.addFileToVFS\s*\(/ },
    { name: 'doc.addFont() called', pattern: /doc\.addFont\s*\(/ },
    { name: '_registerFontsOnDocument() called', pattern: /_registerFontsOnDocument\s*\(/ }
  ];
  
  fontFlowChecks.forEach(check => {
    if (check.pattern.test(pdfCode)) {
      console.log(`  ✅ ${check.name}`);
    } else {
      console.log(`  ❌ ${check.name}`);
    }
  });
} else {
  console.log(`❌ pdfGenerator.js not found`);
}
console.log();

// Step 4: Check resume_fonts.js
console.log('STEP 4: Analyzing resume_fonts.js (Font Data)');
console.log('-'.repeat(70));
const fontsPath = path.join(__dirname, 'resume_fonts.js');
if (fs.existsSync(fontsPath)) {
  const fontFileSize = fs.statSync(fontsPath).size;
  const fontCode = fs.readFileSync(fontsPath, 'utf-8');
  
  console.log(`File size: ${(fontFileSize / 1024 / 1024).toFixed(2)} MB`);
  
  const fontVars = [
    'montserratBoldFont',
    'montserratRegularFont',
    'latoRegularFont',
    'latoBoldFont',
    'robotoRegularFont',
    'robotoBoldFont',
    'poppinsRegularFont',
    'poppinsBoldFont',
    'interRegularFont',
    'interBoldFont',
    'sourceSans3RegularFont',
    'sourceSans3BoldFont'
  ];
  
  console.log('Font Variables:');
  let foundCount = 0;
  fontVars.forEach(fontVar => {
    if (fontCode.includes(`ctx.${fontVar}`)) {
      console.log(`  ✅ ${fontVar}`);
      foundCount++;
    } else {
      console.log(`  ❌ ${fontVar}`);
    }
  });
  console.log(`\n  Loaded: ${foundCount}/${fontVars.length}`);
} else {
  console.log(`❌ resume_fonts.js not found`);
}
console.log();

// Step 5: Check manifest.json
console.log('STEP 5: Analyzing manifest.json (Configuration)');
console.log('-'.repeat(70));
const manifestPath = path.join(__dirname, 'manifest.json');
if (fs.existsSync(manifestPath)) {
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    
    console.log('Scripts Loading Order:');
    console.log(`  Version: ${manifest.version}`);
    
    if (manifest.content_scripts) {
      console.log(`  Content scripts: ${manifest.content_scripts.length}`);
    }
    
    if (manifest.web_accessible_resources) {
      console.log(`  Web accessible resources: ${manifest.web_accessible_resources.length}`);
      manifest.web_accessible_resources.forEach(resource => {
        if (resource.resources) {
          const hasFonts = resource.resources.some(r => r.includes('fonts'));
          const hasResumeFonts = resource.resources.some(r => r.includes('resume_fonts'));
          console.log(`    ${hasFonts ? '✅' : '⚠️ '} Fonts accessible: ${hasFonts}`);
          console.log(`    ${hasResumeFonts ? '✅' : '⚠️ '} resume_fonts.js accessible: ${hasResumeFonts}`);
        }
      });
    }
  } catch (e) {
    console.log(`❌ Error parsing manifest.json: ${e.message}`);
  }
} else {
  console.log(`❌ manifest.json not found`);
}
console.log();

// Step 6: Check popup.html for script loading
console.log('STEP 6: Analyzing popup.html (Script Loading Order)');
console.log('-'.repeat(70));
const popupHtmlPath = path.join(__dirname, 'popup.html');
if (fs.existsSync(popupHtmlPath)) {
  const htmlCode = fs.readFileSync(popupHtmlPath, 'utf-8');
  const scriptMatches = htmlCode.match(/<script[^>]*src="([^"]+)"[^>]*>/g) || [];
  
  if (scriptMatches.length > 0) {
    console.log('Script Loading Order:');
    scriptMatches.forEach((script, index) => {
      const src = script.match(/src="([^"]+)"/)[1];
      console.log(`  ${index + 1}. ${src}`);
    });
  } else {
    console.log('⚠️  No external scripts found in popup.html');
  }
  
  // Check for resume_fonts.js
  if (htmlCode.includes('resume_fonts.js')) {
    console.log(`\n  ✅ resume_fonts.js is loaded in popup.html`);
  } else {
    console.log(`\n  ⚠️  resume_fonts.js NOT found in popup.html`);
    console.log(`     This might be needed for fonts to be accessible!`);
  }
} else {
  console.log(`❌ popup.html not found`);
}
console.log();

// Step 7: Render Flow Sequence
console.log('STEP 7: Complete Render Flow Sequence');
console.log('-'.repeat(70));
console.log(`
1. User clicks extension icon
   └─ popup.js loads and initializes

2. resume_fonts.js executes
   └─ Assigns all 12 fonts to global context (window/self)

3. User clicks "Generate PDF"
   └─ popup.js calls resumeGenerator.generatePDF()

4. pdfGenerator.js instantiates
   └─ new PDFGenerator(jobData)
   
5. Constructor runs
   └─ Creates internal state
   
6. generatePDF() called
   └─ 6a. Calls _newDoc()
       └─ Returns new jsPDF instance
   
   └─ 6b. Calls _registerFontsOnDocument(doc)
       ├─ Iterates through 12 fonts
       ├─ For each font:
       │  ├─ Gets font data from ctx (global scope)
       │  ├─ Calls _base64ToVfsString(fontData)
       │  │  └─ Converts base64 → binary string
       │  ├─ Calls doc.addFileToVFS(filename, binaryString)
       │  │  └─ Registers in jsPDF VFS
       │  └─ Calls doc.addFont(filename, fontName, weight)
       │     └─ Adds to document font table
       └─ Returns doc
   
   └─ 6c. Calls rendering methods
       ├─ _addHeader()
       │  └─ Uses doc.setFont() and doc.text()
       ├─ _addSummary()
       ├─ _addSkills()
       │  └─ Uses bold font for skill categories
       ├─ _addExperience()
       └─ _addEducation()
   
   └─ 6d. Returns PDF as Blob
       └─ doc.output('blob')

7. popup.js receives PDF Blob
   └─ Creates download link
   └─ Triggers browser download
   
8. User saves file
   └─ PDF renders with all fonts
`);

// Step 8: Potential Issues Check
console.log('\nSTEP 8: Potential Issues to Watch For');
console.log('-'.repeat(70));

const issuesPath = path.join(__dirname, 'pdfGenerator.js');
if (fs.existsSync(issuesPath)) {
  const code = fs.readFileSync(issuesPath, 'utf-8');
  
  const issues = [];
  
  // Check if _registerFontsOnDocument is called in _newDoc or generatePDF
  if (!code.includes('_registerFontsOnDocument(doc)')) {
    issues.push('⚠️  _registerFontsOnDocument() might not be called');
  }
  
  // Check if fonts are accessed before registration
  const fontRegPos = code.indexOf('_registerFontsOnDocument');
  const fontUsePos = code.indexOf('doc.setFont');
  if (fontRegPos > fontUsePos && fontRegPos !== -1 && fontUsePos !== -1) {
    issues.push('⚠️  Fonts might be used before registration');
  }
  
  // Check if ctx variables are used
  if (!code.match(/ctx\./i)) {
    issues.push('❌ Font context variables (ctx.fontName) not found!');
  }
  
  // Check if try-catch around font registration
  if (!code.includes('try') || !code.includes('catch')) {
    issues.push('⚠️  No error handling around font registration');
  }
  
  if (issues.length === 0) {
    console.log('✅ No critical issues detected!');
  } else {
    issues.forEach(issue => {
      console.log(issue);
    });
  }
} else {
  console.log('❌ Cannot analyze - pdfGenerator.js not found');
}

console.log('\n' + '='.repeat(70));
console.log('ANALYSIS COMPLETE');
console.log('='.repeat(70) + '\n');

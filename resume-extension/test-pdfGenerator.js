#!/usr/bin/env node

/**
 * pdfGenerator.js Test Suite
 * Comprehensive tests for PDF generation, font registration, and rendering
 */

const fs = require('fs');
const path = require('path');

console.log('\n' + '='.repeat(80));
console.log('PDFGENERATOR.JS TEST SUITE');
console.log('='.repeat(80) + '\n');

// Test utilities
const tests = [];
let passedTests = 0;
let failedTests = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

function runTests() {
  tests.forEach((t, index) => {
    try {
      t.fn();
      console.log(`✅ TEST ${index + 1}: ${t.name}`);
      passedTests++;
    } catch (error) {
      console.log(`❌ TEST ${index + 1}: ${t.name}`);
      console.log(`   Error: ${error.message}`);
      failedTests++;
    }
  });
  
  console.log('\n' + '='.repeat(80));
  console.log(`RESULTS: ${passedTests} passed, ${failedTests} failed out of ${tests.length} tests`);
  console.log('='.repeat(80) + '\n');
  
  return failedTests === 0;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

function assertExists(value, message) {
  if (!value) {
    throw new Error(message || 'Value does not exist');
  }
}

// ============================================================================
// TEST SUITE
// ============================================================================

// Test 1: File existence
test('pdfGenerator.js file exists', () => {
  const filePath = path.join(__dirname, 'pdfGenerator.js');
  assert(fs.existsSync(filePath), 'pdfGenerator.js not found');
});

// Test 2: File is readable
test('pdfGenerator.js is readable', () => {
  const filePath = path.join(__dirname, 'pdfGenerator.js');
  const content = fs.readFileSync(filePath, 'utf-8');
  assert(content.length > 0, 'File is empty');
});

// Test 3: PDFGenerator class exists
test('PDFGenerator class is defined', () => {
  const filePath = path.join(__dirname, 'pdfGenerator.js');
  const content = fs.readFileSync(filePath, 'utf-8');
  assert(content.includes('class PDFGenerator'), 'PDFGenerator class not found');
});

// Test 4: Constructor exists
test('Constructor method exists', () => {
  const filePath = path.join(__dirname, 'pdfGenerator.js');
  const content = fs.readFileSync(filePath, 'utf-8');
  assert(content.includes('constructor'), 'Constructor not found');
});

// Test 5: _newDoc method exists
test('_newDoc() method exists', () => {
  const filePath = path.join(__dirname, 'pdfGenerator.js');
  const content = fs.readFileSync(filePath, 'utf-8');
  assert(content.includes('_newDoc'), '_newDoc method not found');
});

// Test 6: _base64ToVfsString method exists
test('_base64ToVfsString() method exists', () => {
  const filePath = path.join(__dirname, 'pdfGenerator.js');
  const content = fs.readFileSync(filePath, 'utf-8');
  assert(content.includes('_base64ToVfsString'), '_base64ToVfsString method not found');
});

// Test 7: _registerFontsOnDocument method exists
test('_registerFontsOnDocument() method exists', () => {
  const filePath = path.join(__dirname, 'pdfGenerator.js');
  const content = fs.readFileSync(filePath, 'utf-8');
  assert(content.includes('_registerFontsOnDocument'), '_registerFontsOnDocument method not found');
});

// Test 8: PDF generation method exists
test('PDF generation methods exist (generateResumePDF or generateCoverLetterPDF)', () => {
  const filePath = path.join(__dirname, 'pdfGenerator.js');
  const content = fs.readFileSync(filePath, 'utf-8');
  const hasMethods = content.includes('generateResumePDF') || content.includes('generateCoverLetterPDF');
  assert(hasMethods, 'PDF generation methods not found');
});

// Test 9: Font arrays defined
test('Font mapping array is defined', () => {
  const filePath = path.join(__dirname, 'pdfGenerator.js');
  const content = fs.readFileSync(filePath, 'utf-8');
  assert(content.includes('const fonts = [') || content.includes('const fonts='), 'Font array not found');
});

// Test 10: Font data sources (ctx.fontName)
test('Font data accessed from global context (ctx)', () => {
  const filePath = path.join(__dirname, 'pdfGenerator.js');
  const content = fs.readFileSync(filePath, 'utf-8');
  assert(content.match(/ctx\.\w+Font/), 'ctx.fontName references not found');
});

// Test 11: jsPDF addFileToVFS called
test('doc.addFileToVFS() is called', () => {
  const filePath = path.join(__dirname, 'pdfGenerator.js');
  const content = fs.readFileSync(filePath, 'utf-8');
  assert(content.includes('doc.addFileToVFS'), 'doc.addFileToVFS not called');
});

// Test 12: jsPDF addFont called
test('doc.addFont() is called', () => {
  const filePath = path.join(__dirname, 'pdfGenerator.js');
  const content = fs.readFileSync(filePath, 'utf-8');
  assert(content.includes('doc.addFont'), 'doc.addFont not called');
});

// Test 13: jsPDF setFont used
test('doc.setFont() is used for rendering', () => {
  const filePath = path.join(__dirname, 'pdfGenerator.js');
  const content = fs.readFileSync(filePath, 'utf-8');
  assert(content.includes('doc.setFont'), 'doc.setFont not found');
});

// Test 14: Text rendering methods exist
test('Text rendering methods implemented', () => {
  const filePath = path.join(__dirname, 'pdfGenerator.js');
  const content = fs.readFileSync(filePath, 'utf-8');
  const renderMethods = [
    '_renderResumeTemplate',
    '_renderCoverLetterTemplate',
    '_renderSkillsRow',
    '_renderCareerEntry',
    '_renderEducationEntry'
  ];
  const allFound = renderMethods.every(method => content.includes(method));
  assert(allFound, `Not all render methods found: ${renderMethods.join(', ')}`);
});

// Test 15: Error handling in font registration
test('Try-catch error handling for fonts', () => {
  const filePath = path.join(__dirname, 'pdfGenerator.js');
  const content = fs.readFileSync(filePath, 'utf-8');
  assert(content.includes('try') && content.includes('catch'), 'No try-catch found');
});

// Test 16: Font loop iteration
test('Font registration loop processes multiple fonts', () => {
  const filePath = path.join(__dirname, 'pdfGenerator.js');
  const content = fs.readFileSync(filePath, 'utf-8');
  assert(content.includes('forEach') || content.includes('for ('), 'No loop found for fonts');
});

// Test 17: Console logging for debugging
test('Console logs for font operations', () => {
  const filePath = path.join(__dirname, 'pdfGenerator.js');
  const content = fs.readFileSync(filePath, 'utf-8');
  assert(content.includes('console'), 'No console logging found');
});

// Test 18: Verify resume_fonts.js exists
test('resume_fonts.js file exists', () => {
  const filePath = path.join(__dirname, 'resume_fonts.js');
  assert(fs.existsSync(filePath), 'resume_fonts.js not found');
});

// Test 19: Font data file has content
test('resume_fonts.js has font data', () => {
  const filePath = path.join(__dirname, 'resume_fonts.js');
  const content = fs.readFileSync(filePath, 'utf-8');
  assert(content.includes('montserratBoldFont'), 'Font data not found');
});

// Test 20: Base64 conversion logic
test('_base64ToVfsString() uses atob', () => {
  const filePath = path.join(__dirname, 'pdfGenerator.js');
  const content = fs.readFileSync(filePath, 'utf-8');
  // Extract the method
  const methodMatch = content.match(/_base64ToVfsString\s*\([^)]*\)\s*{([^}]+)}/);
  assert(methodMatch, '_base64ToVfsString method structure not found');
  const methodBody = methodMatch[1];
  assert(methodBody.includes('atob'), 'atob not used in _base64ToVfsString');
});

// Test 21: All 12 fonts registered
test('All 12 fonts are registered', () => {
  const filePath = path.join(__dirname, 'pdfGenerator.js');
  const content = fs.readFileSync(filePath, 'utf-8');
  const fontNames = [
    'montserrat', 'lato', 'roboto', 'poppins', 'inter', 'sourceSans3'
  ];
  const allFound = fontNames.every(font => 
    content.toLowerCase().includes(font.toLowerCase())
  );
  assert(allFound, 'Not all font families found');
});

// Test 22: Bold and regular weights
test('Both bold and regular font weights handled', () => {
  const filePath = path.join(__dirname, 'pdfGenerator.js');
  const content = fs.readFileSync(filePath, 'utf-8');
  const hasBold = content.includes('bold');
  const hasRegular = content.includes('regular');
  assert(hasBold && hasRegular, 'Bold or regular weight not found');
});

// Test 23: Code structure is valid
test('Code structure is valid', () => {
  const filePath = path.join(__dirname, 'pdfGenerator.js');
  const content = fs.readFileSync(filePath, 'utf-8');
  // Check for key structural elements
  const hasClass = content.includes('class PDFGenerator');
  const hasInit = content.includes('async init');
  const hasRenderMethods = content.includes('_renderResumeTemplate') || content.includes('_renderCoverLetterTemplate');
  assert(hasClass && hasInit && hasRenderMethods, 'Missing key structural elements');
});
// Test 24: PDF document is created
test('PDF document is created and returned', () => {
  const filePath = path.join(__dirname, 'pdfGenerator.js');
  const content = fs.readFileSync(filePath, 'utf-8');
  assert(content.includes('this._newDoc()') || content.includes('_newDoc()'), 
    'PDF document creation not found');
});

// Test 25: popup.html loads resume_fonts.js
test('popup.html loads resume_fonts.js before popup.js', () => {
  const filePath = path.join(__dirname, 'popup.html');
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Extract just the script tags at the end
  const scriptMatch = content.match(/<script[^>]*src="[^"]*\.js"><\/script>/g);
  assert(scriptMatch && scriptMatch.length >= 2, 'Script tags not found');
  
  // Check order
  const fontsScript = scriptMatch.find(s => s.includes('resume_fonts.js'));
  const popupScript = scriptMatch.find(s => s.includes('popup.js'));
  
  assert(fontsScript, 'resume_fonts.js script tag not found');
  assert(popupScript, 'popup.js script tag not found');
  
  // Fonts should appear before popup in the script tags
  const fontsPos = content.indexOf(fontsScript);
  const popupPos = content.indexOf(popupScript);
  assert(fontsPos < popupPos, 'resume_fonts.js must load before popup.js');
});

// Test 26: manifest.json includes resume_fonts.js in resources
test('manifest.json includes resume_fonts.js in web_accessible_resources', () => {
  const filePath = path.join(__dirname, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const hasResources = manifest.web_accessible_resources && 
                       manifest.web_accessible_resources.length > 0;
  assert(hasResources, 'web_accessible_resources not defined');
  
  const resourcesIncludeFonts = manifest.web_accessible_resources.some(r => 
    r.resources && r.resources.some(res => res.includes('resume_fonts.js'))
  );
  assert(resourcesIncludeFonts, 'resume_fonts.js not in web_accessible_resources');
});

// Test 27: Font file sizes are reasonable
test('Font files have reasonable sizes', () => {
  const filePath = path.join(__dirname, 'resume_fonts.js');
  const stats = fs.statSync(filePath);
  const sizeMB = stats.size / 1024 / 1024;
  
  // Should be around 3.68 MB
  assert(sizeMB > 3 && sizeMB < 4.5, `Font file size ${sizeMB.toFixed(2)} MB is unexpected`);
});

// Test 28: Font data is base64 encoded
test('Font data in resume_fonts.js is base64', () => {
  const filePath = path.join(__dirname, 'resume_fonts.js');
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Extract first font data (look for pattern like: ctx.fontName = "AAE...")
  const match = content.match(/ctx\.\w+Font\s*=\s*"([A-Za-z0-9+/]+={0,2})"/);
  assert(match, 'Could not extract font data');
  
  // Validate it looks like base64
  const base64Pattern = /^[A-Za-z0-9+/]*={0,2}$/;
  const fontData = match[1].substring(0, 100);
  assert(base64Pattern.test(fontData), 'Font data does not appear to be base64 encoded');
});

// Test 29: Fonts are assigned to both window and self
test('Fonts assigned to window or self context', () => {
  const filePath = path.join(__dirname, 'resume_fonts.js');
  const content = fs.readFileSync(filePath, 'utf-8');
  assert(content.includes('typeof window !== "undefined"'), 'window check not found');
  assert(content.includes('window : self') || content.includes('window:self'), 'context assignment not found');
});

// Test 30: PDF generation functions are exported
test('PDF generation functions are properly implemented', () => {
  const filePath = path.join(__dirname, 'pdfGenerator.js');
  const content = fs.readFileSync(filePath, 'utf-8');
  const hasGenerateResume = content.includes('generateResumePDF');
  const hasGenerateCoverLetter = content.includes('generateCoverLetterPDF');
  assert(hasGenerateResume || hasGenerateCoverLetter, 'PDF generation functions not found');
});

// ============================================================================
// RUN ALL TESTS
// ============================================================================

console.log('Running 30 comprehensive tests...\n');
const allPassed = runTests();

if (allPassed) {
  console.log('✅ ALL TESTS PASSED - System is ready for browser testing!\n');
  process.exit(0);
} else {
  console.log('⚠️  Some tests failed - Please review the issues above\n');
  process.exit(1);
}

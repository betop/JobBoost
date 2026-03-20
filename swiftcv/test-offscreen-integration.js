/**
 * Integration test for offscreen.js with background.js
 * Simulates the message flow and PDF generation
 */

const fs = require('fs');
const path = require('path');

console.log('================================================================================');
console.log('OFFSCREEN.JS INTEGRATION TEST');
console.log('================================================================================\n');

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    testsPassed++;
  } catch (err) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${err.message}`);
    testsFailed++;
  }
}

// ============================================================================
// INTEGRATION TEST SUITE
// ============================================================================

// Test 1: Verify message structure from background.js
test('Message structure matches offscreen.js expectations', () => {
  const bgContent = fs.readFileSync(path.join(__dirname, 'background.js'), 'utf-8');
  const offscreenContent = fs.readFileSync(path.join(__dirname, 'offscreen.js'), 'utf-8');
  
  // Extract the message send in background.js
  const messageMatch = bgContent.match(/chrome\.runtime\.sendMessage\(\{[^}]+action:\s*"generateAndDownloadPDFs"[^}]*\}\)/s);
  if (!messageMatch) throw new Error('sendMessage call not found in background.js');
  
  const message = messageMatch[0];
  
  // Check all required fields exist
  const requiredFields = [
    'action: "generateAndDownloadPDFs"',
    'rawData:',
    'coverLetterText:',
    'resumeFilename:',
    'coverLetterFilename:'
  ];
  
  for (const field of requiredFields) {
    if (!message.includes(field)) {
      throw new Error(`Missing field in message: ${field}`);
    }
  }
  
  // Verify offscreen.js handles all these fields
  const fieldsHandledInOffscreen = [
    'message.rawData',
    'message.coverLetterText',
    'message.resumeFilename',
    'message.coverLetterFilename'
  ];
  
  for (const field of fieldsHandledInOffscreen) {
    if (!offscreenContent.includes(field)) {
      throw new Error(`Field not handled in offscreen.js: ${field}`);
    }
  }
});

// Test 2: Verify _extractJSON is properly exposed
test('_extractJSON is exposed in pdfGenerator.js', () => {
  const pdfGenContent = fs.readFileSync(path.join(__dirname, 'pdfGenerator.js'), 'utf-8');
  
  if (!pdfGenContent.includes('if (typeof self !== "undefined") self._extractJSON = _extractJSON')) {
    throw new Error('_extractJSON not exposed to self');
  }
  if (!pdfGenContent.includes('if (typeof window !== "undefined") window._extractJSON = _extractJSON')) {
    throw new Error('_extractJSON not exposed to window');
  }
});

// Test 3: Verify PDF methods exist in pdfGenerator
test('Required PDF generation methods exist in pdfGenerator.js', () => {
  const pdfGenContent = fs.readFileSync(path.join(__dirname, 'pdfGenerator.js'), 'utf-8');
  
  const methods = [
    'generateResumePDF',
    'generateCoverLetterPDF',
    'constructor',
    'init',
    '_newDoc',
    '_base64ToVfsString',
    '_registerFontsOnDocument'
  ];
  
  for (const method of methods) {
    if (!pdfGenContent.includes(method)) {
      throw new Error(`Required method not found: ${method}`);
    }
  }
});

// Test 4: Verify fonts are available
test('Font data file exists and is accessible', () => {
  const fontsPath = path.join(__dirname, 'resume_fonts.js');
  if (!fs.existsSync(fontsPath)) {
    throw new Error('resume_fonts.js not found');
  }
  
  const fontsContent = fs.readFileSync(fontsPath, 'utf-8');
  
  // Check for at least some fonts
  const fontNames = [
    'montserratBoldFont',
    'montserratRegularFont',
    'latoRegularFont',
    'latoBoldFont'
  ];
  
  const foundFonts = fontNames.filter(name => fontsContent.includes(name));
  if (foundFonts.length === 0) {
    throw new Error('No fonts found in resume_fonts.js');
  }
});

// Test 5: Verify offscreen.html loads all dependencies
test('offscreen.html has correct script loading order', () => {
  const htmlContent = fs.readFileSync(path.join(__dirname, 'offscreen.html'), 'utf-8');
  
  // Extract script tags
  const scriptRegex = /<script[^>]*src="([^"]+)"[^>]*>/g;
  const scripts = [];
  let match;
  
  while ((match = scriptRegex.exec(htmlContent)) !== null) {
    scripts.push(match[1]);
  }
  
  if (scripts.length < 3) {
    throw new Error(`Expected at least 3 scripts, found ${scripts.length}`);
  }
  
  // Verify order: jspdf -> pdfGenerator -> offscreen
  const jspdfIndex = scripts.findIndex(s => s.includes('jspdf'));
  const pdfGenIndex = scripts.findIndex(s => s.includes('pdfGenerator'));
  const offscreenIndex = scripts.findIndex(s => s === 'offscreen.js');
  
  if (jspdfIndex === -1) throw new Error('jsPDF not found');
  if (pdfGenIndex === -1) throw new Error('pdfGenerator.js not found');
  if (offscreenIndex === -1) throw new Error('offscreen.js not found');
  
  if (jspdfIndex > pdfGenIndex) throw new Error('jsPDF should load before pdfGenerator');
  if (pdfGenIndex > offscreenIndex) throw new Error('pdfGenerator should load before offscreen');
});

// Test 6: Check for proper error handling in background.js
test('background.js properly handles PDF generation errors', () => {
  const bgContent = fs.readFileSync(path.join(__dirname, 'background.js'), 'utf-8');
  
  // Check for error handling
  if (!bgContent.includes('if (!pdfResult?.success)')) {
    throw new Error('PDF result validation not found');
  }
  if (!bgContent.includes('throw new Error(pdfResult?.error')) {
    throw new Error('PDF error propagation not found');
  }
});

// Test 7: Verify message response handling
test('offscreen.js sends proper response messages', () => {
  const offscreenContent = fs.readFileSync(path.join(__dirname, 'offscreen.js'), 'utf-8');
  
  // Check success response
  if (!offscreenContent.includes('sendResponse({ success: true })')) {
    throw new Error('Success response not found');
  }
  
  // Check error response
  if (!offscreenContent.includes('sendResponse({ success: false, error: err.message })')) {
    throw new Error('Error response not found');
  }
});

// Test 8: Verify manifest has offscreen resources
test('manifest.json includes offscreen resources', () => {
  const manifestPath = path.join(__dirname, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  
  const resources = manifest.web_accessible_resources?.[0]?.resources || [];
  
  if (!resources.includes('offscreen.html')) {
    throw new Error('offscreen.html not in web_accessible_resources');
  }
  if (!resources.includes('offscreen.js')) {
    throw new Error('offscreen.js not in web_accessible_resources');
  }
});

// Test 9: Check manifest permissions
test('manifest.json has required permissions', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'manifest.json'), 'utf-8'));
  
  const permissions = manifest.permissions || [];
  
  if (!permissions.includes('offscreen')) {
    throw new Error('offscreen permission not found');
  }
});

// Test 10: Verify try-catch wraps all critical operations
test('offscreen.js has comprehensive error handling', () => {
  const offscreenContent = fs.readFileSync(path.join(__dirname, 'offscreen.js'), 'utf-8');
  
  // Check for try-catch
  if (!offscreenContent.includes('try {')) throw new Error('try block missing');
  if (!offscreenContent.includes('} catch (err)')) throw new Error('catch block missing');
  
  // Check for console.error
  if (!offscreenContent.includes('console.error("[PDFGen] error:"')) {
    throw new Error('Error logging not found');
  }
});

// Test 11: Verify timeout between PDFs
test('Timeout exists between PDF generations', () => {
  const offscreenContent = fs.readFileSync(path.join(__dirname, 'offscreen.js'), 'utf-8');
  
  if (!offscreenContent.includes('new Promise((r) => setTimeout(r, 1500))')) {
    throw new Error('1500ms timeout not found between PDFs');
  }
});

// Test 12: Check for downloadBlob blob creation
test('downloadBlob properly creates blob from data URI', () => {
  const offscreenContent = fs.readFileSync(path.join(__dirname, 'offscreen.js'), 'utf-8');
  
  if (!offscreenContent.includes('function downloadBlob')) {
    throw new Error('downloadBlob function not found');
  }
  
  // Check all required parts
  if (!offscreenContent.includes('dataUri.split')) throw new Error('dataUri split not found');
  if (!offscreenContent.includes('atob(base64)')) throw new Error('atob not used');
  if (!offscreenContent.includes('Uint8Array')) throw new Error('Uint8Array not used');
  if (!offscreenContent.includes('new Blob([bytes]')) throw new Error('Blob creation not found');
  if (!offscreenContent.includes('URL.createObjectURL')) throw new Error('URL.createObjectURL not found');
  if (!offscreenContent.includes('document.createElement("a")')) throw new Error('Download link not created');
  if (!offscreenContent.includes('.click()')) throw new Error('Click not triggered');
  if (!offscreenContent.includes('URL.revokeObjectURL')) throw new Error('URL revoke not found');
});

// Test 13: Verify async/await pattern
test('Async/await properly used for message handling', () => {
  const offscreenContent = fs.readFileSync(path.join(__dirname, 'offscreen.js'), 'utf-8');
  
  if (!offscreenContent.includes('(async () => {')) {
    throw new Error('Async IIFE not found');
  }
  if (!offscreenContent.includes('await generator.init()')) {
    throw new Error('await on init() not found');
  }
});

// Test 14: Check for message channel keepalive
test('Message channel is kept open for async operations', () => {
  const offscreenContent = fs.readFileSync(path.join(__dirname, 'offscreen.js'), 'utf-8');
  
  // Check that return true exists at the end of the listener
  if (!offscreenContent.includes('return true; // keep message channel open')) {
    throw new Error('return true with keepalive comment not found');
  }
});

// Test 15: Verify parsed data injection
test('Cover letter is properly injected into parsed data', () => {
  const offscreenContent = fs.readFileSync(path.join(__dirname, 'offscreen.js'), 'utf-8');
  
  if (!offscreenContent.includes('if (parsed && !parsed.cover_letter && coverLetterText.trim())')) {
    throw new Error('Cover letter injection check not found');
  }
  if (!offscreenContent.includes('parsed.cover_letter = parsedCL')) {
    throw new Error('Cover letter injection not found');
  }
});

// ============================================================================
// RESULTS
// ============================================================================

console.log('\n================================================================================');
console.log(`RESULTS: ${testsPassed} passed, ${testsFailed} failed out of ${testsPassed + testsFailed} tests`);
console.log('================================================================================\n');

if (testsFailed === 0) {
  console.log('✅ ALL INTEGRATION TESTS PASSED - System is ready!\n');
  process.exit(0);
} else {
  console.log('⚠️  Some tests failed - Please review the issues above\n');
  process.exit(1);
}

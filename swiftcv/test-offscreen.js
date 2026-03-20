/**
 * Test suite for offscreen.js
 * Tests the message handler and PDF generation flow
 */

const fs = require('fs');
const path = require('path');

console.log('================================================================================');
console.log('OFFSCREEN.JS TEST SUITE');
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
// TEST SUITE
// ============================================================================

// Test 1: Check offscreen.js exists
test('offscreen.js file exists', () => {
  const filePath = path.join(__dirname, 'offscreen.js');
  if (!fs.existsSync(filePath)) throw new Error('File not found');
});

// Test 2: Check offscreen.html exists and has correct scripts
test('offscreen.html loads scripts in correct order', () => {
  const filePath = path.join(__dirname, 'offscreen.html');
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Check for required scripts
  if (!content.includes('jspdf.umd.min.js')) throw new Error('jspdf.umd.min.js not found');
  if (!content.includes('pdfGenerator.js')) throw new Error('pdfGenerator.js not found');
  if (!content.includes('offscreen.js')) throw new Error('offscreen.js not found');
  
  // Check order
  const jspdfIndex = content.indexOf('jspdf.umd.min.js');
  const pdfGenIndex = content.indexOf('pdfGenerator.js');
  const offscreenIndex = content.indexOf('offscreen.js');
  
  if (jspdfIndex > pdfGenIndex) throw new Error('jspdf should load before pdfGenerator');
  if (pdfGenIndex > offscreenIndex) throw new Error('pdfGenerator should load before offscreen');
});

// Test 3: Check for chrome.runtime.onMessage listener
test('chrome.runtime.onMessage listener is registered', () => {
  const filePath = path.join(__dirname, 'offscreen.js');
  const content = fs.readFileSync(filePath, 'utf-8');
  
  if (!content.includes('chrome.runtime.onMessage.addListener')) {
    throw new Error('chrome.runtime.onMessage.addListener not found');
  }
});

// Test 4: Check for message action filter
test('Message handler checks for generateAndDownloadPDFs action', () => {
  const filePath = path.join(__dirname, 'offscreen.js');
  const content = fs.readFileSync(filePath, 'utf-8');
  
  if (!content.includes('message.action !== "generateAndDownloadPDFs"')) {
    throw new Error('Message action filter not found');
  }
});

// Test 5: Check for PDFGenerator instantiation
test('PDFGenerator is instantiated and initialized', () => {
  const filePath = path.join(__dirname, 'offscreen.js');
  const content = fs.readFileSync(filePath, 'utf-8');
  
  if (!content.includes('const generator = new PDFGenerator()')) {
    throw new Error('PDFGenerator instantiation not found');
  }
  if (!content.includes('await generator.init()')) {
    throw new Error('generator.init() not called');
  }
});

// Test 6: Check for _extractJSON calls
test('_extractJSON is called for parsing JSON', () => {
  const filePath = path.join(__dirname, 'offscreen.js');
  const content = fs.readFileSync(filePath, 'utf-8');
  
  if (!content.includes('_extractJSON')) {
    throw new Error('_extractJSON not called');
  }
  
  // Count calls
  const matches = content.match(/_extractJSON/g);
  if (matches.length < 2) throw new Error('_extractJSON called less than expected');
});

// Test 7: Check for generateResumePDF call
test('generateResumePDF method is called', () => {
  const filePath = path.join(__dirname, 'offscreen.js');
  const content = fs.readFileSync(filePath, 'utf-8');
  
  if (!content.includes('generator.generateResumePDF')) {
    throw new Error('generateResumePDF not called');
  }
});

// Test 8: Check for generateCoverLetterPDF call
test('generateCoverLetterPDF method is called', () => {
  const filePath = path.join(__dirname, 'offscreen.js');
  const content = fs.readFileSync(filePath, 'utf-8');
  
  if (!content.includes('generator.generateCoverLetterPDF')) {
    throw new Error('generateCoverLetterPDF not called');
  }
});

// Test 9: Check for downloadBlob function
test('downloadBlob function is defined', () => {
  const filePath = path.join(__dirname, 'offscreen.js');
  const content = fs.readFileSync(filePath, 'utf-8');
  
  if (!content.includes('function downloadBlob')) {
    throw new Error('downloadBlob function not defined');
  }
});

// Test 10: Check downloadBlob implementation
test('downloadBlob properly handles data URI conversion', () => {
  const filePath = path.join(__dirname, 'offscreen.js');
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Check for critical parts
  if (!content.includes('dataUri.split')) throw new Error('dataUri not split');
  if (!content.includes('atob(base64)')) throw new Error('base64 not decoded with atob');
  if (!content.includes('Uint8Array')) throw new Error('Uint8Array not used');
  if (!content.includes('new Blob')) throw new Error('Blob not created');
  if (!content.includes('URL.createObjectURL')) throw new Error('URL.createObjectURL not used');
});

// Test 11: Check for proper response handling
test('sendResponse is called with success/error', () => {
  const filePath = path.join(__dirname, 'offscreen.js');
  const content = fs.readFileSync(filePath, 'utf-8');
  
  if (!content.includes('sendResponse({ success: true })')) {
    throw new Error('Success response not found');
  }
  if (!content.includes('sendResponse({ success: false')) {
    throw new Error('Error response not found');
  }
});

// Test 12: Check for try-catch error handling
test('Try-catch block wraps async operations', () => {
  const filePath = path.join(__dirname, 'offscreen.js');
  const content = fs.readFileSync(filePath, 'utf-8');
  
  if (!content.includes('try {')) throw new Error('try block not found');
  if (!content.includes('} catch (err)')) throw new Error('catch block not found');
  if (!content.includes('console.error')) throw new Error('Error logging not found');
});

// Test 13: Check for async operation
test('Async/await is properly used', () => {
  const filePath = path.join(__dirname, 'offscreen.js');
  const content = fs.readFileSync(filePath, 'utf-8');
  
  if (!content.includes('(async () => {')) throw new Error('Async IIFE not found');
  if (!content.includes('await generator.init()')) throw new Error('await not used for init()');
});

// Test 14: Check for message channel keepalive
test('Message channel is kept open for async response', () => {
  const filePath = path.join(__dirname, 'offscreen.js');
  const content = fs.readFileSync(filePath, 'utf-8');
  
  if (!content.includes('return true')) {
    throw new Error('return true (keepalive) not found');
  }
});

// Test 15: Check for timeout between PDF generations
test('Timeout between resume and cover letter generation', () => {
  const filePath = path.join(__dirname, 'offscreen.js');
  const content = fs.readFileSync(filePath, 'utf-8');
  
  if (!content.includes('await new Promise((r) => setTimeout(r, 1500))')) {
    throw new Error('Timeout not found between PDF generations');
  }
});

// Test 16: Check for downloadBlob calls
test('downloadBlob is called for both resume and cover letter', () => {
  const filePath = path.join(__dirname, 'offscreen.js');
  const content = fs.readFileSync(filePath, 'utf-8');
  
  const matches = content.match(/downloadBlob\(/g);
  if (!matches || matches.length < 2) {
    throw new Error('downloadBlob not called for both documents');
  }
});

// Test 17: Check for logic to handle missing cover letter
test('Logic handles missing cover letter gracefully', () => {
  const filePath = path.join(__dirname, 'offscreen.js');
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Check for conditional generation
  if (!content.includes('if (hasCoverLetter ||')) {
    throw new Error('Cover letter generation condition not found');
  }
});

// Test 18: Check for fallback handling
test('Fallback logic handles legacy text format', () => {
  const filePath = path.join(__dirname, 'offscreen.js');
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Check for parsed object vs rawData fallback
  if (!content.includes('hasResume ? parsed : rawData')) {
    throw new Error('Resume fallback logic not found');
  }
});

// Test 19: Check for input validation
test('Input validation checks for empty data', () => {
  const filePath = path.join(__dirname, 'offscreen.js');
  const content = fs.readFileSync(filePath, 'utf-8');
  
  if (!content.includes('if (!hasResume && !rawData.trim())')) {
    throw new Error('Empty data validation not found');
  }
});

// Test 20: Check for pdfGenerator.js dependency
test('pdfGenerator.js is available', () => {
  const filePath = path.join(__dirname, 'pdfGenerator.js');
  if (!fs.existsSync(filePath)) throw new Error('pdfGenerator.js not found');
});

// ============================================================================
// RESULTS
// ============================================================================

console.log('\n================================================================================');
console.log(`RESULTS: ${testsPassed} passed, ${testsFailed} failed out of ${testsPassed + testsFailed} tests`);
console.log('================================================================================\n');

if (testsFailed === 0) {
  console.log('✅ ALL TESTS PASSED - offscreen.js is properly configured!\n');
  process.exit(0);
} else {
  console.log('⚠️  Some tests failed - Please review the issues above\n');
  process.exit(1);
}

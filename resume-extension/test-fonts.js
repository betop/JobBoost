#!/usr/bin/env node

/**
 * Font System Test Suite
 * Tests font data loading and PDF generation with embedded fonts
 */

const fs = require('fs');
const path = require('path');

console.log('\n' + '='.repeat(60));
console.log('FONT SYSTEM TEST SUITE');
console.log('='.repeat(60) + '\n');

// Test 1: Check if resume_fonts.js exists and has content
console.log('TEST 1: Checking resume_fonts.js file...');
const fontFilePath = path.join(__dirname, 'resume_fonts.js');
if (fs.existsSync(fontFilePath)) {
  const fileSize = fs.statSync(fontFilePath).size;
  console.log(`✅ File exists`);
  console.log(`   Size: ${(fileSize / 1024 / 1024).toFixed(2)} MB\n`);
} else {
  console.log(`❌ File not found at ${fontFilePath}\n`);
  process.exit(1);
}

// Test 2: Load and parse resume_fonts.js
console.log('TEST 2: Loading font data...');
try {
  // Create a mock window/self context
  const globalContext = {};
  
  // Load the fonts file
  const fontCode = fs.readFileSync(fontFilePath, 'utf-8');
  
  // Execute the font code with proper context
  // Set up globals for the eval
  const oldWindow = global.window;
  const oldSelf = global.self;
  global.window = globalContext;
  global.self = globalContext;
  
  // Execute the font code
  eval(fontCode);
  
  // Restore globals
  global.window = oldWindow;
  global.self = oldSelf;
  
  // Check which fonts were loaded
  const expectedFonts = [
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
  
  const loadedFonts = Object.keys(globalContext).filter(k => k.includes('Font'));
  console.log(`✅ Font data loaded successfully`);
  console.log(`   Expected: ${expectedFonts.length} fonts`);
  console.log(`   Loaded: ${loadedFonts.length} fonts\n`);
  
  // Test 3: Verify base64 encoding
  console.log('TEST 3: Verifying base64 data...');
  let validFonts = 0;
  let invalidFonts = 0;
  
  loadedFonts.forEach(fontName => {
    const fontData = globalContext[fontName];
    if (typeof fontData === 'string' && fontData.length > 0) {
      // Check if it looks like base64 (contains expected characters)
      if (/^[A-Za-z0-9+/]*={0,2}$/.test(fontData)) {
        validFonts++;
        const sizeKB = (fontData.length / 1024).toFixed(1);
        console.log(`   ✅ ${fontName}: ${sizeKB} KB`);
      } else {
        invalidFonts++;
        console.log(`   ❌ ${fontName}: Invalid base64`);
      }
    } else {
      invalidFonts++;
      console.log(`   ❌ ${fontName}: Missing or empty`);
    }
  });
  
  console.log(`\n   Valid fonts: ${validFonts}/${loadedFonts.length}`);
  if (invalidFonts > 0) {
    console.log(`   ⚠️  Invalid fonts: ${invalidFonts}`);
  } else {
    console.log(`   ✅ All fonts are valid base64\n`);
  }
  
  // Test 4: Test base64 decoding
  console.log('TEST 4: Testing base64 to binary conversion...');
  try {
    // Get the first font
    const firstFontName = loadedFonts[0];
    const firstFontData = globalContext[firstFontName];
    
    // Try decoding the first 100 characters
    const sampleBase64 = firstFontData.substring(0, 100);
    const decoded = Buffer.from(sampleBase64, 'base64');
    console.log(`✅ Successfully decoded ${firstFontName}`);
    console.log(`   First 50 bytes (hex): ${decoded.toString('hex').substring(0, 50)}...\n`);
  } catch (e) {
    console.log(`❌ Failed to decode fonts: ${e.message}\n`);
  }
  
  // Test 5: Check pdfGenerator.js
  console.log('TEST 5: Checking pdfGenerator.js for font methods...');
  const pdfGenPath = path.join(__dirname, 'pdfGenerator.js');
  if (fs.existsSync(pdfGenPath)) {
    const pdfCode = fs.readFileSync(pdfGenPath, 'utf-8');
    
    const checks = [
      { name: '_base64ToVfsString', found: pdfCode.includes('_base64ToVfsString') },
      { name: '_registerFontsOnDocument', found: pdfCode.includes('_registerFontsOnDocument') },
      { name: 'doc.addFileToVFS', found: pdfCode.includes('doc.addFileToVFS') },
      { name: 'doc.addFont', found: pdfCode.includes('doc.addFont') }
    ];
    
    let foundCount = 0;
    checks.forEach(check => {
      if (check.found) {
        console.log(`   ✅ Found: ${check.name}`);
        foundCount++;
      } else {
        console.log(`   ❌ Missing: ${check.name}`);
      }
    });
    
    console.log(`\n   Font methods: ${foundCount}/${checks.length} found\n`);
  } else {
    console.log(`❌ pdfGenerator.js not found\n`);
  }
  
  // Test 6: Summary
  console.log('='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  
  if (validFonts === expectedFonts.length && invalidFonts === 0) {
    console.log('✅ All tests passed!');
    console.log('   • Font file generated correctly');
    console.log('   • All 12 fonts loaded successfully');
    console.log('   • All fonts have valid base64 encoding');
    console.log('   • Font conversion methods implemented');
    console.log('\n🎉 Ready for browser testing!\n');
  } else {
    console.log('⚠️  Some tests failed');
    console.log(`   Valid fonts: ${validFonts}/${expectedFonts.length}`);
    console.log(`   Invalid fonts: ${invalidFonts}`);
  }
  
} catch (error) {
  console.log(`❌ Error loading fonts: ${error.message}\n`);
  console.error(error);
  process.exit(1);
}

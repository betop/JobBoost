#!/usr/bin/env node

/**
 * Font Converter Script
 * Converts TTF font files to jsPDF-compatible JavaScript modules
 * Usage: node convert-fonts.js <input-ttf-path> <font-name> <font-family> <font-style>
 * Example: node convert-fonts.js fonts/Inter_18pt-Regular.ttf Inter_18pt_Regular Inter-18pt normal
 */

const fs = require('fs');
const path = require('path');

function convertTTFtoJS(ttfPath, fontName, fontFamily, fontStyle = 'normal') {
  try {
    // Read the TTF file
    const ttfBuffer = fs.readFileSync(ttfPath);
    
    // Convert to base64
    const base64Font = ttfBuffer.toString('base64');
    
    // Determine output filename
    const outputFileName = `${fontName}.js`;
    const outputPath = path.join(path.dirname(ttfPath), outputFileName);
    
    // Create the JavaScript module
    const jsContent = `import { jsPDF } from "jspdf"

var font = "${base64Font}"

var callAddFont = function () {
  this.addFileToVFS('${fontName}.ttf', font);
  this.addFont('${fontName}.ttf', '${fontFamily}', '${fontStyle}');
};
jsPDF.API.events.push(['addFonts', callAddFont])
`;
    
    // Write the JS file
    fs.writeFileSync(outputPath, jsContent);
    
    console.log(`✓ Successfully converted: ${ttfPath}`);
    console.log(`  → Output: ${outputPath}`);
    console.log(`  → Font Family: ${fontFamily}`);
    console.log(`  → Font Style: ${fontStyle}`);
    console.log(`  → Size: ${(base64Font.length / 1024).toFixed(2)} KB`);
    
    return outputPath;
  } catch (error) {
    console.error(`✗ Error converting ${ttfPath}:`, error.message);
    return null;
  }
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Font Converter for jsPDF');
    console.log('------------------------');
    console.log('Usage: node convert-fonts.js <ttf-path> <font-name> [font-family] [font-style]');
    console.log('');
    console.log('Examples:');
    console.log('  node convert-fonts.js fonts/Inter_18pt-Regular.ttf Inter_18pt_Regular');
    console.log('  node convert-fonts.js fonts/Inter_18pt-Bold.ttf Inter_18pt_Bold Inter-18pt bold');
    console.log('');
    console.log('Parameters:');
    console.log('  ttf-path:     Path to TTF font file');
    console.log('  font-name:    Name for the output JS file (without .js)');
    console.log('  font-family:  CSS font-family name (defaults to font-name)');
    console.log('  font-style:   CSS font-style: normal|italic|bold (defaults to "normal")');
    process.exit(1);
  }
  
  const ttfPath = args[0];
  const fontName = args[1];
  const fontFamily = args[2] || fontName;
  const fontStyle = args[3] || 'normal';
  
  if (!fs.existsSync(ttfPath)) {
    console.error(`✗ File not found: ${ttfPath}`);
    process.exit(1);
  }
  
  convertTTFtoJS(ttfPath, fontName, fontFamily, fontStyle);
}

module.exports = { convertTTFtoJS };

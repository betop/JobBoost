// Internal script — generates resume_fonts.js with embedded base64 font data
const fs = require('fs');
const path = require('path');

const base = path.resolve(__dirname, '..');

const fontMap = [
  // Original fonts
  { global: 'montserratRegularFont',      file: 'fonts/Montserrat/static/Montserrat-Regular.ttf' },
  { global: 'montserratBoldFont',         file: 'fonts/Montserrat/static/Montserrat-Bold.ttf' },
  { global: 'latoRegularFont',            file: 'fonts/Lato/Lato-Regular.ttf' },
  { global: 'latoBoldFont',               file: 'fonts/Lato/Lato-Bold.ttf' },
  { global: 'robotoRegularFont',          file: 'fonts/Roboto/static/Roboto-Regular.ttf' },
  { global: 'robotoBoldFont',             file: 'fonts/Roboto/static/Roboto-Bold.ttf' },
  { global: 'poppinsRegularFont',         file: 'fonts/Poppins/Poppins-Regular.ttf' },
  { global: 'poppinsBoldFont',            file: 'fonts/Poppins/Poppins-Bold.ttf' },
  { global: 'interRegularFont',           file: 'fonts/Inter/static/Inter_18pt-Regular.ttf' },
  { global: 'interBoldFont',              file: 'fonts/Inter/static/Inter_18pt-Bold.ttf' },
  { global: 'sourceSans3RegularFont',     file: 'fonts/Source_Sans_3/static/SourceSans3-Regular.ttf' },
  { global: 'sourceSans3BoldFont',        file: 'fonts/Source_Sans_3/static/SourceSans3-Bold.ttf' },
  // New professional fonts
  { global: 'dmSansRegularFont',          file: 'fonts/DM_Sans/static/DMSans-Regular.ttf' },
  { global: 'dmSansBoldFont',             file: 'fonts/DM_Sans/static/DMSans-Bold.ttf' },
  { global: 'ibmPlexSansRegularFont',     file: 'fonts/IBM_Plex_Sans/static/IBMPlexSans-Regular.ttf' },
  { global: 'ibmPlexSansBoldFont',        file: 'fonts/IBM_Plex_Sans/static/IBMPlexSans-Bold.ttf' },
  { global: 'outfitRegularFont',          file: 'fonts/Outfit/static/Outfit-Regular.ttf' },
  { global: 'outfitBoldFont',             file: 'fonts/Outfit/static/Outfit-Bold.ttf' },
  { global: 'plusJakartaSansRegularFont', file: 'fonts/Plus_Jakarta_Sans/static/PlusJakartaSans-Regular.ttf' },
  { global: 'plusJakartaSansBoldFont',    file: 'fonts/Plus_Jakarta_Sans/static/PlusJakartaSans-Bold.ttf' },
];

let out = '// Auto-generated font data for jsPDF — DO NOT EDIT\n';
out += '(function() {\n';
out += '  var ctx = typeof window !== "undefined" ? window : self;\n';

let ok = 0;
for (const { global: g, file: f } of fontMap) {
  const p = path.join(base, f);
  if (!fs.existsSync(p)) { console.error('MISSING:', p); continue; }
  const b64 = fs.readFileSync(p).toString('base64');
  out += '  ctx.' + g + ' = "' + b64 + '";\n';
  console.log('OK:', g, '(' + Math.round(b64.length / 1024) + ' KB)');
  ok++;
}

out += '})();\n';
const outPath = path.join(base, 'resume_fonts.js');
fs.writeFileSync(outPath, out, 'utf8');
const size = fs.statSync(outPath).size;
console.log('Done. Fonts: ' + ok + '/' + fontMap.length + '. File: ' + Math.round(size / 1024) + ' KB');

// Test that fonts are loaded
const ctx = typeof window !== 'undefined' ? window : self;

console.log('Testing font data availability...');
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
  'sourceSans3BoldFont',
];

let loaded = 0;
let missing = 0;

expectedFonts.forEach(font => {
  if (ctx[font]) {
    console.log(`✓ ${font}`);
    loaded++;
  } else {
    console.log(`✗ ${font} - MISSING`);
    missing++;
  }
});

console.log(`\nResult: ${loaded}/12 fonts loaded`);
if (missing > 0) {
  console.error(`ERROR: ${missing} fonts missing!`);
}

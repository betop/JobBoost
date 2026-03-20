# Icon Conversion Instructions

The extension includes SVG icon files in the `icons/` directory. Chrome extensions require PNG format icons.

## Convert SVG to PNG

### Option 1: Using Online Tools
1. Go to https://cloudconvert.com/svg-to-png
2. Upload each SVG file (icon16.svg, icon48.svg, icon128.svg)
3. Set output size to match filename (16x16, 48x48, 128x128)
4. Convert and download

### Option 2: Using ImageMagick (Command Line)
```bash
# Install ImageMagick if not already installed
# macOS: brew install imagemagick
# Ubuntu: sudo apt-get install imagemagick

# Convert each icon
convert -background none icons/icon16.svg -resize 16x16 icons/icon16.png
convert -background none icons/icon48.svg -resize 48x48 icons/icon48.png
convert -background none icons/icon128.svg -resize 128x128 icons/icon128.png
```

### Option 3: Using Inkscape (Command Line)
```bash
# Install Inkscape if not already installed

# Convert each icon
inkscape icons/icon16.svg --export-filename=icons/icon16.png --export-width=16 --export-height=16
inkscape icons/icon48.svg --export-filename=icons/icon48.png --export-width=48 --export-height=48
inkscape icons/icon128.svg --export-filename=icons/icon128.png --export-width=128 --export-height=128
```

### Option 4: Using Adobe Illustrator or Figma
1. Open each SVG file
2. Export as PNG at the correct size
3. Save to icons/ directory

## Note
The extension will work with the SVG files on some systems, but PNG is the standard format for Chrome extensions and ensures maximum compatibility.

## Custom Icons
To use your own custom icons:
1. Create or design icons in your preferred tool
2. Export as SVG or PNG
3. Ensure sizes are exactly 16x16, 48x48, and 128x128 pixels
4. Replace the files in the icons/ directory
5. Keep the same filenames

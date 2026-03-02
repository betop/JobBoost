# Resume Generator - Browser Extension

A Chrome browser extension that generates customized resumes and cover letters from job descriptions using AI, with PDF generation happening entirely in the browser.

## Features

- 🔐 **Secure Token Authentication** - Token-based access for bidders
- 📄 **PDF Generation** - Client-side PDF generation using jsPDF
- 🎯 **Context Menu Integration** - Right-click to generate resumes
- 💾 **No Server Storage** - PDFs generated and downloaded locally
- ⚡ **Fast Generation** - Instant PDF creation in the browser
- 🔒 **Privacy First** - No resume data stored on servers

## Installation

### Development Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked"
4. Select the `resume-extension` folder

### Configure Your Token

1. Open the `token.json` file in the extension folder
2. Add your access token:
```json
{
  "token": "YOUR_ACCESS_TOKEN_HERE"
}
```
3. Reload the extension in Chrome

## Usage

### First Time Setup

1. After adding your token, reload the extension
2. A confirmation window will appear showing your profile name
3. Click "Confirm & Activate" to enable the extension

### Generating Resumes

1. Navigate to any job posting webpage
2. Select the job description text
3. Right-click on the selection
4. Click "Generate Resume and Cover Letter"
5. Wait for the PDFs to be generated (usually 5-10 seconds)
6. PDFs will automatically download to your default downloads folder

### Checking Status

1. Click the extension icon in the Chrome toolbar
2. View your activation status and profile information
3. Use "Refresh Status" to update the information

## File Structure

```
resume-extension/
├── manifest.json           # Extension configuration
├── token.json             # User's access token (configured by user)
├── background.js          # Background service worker
├── content.js             # Content script for PDF generation
├── pdfGenerator.js        # Enhanced PDF formatting
├── confirm.html           # Profile confirmation page
├── confirm.js             # Confirmation logic
├── popup.html             # Extension popup UI
├── popup.js               # Popup logic
├── styles.css             # Styling for all pages
└── icons/                 # Extension icons
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## How It Works

### 1. Token Validation
- Extension reads token from `token.json`
- Sends token to backend for validation
- Stores profile information locally

### 2. Profile Confirmation
- Shows confirmation window with profile name
- User confirms to activate the extension
- Enables context menu functionality

### 3. Resume Generation
- User selects job description text
- Right-click menu triggers generation
- Background script sends request to backend with:
  - Access token
  - Profile ID
  - Job description
- Backend returns:
  - Resume text
  - Cover letter text
  - Suggested filenames

### 4. PDF Generation
- Content script receives text from background
- Loads jsPDF library dynamically
- Formats text with proper styling
- Generates two PDFs locally
- Automatically downloads both files

## API Requirements

The extension expects the following backend endpoints:

### Token Validation
```
POST /api/public/validate-token
Headers: Authorization: Bearer <token>
Response: { profile_id, profile_name }
```

### Resume Generation
```
POST /api/resume/generate
Headers: Authorization: Bearer <token>
Body: { profile_id, job_description }
Response: {
  resume_text,
  cover_letter_text,
  resume_filename,
  cover_letter_filename
}
```

## Permissions

The extension requires the following permissions:

- **contextMenus** - Add "Generate Resume" to right-click menu
- **storage** - Store token and profile information locally
- **downloads** - Automatically download generated PDFs
- **host_permissions** - Access to backend API

## Privacy & Security

### What's Stored Locally
- Access token (in token.json)
- Profile ID
- Profile name
- Confirmation status

### What's NOT Stored
- Job descriptions
- Generated resumes
- Cover letters
- Any user-generated content

### Security Features
- Token sent via Authorization header
- HTTPS recommended for API communication
- No sensitive data persists after PDF generation

## Troubleshooting

### Extension Not Working
1. Check that token.json contains a valid token
2. Verify backend API is running
3. Check browser console for errors
4. Reload the extension

### Token Validation Failed
1. Ensure token is correct
2. Check token hasn't expired
3. Verify backend API URL is correct

### PDF Generation Issues
1. Check that jsPDF loaded successfully
2. Verify text format from backend
3. Check browser downloads settings

### Context Menu Not Appearing
1. Confirm profile is activated
2. Verify you've selected text
3. Check extension permissions

## Development

### Update API URL
Edit `background.js` and change:
```javascript
const API_BASE_URL = "https://your-backend-url.com/api";
```

### Customize PDF Formatting
Edit `pdfGenerator.js` to modify:
- Font sizes
- Margins
- Section styling
- Line spacing

### Add New Features
- Modify `manifest.json` for new permissions
- Update `background.js` for background tasks
- Update `content.js` for page interactions

## Version History

### 1.0.0 (Current)
- Initial release
- Token-based authentication
- Context menu integration
- Client-side PDF generation
- Profile confirmation flow

## Technical Details

### jsPDF Integration
- Loaded dynamically via CDN
- No local dependencies required
- Version 2.5.1

### Chrome Extension Manifest V3
- Service worker instead of background page
- Updated permissions model
- Modern Chrome extension architecture

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review browser console logs
3. Verify backend API is responding correctly

## License

Part of the Resume Generator Application system.

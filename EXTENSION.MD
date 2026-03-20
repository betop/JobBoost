# SwiftCV Browser Extension – Technical Specification (PDF Generated in Frontend)

## Overview

This extension allows bidders to:

1. Install extension
2. Add assigned token into token.json
3. Confirm profile activation
4. Select job description text
5. Right-click → Generate Resume and Cover Letter
6. Receive generated text from backend
7. Convert text to PDF locally
8. Automatically download both PDF files

Backend remains stateless.

---

# 1. Technology Stack

- Manifest V3
- JavaScript or TypeScript
- Chrome Extension API
- jsPDF (or pdf-lib)
- Fetch API
- Chrome Downloads API

---

# 2. Project Structure

```
swiftcv/
│
├── manifest.json
├── token.json
├── background.js
├── content.js
├── confirm.html
├── confirm.js
├── popup.html
├── popup.js
├── pdfGenerator.js
└── styles.css
```

---

# 3. token.json

User manually inserts assigned token:

```json
{
  "token": "ASSIGNED_ACCESS_TOKEN"
}
```

---

# 4. Activation Flow

## Step 1 – Extension Loads

background.js:

- Read token.json
- Send token to backend:
  POST /public/validate-token

If valid:
- Store profile_id
- Store profile_name
- Show confirmation window

---

## Step 2 – Confirmation Window

confirm.html displays:

- Profile Name
- Confirm Button

On confirm:
- Store is_confirmed = true
- Enable context menu

---

# 5. Context Menu Setup

On extension activation:

```javascript
chrome.contextMenus.create({
  id: "generate_resume",
  title: "Generate Resume and Cover Letter",
  contexts: ["selection"]
});
```

---

# 6. Job Description Flow

1. User selects job description text.
2. Right-click.
3. Click "Generate Resume and Cover Letter".
4. background.js captures selection.

```javascript
chrome.contextMenus.onClicked.addListener((info) => {
    const selectedText = info.selectionText;
    sendGenerateRequest(selectedText);
});
```

---

# 7. Backend Request

POST /resume/generate

Headers:
Authorization: Bearer <token>

Body:

```json
{
  "profile_id": "uuid",
  "job_description": "selected text"
}
```

---

# 8. Backend Response (Text Only)

```json
{
  "resume_text": "formatted resume content",
  "cover_letter_text": "formatted cover letter content",
  "resume_filename": "Resume_John_Doe.pdf",
  "cover_letter_filename": "Cover_Letter_John_Doe.pdf"
}
```

No Base64.
No PDF from backend.

---

# 9. PDF Generation in Extension

Use jsPDF.

## 9.1 pdfGenerator.js

Responsibilities:

- Format text into structured layout
- Handle line wrapping
- Handle page breaks
- Apply margins
- Set font styles

Example flow:

1. Create new jsPDF instance
2. Set font size
3. Split text into lines
4. Add text with y-position control
5. Add new page if overflow
6. Save file

---

# 10. Resume PDF Layout Structure

Recommended Layout:

Header:
- Full Name (bold, large font)
- Email
- Phone
- Location
- LinkedIn

Sections:
- Summary
- Experience
- Education

Formatting rules:
- Section title bold
- Bullet points
- Proper spacing
- Consistent margins

---

# 11. Cover Letter PDF Layout

Structure:

- Date
- Hiring Manager (optional)
- Company
- Body paragraphs
- Signature

Margins consistent with resume.

---

# 12. Automatic Download

After generating PDF:

```javascript
doc.save(filename);
```

Chrome will auto-download.

No server storage.
No local storage needed.

---

# 13. Error Handling

Handle:

- No text selected
- Invalid token
- Backend error
- AI timeout
- Network failure

Display popup notification for errors.

---

# 14. State Storage (chrome.storage.local)

```
{
  token,
  profile_id,
  profile_name,
  is_confirmed
}
```

---

# 15. Security

- Token never exposed in UI
- Token sent via Authorization header
- No resume stored in extension
- Generated text not persisted

---

# 16. Performance Considerations

PDF generation is fast.
Even large resumes render instantly.

No backend PDF rendering means:

- Faster backend response
- Lower Xano execution time
- Less timeout risk
- Lower memory usage

---

# 17. Full Architecture

User
  ↓
Extension
  - Select job description
  - Send to backend
  ↓
Xano
  - Validate token
  - Fetch profile
  - Fetch rules
  - Call AI
  - Return text
  ↓
Extension
  - Generate PDF locally
  - Download files

---

# 18. Advantages of Frontend PDF Generation

- Backend remains lightweight
- Free plan safe
- No file storage costs
- Lower latency
- Better scalability
- Cleaner architecture

---

End of Updated Extension Specification

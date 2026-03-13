# Gmail AI Auto-Triage Chrome Extension

---

## 1. System Overview

### Goal

The extension:

- Reads unread Gmail messages
- Sends content to a backend analyze API
- Decides whether to:
  - Mark as read
  - Star
  - Keep unread

Gmail access runs in-browser; AI classification is delegated to backend API.

---

## 2. Architecture

### Type
Chrome Extension (Manifest v3)

### External APIs
- Gmail REST API
- Xano public analyze API

### Storage
- `chrome.storage.local` (API keys and user preferences only)

---

## 3. High-Level Flow

1. User installs extension
2. User authenticates via Google OAuth
3. Extension retrieves emails in the selected date range
4. If using OpenAI (default):
  - Uploads all emails into a Vector Store as a text file
  - Asks the Assistants API to classify IDs in batches of 50 (no email bodies are sent in the per-batch question)
5. AI returns classifications
6. Extension modifies Gmail labels accordingly

---

## 4. Required Credentials

### Google Cloud
- Gmail API enabled
- OAuth 2.0 Client ID
- Scope:

`https://www.googleapis.com/auth/gmail.modify`

Notes:
- This extension uses `chrome.identity.getAuthToken()`.
- You must set your OAuth Client ID in `manifest.json` at `oauth2.client_id`.

### AI Provider
- Backend uses Claude Haiku 4.5 via Anthropic API
- Anthropic key is stored server-side in Xano env (`ANTHROPIC_API_KEY`)

Extension reads backend URL from `config.json`.

---

## 5. Setup (Dev)

1. In Google Cloud Console:
  - Create/choose a project
  - Enable **Gmail API**
  - Configure **OAuth consent screen** (add yourself as a test user if needed)
  - Create an **OAuth Client ID** suitable for a Chrome extension

2. Update `manifest.json`:
  - Replace `oauth2.client_id` with your client ID
  - Keep the scope as `https://www.googleapis.com/auth/gmail.modify`

3. Load the extension:
  - Chrome → `chrome://extensions`
  - Enable **Developer mode**
  - **Load unpacked** → select this folder

4. Configure backend:
  - Set `backendApiUrl` in `config.json`
  - Optional: set `backendApiKey` if your endpoint validates a custom key header

---

## 6. Usage

1. Click the extension icon
2. Pick a date range
3. Click **Check**

Backend settings:
- `backendApiUrl` points to your Xano endpoint (for example `.../public/gmail-analyze`)

Actions applied:
- `MARK_READ`: removes `UNREAD`
- `STAR`: adds `STARRED` and removes `UNREAD`
- `KEEP_UNREAD`: ensures `UNREAD`

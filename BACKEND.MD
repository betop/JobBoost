# Resume Generator – Backend Technical Specification (Xano – Final Stateless Version)

## 1. System Overview

Backend is implemented using Xano.

This backend:

- Manages Admin Panel
- Manages Bidders & Profiles
- Handles token-based bidder authentication
- Applies global sentence-based rules
- Generates resume & cover letter text via AI
- Returns structured text response
- Does NOT store generated resumes or cover letters
- Does NOT generate PDFs
- Does NOT store job descriptions

PDF conversion and download are handled entirely by the browser extension.

---

## 2. Architecture

System Flow:

Browser Extension
   ↓
Xano Backend
   - Validate token
   - Fetch profile
   - Fetch rules
   - Call AI provider
   - Return resume_text + cover_letter_text
   ↓
Extension
   - Convert text → PDF
   - Download locally

Stateless backend.
No file persistence.

---

## 3. Database Schema

All primary keys: UUID.

---

### 3.1 admin

- id
- email (unique)
- password (hashed)
- created_at
- updated_at

---

### 3.2 profile

- id
- full_name
- email
- phone_number (optional)
- location (optional)
- linkedin_url (optional)
- github_url (optional)
- summary (optional)
- created_at
- updated_at

---

### 3.3 education

- id
- profile_id (relation → profile.id)
- university_name (optional)
- degree_title
- field_of_study (optional)
- start_date
- end_date (optional)
- location (optional)

---

### 3.4 work_experience

- id
- profile_id (relation → profile.id)
- job_title
- company_name (optional)
- employment_type (optional)
- location (optional)
- start_date
- end_date (optional)
- is_current (boolean)
- description (optional)

---

### 3.5 bidder

- id
- full_name
- email (unique)
- profile_id (relation → profile.id)
- is_active (boolean)
- created_at
- updated_at

Constraint:
One bidder → One profile.

---

### 3.6 access_token

- id
- token_hash
- bidder_id
- issued_at
- expires_at (optional)
- is_active (boolean)
- is_used (boolean)

Important:
Store only hashed tokens.

---

### 3.7 rule

- id
- sentence (text)
- target_section (text)
- is_active (boolean)
- created_at
- updated_at

Each rule represents one sentence.

---

### 3.8 generation_log (optional)

For analytics only.

- id
- bidder_id
- profile_id
- timestamp
- status
- error_message (optional)

No resume text stored.

---

## 4. Authentication Design

### 4.1 Admin Authentication

Uses Xano built-in JWT authentication.

Endpoints:
POST /auth/login

All /admin/* endpoints require JWT.

---

### 4.2 Bidder Authentication (Token-Based)

No password login for bidders.

Browser extension sends token.

Validation process:

1. Hash incoming token
2. Compare with access_token.token_hash
3. Verify:
   - is_active = true
   - not expired
4. Fetch bidder
5. Fetch profile

Return:

{
  valid: true,
  profile_id,
  profile_name
}

---

## 5. API Groups

- auth
- admin
- public
- resume

---

## 6. Resume Generation Endpoint

POST /resume/generate

Headers:
Authorization: Bearer <token>

Body:

{
  profile_id,
  job_description
}

---

## 7. Resume Generation Execution Flow

1. Extract token from Authorization header
2. Hash token
3. Validate token in access_token table
4. Fetch bidder
5. Validate profile ownership
6. Fetch profile
7. Fetch education records
8. Fetch work_experience records
9. Fetch active rules
10. Truncate job_description (recommended max 5000 chars)
11. Build AI prompt
12. Call AI provider (OpenAI or similar)
13. Receive AI response
14. Return structured JSON response

No database write.
No file storage.
No PDF generation.

---

## 8. AI Prompt Structure

System:
"You are generating a professional resume and cover letter tailored to a job description."

User:

Profile Information:
...

Education:
...

Work Experience:
...

Job Description:
...

Rules:
1. rule sentence
2. rule sentence
3. rule sentence

Prompt must:
- Avoid storing user input
- Be size-limited
- Use clear formatting markers

---

## 9. Response Format

Return:

{
  "resume_text": "string",
  "cover_letter_text": "string",
  "resume_filename": "Resume_John_Doe.pdf",
  "cover_letter_filename": "Cover_Letter_John_Doe.pdf"
}

Text only.

Extension converts to PDF.

---

## 10. Performance & Limits

Expected Load:
- 6000 API calls/month
- ~5 concurrent calls max
- Stateless execution

This is safe for Xano Free Plan if:

- No PDF generation on backend
- No file storage
- AI response under ~20 seconds

---

## 11. Security

- Tokens hashed
- Rate limit /resume/generate
- Validate job description length
- Restrict CORS
- No resume persistence
- No job description storage
- No file storage

Privacy-safe architecture.

---

## 12. Error Handling

Return structured errors:

{
  success: false,
  error: "TOKEN_INVALID"
}

Possible errors:

- TOKEN_INVALID
- TOKEN_EXPIRED
- PROFILE_NOT_FOUND
- AI_TIMEOUT
- AI_ERROR
- INVALID_INPUT

---

## 13. Resource Efficiency

This backend:

- Performs read-only DB operations
- Makes one external AI call
- Returns JSON
- Does not use storage
- Does not write files
- Does not encode Base64
- Does not persist content

Optimized for free tier usage.

---

## 14. Full Operational Flow

Admin:
- Create profile
- Create bidder
- Generate token
- Define rules

Bidder:
- Install extension
- Insert token.json
- Validate token
- Select job description
- Generate resume

Backend:
- Validate token
- Fetch profile & rules
- Call AI
- Return text

Extension:
- Convert text to PDF
- Download locally

---

## 15. Design Philosophy

Backend is:

- Stateless
- Lightweight
- Privacy-focused
- Free-plan compatible
- AI-powered
- Scalable later if needed

---

End of Final Backend Specification

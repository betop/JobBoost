# SwiftCV Application - System Summary

## 1. Purpose

This application allows approved bidders to generate a customized resume and tailored cover letter based on their stored professional profile, a selected job description, and admin-defined improvement rules.

Generated documents are downloaded locally as PDF files and are not stored on the backend.

---

## 2. Core Architecture

The system consists of three main components:

### A. Admin Panel (Web Application)

Used to manage:
- Profiles
- Bidders
- Access tokens
- Global sentence-based rules that guide resume generation

### B. Backend (Xano - Stateless)

Handles:
- Token validation
- Profile retrieval
- Rule retrieval
- AI prompt construction
- AI provider integration
- Returning structured resume and cover letter text

The backend does **not**:
- Store resumes
- Generate PDFs
- Retain job descriptions

### C. Browser Extension

Used by bidders to:
- Select job descriptions on any webpage
- Request resume generation
- Receive generated text
- Convert it to PDF locally
- Automatically download the files

---

## 3. Authentication Model

- Admin authentication via JWT
- Bidder authentication via token-based access
- Tokens are securely hashed in the backend
- One bidder manages exactly one profile

---

## 4. Rule Engine

Admins define improvement rules as individual sentences.

These rules:
- Are dynamically injected into the AI prompt
- Enhance resume and cover letter quality
- Are global
- Are not executed as code

---

## 5. Resume Generation Flow

1. Validate token  
2. Fetch profile, education, and work experience data  
3. Fetch active rules  
4. Combine with selected job description  
5. Build structured AI prompt  
6. Call AI provider  
7. Return `resume_text` and `cover_letter_text`  
8. Extension converts text to PDF and downloads locally  

---

## 6. Key Design Principles

- Stateless backend architecture
- No resume or document storage
- No server-side PDF generation
- Privacy-focused system design
- Optimized for low concurrency and free-tier backend usage

---

## 7. Privacy Model

No resumes, job descriptions, or generated documents are stored on the backend.

All generated files exist only locally on the user’s device.

---

## 8. Scalability

The system is designed for MVP and moderate usage levels.

It can be scaled later by:
- Upgrading backend infrastructure
- Adding quotas
- Introducing resume versioning if needed

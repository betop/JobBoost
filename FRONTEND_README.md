# Resume Generator Application - Frontend Implementation

A comprehensive system for generating customized resumes and cover letters based on professional profiles and job descriptions.

## Overview

This repository contains the **frontend implementation** of the Resume Generator Application, consisting of two main components:

1. **Admin Panel** - Web-based management interface (Next.js)
2. **Browser Extension** - Chrome extension for end-users (Manifest V3)

## 🏗️ Architecture

```
Frontend Components:
├── Admin Panel (Next.js + TypeScript)
│   └── Manages profiles, bidders, tokens, rules
│
└── Browser Extension (Chrome Manifest V3)
    └── Generates resumes from job descriptions

Backend (Not Included):
└── Xano or Custom API
    └── Token validation, AI integration, data retrieval
```

## 📦 Projects Included

### 1. Admin Panel (`admin-panel/`)

**Technology Stack:**
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- TanStack Query
- Zustand
- React Hook Form + Zod

**Features:**
- 👥 Profile management with education & work experience
- 🎯 Bidder account management
- 🔑 Token generation and management
- 📋 Rule engine for resume improvement
- 🛡️ Access control management
- 📊 Dashboard with statistics
- 🔍 Advanced search and filtering

**Quick Start:**
```bash
cd admin-panel
npm install
npm run dev
```

See [admin-panel/README.md](./admin-panel/README.md) for detailed documentation.

### 2. Browser Extension (`resume-extension/`)

**Technology:**
- Chrome Extension Manifest V3
- Vanilla JavaScript
- jsPDF for PDF generation

**Features:**
- 🔐 Token-based authentication
- 📄 Client-side PDF generation
- 🎯 Context menu integration
- 💾 No server-side storage
- ⚡ Instant PDF creation
- 🔒 Privacy-focused design

**Installation:**
1. Open `chrome://extensions/`
2. Enable Developer mode
3. Load unpacked extension
4. Configure `token.json` with your access token

See [resume-extension/README.md](./resume-extension/README.md) for detailed documentation.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ (for Admin Panel)
- npm or yarn or pnpm
- Chrome browser (for Extension)
- Backend API running (see Backend documentation)

### Environment Setup

1. **Admin Panel:**
```bash
cd admin-panel
cp .env.example .env.local
# Edit .env.local with your API URL
npm install
npm run dev
```

2. **Browser Extension:**
```bash
cd resume-extension
# Edit token.json with your access token
# Load in Chrome as unpacked extension
```

## 📋 Features Overview

### Admin Panel Features

#### Profile Management
- Create comprehensive professional profiles
- Add multiple education entries
- Add multiple work experiences
- Contact information and social links
- Professional summary

#### Bidder Management
- Create bidder accounts
- Assign profiles to bidders
- Activate/deactivate accounts
- Password management

#### Token Management
- Generate access tokens
- Set expiration dates
- Copy tokens to clipboard
- Revoke active tokens
- Track usage

#### Rules Management
- Create improvement rules as sentences
- Target specific sections (summary, experience, education, skills, global)
- Enable/disable rules
- 1000 character limit per rule

#### Access Control
- View all access permissions
- Revoke bidder access
- Manage expiration dates

### Browser Extension Features

#### Token Authentication
- Secure token-based access
- Profile validation
- Confirmation workflow

#### Resume Generation
- Select job description text
- Right-click context menu
- AI-powered generation via backend
- Instant PDF creation
- Automatic downloads

#### PDF Generation
- Client-side PDF rendering
- Professional formatting
- Proper section headers
- Bullet points and spacing
- Page break handling

## 🔌 Backend API Requirements

The frontend expects these endpoints:

### Authentication
- `POST /api/auth/login` - Admin login

### Profiles
- `GET /api/profiles` - List profiles
- `POST /api/profiles` - Create profile
- `PUT /api/profiles/:id` - Update profile
- `DELETE /api/profiles/:id` - Delete profile

### Bidders
- `GET /api/bidders` - List bidders
- `POST /api/bidders` - Create bidder
- `PATCH /api/bidders/:id/deactivate` - Deactivate

### Tokens
- `GET /api/tokens` - List tokens
- `POST /api/tokens/generate` - Generate token
- `PATCH /api/tokens/:id/revoke` - Revoke token

### Rules
- `GET /api/rules` - List rules
- `POST /api/rules` - Create rule
- `PUT /api/rules/:id` - Update rule

### Access Control
- `GET /api/access-control` - List access
- `PATCH /api/access-control/:id/revoke` - Revoke

### Extension Endpoints
- `POST /api/public/validate-token` - Validate token
- `POST /api/resume/generate` - Generate resume

## 🎨 Design Principles

### Stateless Backend
- No resume storage on server
- No job description persistence
- Privacy-first approach

### Client-Side PDF Generation
- Fast generation
- No server load
- Better scalability
- Lower costs

### Security
- JWT authentication for admin
- Token-based access for bidders
- Authorization headers
- No sensitive data logging

### User Experience
- Responsive design
- Fast loading
- Clear feedback
- Error handling
- Toast notifications

## 📱 Responsive Design

Both components are fully responsive:

- **Admin Panel**: Desktop, tablet, and mobile support
- **Extension**: Optimized for browser popup and confirmation windows

## 🔒 Privacy & Security

### What's Stored
- Admin credentials (hashed)
- Profile information
- Bidder accounts
- Access tokens (hashed)
- Improvement rules

### What's NOT Stored
- Generated resumes
- Job descriptions
- Cover letters
- Any generated documents

### Security Features
- JWT authentication
- Token hashing
- HTTPS recommended
- httpOnly cookies (admin)
- Authorization headers

## 🧪 Development

### Admin Panel Development
```bash
cd admin-panel
npm run dev       # Development server
npm run build     # Production build
npm run lint      # Lint code
```

### Extension Development
1. Make changes to extension files
2. Go to `chrome://extensions/`
3. Click reload on the extension
4. Test functionality

## 📦 Production Deployment

### Admin Panel
```bash
cd admin-panel
npm run build
npm start
# Or deploy to Vercel, Netlify, etc.
```

### Browser Extension
1. Update version in `manifest.json`
2. Test thoroughly
3. Package extension files
4. Submit to Chrome Web Store (optional)
5. Or distribute as unpacked extension

## 🐛 Troubleshooting

### Admin Panel Issues
- Check API connection
- Verify environment variables
- Check browser console
- Review network requests

### Extension Issues
- Verify token in `token.json`
- Check backend API is running
- Inspect extension in Chrome DevTools
- Review background service worker logs

## 📚 Documentation

- [Admin Panel Documentation](./admin-panel/README.md)
- [Browser Extension Documentation](./resume-extension/README.md)
- [Backend API Specification](./BACKEND.MD)
- [Database Schema](./DATABASE.MD)

## 🤝 Contributing

This is a complete frontend implementation. To extend:

1. Admin Panel: Add new pages in `src/app/`
2. Extension: Modify `background.js` or `content.js`
3. Follow TypeScript strict mode
4. Use existing component patterns
5. Test thoroughly

## 📄 License

Part of the Resume Generator Application system.

## 🎯 Key Features Summary

✅ Complete admin panel with all CRUD operations  
✅ Responsive design with Tailwind CSS  
✅ Type-safe with TypeScript  
✅ Modern React patterns with hooks  
✅ Form validation with Zod  
✅ State management with Zustand  
✅ API integration ready  
✅ Chrome Manifest V3 extension  
✅ Client-side PDF generation  
✅ Context menu integration  
✅ Token-based authentication  
✅ Privacy-focused architecture  
✅ Comprehensive documentation  

## 🚦 Status

**Ready for Backend Integration** - Both frontend components are complete and ready to connect to a backend API following the specified contracts.

---

**Note:** This is a frontend-only implementation. Backend API must be implemented separately according to the specifications in BACKEND.MD.

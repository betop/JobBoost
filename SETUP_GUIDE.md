# SwiftCV - Setup Guide

Complete setup guide for both the Admin Panel and Browser Extension.

## Table of Contents
1. [Admin Panel Setup](#admin-panel-setup)
2. [Browser Extension Setup](#browser-extension-setup)
3. [Backend Requirements](#backend-requirements)
4. [Testing](#testing)
5. [Deployment](#deployment)

---

## Admin Panel Setup

### 1. Install Dependencies

```bash
cd admin-panel
npm install
```

### 2. Configure Environment

Create `.env.local` file:

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_API_BASE_URL=/api
XANO_API_BASE_URL=https://xxxxx-xxxxx.xano.io/api:v1
```

### 3. Run Development Server

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

### 4. Build for Production

```bash
npm run build
npm start
```

### Default Login (Configure in Backend)
```
Email: admin@example.com
Password: (set in backend)
```

---

## Browser Extension Setup

### 1. Prepare Icons

Convert SVG icons to PNG (see `icons/ICON_INSTRUCTIONS.md`):

```bash
cd swiftcv/icons
# Use ImageMagick, online tool, or design software
```

### 2. Configure Backend URL

Edit `background.js`:
```javascript
const API_BASE_URL = "https://your-backend-url.com/api";
```

### 3. Load Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked"
4. Select the `swiftcv` folder
5. Extension should appear in your extensions list

### 4. Add Access Token

1. Get a token from the Admin Panel (Tokens page)
2. Open `swiftcv/token.json`
3. Add your token:
```json
{
  "token": "your-token-here"
}
```
4. Reload the extension in Chrome

### 5. Confirm Profile

1. After adding token, reload the extension
2. A popup window will appear with your profile name
3. Click "Confirm & Activate"
4. Extension is now ready to use

---

## Backend Requirements

The frontend requires a backend API with these endpoints:

### Admin Endpoints

```
POST   /api/auth/login
GET    /api/profiles
POST   /api/profiles
PUT    /api/profiles/:id
DELETE /api/profiles/:id
GET    /api/bidders
POST   /api/bidders
PATCH  /api/bidders/:id/deactivate
GET    /api/tokens
POST   /api/tokens/generate
PATCH  /api/tokens/:id/revoke
GET    /api/rules
POST   /api/rules
PUT    /api/rules/:id
GET    /api/access-control
PATCH  /api/access-control/:id/revoke
GET    /api/dashboard/stats
```

### Extension Endpoints

```
POST /api/public/validate-token
POST /api/resume/generate
```

See `BACKEND.MD` for detailed API specifications.

---

## Testing

### Test Admin Panel

1. **Login**
   - Navigate to /login
   - Enter credentials
   - Should redirect to dashboard

2. **Create Profile**
   - Go to Profiles → Create Profile
   - Fill in all required fields
   - Add education and work experience
   - Click Create Profile

3. **Create Bidder**
   - Go to Bidders → Create Bidder
   - Fill in details
   - Assign profile
   - Click Create Bidder

4. **Generate Token**
   - Go to Tokens
   - Click Generate Token
   - Select bidder
   - Copy token

5. **Create Rule**
   - Go to Rules → Create Rule
   - Enter rule sentence
   - Select target section
   - Save

### Test Browser Extension

1. **Configure Extension**
   - Add token to token.json
   - Reload extension
   - Confirm profile

2. **Generate Resume**
   - Find a job posting online
   - Select job description text
   - Right-click
   - Select "Generate Resume and Cover Letter"
   - Wait for PDFs to download

3. **Check Status**
   - Click extension icon
   - Verify status shows "Active"
   - Check profile name is correct

---

## Deployment

### Deploy Admin Panel

#### Vercel (Recommended)
```bash
cd admin-panel
npm install -g vercel
vercel login
vercel
```

#### Netlify
```bash
cd admin-panel
npm run build
# Upload .next folder to Netlify
```

#### Docker
```bash
cd admin-panel
# Create Dockerfile
docker build -t resume-admin .
docker run -p 3000:3000 resume-admin
```

### Distribute Extension

#### Chrome Web Store
1. Create developer account
2. Package extension
3. Upload to Chrome Web Store
4. Submit for review

#### Enterprise Distribution
1. Package extension as .crx file
2. Distribute to users
3. Users load as unpacked extension

#### Private Distribution
1. Share folder with users
2. Instruct them to load unpacked
3. Provide token configuration instructions

---

## Environment Variables

### Admin Panel

```env
# Required
NEXT_PUBLIC_API_BASE_URL=https://api.example.com

# Optional
NODE_ENV=production
```

### Browser Extension

Edit directly in `background.js`:
```javascript
const API_BASE_URL = "https://api.example.com/api";
```

---

## Troubleshooting

### Admin Panel Issues

**Port Already in Use**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
# Or use different port
npm run dev -- -p 3001
```

**Build Errors**
```bash
# Clear cache
rm -rf .next
rm -rf node_modules
npm install
npm run build
```

**API Connection Failed**
- Check NEXT_PUBLIC_API_BASE_URL in .env.local
- Verify backend is running
- Check CORS settings on backend

### Extension Issues

**Token Validation Failed**
- Verify token in token.json is correct
- Check backend URL in background.js
- Ensure backend API is accessible

**Context Menu Not Appearing**
- Confirm profile is activated
- Check extension permissions
- Reload extension

**PDF Generation Failed**
- Check browser console for errors
- Verify jsPDF loaded successfully
- Check downloads permission

**Extension Not Loading**
- Check manifest.json syntax
- Verify all files present
- Check Chrome extensions page for errors

---

## Performance Tips

### Admin Panel
- Enable production build for deployment
- Use CDN for static assets
- Implement lazy loading for large tables
- Enable caching in React Query

### Browser Extension
- Keep background script lightweight
- Load jsPDF only when needed
- Optimize PDF generation for large resumes
- Use chrome.storage efficiently

---

## Security Checklist

- [ ] Use HTTPS for all API calls
- [ ] Store tokens securely
- [ ] Implement rate limiting on backend
- [ ] Validate all user inputs
- [ ] Use httpOnly cookies for admin sessions
- [ ] Hash tokens in database
- [ ] Implement CORS properly
- [ ] Regular security audits
- [ ] Keep dependencies updated

---

## Next Steps

1. ✅ Setup Admin Panel
2. ✅ Setup Browser Extension  
3. ⬜ Implement Backend API
4. ⬜ Connect Frontend to Backend
5. ⬜ Test End-to-End Flow
6. ⬜ Deploy to Production
7. ⬜ Monitor and Maintain

---

## Support

For issues or questions:
- Check troubleshooting section
- Review documentation files
- Inspect browser console
- Check network requests

---

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Chrome Extension Developer Guide](https://developer.chrome.com/docs/extensions/)
- [TanStack Query Docs](https://tanstack.com/query/latest)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [jsPDF Documentation](https://github.com/parallax/jsPDF)

---

Last Updated: February 2026

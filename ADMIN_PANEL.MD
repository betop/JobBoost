# Resume Generator – Admin Panel (Frontend Specification)

## Overview

This is a web-based Admin Panel used to manage:

- Admin authentication
- Bidders
- Profiles
- Education records
- Work experiences
- Access tokens
- Global sentence-based rules
- Profile access permissions

Frontend only. Backend APIs will be defined separately.

---

# 1. Technology Stack

Recommended:

- React (Next.js preferred)
- TypeScript
- Tailwind CSS or Material UI
- React Query (API state management)
- Zustand or Context API (local state)
- Axios or Fetch API
- React Hook Form (forms)
- Zod (validation)

---

# 2. Application Structure

```
admin-panel/
│
├── src/
│   ├── app/
│   │   ├── login/
│   │   ├── dashboard/
│   │   ├── bidders/
│   │   ├── profiles/
│   │   ├── tokens/
│   │   ├── rules/
│   │   └── access-control/
│   │
│   ├── components/
│   ├── hooks/
│   ├── services/
│   ├── store/
│   └── utils/
```

---

# 3. Authentication

## 3.1 Login Page

Route:
```
/login
```

Fields:
- Email
- Password
- Login button

On success:
- Store JWT in httpOnly cookie
- Redirect to `/dashboard`

---

# 4. Layout Structure

## 4.1 Main Layout

Left Sidebar:
- Dashboard
- Profiles
- Bidders
- Tokens
- Rules
- Access Control
- Logout

Top Bar:
- Admin name
- Search bar
- Notifications (optional)

Main Content Area:
- Dynamic content by route

---

# 5. Dashboard Page

Route:
```
/dashboard
```

Widgets:

- Total Profiles
- Total Bidders
- Active Tokens
- Active Rules
- Recent Activity Log

Charts (optional):
- Profile growth
- Resume generations count

---

# 6. Profiles Management

Route:
```
/profiles
```

## 6.1 Profiles List

Table Columns:
- Full Name
- Email
- Location
- LinkedIn
- GitHub
- Created Date
- Actions (Edit / Delete / View)

Search + Filter:
- By name
- By email

---

## 6.2 Create / Edit Profile

Route:
```
/profiles/new
/profiles/:id
```

Sections:

### Basic Info
- Full Name
- Email
- Phone
- Location
- LinkedIn
- GitHub
- Summary

### Education Section
Dynamic List:
- Add Education
- Edit Education
- Remove Education

Fields:
- University (optional)
- Degree
- Field of Study
- Start Date
- End Date
- Location (optional)

### Work Experience Section
Dynamic List:
- Add Experience
- Edit Experience
- Remove Experience

Fields:
- Job Title
- Company (optional)
- Employment Type (optional)
- Location (optional)
- Start Date
- End Date
- Description (optional)

Save Button

---

# 7. Bidders Management

Route:
```
/bidders
```

## 7.1 Bidders List

Columns:
- Full Name
- Email
- Profile Assigned
- Active Status
- Created Date
- Actions

Actions:
- Edit
- Deactivate
- Assign Profile

---

## 7.2 Create Bidder

Fields:
- Full Name
- Email
- Password
- Assign Profile (dropdown)
- Active Toggle

Constraint:
- One bidder → One profile

---

# 8. Tokens Management

Route:
```
/tokens
```

## 8.1 Tokens List

Columns:
- Token
- Assigned Bidder
- Issued Date
- Expiration Date
- Used Status
- Active Status
- Actions

Actions:
- Revoke
- Delete

---

## 8.2 Generate Token

Fields:
- Select Bidder
- Expiration Date (optional)
- Generate Button

After creation:
- Display token
- Copy to clipboard button

---

# 9. Rules Management

Route:
```
/rules
```

## 9.1 Rules List

Columns:
- Sentence
- Target Section
- Active Status
- Created Date
- Actions

Filter by:
- Target Section
- Active / Inactive

---

## 9.2 Create / Edit Rule

Fields:
- Rule Sentence (textarea)
- Target Section (dropdown)
  - summary
  - work_experience
  - education
  - skills
  - global
- Active Toggle

Validation:
- Sentence must not be empty
- Max length 1000 characters

---

# 10. Access Control

Route:
```
/access-control
```

Table Columns:
- Bidder
- Profile
- Granted By
- Granted Date
- Expiration Date
- Active Status

Actions:
- Revoke Access
- Edit Expiration

---

# 11. Global Search

Search bar in header:

Search across:
- Profiles
- Bidders
- Rules

Returns:
- Quick result dropdown
- Navigate on click

---

# 12. Reusable Components

- DataTable
- Modal
- ConfirmDialog
- Toast Notification
- Loading Spinner
- Form Input
- Date Picker
- Toggle Switch
- Dropdown

---

# 13. State Management

Use React Query for:

- Fetching lists
- Mutations
- Caching
- Auto refetch

Global Store:

```
authStore:
- admin
- isAuthenticated

uiStore:
- sidebarCollapsed
- loadingState
```

---

# 14. UX Requirements

- Clean and minimal interface
- Fast load time
- Pagination for tables
- Sorting on all columns
- Toast notifications for actions
- Confirmation before delete
- Responsive layout
- Dark mode support (optional)

---

# 15. API Contracts (Frontend Expectation)

Example:

GET /api/profiles
POST /api/profiles
PUT /api/profiles/:id
DELETE /api/profiles/:id

GET /api/bidders
POST /api/bidders

GET /api/tokens
POST /api/tokens

GET /api/rules
POST /api/rules

GET /api/access-control

Authentication:
Authorization: Bearer <admin_jwt>

---

# 16. Security Requirements

- Protected routes
- Auto logout on token expiry
- Disable UI if unauthorized
- Form validation client-side
- Do not expose sensitive tokens

---

# 17. Optional Enhancements

- Resume preview generator
- Rule testing sandbox
- Audit logs page
- Activity timeline
- Export data as CSV
- Role-based admin levels

---

# 18. User Flow Summary

Admin:
1. Login
2. Create profile
3. Create bidder
4. Generate token
5. Define rules
6. Grant profile access
7. Manage system from dashboard

---

End of Admin Panel Frontend Specification

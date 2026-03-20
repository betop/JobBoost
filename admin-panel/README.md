# SwiftCV - Admin Panel

A modern, responsive admin panel built with Next.js, TypeScript, and Tailwind CSS for managing profiles, bidders, tokens, and rules.

## Features

- 🔐 **Authentication** - Secure JWT-based admin authentication
- 👥 **Profile Management** - Create and manage professional profiles with education and work experience
- 🎯 **Bidder Management** - Manage bidder accounts and assign profiles
- 🔑 **Token Management** - Generate and manage access tokens for bidders
- 📋 **Rules Engine** - Create and manage resume improvement rules
- 🛡️ **Access Control** - Manage bidder profile access permissions
- 📊 **Dashboard** - Overview of system statistics and quick actions
- 🔍 **Search & Filter** - Advanced search functionality across all tables
- 📱 **Responsive Design** - Works seamlessly on desktop, tablet, and mobile

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Forms**: React Hook Form + Zod validation
- **HTTP Client**: Axios
- **Icons**: Lucide React
- **Date Utilities**: date-fns

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env.local` file:
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
admin-panel/
├── src/
│   ├── app/                    # Next.js app router pages
│   │   ├── login/             # Login page
│   │   ├── dashboard/         # Dashboard
│   │   ├── profiles/          # Profile management
│   │   ├── bidders/           # Bidder management
│   │   ├── tokens/            # Token management
│   │   ├── rules/             # Rules management
│   │   └── access-control/    # Access control
│   │
│   ├── components/            # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── DataTable.tsx
│   │   ├── Modal.tsx
│   │   ├── Toast.tsx
│   │   └── ...
│   │
│   ├── services/              # API service layer
│   │   ├── api.ts
│   │   ├── authService.ts
│   │   ├── profileService.ts
│   │   └── ...
│   │
│   ├── store/                 # Zustand state management
│   │   ├── authStore.ts
│   │   └── uiStore.ts
│   │
│   └── utils/                 # Utility functions
│       ├── cn.ts
│       └── dateUtils.ts
│
├── public/                    # Static assets
├── tailwind.config.ts         # Tailwind configuration
├── tsconfig.json              # TypeScript configuration
└── package.json
```

## API Integration

The admin panel expects the backend API to implement the following endpoints:

### Authentication
- `POST /api/auth/login` - Admin login

### Profiles
- `GET /api/profiles` - List all profiles
- `GET /api/profiles/:id` - Get profile by ID
- `POST /api/profiles` - Create profile
- `PUT /api/profiles/:id` - Update profile
- `DELETE /api/profiles/:id` - Delete profile

### Bidders
- `GET /api/bidders` - List all bidders
- `GET /api/bidders/:id` - Get bidder by ID
- `POST /api/bidders` - Create bidder
- `PUT /api/bidders/:id` - Update bidder
- `PATCH /api/bidders/:id/deactivate` - Deactivate bidder
- `DELETE /api/bidders/:id` - Delete bidder

### Tokens
- `GET /api/tokens` - List all tokens
- `POST /api/tokens/generate` - Generate new token
- `PATCH /api/tokens/:id/revoke` - Revoke token
- `DELETE /api/tokens/:id` - Delete token

### Rules
- `GET /api/rules` - List all rules
- `GET /api/rules/:id` - Get rule by ID
- `POST /api/rules` - Create rule
- `PUT /api/rules/:id` - Update rule
- `DELETE /api/rules/:id` - Delete rule

### Access Control
- `GET /api/access-control` - List all access controls
- `PATCH /api/access-control/:id/revoke` - Revoke access
- `PATCH /api/access-control/:id/expiration` - Update expiration

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

## Features in Detail

### Profile Management
- Create profiles with comprehensive information
- Dynamic education and work experience sections
- Add/remove multiple education entries
- Add/remove multiple work experience entries
- LinkedIn and GitHub profile links
- Professional summary

### Bidder Management
- Create and manage bidder accounts
- Assign profiles to bidders (one-to-one relationship)
- Activate/deactivate bidders
- Password management

### Token Management
- Generate access tokens for bidders
- Set optional expiration dates
- Copy tokens to clipboard
- Revoke active tokens
- Track token usage

### Rules Management
- Create sentence-based improvement rules
- Categorize by target section (summary, work experience, education, skills, global)
- Toggle active/inactive status
- Character limit validation (1000 characters)

### Access Control
- View all bidder-profile access permissions
- Revoke access when needed
- Track grant dates and expiration

## Customization

### Styling
Modify `tailwind.config.ts` to customize colors, fonts, and other design tokens.

### API Base URL
Update the `NEXT_PUBLIC_API_BASE_URL` environment variable to point to your backend API.

### Authentication
The authentication flow uses JWT tokens stored in localStorage. Modify `src/services/api.ts` to use httpOnly cookies if preferred.

## Development

### Code Quality
```bash
npm run lint        # Run ESLint
```

### Type Checking
TypeScript strict mode is enabled for maximum type safety.

## License

This project is part of the SwiftCV Application system.

# TAMS360 - Road & Traffic Asset Management Suite

Comprehensive web and mobile application for managing road infrastructure assets including signage, guardrails, traffic signals, and safety barriers.

## 🚀 Features

- **Asset Management:** Complete inventory tracking with auto-numbering
- **Mobile Capture:** Field data collection with offline support and photo uploads
- **GIS Mapping:** Interactive maps with Leaflet, clustering, and export functionality
- **Component Inspections:** Detailed condition assessments with CI/DERU calculations
- **Maintenance Tracking:** Work order management and scheduling
- **Dashboard Analytics:** Real-time metrics and performance indicators
- **Reports:** Export to CSV/PDF with customizable templates
- **PWA Support:** Installable as native mobile app with offline functionality

## 🛠️ Tech Stack

- **Frontend:** React + TypeScript + Vite
- **UI Framework:** Tailwind CSS v4 + shadcn/ui components
- **Backend:** Supabase (PostgreSQL + Edge Functions)
- **Mapping:** Leaflet with marker clustering
- **Charts:** Recharts for analytics
- **Icons:** Lucide React
- **PWA:** Service Worker with offline caching

## 🎨 Design System

- **Primary Colors:**
  - Deep Navy: `#010D13`
  - Sky Blue: `#39AEDF`
  - Green: `#5DB32A`
  - Yellow Accent: `#F8D227`
  - Slate Grey: `#455B5E`
- **Typography:** Inter (sans-serif)
- **Design Style:** Modern infrastructure-tech aesthetic

## 🌐 Live Demo

**Production URL:** `https://tams360-app.vercel.app` _(update with your actual URL)_

## 📋 Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Modern web browser (Chrome, Edge, Safari, Firefox)

## 🔧 Installation & Setup

### 1. Clone Repository

```bash
git clone https://github.com/YOUR-USERNAME/tams360-app.git
cd tams360-app
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**Get your keys from:**
- Supabase Dashboard → Settings → API

### 4. Set Up Database

1. **Run database setup:**
   - Execute SQL files in order:
     - `/CREATE_TAMS360_PUBLIC_VIEWS.sql`
     - `/DATABASE_SCHEMA_ENHANCEMENTS.sql`
   - Import into Supabase SQL Editor

2. **Seed sample data (optional):**
   ```sql
   -- Run seed-sample-data.sql for demo data
   ```

3. **Create public views:**
   ```sql
   -- Run PUBLIC_VIEWS_SETUP.sql
   ```

### 5. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:5173`

### 6. Build for Production

```bash
npm run build
```

Output in `/dist` folder.

## 🚀 Deployment

### Deploy to Vercel (Recommended)

1. Push to GitHub
2. Import repository in Vercel
3. Configure build settings:
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Add environment variables
5. Deploy!

**See `/DEPLOYMENT-CHECKLIST.md` for detailed instructions**

## 📱 PWA Installation

### Desktop (Chrome/Edge)
1. Visit the web app
2. Click install icon (⊕) in address bar
3. App opens in standalone window

### Mobile (Android)
1. Open in Chrome
2. Menu (⋮) → "Add to Home screen"
3. App icon appears on home screen

### Mobile (iOS)
1. Open in Safari
2. Share (□↑) → "Add to Home Screen"
3. App icon appears on home screen

## 👤 User Roles & Authentication

### Admin Users
- Full CRUD access to all modules
- User approval management
- System configuration
- Component template management
- Tenant settings

### Field Users
- Asset capture and editing
- Inspection recording
- Maintenance logging
- Photo uploads
- Offline data sync

### Authentication Flow
1. User registers via `/register`
2. Admin approves user in Admin Console
3. User receives approval and can log in
4. Role-based access enforced

## 📊 Key Modules

### Assets
- Complete inventory management
- Auto-numbering system
- GPS location tracking
- Photo attachments
- Ownership/responsibility tracking
- Historical valuation

### Inspections
- Component-based assessments
- Condition scoring (CI/DERU)
- Urgency calculations
- Remedial cost tracking
- Photo documentation
- Export to CSV

### Maintenance
- Work order creation
- Status tracking (Planned/In Progress/Complete)
- Cost management
- Contractor assignment
- Completion documentation

### GIS Map
- Interactive Leaflet map
- Asset/inspection markers
- Marker clustering for performance
- Export to GeoJSON/CSV
- Current location tracking

### Dashboard
- Real-time KPI metrics
- Asset distribution charts
- Condition analytics
- Maintenance status tracking
- Urgency summary

## 🔐 Security

- Row Level Security (RLS) enabled in Supabase
- API keys stored in environment variables
- User authentication via Supabase Auth
- Role-based access control
- Private storage buckets for photos

## 📖 Documentation

- **Quick Start:** `/QUICK-DEPLOY-GUIDE.md`
- **Deployment:** `/DEPLOYMENT-CHECKLIST.md`
- **GitHub Workflow:** `/GITHUB-DEPLOYMENT-WORKFLOW.md`
- **GitHub Desktop:** `/GITHUB-DESKTOP-GUIDE.md`
- **Database Schema:** `/DATABASE_SCHEMA.md`

## 🧪 Testing

The application includes:
- Offline functionality testing
- PWA installation verification
- Mobile responsiveness checks
- Authentication flow validation
- Data sync testing

## 🛠️ Development

### Project Structure

```
tams360-app/
├── public/                 # Static assets
│   ├── manifest.json      # PWA manifest
│   ├── sw.js              # Service worker
│   └── favicon.svg        # App icon
├── src/
│   ├── app/
│   │   ├── components/    # React components
│   │   │   ├── admin/    # Admin pages
│   │   │   ├── assets/   # Asset management
│   │   │   ├── inspections/
│   │   │   ├── maintenance/
│   │   │   ├── map/      # GIS mapping
│   │   │   ├── mobile/   # Mobile capture
│   │   │   ├── offline/  # Offline support
│   │   │   └── ui/       # Reusable UI components
│   │   ├── utils/        # Utility functions
│   │   └── App.tsx       # Main app component
│   └── styles/           # CSS styles
├── supabase/
│   ├── functions/        # Edge functions
│   │   └── server/      # Backend API
│   └── migrations/      # SQL migrations
├── utils/
│   └── supabase/        # Supabase config
├── package.json
├── vite.config.ts
└── README.md
```

### Adding New Features

1. Develop in Figma Make (or local environment)
2. Test thoroughly
3. Update GitHub repository
4. Vercel auto-deploys
5. Verify in production

## 🐛 Known Issues

- Supabase DNS intermittent errors (temporary infrastructure issue)
- Map marker clustering may be slow with 10,000+ assets
- Offline sync requires service worker to be active

## 📈 Future Enhancements

- [ ] Push notifications for maintenance reminders
- [ ] Advanced reporting with custom filters
- [ ] Multi-tenant support with data isolation
- [ ] Integration with external GIS systems
- [ ] Bulk import from CSV/Excel
- [ ] Mobile app (React Native version)

## 🤝 Contributing

This is a private project. If you have access and want to contribute:

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit pull request with description

## 📄 License

Private - All Rights Reserved

## 📧 Contact & Support

For questions or issues:
- **Email:** [Your email]
- **GitHub Issues:** [Link to issues page]
- **Project Lead:** [Your name]

## 🙏 Acknowledgments

- Built with Figma Make
- UI components from shadcn/ui
- Icons from Lucide
- Maps from Leaflet
- Backend by Supabase
- Deployed on Vercel

---

**Version:** 1.0.0  
**Last Updated:** January 8, 2026  
**Status:** ✅ Production Ready

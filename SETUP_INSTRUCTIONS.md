# TAMS360 Setup Instructions

## 🔐 Initial Login Setup

Your TAMS360 system now **auto-approves the first registered user as Admin**! This makes initial setup much easier.

### Quick Start (Recommended)

1. **Register Your Admin Account:**
   - Go to the registration page
   - Fill in your details:
     - Name: Your full name
     - Email: Your email address
     - Password: Choose a strong password (minimum 6 characters)
     - Organization: Your organization name
   - Click "Register"
   
2. **Automatic Approval:**
   - ✅ **The first user is automatically approved as Admin!**
   - You'll see a message: "Welcome! You are the first admin user. You can now log in."
   - No manual approval needed!

3. **Log In:**
   - Go to the login page
   - Enter your email and password
   - You'll be logged in with full admin access!

### Test Credentials (For Demo/Testing)

If you want to create test users, use these details:

**First Admin User (auto-approved):**
- Name: `Admin User`
- Email: `admin@tams360.com`
- Password: `Admin123!`
- Organization: `TAMS360 Operations`

**Additional Test Users (require admin approval):**

Field User:
- Name: `John Field`
- Email: `field@tams360.com`
- Password: `Field123!`
- Organization: `Field Operations`

Supervisor:
- Name: `Sarah Supervisor`  
- Email: `supervisor@tams360.com`
- Password: `Super123!`
- Organization: `TAMS360 Operations`

## 📱 User Roles

Your system has 4 role types:

| Role | Permissions |
|------|-------------|
| **Admin** | Full access - manage users, assets, inspections, maintenance, admin console |
| **Supervisor** | Manage assets, inspections, maintenance, view reports |
| **Field User** | Create/edit assets, conduct inspections, view assigned tasks |
| **Viewer** | Read-only access to dashboards and reports |

## 🚀 Next Steps After Login

1. **Admin Console** - Approve pending user registrations
2. **Dashboard** - View system overview and analytics
3. **Assets** - Start managing road infrastructure assets
4. **GIS Map** - View assets on the map (placeholder - needs real map integration)
5. **Inspections** - Create and manage asset inspections
6. **Maintenance** - Track maintenance work orders

## 🔧 Important Notes

- **First Login**: The first user should be made an admin to manage subsequent registrations
- **Approval Workflow**: All new registrations require admin approval
- **GIS Integration**: The map currently shows a placeholder - integrate with Leaflet, Mapbox, or ArcGIS for production
- **Offline Support**: The mobile features require additional PWA configuration for full offline capabilities

## 🆘 Troubleshooting

**Can't log in after registration?**
- Check if your account has been approved by an admin
- Verify your email and password are correct
- Make sure the first admin user has been created (see Option 2 above)

**No admin exists yet?**
- Use the SQL method in Option 2 to bootstrap your first admin user

**Forgot password?**
- Contact your system administrator to reset via Supabase dashboard
# Admin User Setup

## Admin Credentials
- **Email**: `alboabourt@progdealer.com`
- **Password**: `sparkz-coupa-spill`

## Setup Instructions

### Option 1: Using Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to Authentication > Users
3. Click "Add user"
4. Enter:
   - Email: `alboabourt@progdealer.com`
   - Password: `sparkz-coupa-spill`
   - Confirm email: ✅ (checked)
5. Click "Create user"

### Option 2: Using the Script
1. Set environment variables:
   ```bash
   export VITE_SUPABASE_URL="your_supabase_url"
   export SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
   ```
2. Run the script:
   ```bash
   node create-admin-user.js
   ```

### Option 3: Manual SQL (Advanced)
If you have direct database access, you can run the migration file:
```bash
psql -h your-db-host -U postgres -d postgres -f supabase/migrations/create_admin_user.sql
```

## Usage
1. Go to your deployed application: https://progdealer.netlify.app
2. Click the admin/shield icon in the top right
3. Login with the credentials above
4. You'll have full access to the admin panel

## Security Notes
- Change the password after first login if desired
- The user has full admin privileges
- Email confirmation is automatically set to true
- User can manage all events in the system

## Troubleshooting
- If login fails, check that the user was created in Supabase Auth
- Verify the email and password are exactly as specified
- Check browser console for any authentication errors
- Ensure Supabase environment variables are properly set
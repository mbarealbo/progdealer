# User Roles and Access Control

## Overview

ProgDealer now implements a comprehensive role-based access control system with two user roles:

- **User** (default): Standard access to user area and event submission
- **Admin**: Full access to admin panel, event moderation, and user management

## Role System Architecture

### Database Schema

#### Profiles Table
```sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### Automatic Profile Creation
- Every new user automatically gets a profile with `role = 'user'`
- Profiles are created via database trigger on user signup
- Fallback mechanism ensures profile creation even if trigger fails
- No manual intervention required for standard users
- Default role is enforced at database level with NOT NULL constraint

## Access Control

### Frontend Protection
- **ProtectedRoute** component handles access control
- Admin areas require `role = 'admin'`
- Non-admin users see "Access Denied" page
- Role checking happens on every route access

### Backend Security
- Row Level Security (RLS) policies enforce role-based access
- Admin operations require `role = 'admin'` at database level
- Import functions check admin status before execution
- All admin API endpoints validate user role

## User Roles

### User Role (`role = 'user'`)
**Access:**
- ✅ User area (profile management, view own events)
- ✅ Submit events (pending approval)
- ✅ View approved events
- ❌ Admin panel
- ❌ Event moderation
- ❌ User management

### Admin Role (`role = 'admin'`)
**Access:**
- ✅ All user permissions
- ✅ Admin panel
- ✅ Event moderation (approve/reject/delete)
- ✅ Import events
- ✅ User management (view/edit roles)
- ✅ View all events (including pending/rejected)

## Role Management

### Promoting Users to Admin

#### Method 1: Supabase Table Editor (Recommended)
1. Go to Supabase Dashboard → Table Editor
2. Open the `profiles` table
3. Find the user by email
4. Change their `role` from `'user'` to `'admin'`
5. Save changes

#### Method 2: SQL Query
```sql
UPDATE profiles 
SET role = 'admin', updated_at = now() 
WHERE email = 'user@example.com';
```

#### Method 3: Admin Panel (Future)
- User management interface in admin panel
- Click "Edit Role" next to any user
- Change role and save
- **Note**: Currently disabled for security

### Default Admin User
- Email: `alboabourt@progdealer.com`
- Role: `admin` (set automatically if user exists)
- Can promote other users to admin

## Security Features

### Frontend Security
- Role checking on every protected route
- Admin UI elements hidden from non-admins
- Access denied pages for unauthorized access
- Real-time role validation

### Backend Security
- Database-level role enforcement via RLS
- Admin functions check role before execution
- Import operations require admin privileges
- Event moderation restricted to admins

### Protection Against
- ❌ Direct URL access to admin areas
- ❌ API endpoint access without admin role
- ❌ Client-side role manipulation
- ❌ Unauthorized event operations

## Implementation Details

### Role Hook
```typescript
const { profile, isAdmin, loading } = useUserRole(currentUser);
```

### Protected Route Usage
```typescript
<ProtectedRoute
  isAuthenticated={isAuthenticated}
  isAdmin={isAdmin}
  loading={roleLoading}
  requireAdmin={true}
>
  <AdminPanel />
</ProtectedRoute>
```

### Admin Check Function
```typescript
const isUserAdmin = await checkIsAdmin();
```

## Testing Access Control

### Test User Access
1. Register new user → Should get `role = 'user'`
2. Try accessing admin panel → Should see "Access Denied"
3. Access user area → Should work normally

### Test Admin Access
1. Promote user to admin in database
2. Access admin panel → Should work
3. Moderate events → Should work
4. Manage users → Should work

## Future Enhancements

### Planned Features
- [ ] Email confirmation with custom SMTP
- [ ] Role-based event submission limits
- [ ] Audit logging for admin actions
- [ ] Bulk user role management
- [ ] Role-based API rate limiting

### Security Improvements
- [ ] Session timeout for admin users
- [ ] Two-factor authentication for admins
- [ ] IP-based access restrictions
- [ ] Admin action notifications

## Troubleshooting

### Common Issues

#### User Can't Access Admin Panel
1. Check user's role in `profiles` table
2. Verify user is authenticated
3. Check browser console for errors
4. Ensure RLS policies are active

#### Profile Not Created
1. Check if trigger function exists
2. Verify role column has default value 'user'
3. Check if NOT NULL constraint is properly set
4. Verify auth.users table has the user
5. Manually create profile if needed
6. Check database logs for errors

#### Role Changes Not Reflected
1. User needs to log out and back in
2. Check if profile was actually updated
3. Clear browser cache/localStorage
4. Verify RLS policies are correct

## Database Queries

### Check User Roles
```sql
SELECT email, role, created_at 
FROM profiles 
ORDER BY created_at DESC;
```

### Find Admin Users
```sql
SELECT email, role 
FROM profiles 
WHERE role = 'admin';
```

### Promote User to Admin
```sql
UPDATE profiles 
SET role = 'admin', updated_at = now() 
WHERE email = 'user@example.com';
```

### Demote Admin to User
```sql
UPDATE profiles 
SET role = 'user', updated_at = now() 
WHERE email = 'admin@example.com';
```
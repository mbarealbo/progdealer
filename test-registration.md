# Registration Testing Guide

## Test Steps

### 1. Database Verification
Run these queries in Supabase SQL Editor to verify setup:

```sql
-- Check profiles table structure
\d profiles;

-- Verify role column has default
SELECT column_name, column_default, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'role';

-- Check trigger function exists
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'create_user_profile';

-- Check trigger exists
SELECT trigger_name, event_manipulation, action_timing 
FROM information_schema.triggers 
WHERE trigger_name = 'create_profile_trigger';
```

### 2. Frontend Testing

#### Test New User Registration
1. Go to the app and click "USER" button
2. Click "REGISTER" tab
3. Enter test email: `test@example.com`
4. Enter password: `testpass123`
5. Click "REGISTER"
6. Should succeed without database errors

#### Verify Profile Creation
After registration, check in Supabase Table Editor:
```sql
SELECT * FROM profiles WHERE email = 'test@example.com';
```
Should show:
- `id`: UUID matching auth.users
- `email`: test@example.com
- `role`: user (default)
- `created_at`: timestamp
- `updated_at`: timestamp

#### Test Login
1. Use same credentials to log in
2. Should work without errors
3. User should have "USER" badge (not "ADMIN")
4. Should be able to access user area
5. Should NOT be able to access admin area

### 3. Error Scenarios

#### Test Duplicate Registration
1. Try registering same email again
2. Should show appropriate error message
3. Should not crash the app

#### Test Invalid Email
1. Try registering with invalid email format
2. Should show validation error
3. Should not attempt database operation

### 4. Admin Role Testing

#### Promote User to Admin
1. In Supabase Table Editor, find the test user
2. Change `role` from `'user'` to `'admin'`
3. User should log out and back in
4. Should now have "ADMIN" badge
5. Should be able to access admin area

## Expected Results

### ✅ Success Criteria
- [ ] New users register without database errors
- [ ] All new users get `role = 'user'` by default
- [ ] Profile is created automatically on registration
- [ ] Users can log in after registration
- [ ] Role-based access control works correctly
- [ ] Admin promotion works via database update

### ❌ Failure Indicators
- Database errors during registration
- NULL role values in profiles table
- Missing profiles after user creation
- Users unable to log in after registration
- Role-based access not working

## Troubleshooting

### If Registration Fails
1. Check Supabase logs for errors
2. Verify trigger function is working
3. Check if role column has proper default
4. Ensure RLS policies allow profile creation

### If Profile Not Created
1. Check if trigger fired
2. Manually create profile:
```sql
INSERT INTO profiles (id, email, role) 
VALUES ('user-uuid-here', 'user@example.com', 'user');
```

### If Role Access Issues
1. Verify user's role in profiles table
2. Check RLS policies are active
3. Ensure frontend is checking roles correctly
4. Clear browser cache and re-login
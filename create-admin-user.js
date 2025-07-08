// Script to create admin user via Supabase Auth API
// Run this with: node create-admin-user.js
// 
// SECURITY REQUIREMENT: Set ADMIN_PASSWORD environment variable before running
// Example: ADMIN_PASSWORD="your-secure-password" node create-admin-user.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY';
const adminPassword = process.env.ADMIN_PASSWORD;

// Validate required environment variables
if (!supabaseUrl || !supabaseServiceKey || supabaseServiceKey === 'YOUR_SERVICE_ROLE_KEY') {
  console.error('❌ Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

if (!adminPassword) {
  console.error('❌ ADMIN_PASSWORD environment variable is required');
  console.error('   Set it like: ADMIN_PASSWORD="your-secure-password" node create-admin-user.js');
  process.exit(1);
}

// Validate password strength
if (adminPassword.length < 8) {
  console.error('❌ Password must be at least 8 characters long');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdminUser() {
  try {
    console.log('Creating admin user...');
    
    const { data, error } = await supabase.auth.admin.createUser({
      email: 'alboabourt@progdealer.com',
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        role: 'admin',
        name: 'Admin User'
      }
    });

    if (error) {
      if (error.message.includes('already registered')) {
        console.log('✅ Admin user already exists: alboabourt@progdealer.com');
        return;
      }
      throw error;
    }

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email: alboabourt@progdealer.com');
    console.log('🔑 Password: [HIDDEN FOR SECURITY]');
    console.log('🆔 User ID:', data.user?.id);
    console.log('');
    console.log('⚠️  SECURITY REMINDER: Store the password securely and never commit it to version control!');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    process.exit(1);
  }
}

createAdminUser();
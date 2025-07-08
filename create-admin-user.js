// Script to create admin user via Supabase Auth API
// Run this with: node create-admin-user.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY';

if (!supabaseUrl || !supabaseServiceKey || supabaseServiceKey === 'YOUR_SERVICE_ROLE_KEY') {
  console.error('Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
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
      password: 'sparkz-coupa-spill',
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
    console.log('🔑 Password: sparkz-coupa-spill');
    console.log('🆔 User ID:', data.user?.id);
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    process.exit(1);
  }
}

createAdminUser();
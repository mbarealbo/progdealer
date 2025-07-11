import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Function to send confirmation email via Resend
async function sendDeletionConfirmationEmail(userEmail: string): Promise<void> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  
  if (!resendApiKey) {
    console.warn('RESEND_API_KEY not found, skipping confirmation email')
    return
  }

  const emailHtml = `
<!DOCTYPE html>
<html>
  <body style="font-family: sans-serif; font-size: 16px; line-height: 1.6; color: #111111; background-color: #ffffff; padding: 32px;">
    <h2 style="color: #D72638; margin-bottom: 8px;">Goodbye from ProgDealer 👋</h2>
    <p style="margin-top: 0;">Your account has been permanently deleted from our system.</p>
    <p>If this was a mistake, you're always welcome to rejoin the world of progressive events, great bands and cult live shows.</p>

    <hr style="margin-top: 40px; border: none; border-top: 1px solid #eeeeee;">

    <p style="font-size: 12px; color: #999999;">This message was sent by ProgDealer • <a href="https://progdealer.online" style="color: #D72638; text-decoration: none;">progdealer.online</a></p>
  </body>
</html>
  `.trim()

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'hello@progdealer.online',
        to: [userEmail],
        subject: 'Your ProgDealer account has been deleted',
        html: emailHtml,
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Failed to send confirmation email via Resend:', errorData)
      throw new Error(`Resend API error: ${response.status}`)
    }

    const result = await response.json()
    console.log('Confirmation email sent successfully via Resend:', result.id)
  } catch (error) {
    console.error('Error sending confirmation email:', error)
    // Don't throw - we don't want email failures to block account deletion
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method Not Allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header missing' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Bearer token missing' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Initialize Supabase client with service role key (admin privileges)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify the user's JWT token to get their ID
    // This ensures the user can only delete their own account
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      console.error('Auth error:', authError)
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log(`Attempting to delete user: ${user.id}`)

    // Store user email for confirmation email before deletion
    const userEmail = user.email

    // Delete the user from Supabase Auth
    // This will cascade delete the profile due to foreign key constraints
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)

    if (deleteError) {
      console.error('Delete user error:', deleteError)
      return new Response(
        JSON.stringify({ error: `Failed to delete user: ${deleteError.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log(`Successfully deleted user: ${user.id}`)

    // Send confirmation email after successful deletion
    if (userEmail) {
      console.log(`Sending confirmation email to: ${userEmail}`)
      await sendDeletionConfirmationEmail(userEmail)
    }

    // Send account deletion confirmation email before deleting the user
    // This uses the "Account Deleted" email template configured in Supabase
    try {
      console.log(`Sending deletion confirmation email to: ${userEmail}`)
      
      // Note: Since we're about to delete the user, we need to send the email
      // while the user still exists in the auth system
      const { error: emailError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'email_change_confirm',
        email: userEmail,
        options: {
          redirectTo: `${Deno.env.get('SITE_URL') || 'http://localhost:5173'}/goodbye`
        }
      })

      // For account deletion confirmation, we'll use a custom approach
      // since Supabase doesn't have a built-in "account deleted" email trigger
      // We can use the admin API to send a custom email or use a third-party service
      
      // Alternative: Use Supabase's built-in email functionality
      // This will send an email using your configured email template
      console.log('Account deletion email preparation completed')
      
    } catch (emailError) {
      console.warn('Failed to send deletion confirmation email:', emailError)
      // Don't fail the deletion if email fails - continue with account deletion
    }
    // Delete the user from Supabase Auth
    // This will cascade delete the profile due to foreign key constraints
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)

    if (deleteError) {
      console.error('Delete user error:', deleteError)
      return new Response(
        JSON.stringify({ error: `Failed to delete user: ${deleteError.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log(`Successfully deleted user: ${user.id}`)

    // Send a final confirmation email after successful deletion
    // Note: This is sent to the email address, even though the user account no longer exists
    try {
      // Here you would integrate with your email service (SendGrid, Resend, etc.)
      // or use Supabase's webhook functionality to trigger the email
      console.log(`Account deletion completed for email: ${userEmail}`)
    } catch (finalEmailError) {
      console.warn('Failed to send final confirmation email:', finalEmailError)
      // Don't fail the response if final email fails
    }
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User account deleted successfully',
        userId: user.id,
        email: userEmail
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal Server Error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
console.log("🔍 VERSIONE CORRETTA ESEGUITA");
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
    // Parse the request body
    const { user_email } = await req.json()
    
    if (!user_email) {
      console.error('Missing user_email in request body')
      return new Response(
        JSON.stringify({ error: 'user_email is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log(`Processing notification for user: ${user_email}`)

    // Get Resend API key from environment
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not found in environment variables')
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Create the HTML email content
    const emailHtml = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Event Submission - ProgDealer</title>
  </head>
  <body style="font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
      
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%); color: #ffffff; padding: 30px; text-align: center;">
        <div style="font-size: 32px; margin-bottom: 10px;">🎸</div>
        <h1 style="margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 2px;">PROGDEALER</h1>
        <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.8; text-transform: uppercase; letter-spacing: 1px;">Event Notification</p>
      </div>

      <!-- Content -->
      <div style="padding: 30px;">
        <h2 style="color: #1a1a1a; margin-top: 0; margin-bottom: 20px; font-size: 20px;">New Event Submitted</h2>
        
        <p style="margin-bottom: 20px; font-size: 16px;">
          A new progressive music event has been submitted to ProgDealer and is waiting for your review.
        </p>

        <div style="background-color: #f8f9fa; border-left: 4px solid #28a745; padding: 20px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Submitted by:</p>
          <p style="margin: 0; font-size: 18px; font-weight: bold; color: #1a1a1a;">${user_email}</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="https://progdealer.netlify.app/adminarea" 
             style="display: inline-block; background-color: #28a745; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; font-size: 14px; transition: background-color 0.3s;">
            🛠️ Go to Admin Panel
          </a>
        </div>

        <p style="font-size: 14px; color: #666; margin-top: 30px;">
          You can review, approve, or reject this event from the admin panel. The event is currently in "pending" status and won't be visible to the public until approved.
        </p>
      </div>

      <!-- Footer -->
      <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
        <p style="margin: 0; font-size: 12px; color: #666;">
          This is an automated notification from 
          <a href="https://progdealer.netlify.app" style="color: #28a745; text-decoration: none;">ProgDealer</a>
        </p>
        <p style="margin: 5px 0 0 0; font-size: 12px; color: #999;">
          Progressive Music Events Database
        </p>
      </div>
    </div>
  </body>
</html>
    `.trim()

    console.log('Sending notification email to albo@progdealer.com')

    // Send email via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'ProgDealer <notifications@progdealer.online>',
        to: ['albo@progdealer.com'],
        subject: 'New Event on ProgDealer',
        html: emailHtml,
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Failed to send email via Resend:', errorData)
      throw new Error(`Resend API error: ${response.status}`)
    }

    const result = await response.json()
    console.log('Email sent successfully:', result.id)

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error in notify-albo function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal Server Error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
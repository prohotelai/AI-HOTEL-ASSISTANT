/**
 * Staff Invitation Email Template
 * HTML email with magic link for staff registration
 */

export interface StaffInvitationEmailData {
  firstName: string
  lastName: string
  hotelName: string
  position?: string
  magicLink: string
  expiresAt: Date
  inviterName?: string
}

/**
 * Generate HTML email for staff invitation
 */
export function generateStaffInvitationEmail(data: StaffInvitationEmailData): {
  subject: string
  html: string
  text: string
} {
  const expiryHours = Math.round(
    (data.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60)
  )

  const subject = `You're invited to join ${data.hotelName}!`

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Staff Invitation</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 18px;
      color: #333;
      margin-bottom: 20px;
    }
    .message {
      color: #666;
      margin-bottom: 30px;
      line-height: 1.8;
    }
    .position-badge {
      display: inline-block;
      background: #f0f4ff;
      color: #4c51bf;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 500;
      margin: 10px 0 20px 0;
    }
    .cta-button {
      display: block;
      width: 100%;
      max-width: 300px;
      margin: 30px auto;
      padding: 16px 32px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      text-align: center;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      transition: transform 0.2s;
    }
    .cta-button:hover {
      transform: translateY(-2px);
    }
    .expiry-notice {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
      font-size: 14px;
      color: #856404;
    }
    .footer {
      background: #f9fafb;
      padding: 30px;
      text-align: center;
      color: #666;
      font-size: 14px;
      border-top: 1px solid #e5e7eb;
    }
    .footer a {
      color: #667eea;
      text-decoration: none;
    }
    .divider {
      border-top: 1px solid #e5e7eb;
      margin: 30px 0;
    }
    .steps {
      margin: 30px 0;
    }
    .step {
      display: flex;
      align-items: flex-start;
      margin-bottom: 20px;
    }
    .step-number {
      background: #667eea;
      color: white;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      flex-shrink: 0;
      margin-right: 15px;
    }
    .step-content {
      flex: 1;
      padding-top: 4px;
    }
    .step-title {
      font-weight: 600;
      color: #333;
      margin-bottom: 5px;
    }
    .step-description {
      color: #666;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Welcome to the Team!</h1>
    </div>
    
    <div class="content">
      <div class="greeting">
        Hi ${data.firstName},
      </div>
      
      <div class="message">
        ${
          data.inviterName
            ? `${data.inviterName} has invited you to join`
            : 'You have been invited to join'
        } <strong>${data.hotelName}</strong> as part of their staff team!
        ${data.position ? `<div class="position-badge">Position: ${data.position}</div>` : ''}
      </div>

      <div class="message">
        We're excited to have you on board. Click the button below to complete your registration and set up your account.
      </div>

      <a href="${data.magicLink}" class="cta-button">
        Complete Registration →
      </a>

      <div class="expiry-notice">
        ⏰ <strong>Note:</strong> This invitation expires in ${expiryHours} hours. Please complete your registration before then.
      </div>

      <div class="divider"></div>

      <div class="steps">
        <h3 style="margin-bottom: 20px; color: #333;">What happens next?</h3>
        
        <div class="step">
          <div class="step-number">1</div>
          <div class="step-content">
            <div class="step-title">Click the registration link</div>
            <div class="step-description">Use the button above or copy the link at the bottom of this email</div>
          </div>
        </div>

        <div class="step">
          <div class="step-number">2</div>
          <div class="step-content">
            <div class="step-title">Set up your password</div>
            <div class="step-description">Create a secure password for your account</div>
          </div>
        </div>

        <div class="step">
          <div class="step-number">3</div>
          <div class="step-content">
            <div class="step-title">Complete your profile</div>
            <div class="step-description">Add your personal details and contact information</div>
          </div>
        </div>

        <div class="step">
          <div class="step-number">4</div>
          <div class="step-content">
            <div class="step-title">Start working!</div>
            <div class="step-description">Access your dashboard, calendar, and begin collaborating with your team</div>
          </div>
        </div>
      </div>

      <div class="divider"></div>

      <div class="message" style="font-size: 14px; color: #666;">
        <strong>Having trouble with the button?</strong><br>
        Copy and paste this link into your browser:<br>
        <a href="${data.magicLink}" style="color: #667eea; word-break: break-all;">${data.magicLink}</a>
      </div>
    </div>
    
    <div class="footer">
      <p>
        This invitation was sent to ${data.firstName} ${data.lastName}<br>
        If you didn't expect this invitation, you can safely ignore this email.
      </p>
      <p style="margin-top: 20px;">
        <a href="#">Privacy Policy</a> • <a href="#">Terms of Service</a> • <a href="#">Contact Support</a>
      </p>
      <p style="margin-top: 20px; color: #999; font-size: 12px;">
        © ${new Date().getFullYear()} ${data.hotelName}. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
  `

  const text = `
Hi ${data.firstName},

${data.inviterName ? `${data.inviterName} has invited you` : 'You have been invited'} to join ${data.hotelName} as part of their staff team!
${data.position ? `Position: ${data.position}` : ''}

Click the link below to complete your registration:
${data.magicLink}

This invitation expires in ${expiryHours} hours.

What happens next?
1. Click the registration link
2. Set up your password
3. Complete your profile
4. Start working!

If you didn't expect this invitation, you can safely ignore this email.

© ${new Date().getFullYear()} ${data.hotelName}
  `.trim()

  return { subject, html, text }
}

/**
 * Generate plain text fallback
 */
export function generatePlainTextInvitation(data: StaffInvitationEmailData): string {
  return `
Hi ${data.firstName},

You've been invited to join ${data.hotelName}!
${data.position ? `Position: ${data.position}` : ''}

Complete your registration here:
${data.magicLink}

This link expires in ${Math.round((data.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60))} hours.

Thanks,
${data.hotelName} Team
  `.trim()
}

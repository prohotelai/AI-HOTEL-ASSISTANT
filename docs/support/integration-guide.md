# Integration Guide - AI Hotel Assistant

## Overview
This guide covers integrating AI Hotel Assistant with your existing hotel systems, including Property Management Systems (PMS), payment gateways, and third-party services.

---

## PMS Integration

### Supported PMS Systems
- Opera Cloud (Oracle)
- Cloudbeds
- Guesty
- Mews
- RMS Cloud
- Custom PMS (via REST API)

### Setup Steps

#### 1. Obtain PMS API Credentials
1. Log into your PMS admin panel
2. Navigate to API/Integrations section
3. Generate API key/credentials
4. Note the API endpoint URL
5. Whitelist our webhook IPs (if required)

#### 2. Configure Integration in Dashboard
1. Go to **Dashboard > Settings > Integrations**
2. Click "Add New Integration"
3. Select your PMS provider
4. Enter API credentials:
   - API Key
   - API Secret (if applicable)
   - Endpoint URL
   - Property/Hotel ID
5. Click "Test Connection"
6. Save configuration

#### 3. Configure Sync Settings
- **Sync Frequency:** Choose 5min, 15min, 30min, or 1 hour
- **Data Types:**
  - ☑ Bookings/Reservations
  - ☑ Guest profiles
  - ☑ Room availability
  - ☑ Rates and packages
  - ☑ Check-ins/Check-outs
- **Historical Data:** Choose how far back to sync (7, 30, 90 days)

#### 4. Set Up Webhooks
Configure PMS to send webhooks to:
```
https://yourdomain.com/api/integrations/pms/webhook
```

Webhook events to subscribe:
- `reservation.created`
- `reservation.updated`
- `reservation.cancelled`
- `guest.checkin`
- `guest.checkout`

#### 5. Test Integration
1. Create test booking in PMS
2. Verify it appears in AI Assistant dashboard within sync interval
3. Check logs for any errors (Dashboard > Integrations > Logs)
4. Test AI Assistant queries about the booking

### Troubleshooting PMS Integration

**Issue: Connection Test Fails**
- Verify API credentials are correct
- Check API endpoint URL format
- Ensure IP whitelist includes our servers
- Check PMS API status (external issue)

**Issue: Data Not Syncing**
- Review sync logs for errors
- Verify webhook configuration
- Check sync frequency settings
- Ensure data types are selected
- Clear cache and retry

---

## Payment Gateway Integration

### Stripe Setup (Recommended)

#### 1. Create Stripe Account
1. Sign up at stripe.com
2. Complete business verification
3. Enable payment methods (cards, wallets, etc.)

#### 2. Get API Keys
1. Go to Stripe Dashboard > Developers > API Keys
2. Copy **Publishable Key** (starts with `pk_`)
3. Copy **Secret Key** (starts with `sk_`)
4. **Store secret key securely** (never commit to git)

#### 3. Configure in AI Hotel Assistant
Add to environment variables (`.env.local`):
```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

#### 4. Set Up Webhook
1. Go to Stripe Dashboard > Developers > Webhooks
2. Click "Add endpoint"
3. Enter URL:
   ```
   https://yourdomain.com/api/billing/webhooks
   ```
4. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy **Webhook Signing Secret** (starts with `whsec_`)
6. Add to environment:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

#### 5. Test Webhook
Using Stripe CLI:
```bash
stripe listen --forward-to localhost:3000/api/billing/webhooks
stripe trigger customer.subscription.created
```

### Alternative Payment Gateways

#### PayPal
1. Create PayPal Business account
2. Get API credentials from Developer Dashboard
3. Configure webhook endpoint
4. Contact support for PayPal integration activation

#### Square
1. Create Square developer account
2. Get Application ID and Access Token
3. Configure in Settings > Integrations > Payments
4. Test with Square sandbox

---

## Email Integration

### SMTP Configuration
For transactional emails (password reset, notifications):

1. Go to **Settings > Integrations > Email**
2. Configure SMTP:
   ```
   SMTP Host: smtp.yourdomain.com
   SMTP Port: 587 (TLS) or 465 (SSL)
   Username: noreply@yourdomain.com
   Password: [your-smtp-password]
   From Name: AI Hotel Assistant
   From Email: noreply@yourdomain.com
   ```

### Email Providers

**SendGrid (Recommended)**
```bash
SENDGRID_API_KEY=SG.xxxx
```

**AWS SES**
```bash
AWS_SES_REGION=us-east-1
AWS_SES_ACCESS_KEY=xxxx
AWS_SES_SECRET_KEY=xxxx
```

**Mailgun**
```bash
MAILGUN_API_KEY=xxxx
MAILGUN_DOMAIN=mg.yourdomain.com
```

---

## Live Chat Integration

### Intercom Setup
1. Create Intercom account
2. Get Workspace ID from Settings
3. Add to environment:
   ```bash
   NEXT_PUBLIC_INTERCOM_APP_ID=your_app_id
   ```
4. Install Intercom script (handled by SupportCard component)

### Alternative: Zendesk Chat
1. Create Zendesk account
2. Enable Chat widget
3. Get embed code
4. Add to SupportCard component

---

## Analytics Integration

### Google Analytics 4
1. Create GA4 property
2. Get Measurement ID (G-XXXXXXXXXX)
3. Add to environment:
   ```bash
   NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
   ```

### Mixpanel
For advanced user analytics:
```bash
NEXT_PUBLIC_MIXPANEL_TOKEN=your_token
```

---

## Single Sign-On (SSO)

### SAML Integration
For enterprise customers:

1. Go to **Settings > Security > SSO**
2. Select SAML 2.0
3. Provide your IdP metadata:
   - SSO URL
   - Entity ID
   - X.509 Certificate
4. Download our SP metadata
5. Configure in your IdP (Okta, Azure AD, etc.)

### OAuth 2.0 / OpenID Connect
Supported providers:
- Google Workspace
- Microsoft Azure AD
- Okta

Configuration in `.env.local`:
```bash
OAUTH_CLIENT_ID=xxxx
OAUTH_CLIENT_SECRET=xxxx
OAUTH_ISSUER=https://your-idp.com
```

---

## API Integration

### REST API Access

#### 1. Generate API Key
1. Go to **Settings > API Access**
2. Click "Generate New API Key"
3. Set permissions (read, write, admin)
4. Copy API key (shown once)
5. Store securely

#### 2. Make API Requests
```bash
curl -X GET https://yourdomain.com/api/v1/bookings \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json"
```

#### 3. Webhooks
Configure webhooks to receive events:
- `booking.created`
- `guest.checkin`
- `ticket.created`
- `payment.succeeded`

---

## Mobile App Integration

### Push Notifications
Using Firebase Cloud Messaging (FCM):

1. Create Firebase project
2. Download service account JSON
3. Add to environment:
   ```bash
   FIREBASE_PROJECT_ID=your-project
   FIREBASE_CLIENT_EMAIL=xxx@xxx.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
   ```

---

## Testing Integrations

### Integration Test Checklist
- [ ] PMS data syncs correctly
- [ ] Webhooks receive events
- [ ] Payment processing works
- [ ] Emails deliver successfully
- [ ] Live chat widget loads
- [ ] Analytics tracks events
- [ ] SSO login works
- [ ] API authentication succeeds
- [ ] Push notifications deliver

### Monitoring
Check integration health:
1. **Dashboard > Integrations > Health**
2. View last sync times
3. Check error logs
4. Monitor API rate limits
5. Review webhook delivery status

---

## Security Best Practices

1. **Never commit secrets to git**
2. Use environment variables for all credentials
3. Rotate API keys every 90 days
4. Enable IP whitelisting when available
5. Use HTTPS for all webhooks
6. Verify webhook signatures
7. Implement rate limiting
8. Monitor for suspicious activity

---

## Getting Help

For integration issues:
- **Email:** integrations@aihotelassistant.com
- **Documentation:** docs.aihotelassistant.com
- **Support Portal:** Dashboard > Support
- **Phone (Enterprise):** +1 (800) 555-0123

**Last Updated:** December 2024

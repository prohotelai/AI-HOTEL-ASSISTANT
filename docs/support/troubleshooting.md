# Troubleshooting Guide - AI Hotel Assistant

## Common Issues and Solutions

### 1. Login Issues

#### Problem: Unable to log in with correct credentials
**Solution:**
1. Clear browser cache and cookies
2. Ensure Caps Lock is off when typing password
3. Try password reset via "Forgot Password" link
4. Check if your account is active (contact admin)

#### Problem: "Session expired" error appears frequently
**Solution:**
1. Check if cookies are enabled in browser settings
2. Update browser to latest version
3. Try incognito/private browsing mode
4. Contact support if issue persists (session timeout may need adjustment)

---

### 2. AI Assistant Issues

#### Problem: AI Assistant not responding
**Solution:**
1. Check internet connection
2. Refresh the page (Ctrl+F5 or Cmd+Shift+R)
3. Clear browser cache
4. Check if AI message quota is exceeded (Dashboard > Usage)
5. Verify OpenAI API key is configured (admin only)

#### Problem: AI responses are slow or delayed
**Solution:**
1. Check network speed (minimum 5 Mbps recommended)
2. Reduce conversation history (start new conversation)
3. Avoid large file uploads if applicable
4. Check system status page for service disruptions

#### Problem: AI provides incorrect or outdated information
**Solution:**
1. Update knowledge base documents (Dashboard > Knowledge Base)
2. Verify PMS integration is syncing correctly
3. Train AI with recent hotel-specific information
4. Report specific errors to support for model retraining

---

### 3. PMS Integration Issues

#### Problem: PMS data not syncing
**Solution:**
1. Verify PMS credentials are correct (Settings > Integrations)
2. Check PMS API status (external service)
3. Review sync logs (Dashboard > Integrations > Logs)
4. Ensure webhook URLs are whitelisted in PMS settings
5. Test connection manually (Settings > Test Connection)

#### Problem: Room bookings not appearing
**Solution:**
1. Check sync frequency settings (may take up to 15 minutes)
2. Verify booking dates are within sync range
3. Clear integration cache (Settings > Integrations > Clear Cache)
4. Manually trigger sync (Dashboard > Sync Now button)

---

### 4. Payment & Billing Issues

#### Problem: Payment declined during subscription
**Solution:**
1. Verify card details are correct
2. Check card has sufficient funds
3. Contact bank to ensure no fraud blocks
4. Try alternative payment method
5. Contact billing support if issue persists

#### Problem: Subscription not activated after payment
**Solution:**
1. Wait 5-10 minutes for webhook processing
2. Check email for payment confirmation
3. Refresh dashboard page
4. Check Stripe webhook logs (admin: Dashboard > System > Webhooks)
5. Contact support with transaction ID

#### Problem: Usage limits not updated after upgrade
**Solution:**
1. Wait 10-15 minutes for system propagation
2. Log out and log back in to refresh session
3. Clear browser cache
4. Check subscription status (Dashboard > Billing)
5. Contact support if not resolved within 1 hour

---

### 5. Knowledge Base Issues

#### Problem: Uploaded documents not appearing in searches
**Solution:**
1. Wait 2-5 minutes for document processing
2. Check file format is supported (PDF, DOCX, TXT, MD)
3. Verify file size is under 10MB
4. Check document status (Dashboard > Knowledge Base > Documents)
5. Re-upload document if status shows "Failed"

#### Problem: AI not using knowledge base information
**Solution:**
1. Ensure documents are marked as "Active"
2. Check document tags/categories match query context
3. Verify embeddings are generated (admin: check Pinecone)
4. Update RAG retrieval settings if needed (Settings > AI Config)

---

### 6. Support Ticket Issues

#### Problem: Cannot create support ticket
**Solution:**
1. Verify subscription plan includes support (PRO or higher)
2. Check ticket quota is not exceeded (Dashboard > Usage)
3. Ensure subject and description meet minimum length requirements
4. Try reducing description length if too long (max 5000 chars)

#### Problem: No response to support ticket
**Solution:**
1. Check spam folder for email responses
2. Verify email address is correct (Profile > Settings)
3. Allow 24 hours for initial response
4. For urgent issues, use live chat or phone support
5. Check ticket status (Dashboard > Support > My Tickets)

---

### 7. Performance Issues

#### Problem: Dashboard loading slowly
**Solution:**
1. Check internet connection speed
2. Close unnecessary browser tabs
3. Clear browser cache and cookies
4. Disable browser extensions temporarily
5. Try different browser (Chrome, Firefox, Safari)

#### Problem: High CPU/memory usage
**Solution:**
1. Close inactive tabs and applications
2. Reduce number of concurrent AI conversations
3. Disable real-time features if not needed
4. Check for browser updates
5. Restart browser

---

### 8. Mobile App Issues

#### Problem: Mobile app crashes on launch
**Solution:**
1. Force close app and restart
2. Clear app cache (Settings > Apps > Clear Cache)
3. Update app to latest version
4. Restart device
5. Uninstall and reinstall app

#### Problem: Push notifications not working
**Solution:**
1. Enable notifications in device settings
2. Check app notification permissions
3. Verify notification preferences (App Settings > Notifications)
4. Restart device
5. Re-login to app

---

## Advanced Troubleshooting

### Browser Console Errors
If you see errors in browser console (F12):
1. Take screenshot of error message
2. Note steps that triggered the error
3. Check browser version compatibility
4. Create support ticket with error details

### Network Issues
If experiencing connectivity problems:
1. Run speed test (speedtest.net)
2. Check firewall/VPN settings
3. Test on different network
4. Verify DNS settings
5. Contact IT department if corporate network

### Database Connection Errors
If seeing "Database connection failed":
1. Check system status page
2. Wait 5-10 minutes (may be temporary)
3. Try different feature in dashboard
4. Contact support if persists beyond 30 minutes

---

## Getting Additional Help

### Support Channels
- **Email:** support@aihotelassistant.com (24-hour response)
- **Live Chat:** Available Mon-Fri, 9AM-6PM EST
- **Phone:** +1 (800) 555-0123 (Urgent issues only)
- **Support Tickets:** Dashboard > Support > Create Ticket

### Before Contacting Support
Gather the following information:
- Hotel name and workspace ID
- Browser version and operating system
- Steps to reproduce the issue
- Screenshots or error messages
- Time when issue occurred

### Emergency Contact
For critical system failures affecting operations:
- Call emergency hotline: +1 (800) 555-9999
- Available 24/7 for ENTERPRISE plans
- Email urgent@aihotelassistant.com

---

**Last Updated:** December 2024  
**Version:** 1.0.0

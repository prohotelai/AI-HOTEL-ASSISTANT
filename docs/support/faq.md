# Frequently Asked Questions (FAQ)

## Getting Started

### What is AI Hotel Assistant?
AI Hotel Assistant is a comprehensive SaaS platform that helps hotels automate guest communication, streamline operations, and provide 24/7 support through AI-powered chatbots and management tools.

### Who is it for?
- Independent hotels
- Hotel chains
- Boutique properties
- Vacation rentals
- Resort properties
- Bed & breakfasts

### How do I get started?
1. Sign up for a free account
2. Complete hotel profile setup
3. Integrate with your PMS (optional)
4. Train AI with your hotel information
5. Deploy chat widget on your website
6. Start engaging with guests!

### Is there a free trial?
Yes! All paid plans include a 14-day free trial. No credit card required. The STARTER plan is free forever with basic features.

---

## Features

### What can the AI Assistant do?
- Answer guest questions 24/7
- Provide hotel information (amenities, policies, hours)
- Assist with booking inquiries
- Handle common guest requests
- Offer local recommendations
- Escalate complex issues to staff
- Support multiple languages

### Does it integrate with my PMS?
Yes, we integrate with:
- Opera Cloud
- Cloudbeds
- Guesty
- Mews
- RMS Cloud
- Custom PMS via REST API

### Can I customize the AI responses?
Yes! You can:
- Upload custom knowledge base documents
- Set hotel-specific policies
- Define standard responses
- Train AI on your brand voice
- Configure escalation rules

### Is multi-language support available?
Yes, the AI Assistant supports 50+ languages including:
- English, Spanish, French, German, Italian
- Portuguese, Dutch, Russian, Arabic, Hindi
- Chinese (Simplified & Traditional), Japanese, Korean
- And many more!

---

## Technical

### What browsers are supported?
- Google Chrome (recommended, v90+)
- Mozilla Firefox (v88+)
- Safari (v14+)
- Microsoft Edge (v90+)
- Mobile browsers (iOS Safari, Chrome Android)

### Is there a mobile app?
Yes, native mobile apps are available:
- iOS app (App Store)
- Android app (Google Play)

Features include push notifications, offline mode, and mobile-optimized interface.

### What about data security?
Security is our top priority:
- ✅ End-to-end encryption
- ✅ SOC 2 Type II certified
- ✅ GDPR compliant
- ✅ CCPA compliant
- ✅ Regular security audits
- ✅ Multi-factor authentication
- ✅ Role-based access control
- ✅ Daily encrypted backups

### Where is data stored?
- Primary servers: US (AWS us-east-1)
- European customers: EU region available (GDPR)
- Data residency options for enterprise plans
- Automatic daily backups retained for 30 days

### What's the uptime guarantee?
- **STARTER/PRO/PRO_PLUS:** 99% uptime (best effort)
- **ENTERPRISE_LITE:** 99.5% SLA with credits
- **ENTERPRISE_MAX:** 99.9% SLA with credits

View current status: status.aihotelassistant.com

---

## Account & Billing

### How do I upgrade my plan?
1. Go to Dashboard > Billing
2. Click "Change Plan"
3. Select desired plan
4. Confirm payment
5. Upgrade activates immediately

### Can I downgrade my plan?
Yes, downgrades take effect at the end of your current billing period. You'll keep your current features until then.

### What happens if I exceed usage limits?
- **AI Messages:** Service pauses until next billing cycle or upgrade
- **Voice Minutes:** Voice features disabled until reset
- **Storage:** Cannot upload new files until space freed
- Notification sent at 80% and 100% of limits

### How do I cancel my account?
1. Dashboard > Billing > Cancel Subscription
2. Select reason (optional)
3. Confirm cancellation
4. Account remains active until billing period ends

Your data is preserved for 90 days after cancellation.

---

## Support

### What support channels are available?

**FREE (STARTER) Plan:**
- Email support (72-hour response)
- Community forum
- Knowledge base

**PAID Plans (PRO, PRO_PLUS, ENTERPRISE):**
- 24/7 email support (24-hour response)
- Live chat (business hours)
- Phone support
- Priority ticket system
- Dedicated account manager (ENTERPRISE)

### How do I create a support ticket?
1. Go to Dashboard > Support
2. Click "Create Ticket"
3. Enter subject and description
4. Select priority level
5. Submit ticket

You'll receive confirmation email and updates.

### What's the typical response time?
- **Email:** 24-72 hours (depending on plan)
- **Live Chat:** Within 5 minutes (business hours)
- **Phone:** Immediate (business hours)
- **Urgent Tickets:** Within 2 hours (ENTERPRISE)

---

## AI & Automation

### How accurate is the AI?
The AI Assistant achieves:
- 95%+ accuracy on factual hotel information
- 90%+ accuracy on policy questions
- 85%+ on complex guest requests
- Continuously improves with feedback

### Can the AI make bookings?
The AI can:
- ✅ Assist with booking inquiries
- ✅ Check room availability
- ✅ Provide rate information
- ✅ Direct to booking page
- ❌ Cannot complete bookings directly (security/PCI compliance)

For direct booking capability, integrate with your booking engine.

### What if the AI doesn't know the answer?
The AI will:
1. Search knowledge base for relevant information
2. If uncertain, admit limitations
3. Offer to escalate to human staff
4. Create ticket for follow-up
5. Learn from staff responses for future

### Can I train the AI on my specific hotel?
Yes! Upload documents in various formats:
- Hotel policies (PDF, DOCX)
- FAQs (TXT, MD)
- Menu/amenities lists
- Standard operating procedures
- Previous guest Q&As

AI extracts information and uses it in responses.

### Does the AI replace my staff?
No, it augments your team by:
- Handling routine questions
- Providing 24/7 availability
- Freeing staff for complex tasks
- Escalating when needed
- Improving response times

Your staff remains essential for personalized service.

---

## Integration & Setup

### How long does setup take?
- **Basic setup:** 30 minutes
- **PMS integration:** 1-2 hours
- **Custom training:** 1-3 days
- **Full deployment:** 1 week

We provide onboarding support for paid plans.

### Do I need technical knowledge?
No! The platform is designed for non-technical users:
- Step-by-step setup wizard
- Visual configuration tools
- Copy-paste widget installation
- Pre-configured templates
- Video tutorials

Developers can use our API for custom integrations.

### Can I embed the chat widget on my website?
Yes, simple copy-paste installation:
```html
<script src="https://cdn.aihotelassistant.com/widget.js"></script>
<script>
  AIHotelWidget.init({ hotelId: 'your-hotel-id' })
</script>
```

Supports WordPress, Wix, Squarespace, Shopify, and custom sites.

### What about GDPR/privacy compliance?
The widget includes:
- Cookie consent management
- Privacy policy links
- Data processing agreements
- Right to deletion
- Data portability
- Audit logs

Configure in Dashboard > Settings > Privacy.

---

## Troubleshooting

### AI responses are slow
Possible causes:
- High traffic (temporary)
- Slow internet connection
- Large document uploads in progress
- Check system status page

### Chat widget not appearing on website
1. Verify script is installed correctly
2. Check browser console for errors
3. Ensure hotelId is correct
4. Clear browser cache
5. Check if widget is enabled (Dashboard > Widget Settings)

### PMS sync not working
1. Verify API credentials
2. Check PMS API status
3. Review sync logs (Dashboard > Integrations > Logs)
4. Test connection manually
5. Contact support if persists

### Can't log in to dashboard
1. Verify email and password
2. Check Caps Lock is off
3. Try password reset
4. Clear browser cookies
5. Try incognito mode
6. Contact support

---

## Pricing & Plans

### What's included in the FREE plan?
- 100 AI messages/month
- 10 support tickets/month
- 1 GB storage
- Basic knowledge base
- Email support (72-hour response)
- Community forum access

### What are the paid plan prices?
- **PRO:** $999/month
- **PRO_PLUS:** $1,999/month
- **ENTERPRISE_LITE:** $2,999/month
- **ENTERPRISE_MAX:** $3,999/month

See Dashboard > Billing for full comparison.

### Are there discounts?
Yes:
- **Annual billing:** Save 20%
- **Multiple properties:** Bulk discount
- **Non-profits:** 30% discount
- **Educational institutions:** 40% discount

Contact sales for custom pricing.

### Can I pay annually?
Yes! Save 20% with annual prepayment:
- PRO Annual: $9,588/year
- PRO_PLUS Annual: $19,188/year
- ENTERPRISE_LITE Annual: $28,788/year
- ENTERPRISE_MAX Annual: $38,388/year

---

## Advanced Features

### What are Knowledge Base collections?
Collections organize your hotel information:
- **Policies:** Check-in/out, cancellation, pet policy
- **Amenities:** Pool, gym, spa, restaurant hours
- **Local Area:** Attractions, transportation, restaurants
- **Services:** Room service, concierge, housekeeping
- **FAQs:** Common guest questions

AI searches relevant collections based on query context.

### Can I set up automated workflows?
Yes, with workflow automation (PRO_PLUS+):
- Auto-respond to common inquiries
- Trigger actions based on keywords
- Schedule messages (check-in reminders)
- Escalate to specific departments
- Generate reports

### What analytics are available?
Dashboard analytics include:
- Message volume trends
- Response time metrics
- Common guest questions
- Satisfaction ratings
- Staff performance
- Usage by time/day
- Export to CSV/PDF

### Can multiple staff members use one account?
Yes! Invite team members with role-based access:
- **Admin:** Full access
- **Manager:** Most features, no billing
- **Staff:** Limited to assigned tasks
- **Reception/Housekeeping/Maintenance:** Department-specific

Configure in Dashboard > Team.

---

## API & Developers

### Is there an API?
Yes, REST API available for:
- Guest data management
- Booking information
- Conversation history
- Knowledge base updates
- Analytics export
- Webhook subscriptions

Documentation: api.aihotelassistant.com/docs

### What programming languages are supported?
Official SDKs:
- JavaScript/TypeScript
- Python
- PHP
- Ruby
- C#/.NET

Community SDKs available for other languages.

### Can I build custom integrations?
Yes! Use our API to:
- Integrate with custom PMS
- Connect to CRM systems
- Build mobile apps
- Create custom reports
- Automate workflows

Enterprise plans include integration support.

---

## Compliance & Legal

### Is the platform GDPR compliant?
Yes, fully compliant with:
- GDPR (EU)
- CCPA (California)
- PIPEDA (Canada)
- Data Protection Act (UK)

Data Processing Agreements available.

### What about PCI compliance?
- We do NOT store credit card numbers
- Payment processing via Stripe (PCI Level 1)
- Tokenization for payment methods
- No card data in logs or database

### Can I sign a Business Associate Agreement (BAA)?
Yes, for healthcare-related properties (medical tourism, wellness resorts). Contact legal@aihotelassistant.com.

### Where are Terms of Service?
Available at:
- Terms of Service: aihotelassistant.com/terms
- Privacy Policy: aihotelassistant.com/privacy
- DPA: aihotelassistant.com/dpa

---

## Still Have Questions?

### Contact Us
- **Email:** support@aihotelassistant.com
- **Phone:** +1 (800) 555-0123
- **Live Chat:** Dashboard (paid plans)
- **Support Portal:** Dashboard > Support

### Resources
- **Knowledge Base:** docs.aihotelassistant.com
- **Video Tutorials:** youtube.com/aihotelassistant
- **Blog:** blog.aihotelassistant.com
- **Community Forum:** community.aihotelassistant.com

### Follow Us
- Twitter: @AIHotelAssist
- LinkedIn: AI Hotel Assistant
- Facebook: facebook.com/aihotelassistant

---

**Last Updated:** December 2024  
**Version:** 1.0.0

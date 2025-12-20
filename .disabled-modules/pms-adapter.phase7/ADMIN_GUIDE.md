# 🎓 PMS INTEGRATION - ADMIN GUIDE

## Complete Guide for Hotel Administrators

**Version**: 1.0.0  
**Last Updated**: December 13, 2025  
**Audience**: Hotel Administrators & Managers

---

## 📖 Table of Contents

1. [What is PMS Integration?](#what-is-pms-integration)
2. [Before You Start](#before-you-start)
3. [Step-by-Step Setup](#step-by-step-setup)
4. [Understanding Sync Modes](#understanding-sync-modes)
5. [Testing Your Integration](#testing-your-integration)
6. [Troubleshooting](#troubleshooting)
7. [FAQs](#faqs)

---

## What is PMS Integration?

PMS (Property Management System) Integration allows you to connect your existing hotel software (like Opera, Mews, or Protel) with this platform, so data can flow between both systems automatically.

### Why Integrate?

- ✅ **Avoid double data entry** - Update once, sync everywhere
- ✅ **Keep systems in sync** - Room status, bookings, guest info
- ✅ **Maintain your workflow** - Keep using your familiar PMS
- ✅ **Flexible control** - Choose what to sync and when

### What Gets Synced?

You choose which modules to sync:
- 🏨 Rooms & Room Status
- 📅 Bookings/Reservations
- 👥 Guest Profiles
- 🧹 Housekeeping Tasks
- 💰 Billing & Folios
- 🔧 Maintenance Work Orders

---

## Before You Start

### ✅ Prerequisites

1. **PMS Access**
   - Admin or API access to your PMS system
   - API credentials (username/password or API key)
   - PMS API documentation (if available)

2. **Information Needed**
   - Your PMS name and version
   - API URL (if cloud-based)
   - Authentication credentials
   - IT contact at PMS vendor (recommended)

3. **Permissions**
   - You need `Admin Manager` role in this platform
   - Contact support if you don't have access

### ⚠️ Important Notes

- 🔒 **Your data is safe** - Integration is disabled by default
- 🧪 **Test first** - Always test before enabling live sync
- 📞 **Get help** - Contact your PMS vendor if unsure
- 🔙 **Reversible** - You can disable anytime

---

## Step-by-Step Setup

### Step 1: Access PMS Integration

1. Log in to your admin dashboard
2. Navigate to **Settings** → **Integrations** → **PMS Integration**
3. Click **"Setup PMS Integration"**

### Step 2: Provide PMS Information

You'll be asked for:

**Basic Information**:
- PMS Name (e.g., "Opera Cloud")
- Vendor/Provider
- Version number (if known)

**Technical Details**:
- Is it Cloud-based or On-premise?
- API Type (usually REST)
- Authentication method

**Example**:
```
PMS Name: Opera Cloud
Provider: Oracle Hospitality
Version: 5.6
Type: Cloud-based
API: REST API
Auth: API Key
```

Click **"Continue"** when ready.

### Step 3: Connection Details

**You'll need**:
- Base API URL (e.g., `https://api.opera.com`)
- API Key or Username/Password
- Any additional auth tokens

**Security Note**: 🔒 Credentials are encrypted immediately and never displayed again.

**Example**:
```
API URL: https://api.opera.com/v1
API Key: abcd1234-5678-90ef-ghij-klmnopqrstuv
API Secret: (if required)
```

Click **"Save Connection"** (this does NOT connect yet).

### Step 4: Test Connection

Before going further, **test your connection**:

1. Click **"Test Connection"**
2. Wait for result (usually 5-10 seconds)
3. Review the outcome

**Success looks like**:
```
✅ Connection Successful!
- Response time: 234ms
- API Version: v5.6
- PMS is reachable
```

**Failure looks like**:
```
❌ Connection Failed
- Error: Authentication failed
- Suggestion: Check your API key
```

If it fails:
- Double-check your credentials
- Verify the API URL
- Contact your PMS vendor
- Contact our support

### Step 5: Select Modules

Choose which data to sync:

| Module | Description | Recommendation |
|--------|-------------|----------------|
| **Rooms** | Room numbers, status, types | ✅ Highly recommended |
| **Bookings** | Reservations, check-ins | ✅ Highly recommended |
| **Guests** | Guest profiles, contact info | ⚠️ Optional |
| **Housekeeping** | Cleaning tasks, status | ⚠️ Optional |
| **Billing** | Invoices, folios, charges | ⚠️ Advanced |
| **Maintenance** | Work orders, repairs | ⚠️ Advanced |

**Start simple**: Enable only Rooms and Bookings initially.

### Step 6: Review Field Mappings

The system will suggest how fields map between your PMS and our platform:

**Example**:
```
Your PMS          →    Our Platform
─────────────────────────────────────
RoomNumber        →    number
FloorNumber       →    floor
RoomStatus        →    status (uppercase)
GuestFirstName    →    firstName
```

**Review carefully**:
- ✅ Green = Direct match, high confidence
- ⚠️ Yellow = Needs transformation, review needed
- ❌ Red = Missing or incompatible, manual fix needed

**Ask yourself**:
- Do the mappings make sense?
- Are critical fields mapped correctly?
- Are there any warnings?

Click **"Approve Mappings"** if satisfied, or **"Edit"** to adjust.

### Step 7: Choose Sync Mode

**Three options**:

#### 1. SaaS Only (No Integration)
```
Your PMS  ❌  This Platform
```
- All data managed here only
- No sync with external PMS
- Simplest option

**When to use**: New hotels without existing PMS

#### 2. External PMS Only (Read-Only)
```
Your PMS  →  This Platform
```
- Pull data FROM your PMS
- Never write back to PMS
- PMS is source of truth

**When to use**: 
- You trust your PMS data completely
- You don't want this platform updating your PMS
- **Recommended for most hotels**

#### 3. Hybrid (Bi-Directional)
```
Your PMS  ⇄  This Platform
```
- Sync both ways
- Changes flow in both directions
- Requires conflict resolution

**When to use**:
- Advanced setups only
- You understand the risks
- You need full two-way sync

⚠️ **Recommendation**: Start with **External PMS Only** mode.

### Step 8: Set Sync Schedule

**How often should sync run?**

- ⏱️ Every 5 minutes (Real-time, high API usage)
- ⏱️ Every 15 minutes (Balanced, recommended)
- ⏱️ Every 30 minutes (Conservative)
- ⏱️ Every hour (Low frequency)
- 🚫 Manual only (You trigger each sync)

**Recommendation**: Start with **Manual only**, test thoroughly, then enable automatic sync at 15-minute intervals.

### Step 9: Review Final Configuration

You'll see a complete summary:

```
═══════════════════════════════════════════
PMS Integration Configuration Summary
═══════════════════════════════════════════

PMS: Opera Cloud v5.6
Connection: ✅ Tested successfully
Modules: Rooms, Bookings
Sync Mode: External PMS Only (Read-Only)
Direction: Pull from PMS → Platform
Conflict: External PMS Wins
Schedule: Manual trigger only

Field Mappings: 12 fields configured
Warnings: 1 minor warning

Status: DISABLED (will not run automatically)
Risk Level: LOW

═══════════════════════════════════════════
```

**Check everything carefully**:
- Is the PMS name correct?
- Are the right modules enabled?
- Is the sync direction what you want?
- Do you understand the warnings?

### Step 10: Save Configuration

Click **"Save Configuration"** 

**Important**: This saves the config but does NOT enable it yet.

You'll see:
```
✅ Configuration saved successfully!

Config ID: int_abc123def456

Status: SAVED but DISABLED
No automatic sync will occur.

Next Steps:
1. Test sync with dry-run
2. Review results carefully  
3. Enable integration when ready
```

---

## Understanding Sync Modes

### Read-Only (PULL) - Recommended

**How it works**:
```
Your PMS (Source)  →  Platform (Mirror)
```

**What happens**:
- Platform reads data from your PMS
- Platform never writes back to PMS
- Your PMS data is never changed
- Safe and predictable

**Best for**:
- Most hotels
- First-time integration
- When PMS is your main system

**Example**:
1. Guest books room in your PMS
2. 15 minutes later, sync runs
3. Booking appears in this platform
4. Your PMS remains unchanged

### Write-Only (PUSH)

**How it works**:
```
Platform (Source)  →  Your PMS (Updated)
```

**What happens**:
- Platform sends data to your PMS
- Your PMS gets updated
- Platform data is source of truth

**Best for**:
- Rare use case
- When this platform is primary
- Requires careful testing

### Bi-Directional (HYBRID)

**How it works**:
```
Your PMS  ⇄  Platform
```

**What happens**:
- Changes flow both ways
- Conflicts can occur
- Requires conflict resolution rules

**Conflict Example**:
```
Your PMS: Room 101 = "Dirty"
Platform: Room 101 = "Clean"

Which one wins? You decide:
→ External Wins (PMS data overrides)
→ Internal Wins (Platform data overrides)
→ Manual Review (You choose each time)
```

**Best for**:
- Advanced users only
- Full workflow integration
- When you understand the risks

⚠️ **Warning**: Test extensively before using Hybrid mode in production.

---

## Testing Your Integration

### Dry-Run Test (Highly Recommended)

**What is a dry-run?**
- Simulates a sync without committing changes
- Shows you what WOULD happen
- Safe to run anytime
- No data is actually modified

**How to run**:
1. Go to **PMS Integration** → **Test Sync**
2. Select entity (e.g., "Rooms")
3. Click **"Run Dry-Run Sync"**
4. Wait for results

**Example result**:
```
🧪 Dry-Run Sync Results
═══════════════════════════════════
Entity: Rooms
Direction: PULL from PMS

Would process: 50 rooms
Would succeed: 48 rooms
Would fail: 2 rooms

Failures:
- Room 305: Missing floor number
- Room 401: Invalid status code "X"

⚠️ This was a test - no data was changed.
```

**What to do**:
- ✅ If all succeed: Enable real sync
- ⚠️ If some fail: Review failures, fix mappings
- ❌ If many fail: Contact support

### Real Sync Test

**Only after successful dry-run**:

1. Go to **PMS Integration** → **Manual Sync**
2. Select entity (e.g., "Rooms")
3. Click **"Sync Now"**
4. Wait for completion
5. **Verify results immediately**

**Verification checklist**:
- [ ] Check room numbers match
- [ ] Check room statuses are correct
- [ ] Check no data was lost
- [ ] Check timestamps are recent
- [ ] Compare with your PMS directly

### Enable Automatic Sync

**Only after successful manual tests**:

1. Go to **PMS Integration** → **Settings**
2. Click **"Enable Auto-Sync"**
3. Choose interval (recommend 15 min)
4. Click **"Enable"**

**You'll see**:
```
✅ Auto-Sync Enabled!

Sync will run every 15 minutes
Next sync: 2:45 PM (in 14 min)
Last sync: Never (first run pending)

You can disable this anytime.
```

**Monitor for 24 hours**:
- Check sync logs regularly
- Watch for errors
- Verify data accuracy
- Disable if issues occur

---

## Troubleshooting

### Connection Test Fails

**Error**: "Connection refused"

**Solutions**:
1. Verify API URL is correct
2. Check your network/firewall
3. Confirm PMS system is online
4. Contact PMS vendor support

**Error**: "Authentication failed"

**Solutions**:
1. Double-check API credentials
2. Verify API key hasn't expired
3. Check if IP whitelisting is required
4. Contact PMS vendor for new credentials

### Sync Fails

**Error**: "Some records failed"

**What to do**:
1. View sync history: **Integrations** → **Sync Logs**
2. Check failed records details
3. Review field mappings
4. Fix issues and retry

**Common causes**:
- Missing required fields
- Data type mismatches
- Invalid values
- PMS API rate limits

### Data Doesn't Match

**Problem**: Data in platform differs from PMS

**Troubleshooting steps**:
1. Check last sync time
2. Trigger manual sync
3. Wait for completion
4. Compare again
5. Review sync logs for errors

**If still mismatched**:
- Check field mappings
- Verify sync direction
- Ensure no manual edits blocking sync
- Contact support

### Auto-Sync Stopped

**Check**:
1. Is integration still enabled?
2. Are there sync errors in logs?
3. Did PMS credentials expire?
4. Is PMS API accessible?

**Fix**:
1. Review error messages
2. Test connection
3. Fix identified issues
4. Re-enable auto-sync

---

## FAQs

### General

**Q: Is my PMS data safe?**  
A: Yes. We use bank-level encryption (AES-256) for all credentials. Data sync respects your chosen direction and never modifies data without your approval.

**Q: Can I undo an integration?**  
A: Yes. Click "Disable Integration" anytime. Data already synced remains, but no new sync occurs. You can also completely remove the integration.

**Q: Will this replace my PMS?**  
A: No. This is a supplement, not a replacement. Your PMS remains your primary system (in most modes).

### Technical

**Q: How often does sync run?**  
A: You choose (5-60 minutes, or manual only). Recommended: 15 minutes.

**Q: What happens if both systems change the same data?**  
A: Depends on your conflict strategy:
- External Wins: PMS data overrides
- Internal Wins: Platform data overrides
- Manual: You choose each time

**Q: Can I sync only specific rooms/bookings?**  
A: Yes, through advanced filters (contact support to set up).

**Q: Does this work offline?**  
A: No, both systems must be online for sync to work.

### Costs & Limits

**Q: Are there API call limits?**  
A: Depends on your PMS vendor. Check your PMS contract. We respect rate limits automatically.

**Q: Does this cost extra?**  
A: PMS Integration is included in your plan. However, your PMS vendor may charge for API access.

**Q: Can I sync multiple PMS systems?**  
A: One PMS per hotel property. Contact enterprise sales for multi-property setups.

### Safety & Security

**Q: What if sync fails?**  
A: Sync stops, error is logged, you're notified. No data loss occurs. You can retry anytime.

**Q: Can sync delete data?**  
A: Only if your PMS deletes it first (in PULL mode). We never delete automatically in PUSH mode.

**Q: Who can access PMS integration?**  
A: Only admin users with proper permissions. Credentials are never shown after initial setup.

---

## Need Help?

### Resources

- 📖 **Full Documentation**: [Link to technical docs]
- 🎬 **Video Tutorials**: [Link to videos]
- 💬 **Community Forum**: [Link to forum]
- 📞 **Support**: support@example.com

### Before Contacting Support

Have ready:
- Your hotel ID
- PMS name and version
- Config ID (if integration created)
- Error messages (copy/paste)
- Screenshots (if visual issue)

### Support Hours

- **Email**: 24/7 (response within 24 hours)
- **Chat**: Mon-Fri 9AM-6PM EST
- **Phone**: Emergency only (hotel operations)

---

**Document Version**: 1.0.0  
**Last Updated**: December 13, 2025  
**Questions?** Contact support@example.com

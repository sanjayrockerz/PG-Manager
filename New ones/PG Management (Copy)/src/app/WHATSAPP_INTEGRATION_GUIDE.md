# WhatsApp Integration Guide - PG Manager

## 📋 Overview

This document outlines the complete WhatsApp integration architecture for PG Manager. The system enables **tenants to interact via WhatsApp** while **owners manage everything from the dashboard**.

**Core Concept:** WhatsApp-powered PG management platform where tenants don't need to install apps, and owners manage everything through the web dashboard.

---

## 🏗 System Architecture

### Three-Layer Architecture

```
┌─────────────────────────┐
│   Owner Dashboard       │ ← Web Interface (React)
│   (React Frontend)      │
└───────────┬─────────────┘
            │
            ↓
┌─────────────────────────┐
│   Backend Server        │ ← Node.js + PostgreSQL
│   + Database            │
└───────────┬─────────────┘
            │
            ↓
┌─────────────────────────┐
│   WhatsApp Business     │ ← Twilio / 360Dialog
│   API                   │
└───────────┬─────────────┘
            │
            ↓
┌─────────────────────────┐
│   Tenant WhatsApp       │ ← Mobile App (WhatsApp)
│   Chatbot               │
└─────────────────────────┘
```

---

## 📱 Tenant Experience (WhatsApp Chatbot)

### Message Flow: Tenant → System

```
Tenant sends message via WhatsApp
         ↓
WhatsApp API receives message
         ↓
Webhook sends to backend
         ↓
Backend verifies phone number
         ↓
Backend fetches tenant data from database
         ↓
Chatbot generates response
         ↓
Response sent to tenant via WhatsApp
```

---

## 🤖 Chatbot Menu Structure

### Welcome Message (When tenant sends "Hi")

```
Hi Rahul 👋
Welcome to Sunrise PG Support

How can we help today?

1️⃣ My Status
2️⃣ Raise Complaint
3️⃣ PG Rules & Info
4️⃣ Contact Owner
```

**Implementation:**

- Detect: "Hi", "Hello", "Hey", "Menu", "Help"
- Response: Show main menu
- Store conversation state if needed

---

### Option 1: My Status

**Tenant Input:** Types `1` or "My Status" or "Status"

**Bot Response:**

```
Tenant: Rahul
Room: 203

Rent Status
March Rent: ₹6,900
Status: Pending ⏳
Due Date: 5th March

Open Complaints
• Fan not working (In Progress) 🔧
```

**Data Sources:**

- Tenant table: Name, Room, Property
- Payments table: Latest payment status
- Maintenance table: Open tickets

**Database Query:**

```sql
SELECT
  t.name, t.room, t.floor,
  p.amount, p.status, p.dueDate,
  m.issue, m.status
FROM tenants t
LEFT JOIN payments p ON t.id = p.tenantId
LEFT JOIN maintenance m ON t.id = m.tenantId
WHERE t.phone = '+919876543210'
  AND p.month = CURRENT_MONTH
  AND m.status != 'completed'
```

---

### Option 2: Raise Complaint

**Tenant Input:** Types `2` or "Raise Complaint" or "Complaint"

**Bot Response:**

```
Please describe your issue:
```

**Tenant Input:** "Fan not working"

**Bot Response:**

```
✅ Your complaint has been registered.

Ticket ID: #204
Issue: Fan not working
Status: Open
Room: 203

We'll get back to you soon!
```

**Backend Process:**

1. Create new maintenance ticket
2. Set status: "pending"
3. Set priority: "medium" (default)
4. Link to tenant ID
5. Notify owner on dashboard
6. Send confirmation to tenant

**Database Insert:**

```sql
INSERT INTO maintenance_requests
  (tenantId, issue, description, priority, status, whatsappMessageId, createdAt)
VALUES
  ('tenant_456', 'Fan not working', 'Fan not working', 'medium', 'pending', 'wamid_123', NOW())
```

---

### Option 3: PG Rules & Info

**Tenant Input:** Types `3` or "Rules" or "PG Rules"

**Bot Response:**

```
📜 Sunrise PG Rules

1. Main gate closes at 11 PM 🚪
2. No loud music after 10 PM 🔇
3. Guests not allowed after 9 PM 👥
4. Keep common areas clean 🧹

PG Address:
123 Jaipur Road, Mumbai - 400001

Contact:
📞 +91 9876543210
```

**Data Source:**

- Settings → PG Rules table
- Property information table

**Database Query:**

```sql
SELECT r.title, r.description, p.address, p.phone
FROM pg_rules r, properties p
WHERE p.id = (
  SELECT propertyId FROM tenants WHERE phone = '+919876543210'
)
AND r.isActive = true
ORDER BY r.category
```

---

### Option 4: Contact Owner

**Tenant Input:** Types `4` or "Contact Owner"

**Bot Response:**

```
You can contact the PG manager here:

📞 +91 9876543210
✉️ admin@sunrisepg.com

Office Hours: 9 AM - 9 PM
```

**Data Source:**

- Settings → General Settings
- Property contact information

---

## 📤 Automated Messages (System → Tenant)

### 1. Welcome Message

**Trigger:** When new tenant is added to system

**Message:**

```
Welcome to Sunrise PG, Rahul! 👋

Your Room: 203
Floor: 2

You can use this WhatsApp number for:
• Checking rent status 💳
• Raising complaints 🔧
• Viewing PG rules 📜
• Contacting management 📞

Type 'Hi' anytime to see the menu!
```

**Backend Implementation:**

```javascript
// When tenant is created
async function sendWelcomeMessage(tenantId) {
  const tenant = await getTenantById(tenantId);
  const property = await getPropertyById(tenant.propertyId);

  const message = `Welcome to ${property.name}, ${tenant.name}! 👋\n\n` +
    `Your Room: ${tenant.bedNumber}\n` +
    `Floor: ${tenant.floor}\n\n` +
    `You can use this WhatsApp number for:\n` +
    `• Checking rent status 💳\n` +
    `• Raising complaints 🔧\n` +
    `• Viewing PG rules 📜\n` +
    `• Contacting management 📞\n\n` +
    `Type 'Hi' anytime to see the menu!`;

  await sendWhatsAppMessage(tenant.phone, message);
}
```

---

### 2. Rent Reminder

**Trigger:** 3 days before due date (configurable in settings)

**Message:**

```
🔔 Rent Reminder

Hi Rahul,

Your rent for March is due on 5th March.

Amount: ₹6,900

Pay here:
[Payment Link]

Or pay via UPI:
pgmanager@paytm

Thank you! 🙏
```

**Backend Implementation:**

```javascript
// Cron job runs daily at 9 AM
async function sendRentReminders() {
  const daysBeforeDue = 3; // From settings
  const targetDate = addDays(new Date(), daysBeforeDue);

  const tenants = await getTenantsWithDueDate(targetDate);

  for (const tenant of tenants) {
    const message = `🔔 Rent Reminder\n\n` +
      `Hi ${tenant.name},\n\n` +
      `Your rent for ${getCurrentMonth()} is due on ${formatDate(tenant.dueDate)}.\n\n` +
      `Amount: ₹${tenant.rent}\n\n` +
      `Pay here:\n${generatePaymentLink(tenant.id)}\n\n` +
      `Thank you! 🙏`;

    await sendWhatsAppMessage(tenant.phone, message);
  }
}
```

---

### 3. Announcement Broadcast

**Trigger:** When owner sends announcement from dashboard

**Message:**

```
📢 Announcement from Sunrise PG

Water supply will be unavailable tomorrow
from 10 AM to 2 PM.

Please store water in advance.

Thank you for your cooperation! 🙏
```

**Backend Implementation:**

```javascript
// When owner creates announcement
async function broadcastAnnouncement(announcementData) {
  const { title, message, targetAudience, propertyId, recipientIds } = announcementData;

  let recipients = [];

  if (targetAudience === 'all') {
    recipients = await getAllTenants();
  } else if (targetAudience === 'property') {
    recipients = await getTenantsByProperty(propertyId);
  } else if (targetAudience === 'custom') {
    recipients = await getTenantsByIds(recipientIds);
  }

  const broadcastMessage = `📢 Announcement from ${property.name}\n\n${message}`;

  for (const recipient of recipients) {
    await sendWhatsAppMessage(recipient.phone, broadcastMessage);
  }

  // Update delivery status
  await updateAnnouncementStatus(announcementId, 'sent', recipients.length);
}
```

---

### 4. Complaint Status Update

**Trigger:** When owner updates maintenance ticket status

**Message (In Progress):**

```
🔧 Complaint Update

Your complaint for Room 203 is now being worked on.

Issue: Fan not working
Status: In Progress

Expected resolution: Within 24 hours
```

**Message (Resolved):**

```
✅ Complaint Resolved

Your complaint for Room 203 has been resolved.

Issue: Fan not working
Status: Completed

Thank you for your patience! 🙏

If the issue persists, please let us know.
```

**Backend Implementation:**

```javascript
// When maintenance status is updated
async function notifyComplaintUpdate(ticketId, newStatus) {
  const ticket = await getMaintenanceTicket(ticketId);
  const tenant = await getTenantById(ticket.tenantId);

  let message;

  if (newStatus === 'in-progress') {
    message = `🔧 Complaint Update\n\n` +
      `Your complaint for Room ${tenant.bedNumber} is now being worked on.\n\n` +
      `Issue: ${ticket.issue}\n` +
      `Status: In Progress\n\n` +
      `Expected resolution: Within 24 hours`;
  } else if (newStatus === 'completed') {
    message = `✅ Complaint Resolved\n\n` +
      `Your complaint for Room ${tenant.bedNumber} has been resolved.\n\n` +
      `Issue: ${ticket.issue}\n` +
      `Status: Completed\n\n` +
      `Thank you for your patience! 🙏\n\n` +
      `If the issue persists, please let us know.`;
  }

  await sendWhatsAppMessage(tenant.phone, message);
}
```

---

### 5. Payment Confirmation

**Trigger:** When payment is recorded

**Message:**

```
✅ Payment Received

Thank you, Rahul!

Month: March 2026
Amount: ₹6,900
Date: 10th March 2026
Method: UPI

Receipt: [Download Link]

Your rent status is now up to date! 🎉
```

---

## 🎛️ Dashboard Control Panel

### WhatsApp Automation Settings Page

**Location:** Settings → WhatsApp Automation

**Owner Controls:**

| Setting                     | Options                           | Purpose                         |
| --------------------------- | --------------------------------- | ------------------------------- |
| **Welcome Message**         | Enable/Disable, Customize text    | Sent to new tenants             |
| **Rent Reminder**           | Enable/Disable, Days before (1-7) | Payment reminder timing         |
| **Reminder Message**        | Customize text                    | Payment reminder content        |
| **Complaint Notifications** | Enable/Disable                    | Auto-notify on ticket updates   |
| **Announcement Broadcast**  | Enable/Disable                    | Send announcements via WhatsApp |
| **Payment Confirmation**    | Enable/Disable                    | Send receipt on payment         |

**UI Components:**

```typescript
interface WhatsAppSettings {
  welcomeMessage: {
    enabled: boolean;
    template: string;
  };
  rentReminder: {
    enabled: boolean;
    daysBeforeDue: number;
    template: string;
  };
  complaintNotification: {
    enabled: boolean;
    notifyOnCreate: boolean;
    notifyOnUpdate: boolean;
    notifyOnResolve: boolean;
  };
  announcements: {
    enabled: boolean;
  };
  paymentConfirmation: {
    enabled: boolean;
    template: string;
  };
}
```

---

## 🔌 WhatsApp API Integration Options

### Option 1: Twilio (Recommended)

**Pros:**

- ✅ Easy setup
- ✅ Good documentation
- ✅ Reliable delivery
- ✅ Great developer experience

**Cons:**

- ❌ Slightly expensive for high volume

**Setup:**

1. Create Twilio account
2. Set up WhatsApp sandbox (for testing)
3. Apply for WhatsApp Business approval
4. Configure webhook endpoint
5. Get API credentials

**Pricing:**

- $0.005 per message (incoming)
- $0.005-$0.04 per message (outgoing, varies by country)

**API Example:**

```javascript
const twilio = require('twilio');
const client = twilio(ACCOUNT_SID, AUTH_TOKEN);

// Send message
await client.messages.create({
  from: 'whatsapp:+14155238886',
  to: 'whatsapp:+919876543210',
  body: 'Your rent is due on 5th March'
});
```

---

### Option 2: 360Dialog

**Pros:**

- ✅ WhatsApp Business API partner
- ✅ Competitive pricing
- ✅ Good for scaling

**Cons:**

- ❌ Requires business verification

**Setup:**

1. Register on 360Dialog
2. Complete business verification
3. Get WhatsApp number
4. Configure webhook
5. Approve message templates

---

### Option 3: Meta WhatsApp Business API (Direct)

**Pros:**

- ✅ Official API
- ✅ Most control
- ✅ Best pricing at scale

**Cons:**

- ❌ Complex setup
- ❌ Requires Facebook Business verification
- ❌ Template approval process

---

## 🛠 Technical Implementation

### Backend Architecture

**Recommended Stack:**

```
Frontend: React (already built)
Backend: Node.js + Express
Database: PostgreSQL
WhatsApp: Twilio / 360Dialog
Hosting: AWS / Google Cloud / Vercel
```

---

### Webhook Setup

**Endpoint:** `POST /api/whatsapp/webhook`

**What it receives:**

```json
{
  "From": "whatsapp:+919876543210",
  "To": "whatsapp:+14155238886",
  "Body": "Hi",
  "MessageSid": "SMxxxxx",
  "NumMedia": "0"
}
```

**Backend Processing:**

```javascript
app.post('/api/whatsapp/webhook', async (req, res) => {
  const { From, Body } = req.body;

  // Extract phone number
  const phoneNumber = From.replace('whatsapp:', '');

  // Find tenant by phone
  const tenant = await findTenantByPhone(phoneNumber);

  if (!tenant) {
    await sendWhatsAppMessage(phoneNumber,
      'Sorry, we could not find your registration. Please contact management.');
    return res.status(200).send('OK');
  }

  // Process message
  const response = await processChatbotMessage(Body.toLowerCase(), tenant);

  // Send response
  await sendWhatsAppMessage(phoneNumber, response);

  res.status(200).send('OK');
});
```

---

### Chatbot Logic

```javascript
async function processChatbotMessage(message, tenant) {
  // Main menu triggers
  if (['hi', 'hello', 'hey', 'menu', 'help'].includes(message)) {
    return getMainMenu(tenant);
  }

  // Status
  if (['1', 'status', 'my status'].includes(message)) {
    return await getTenantStatus(tenant);
  }

  // Raise complaint
  if (['2', 'complaint', 'raise complaint'].includes(message)) {
    // Set conversation state
    await setConversationState(tenant.id, 'awaiting_complaint');
    return 'Please describe your issue:';
  }

  // PG Rules
  if (['3', 'rules', 'pg rules', 'info'].includes(message)) {
    return await getPGRules(tenant);
  }

  // Contact
  if (['4', 'contact', 'contact owner'].includes(message)) {
    return await getContactInfo(tenant);
  }

  // Check if awaiting complaint description
  const state = await getConversationState(tenant.id);
  if (state === 'awaiting_complaint') {
    return await createComplaint(tenant, message);
  }

  // Default
  return `I didn't understand that. Type 'Hi' to see the menu.`;
}
```

---

### Database Schema Updates

**Add to existing schema:**

```sql
-- Conversation state tracking
CREATE TABLE conversation_states (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL,
  state VARCHAR(50),
  data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- WhatsApp message log
CREATE TABLE whatsapp_messages (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(255),
  direction VARCHAR(10), -- 'inbound' or 'outbound'
  message TEXT,
  message_sid VARCHAR(255),
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add to settings table
ALTER TABLE settings ADD COLUMN whatsapp_settings JSONB;
```

---

## 📊 Message Templates (For Approval)

WhatsApp requires pre-approved templates for outbound messages.

### Template 1: Welcome Message

```
Name: welcome_message
Category: ACCOUNT_UPDATE
Language: English

Body:
Welcome to {{1}}, {{2}}! 👋

Your Room: {{3}}
Floor: {{4}}

You can use this WhatsApp number for:
• Checking rent status 💳
• Raising complaints 🔧
• Viewing PG rules 📜

Type 'Hi' anytime to see the menu!

Variables:
1. Property name
2. Tenant name
3. Room number
4. Floor number
```

### Template 2: Rent Reminder

```
Name: rent_reminder
Category: PAYMENT_UPDATE
Language: English

Body:
🔔 Rent Reminder

Hi {{1}},

Your rent for {{2}} is due on {{3}}.

Amount: ₹{{4}}

Pay here: {{5}}

Thank you! 🙏

Variables:
1. Tenant name
2. Month
3. Due date
4. Amount
5. Payment link
```

---

## 🔔 Notification Flow Examples

### Example 1: Tenant Raises Complaint

```
1. Tenant sends: "Fan not working"
   ↓
2. Webhook receives message
   ↓
3. Backend creates ticket in database
   ↓
4. Backend sends confirmation to tenant
   ↓
5. Dashboard shows new ticket notification to owner
   ↓
6. Owner assigns to staff
   ↓
7. Backend sends update to tenant: "In Progress"
   ↓
8. Staff resolves issue
   ↓
9. Owner marks as complete
   ↓
10. Backend sends: "Resolved" message to tenant
```

### Example 2: Owner Sends Announcement

```
1. Owner writes announcement in dashboard
   ↓
2. Owner selects recipients (All / Property / Floor)
   ↓
3. Owner clicks "Send"
   ↓
4. Backend fetches recipient list
   ↓
5. Backend sends WhatsApp message to each recipient
   ↓
6. Backend logs delivery status
   ↓
7. Dashboard shows delivery stats
```

---

## 🎯 Implementation Checklist

### Phase 1: Basic Setup (Week 1-2)

- [ ] Set up Twilio/360Dialog account
- [ ] Create webhook endpoint
- [ ] Test message sending
- [ ] Test message receiving
- [ ] Implement phone number verification

### Phase 2: Chatbot (Week 3-4)

- [ ] Implement main menu
- [ ] Implement "My Status" command
- [ ] Implement "Raise Complaint" flow
- [ ] Implement "PG Rules" command
- [ ] Implement "Contact Owner" command
- [ ] Add conversation state management

### Phase 3: Automated Messages (Week 5-6)

- [ ] Welcome message on tenant creation
- [ ] Rent reminder cron job
- [ ] Payment confirmation message
- [ ] Complaint update notifications
- [ ] Announcement broadcast

### Phase 4: Dashboard Integration (Week 7-8)

- [ ] WhatsApp settings page
- [ ] Message template editor
- [ ] Delivery status tracking
- [ ] Message history log
- [ ] Analytics and reporting

---

## 🔒 Security & Privacy

### Phone Number Verification

```javascript
// Always verify phone belongs to registered tenant
async function verifyTenantPhone(phoneNumber) {
  const tenant = await db.query(
    'SELECT * FROM tenants WHERE phone = $1 AND status = $2',
    [phoneNumber, 'active']
  );

  if (!tenant) {
    throw new Error('Unauthorized phone number');
  }

  return tenant;
}
```

### Rate Limiting

```javascript
// Prevent spam
const rateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 messages per minute per tenant
  keyGenerator: (req) => req.body.From
});

app.post('/api/whatsapp/webhook', rateLimiter, handleWebhook);
```

### Data Privacy

- Store only necessary WhatsApp message metadata
- Don't log sensitive information in messages
- Auto-delete old message logs (after 30 days)
- Encrypt stored messages

---

## 📈 Analytics & Monitoring

### Track These Metrics

- Total messages sent/received
- Response time
- Delivery success rate
- Failed deliveries
- Most common queries
- Complaint resolution time
- Active users (tenants using WhatsApp)

### Dashboard Widgets

```typescript
interface WhatsAppAnalytics {
  totalMessagesSent: number;
  totalMessagesReceived: number;
  deliveryRate: number;
  averageResponseTime: number;
  activeUsers: number;
  commonQueries: Array<{ query: string; count: number }>;
}
```

---

## 💰 Cost Estimation

### Twilio Pricing (India)

- Incoming: $0.005 per message
- Outgoing: $0.032 per message

### Monthly Cost Example (100 Tenants)

```
Rent reminders: 100 × 1 × $0.032 = $3.20
Payment confirmations: 100 × 1 × $0.032 = $3.20
Announcements: 100 × 4 × $0.032 = $12.80
Complaint updates: 50 × 2 × $0.032 = $3.20
Incoming messages: 200 × $0.005 = $1.00

Total: ~$23.40/month for 100 tenants
```

---

## 🚀 Go-Live Checklist

- [ ] WhatsApp Business account verified
- [ ] Message templates approved
- [ ] Webhook endpoint deployed and tested
- [ ] Database tables created
- [ ] Chatbot logic implemented
- [ ] Automated messages configured
- [ ] Dashboard settings page ready
- [ ] Error handling and logging
- [ ] Rate limiting configured
- [ ] Security measures in place
- [ ] Testing completed with real tenants
- [ ] Documentation provided to owner
- [ ] Monitoring and analytics set up

---

## 📞 Support Resources

### Twilio Documentation

- WhatsApp API: https://www.twilio.com/docs/whatsapp
- Webhooks: https://www.twilio.com/docs/usage/webhooks
- Message Templates: https://www.twilio.com/docs/whatsapp/tutorial/send-whatsapp-notification-messages-templates

### Testing

- Use Twilio Sandbox for testing before going live
- Test all chatbot commands
- Test automated messages
- Test with multiple phone numbers

---

**Document Version:** 1.0  
**Last Updated:** March 10, 2026  
**Integration Status:** Backend Implementation Required  
**Estimated Implementation Time:** 6-8 weeks
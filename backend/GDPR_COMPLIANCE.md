# GDPR Compliance Guide

Complete guide to GDPR compliance features in the Liteyfy notification system.

## 📋 Table of Contents

- [Overview](#overview)
- [Legal Basis](#legal-basis)
- [Consent Management](#consent-management)
- [User Rights](#user-rights)
- [Data Minimization](#data-minimization)
- [Data Retention](#data-retention)
- [API Reference](#api-reference)
- [Audit Trail](#audit-trail)
- [Privacy Policy](#privacy-policy)

---

## 🔒 Overview

Liteyfy implements comprehensive GDPR compliance features to ensure user privacy and data protection rights are respected.

### Key Features

- ✅ **Explicit Consent**: Users must explicitly opt-in for push notifications
- ✅ **Right to Access**: Users can export all their data
- ✅ **Right to be Forgotten**: Users can request complete data deletion
- ✅ **Right to Rectification**: Users can update their preferences
- ✅ **Consent Withdrawal**: Users can revoke consent at any time
- ✅ **Audit Trail**: All consent actions are logged
- ✅ **Data Minimization**: Only necessary data is collected
- ✅ **30-Day Grace Period**: Data deletion requests have a 30-day cancellation window

---

## ⚖️ Legal Basis

### Consent (Article 6(1)(a))

All personal data processing requires explicit user consent:

1. **Push Notifications**: Users must actively grant permission for browser push notifications
2. **Data Processing**: Users must consent to processing of subscription preferences
3. **Analytics** (Optional): Users can opt-in to analytics tracking

### Legitimate Interest (Article 6(1)(f))

Used for:
- Service improvement
- Security monitoring
- Fraud prevention

---

## 🤝 Consent Management

### Consent Types

| Type | Required | Purpose |
|------|----------|---------|
| `PUSH_NOTIFICATIONS` | Yes | Send push notifications |
| `DATA_PROCESSING` | Yes | Store subscription preferences |
| `ANALYTICS` | No | Track usage statistics |

### Grant Consent

```http
POST /api/gdpr/consent/grant
Content-Type: application/json

{
  "userId": "user-123",
  "consentType": "PUSH_NOTIFICATIONS",
  "privacyPolicyVersion": "1.0"
}
```

**Response:**
```json
{
  "message": "Consent granted successfully",
  "consent": {
    "userId": "user-123",
    "pushNotifications": true,
    "dataProcessing": true,
    "analytics": false
  }
}
```

### Revoke Consent

```http
POST /api/gdpr/consent/revoke
Content-Type: application/json

{
  "userId": "user-123",
  "consentType": "PUSH_NOTIFICATIONS"
}
```

**Response:**
```json
{
  "message": "Consent revoked successfully",
  "consent": {
    "userId": "user-123",
    "pushNotifications": false,
    "dataProcessing": true,
    "analytics": false
  }
}
```

### Check Consent Status

```http
GET /api/gdpr/consent/status/user-123
```

**Response:**
```json
{
  "userId": "user-123",
  "pushNotifications": true,
  "dataProcessing": true,
  "analytics": false,
  "hasValidConsent": true,
  "deletionRequested": false,
  "deletionScheduledFor": null
}
```

---

## 👤 User Rights

### 1. Right of Access (Article 15)

Users can export all their personal data.

```http
GET /api/gdpr/export/user-123
```

**Response:**
```json
{
  "message": "Data export completed",
  "data": {
    "userId": "user-123",
    "exportedAt": "2025-10-11T23:00:00.000Z",
    "dataRetentionPolicy": "30 days for notifications, indefinite for subscriptions until revoked",
    "consent": {
      "pushNotifications": {
        "granted": true,
        "grantedAt": "2025-10-01T10:00:00.000Z",
        "ipAddress": "192.168.1.1",
        "userAgent": "Mozilla/5.0..."
      },
      "consentHistory": [...]
    },
    "subscription": {
      "trainLines": [...],
      "weatherRegions": [...],
      "quietHours": {...},
      "createdAt": "2025-10-01T10:00:00.000Z"
    },
    "notifications": [
      {
        "title": "Train IC2534 delayed",
        "type": "TRAIN_DELAY",
        "timestamp": "2025-10-11T08:30:00.000Z"
      }
    ],
    "statistics": {
      "totalNotifications": 150,
      "subscriptionActive": true
    }
  }
}
```

### 2. Right to be Forgotten (Article 17)

Users can request complete data deletion with a 30-day grace period.

**Request Deletion:**
```http
POST /api/gdpr/delete
Content-Type: application/json

{
  "userId": "user-123"
}
```

**Response:**
```json
{
  "userId": "user-123",
  "deletionScheduledFor": "2025-11-10T23:00:00.000Z",
  "message": "Your data will be deleted in 30 days. You can cancel this request anytime before then."
}
```

**Cancel Deletion:**
```http
POST /api/gdpr/delete/cancel
Content-Type: application/json

{
  "userId": "user-123"
}
```

**Response:**
```json
{
  "userId": "user-123",
  "message": "Your data deletion request has been canceled."
}
```

### 3. Right to Rectification (Article 16)

Users can update their subscription preferences at any time through the subscription API.

```http
PATCH /api/subscriptions/user-123
Content-Type: application/json

{
  "trainLines": [...],
  "quietHours": {...}
}
```

### 4. Right to Data Portability (Article 20)

The data export endpoint provides data in structured JSON format that can be imported into other systems.

---

## 🎯 Data Minimization

### What We Collect

| Data | Purpose | Legal Basis | Retention |
|------|---------|-------------|-----------|
| User ID (hash) | Identify user | Consent | Until revoked |
| Push endpoint | Send notifications | Consent | Until revoked |
| Subscription preferences | Filter notifications | Consent | Until revoked |
| IP address (consent) | Fraud prevention | Legitimate interest | 1 year |
| User agent (consent) | Security | Legitimate interest | 1 year |
| Notifications | Service provision | Consent | 30 days |

### What We DON'T Collect

- ❌ Name
- ❌ Email address
- ❌ Phone number
- ❌ Physical address
- ❌ Browsing history
- ❌ Location data (beyond region for weather alerts)
- ❌ Device identifiers
- ❌ Biometric data

### Pseudonymization

- User IDs are hashed and not linked to real identities
- Notification data is anonymized after 30 days
- Analytics data is aggregated and anonymous

---

## ⏰ Data Retention

### Automatic Deletion

| Data Type | Retention Period | Deletion Method |
|-----------|------------------|-----------------|
| Notifications | 30 days | Automatic deletion |
| Consent logs | 3 years | Automatic anonymization |
| Subscription data | Until revoked | User-initiated |
| Audit logs | 1 year | Automatic deletion |

### Scheduled Deletion Job

Runs daily at 2 AM:

```javascript
cron.schedule('0 2 * * *', async () => {
  // Delete users who requested deletion 30+ days ago
  await gdprService.executeScheduledDeletions();
});
```

---

## 📡 API Reference

### Base URL

```
https://api.liteyfy.be
```

### Authentication

All GDPR endpoints require the user to be identified by `userId` in the request.

### Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/gdpr/consent/grant` | Grant consent |
| POST | `/api/gdpr/consent/revoke` | Revoke consent |
| GET | `/api/gdpr/consent/status/:userId` | Get consent status |
| POST | `/api/gdpr/delete` | Request data deletion |
| POST | `/api/gdpr/delete/cancel` | Cancel deletion |
| GET | `/api/gdpr/export/:userId` | Export user data |
| GET | `/api/gdpr/audit/:userId` | Get consent audit trail |

### Error Responses

**Missing Consent:**
```json
{
  "error": "User consent required",
  "code": "CONSENT_REQUIRED",
  "message": "You must grant consent for data processing to use this feature"
}
```

**User Not Found:**
```json
{
  "error": "User consent record not found",
  "code": "USER_NOT_FOUND"
}
```

---

## 📜 Audit Trail

### Consent History

Every consent action is logged with:
- Action type (GRANTED, REVOKED, UPDATED)
- Timestamp
- IP address
- User agent
- Details

### Get Audit Trail

```http
GET /api/gdpr/audit/user-123
```

**Response:**
```json
{
  "userId": "user-123",
  "auditTrail": [
    {
      "action": "GRANTED",
      "consentType": "PUSH_NOTIFICATIONS",
      "timestamp": "2025-10-01T10:00:00.000Z",
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "details": {
        "privacyPolicyVersion": "1.0"
      }
    },
    {
      "action": "REVOKED",
      "consentType": "ANALYTICS",
      "timestamp": "2025-10-05T14:30:00.000Z",
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0..."
    }
  ]
}
```

### Audit Log Retention

- Consent actions: 3 years (legal requirement)
- API access logs: 1 year
- Security logs: 1 year

---

## 📋 Privacy Policy

### Required Information

Your privacy policy must include:

1. **Data Controller**: Liteyfy (provide company details)
2. **Data Protection Officer**: Contact information
3. **Data Collected**: List all personal data collected
4. **Purpose**: Why each piece of data is collected
5. **Legal Basis**: Consent, legitimate interest, etc.
6. **Retention Period**: How long data is kept
7. **User Rights**: Access, deletion, rectification, portability
8. **Data Transfers**: If data leaves EU (N/A for Liteyfy)
9. **Cookies**: Browser push subscription uses Service Workers (not cookies)
10. **Contact**: How to exercise rights

### Template Sections

```markdown
## What Data We Collect

We collect minimal personal data:
- A unique user identifier (hashed)
- Your browser's push notification endpoint
- Your subscription preferences (train lines, weather regions)
- Notification history (kept for 30 days)

## Why We Collect It

To provide you with real-time notifications about:
- Train delays and cancellations
- Weather alerts
- Public transport disruptions

## Your Rights

You have the right to:
- Access your data (download all data)
- Delete your data (30-day grace period)
- Update your preferences
- Revoke consent at any time
- Object to processing
- Data portability

## How to Exercise Your Rights

Use the settings page in the app or contact us at privacy@liteyfy.be
```

---

## 🛡️ Security Measures

### Data Protection

- ✅ **Encryption in transit**: HTTPS/TLS 1.3
- ✅ **Encryption at rest**: MongoDB encrypted storage
- ✅ **Access control**: Role-based access
- ✅ **Audit logging**: All consent actions logged
- ✅ **Regular backups**: Daily encrypted backups
- ✅ **Security monitoring**: Real-time alerts

### Breach Notification

If a data breach occurs:
1. Internal notification: Immediate
2. DPA notification: Within 72 hours
3. User notification: If high risk to rights and freedoms

---

## ✅ Compliance Checklist

### Implementation

- [x] Explicit consent mechanism
- [x] Consent withdrawal
- [x] Data export endpoint
- [x] Data deletion endpoint
- [x] Audit trail
- [x] Data minimization
- [x] Retention policies
- [x] 30-day grace period for deletion

### Documentation

- [x] Privacy policy template
- [x] API documentation
- [x] Data flow diagrams
- [x] Retention schedule

### Ongoing

- [ ] Annual privacy audit
- [ ] Privacy policy updates
- [ ] User consent renewal (if policy changes)
- [ ] Security assessments
- [ ] DPO appointment (if required)

---

## 📞 Contact

For GDPR-related questions:
- Email: privacy@liteyfy.be
- DPO: dpo@liteyfy.be (if appointed)
- Address: [Your Company Address]

---

## 📚 Legal References

- **GDPR**: Regulation (EU) 2016/679
- **Article 6**: Legal basis for processing
- **Article 7**: Conditions for consent
- **Article 13**: Information to be provided
- **Article 15**: Right of access
- **Article 17**: Right to erasure
- **Article 20**: Right to data portability
- **Article 25**: Data protection by design and by default

---

## 🔄 Updates

This document is regularly updated. Last updated: October 11, 2025

**Version History:**
- v1.0 (2025-10-11): Initial GDPR compliance implementation


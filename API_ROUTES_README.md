# Billing API Routes Documentation

This document describes the API routes for the Billing Page functionality, including subscription management and invoice downloads.

## 🚀 **API Routes Overview**

### 1. Cancel Subscription
**Endpoint:** `POST /api/cancel-subscription`  
**Purpose:** Cancel a user's active subscription via Paystack integration

### 2. Download Invoice (JSON Response)
**Endpoint:** `GET /api/invoice/:id`  
**Purpose:** Get invoice URL for a specific transaction

### 3. Download Invoice (Direct Redirect)
**Endpoint:** `GET /api/invoice-redirect/:id`  
**Purpose:** Redirect directly to invoice URL for better UX

---

## 📋 **1. Cancel Subscription API**

### **Endpoint**
```
POST /api/cancel-subscription
```

### **Authentication**
- **Required:** Bearer token in Authorization header
- **Format:** `Authorization: Bearer <supabase_jwt_token>`

### **Request Body**
```json
{
  "subscriptionId": "uuid-string"
}
```

### **Response Format**
```json
{
  "success": true,
  "message": "Subscription cancelled successfully"
}
```

### **Error Responses**
```json
// 401 Unauthorized
{
  "success": false,
  "error": "Unauthorized - Missing or invalid token"
}

// 400 Bad Request
{
  "success": false,
  "error": "Missing subscriptionId"
}

// 404 Not Found
{
  "success": false,
  "error": "Subscription not found"
}

// 500 Internal Server Error
{
  "success": false,
  "error": "Paystack API error: [specific error message]"
}
```

### **Process Flow**
1. **Authentication:** Verify Supabase JWT token
2. **Validation:** Check if subscriptionId is provided
3. **Database Query:** Fetch subscription from `user_subscriptions` table
4. **Authorization:** Ensure user owns the subscription
5. **Status Check:** Verify subscription isn't already cancelled
6. **Paystack Integration:** Call Paystack API to disable subscription
7. **Database Update:** Update subscription status to 'cancelled'
8. **Response:** Return success/error message

### **Example Usage**
```javascript
const cancelSubscription = async (subscriptionId) => {
  const response = await fetch('/api/cancel-subscription', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ subscriptionId }),
  });

  const result = await response.json();
  
  if (result.success) {
    console.log('Subscription cancelled:', result.message);
  } else {
    console.error('Error:', result.error);
  }
};
```

---

## 📄 **2. Download Invoice API (JSON Response)**

### **Endpoint**
```
GET /api/invoice/:id
```

### **Authentication**
- **Required:** Bearer token in Authorization header
- **Format:** `Authorization: Bearer <supabase_jwt_token>`

### **URL Parameters**
- `id`: Transaction UUID

### **Response Format**
```json
{
  "success": true,
  "invoice_url": "https://paystack.com/invoice/abc123"
}
```

### **Error Responses**
```json
// 401 Unauthorized
{
  "success": false,
  "error": "Unauthorized - Missing or invalid token"
}

// 400 Bad Request
{
  "success": false,
  "error": "Invalid transaction ID"
}

// 404 Not Found
{
  "success": false,
  "error": "Transaction not found"
}

// 404 Not Found
{
  "success": false,
  "error": "No invoice available for this transaction"
}
```

### **Process Flow**
1. **Authentication:** Verify Supabase JWT token
2. **Validation:** Validate transaction ID format
3. **Database Query:** Fetch transaction from `transactions` table
4. **Authorization:** Ensure user owns the transaction
5. **Status Check:** Verify transaction is successful
6. **URL Check:** Ensure invoice_url exists
7. **Response:** Return invoice URL

### **Example Usage**
```javascript
const getInvoiceUrl = async (transactionId) => {
  const response = await fetch(`/api/invoice/${transactionId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
    },
  });

  const result = await response.json();
  
  if (result.success) {
    window.open(result.invoice_url, '_blank');
  } else {
    console.error('Error:', result.error);
  }
};
```

---

## 🔗 **3. Download Invoice API (Direct Redirect)**

### **Endpoint**
```
GET /api/invoice-redirect/:id
```

### **Authentication**
- **Required:** Bearer token in Authorization header
- **Format:** `Authorization: Bearer <supabase_jwt_token>`

### **URL Parameters**
- `id`: Transaction UUID

### **Response**
- **Success:** HTTP 302 redirect to invoice URL
- **Error:** JSON error response

### **Process Flow**
1. **Authentication:** Verify Supabase JWT token
2. **Validation:** Validate transaction ID format
3. **Database Query:** Fetch transaction from `transactions` table
4. **Authorization:** Ensure user owns the transaction
5. **Status Check:** Verify transaction is successful
6. **URL Check:** Ensure invoice_url exists
7. **Redirect:** HTTP 302 redirect to invoice URL

### **Example Usage**
```javascript
const downloadInvoice = async (transactionId) => {
  // Create a temporary link and click it
  const link = document.createElement('a');
  link.href = `/api/invoice-redirect/${transactionId}`;
  link.target = '_blank';
  link.click();
};
```

---

## 🔧 **Environment Variables**

### **Required Environment Variables**
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Paystack Configuration
PAYSTACK_SECRET_KEY=your_paystack_secret_key
```

### **Database Tables Required**
```sql
-- user_subscriptions table
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  status VARCHAR(20),
  paystack_subscription_code VARCHAR(255),
  paystack_token VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE
);

-- transactions table
CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  invoice_url TEXT,
  status VARCHAR(20),
  amount INTEGER,
  currency VARCHAR(3),
  created_at TIMESTAMP WITH TIME ZONE
);
```

---

## 🛡️ **Security Features**

### **Authentication & Authorization**
- ✅ JWT token verification via Supabase
- ✅ User ownership validation
- ✅ Row-level security enforcement

### **Input Validation**
- ✅ Request method validation
- ✅ Required field validation
- ✅ UUID format validation
- ✅ Authorization header validation

### **Error Handling**
- ✅ Comprehensive error responses
- ✅ Proper HTTP status codes
- ✅ Detailed logging for debugging
- ✅ Graceful failure handling

### **Data Protection**
- ✅ User can only access their own data
- ✅ Subscription ownership verification
- ✅ Transaction ownership verification

---

## 📊 **Logging & Monitoring**

### **Request Logging**
```javascript
console.log(`[${new Date().toISOString()}] Processing cancel subscription request`);
console.log(`[${new Date().toISOString()}] Authenticated user: ${user.id}`);
console.log(`[${new Date().toISOString()}] Found subscription: ${subscription.id}`);
```

### **Error Logging**
```javascript
console.log(`[${new Date().toISOString()}] Authentication failed:`, authError?.message);
console.log(`[${new Date().toISOString()}] Paystack API error:`, paystackResult);
console.error(`[${new Date().toISOString()}] Unexpected error:`, error);
```

### **Success Logging**
```javascript
console.log(`[${new Date().toISOString()}] Subscription cancelled successfully for user: ${user.id}`);
console.log(`[${new Date().toISOString()}] Returning invoice URL for transaction: ${transaction.id}`);
```

---

## 🧪 **Testing**

### **Test Cases**

#### **Cancel Subscription**
```javascript
// Valid request
POST /api/cancel-subscription
Authorization: Bearer valid_jwt
Body: { "subscriptionId": "valid-uuid" }

// Invalid token
POST /api/cancel-subscription
Authorization: Bearer invalid_token

// Missing subscriptionId
POST /api/cancel-subscription
Authorization: Bearer valid_jwt
Body: {}
```

#### **Download Invoice**
```javascript
// Valid request
GET /api/invoice/valid-transaction-id
Authorization: Bearer valid_jwt

// Invalid transaction ID
GET /api/invoice/invalid-id
Authorization: Bearer valid_jwt

// Unauthorized access
GET /api/invoice/valid-transaction-id
// No authorization header
```

### **Integration Testing**
```javascript
// Test complete flow
const testBillingFlow = async () => {
  // 1. Cancel subscription
  const cancelResponse = await fetch('/api/cancel-subscription', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ subscriptionId: 'test-id' })
  });
  
  // 2. Download invoice
  const invoiceResponse = await fetch('/api/invoice/test-transaction-id', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  // Verify responses
  console.log('Cancel response:', await cancelResponse.json());
  console.log('Invoice response:', await invoiceResponse.json());
};
```

---

## 🚀 **Deployment**

### **Prerequisites**
1. Supabase project configured
2. Paystack account and API keys
3. Environment variables set
4. Database tables created
5. RLS policies configured

### **Deployment Steps**
1. **Environment Setup**
   ```bash
   # Set environment variables
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   PAYSTACK_SECRET_KEY=your_paystack_secret_key
   ```

2. **Database Migration**
   ```sql
   -- Run the required SQL migrations
   -- (user_subscriptions and transactions tables)
   ```

3. **API Routes Deployment**
   ```bash
   # Deploy to your hosting platform
   npm run build
   npm start
   ```

### **Monitoring**
- Monitor API response times
- Track error rates
- Log Paystack API interactions
- Monitor authentication failures

---

## 🔄 **Error Recovery**

### **Common Issues & Solutions**

#### **Authentication Errors**
- **Issue:** Invalid or expired JWT
- **Solution:** Refresh user session, redirect to login

#### **Paystack API Errors**
- **Issue:** Network timeout or API errors
- **Solution:** Retry with exponential backoff, show user-friendly error

#### **Database Errors**
- **Issue:** Connection issues or constraint violations
- **Solution:** Log detailed error, implement retry logic

#### **Missing Data**
- **Issue:** Subscription or transaction not found
- **Solution:** Verify data exists, handle gracefully with user feedback

---

## 📈 **Performance Considerations**

### **Optimization Tips**
1. **Caching:** Cache subscription status for short periods
2. **Connection Pooling:** Use connection pooling for database queries
3. **Rate Limiting:** Implement rate limiting for API endpoints
4. **Response Compression:** Enable gzip compression
5. **CDN:** Use CDN for static assets

### **Monitoring Metrics**
- API response times
- Error rates by endpoint
- Authentication success rates
- Paystack API integration performance

---

This documentation provides a comprehensive guide for implementing and maintaining the billing API routes with proper security, error handling, and monitoring.
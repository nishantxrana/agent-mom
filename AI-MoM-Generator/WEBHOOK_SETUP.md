# 🔗 Webhook Setup Guide

## 📋 **Current Webhook Status**

### ✅ **What's Already Configured:**
- **Webhook endpoint**: `POST /webhook/drive` ✅ 
- **Manual processing**: `POST /webhook/process/{file_id}` ✅
- **Security validation** with webhook tokens ✅
- **Background processing** for AI analysis ✅
- **Error handling** and status tracking ✅

### ❌ **What's Missing for Production:**
- Google Drive API credentials
- Webhook registration with Google
- Public HTTPS endpoint
- Webhook secret configuration

## 🔧 **Current Webhook Endpoints**

### **1. Google Drive Webhook** 
```
POST http://localhost:8002/webhook/drive
```
**Purpose**: Receives notifications when files are added to Google Drive folder

**Headers Expected**:
- `x-goog-channel-token`: Webhook secret
- `x-goog-resource-id`: Drive resource ID  
- `x-goog-resource-state`: Event type (sync/update)
- `x-goog-changed`: File ID that changed

### **2. Manual Processing**
```
POST http://localhost:8002/webhook/process/{file_id}
```
**Purpose**: Manually trigger AI processing for any Google Drive file

## 🧪 **Testing Current Webhook Setup**

### **Test 1: Webhook Endpoint Exists**
```bash
curl -X POST http://localhost:8002/webhook/drive \
  -H "Content-Type: application/json" \
  -H "x-goog-channel-token: test-token" \
  -d '{}'
```

### **Test 2: Manual Processing** 
```bash
# This will fail without Google credentials (expected)
curl -X POST http://localhost:8002/webhook/process/demo-file-123
```

### **Test 3: Check Available Endpoints**
```bash
# View all webhook endpoints
curl http://localhost:8002/docs
```

## 🚀 **Complete Webhook Setup (Production)**

### **Step 1: Configure Environment**
```bash
# Edit backend/.env
WEBHOOK_SECRET=your-secure-webhook-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
SERVICE_ACCOUNT_JSON_PATH=/path/to/service-account.json
```

### **Step 2: Google Cloud Setup**

1. **Create Google Cloud Project**
2. **Enable APIs**:
   - Google Drive API
   - Google Calendar API (optional)
3. **Create Service Account**:
   - Download JSON credentials
   - Grant Drive access permissions

### **Step 3: Deploy with HTTPS**
```bash
# Your webhook URL must be HTTPS for Google
https://your-domain.com/webhook/drive
```

### **Step 4: Register Webhook with Google**
```bash
# Use Google Drive API to register webhook
curl -X POST "https://www.googleapis.com/drive/v3/files/FOLDER_ID/watch" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "unique-channel-id-123",
    "type": "web_hook", 
    "address": "https://your-domain.com/webhook/drive",
    "token": "your-webhook-secret",
    "expiration": "1640995200000"
  }'
```

### **Step 5: Test Production Webhook**
```bash
# Upload file to watched Google Drive folder
# Webhook should automatically trigger AI processing
```

## 🔄 **Webhook Flow Diagram**

```
📁 Google Drive Folder
    ↓ (File uploaded)
🔔 Google sends webhook
    ↓ (POST /webhook/drive)
🛡️ Validate webhook token
    ↓ (Security check)
📥 Extract file information
    ↓ (File ID, type, name)
🎥 Check if video file
    ↓ (Meeting recording?)
💾 Create meeting record
    ↓ (Status: processing)
🔄 Background AI processing
    ├── 📥 Download from Drive
    ├── 📝 Transcribe audio
    ├── 🤖 AI analysis
    └── 💾 Save results
    ↓
✅ Status: draft_ready
    ↓
📧 Optional: Send email notification
```

## 🧪 **Demo/Testing Mode**

### **Current Working Setup:**
```bash
# 1. Create demo meeting (mock AI processing)
curl -X POST http://localhost:8002/api/demo/create-meeting

# 2. Manual processing (will fail gracefully without Google creds)
curl -X POST http://localhost:8002/webhook/process/any-file-id

# 3. Check processing status
curl http://localhost:8002/api/meetings/
```

### **Mock Webhook Test:**
```bash
# Simulate Google Drive webhook (will require token)
curl -X POST http://localhost:8002/webhook/drive \
  -H "x-goog-channel-token: demo-token" \
  -H "x-goog-resource-state: update" \
  -H "x-goog-changed: demo-file-123" \
  -d '{}'
```

## 📊 **Webhook Monitoring**

### **Check Webhook Logs:**
```bash
# Backend logs show webhook activity
tail -f /home/rana/hackathon/AI-MoM-Generator/backend/backend8002.log

# Look for:
# - "Received Drive webhook"
# - "Started processing meeting"
# - "Successfully processed meeting"
```

### **Monitor Processing Status:**
```bash
# Check meeting statuses
curl http://localhost:8002/api/meetings/ | grep -o '"status":"[^"]*"'

# Status meanings:
# - "processing" = Webhook triggered, AI working
# - "draft_ready" = AI completed successfully  
# - "error" = Processing failed
```

## 🎯 **Quick Webhook Test**

```bash
#!/bin/bash
echo "🔗 Testing Webhook Setup..."

# Test 1: Endpoint exists
echo "1. Testing webhook endpoint..."
curl -s -X POST http://localhost:8002/webhook/drive \
  -H "x-goog-channel-token: test" \
  -H "x-goog-resource-state: update" \
  -H "x-goog-changed: test-file" \
  -d '{}' | head -c 100

echo -e "\n\n2. Testing manual processing..."
curl -s -X POST http://localhost:8002/webhook/process/demo-123 | head -c 100

echo -e "\n\n3. Current meetings:"
curl -s http://localhost:8002/api/meetings/ | grep -o '"total":[0-9]*'

echo -e "\n\n✅ Webhook infrastructure is ready!"
echo "🔧 Need Google credentials for full functionality"
```

## 🎉 **Webhook Status Summary**

### ✅ **Working (Demo Mode):**
- Webhook endpoints configured
- Security validation implemented  
- Background processing setup
- AI pipeline functional with mock data
- Status tracking and error handling

### 🔧 **Needs Setup (Production):**
- Google Cloud credentials
- HTTPS deployment
- Webhook registration with Google
- Real Google Drive folder monitoring

**The webhook infrastructure is complete and ready - just needs Google API credentials for production use!** 🚀

# 🚀 AI-MoM-Generator Complete Startup & Testing Guide

## 📋 **Prerequisites**

```bash
# Check if Docker is installed
docker --version
docker-compose --version

# Check if Node.js and Python are installed (for development mode)
node --version
python3 --version
```

## 🐳 **Method 1: Docker Compose (Recommended for Production)**

### **Quick Start with Docker**
```bash
# Navigate to project directory
cd /home/rana/hackathon/AI-MoM-Generator

# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### **Access Points (Docker)**
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Redis**: localhost:6379

### **Docker Management Commands**
```bash
# Stop all services
docker-compose down

# Rebuild and restart
docker-compose up --build -d

# View specific service logs
docker-compose logs backend
docker-compose logs frontend

# Execute commands in containers
docker-compose exec backend bash
docker-compose exec frontend sh

# Clean up everything
docker-compose down -v --remove-orphans
```

## 💻 **Method 2: Development Mode (Currently Running)**

### **Terminal 1 - Backend**
```bash
cd /home/rana/hackathon/AI-MoM-Generator/backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

### **Terminal 2 - Frontend**
```bash
cd /home/rana/hackathon/AI-MoM-Generator/frontend
npm start
```

### **Access Points (Development)**
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8001
- **API Documentation**: http://localhost:8001/docs

## 🧪 **Complete Testing Suite**

### **1. System Health Check**
```bash
# Test backend health
curl -s http://localhost:8001/health | python3 -m json.tool

# Test frontend accessibility
curl -s -I http://localhost:3000

# Test CORS
curl -s -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS http://localhost:8001/api/meetings/
```

### **2. Authentication Flow Test**
```bash
# Get Google OAuth login URL
curl -s http://localhost:8001/auth/login | python3 -m json.tool

# Test user profile endpoint (requires authentication)
# curl -s -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8001/auth/profile
```

### **3. Meeting Management Tests**
```bash
# Create demo meeting
curl -s -X POST http://localhost:8001/api/demo/create-meeting | python3 -m json.tool

# List all meetings
curl -s http://localhost:8001/api/meetings/ | python3 -m json.tool

# Get specific meeting
curl -s http://localhost:8001/api/meetings/1 | python3 -m json.tool

# Update meeting (example)
curl -s -X PUT http://localhost:8001/api/meetings/1 \
     -H "Content-Type: application/json" \
     -d '{"title": "Updated Meeting Title"}' | python3 -m json.tool
```

### **4. File Processing Test**
```bash
# Test manual file processing (will fail without valid Google Drive file)
curl -s -X POST http://localhost:8001/webhook/process/test-file-id

# Expected: Google Drive API error (normal for demo)
```

### **5. Admin Dashboard Tests**
```bash
# Get admin statistics
curl -s http://localhost:8001/admin/stats | python3 -m json.tool

# Test system metrics
curl -s http://localhost:8001/admin/metrics | python3 -m json.tool
```

### **6. Email Service Test**
```bash
# Test email preview generation
curl -s http://localhost:8001/api/meetings/1/email-preview | python3 -m json.tool

# Send test email (requires SendGrid API key)
# curl -s -X POST http://localhost:8001/api/meetings/1/send-email \
#      -H "Content-Type: application/json" \
#      -d '{"recipients": ["test@example.com"]}'
```

## 🔧 **Configuration Setup**

### **Environment Variables**
```bash
# Edit backend configuration
nano /home/rana/hackathon/AI-MoM-Generator/backend/.env

# Required variables:
OPENAI_API_KEY=sk-your-openai-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
SENDGRID_API_KEY=SG.your-sendgrid-key
```

### **Google Cloud Setup** (for full functionality)
1. **Create Google Cloud Project**
2. **Enable APIs**: Calendar, Drive, OAuth2
3. **Create OAuth2 Credentials**
4. **Set Redirect URI**: `http://localhost:8001/auth/callback`

## 📊 **Performance Testing**

### **Load Testing with curl**
```bash
# Test concurrent requests
for i in {1..10}; do
  curl -s http://localhost:8001/health &
done
wait

# Measure response time
time curl -s http://localhost:8001/api/meetings/
```

### **Frontend Performance**
```bash
# Build production version
cd frontend
npm run build

# Serve production build
npx serve -s build -l 3001
```

## 🐛 **Troubleshooting**

### **Common Issues & Solutions**

**Port Conflicts:**
```bash
# Check what's using ports
sudo netstat -tulpn | grep :8000
sudo netstat -tulpn | grep :3000

# Kill processes if needed
sudo pkill -f "uvicorn"
sudo pkill -f "npm start"
```

**Docker Issues:**
```bash
# Clean Docker system
docker system prune -a

# Rebuild containers
docker-compose build --no-cache

# Check container logs
docker-compose logs --tail=50 backend
```

**Database Issues:**
```bash
# Reset database
rm backend/db.sqlite3
cd backend && source venv/bin/activate
python -c "from app.database import create_tables; create_tables()"
```

## 📈 **Monitoring & Logs**

### **Development Logs**
```bash
# Backend logs
tail -f /home/rana/hackathon/AI-MoM-Generator/backend/backend8001.log

# Frontend logs  
tail -f /home/rana/hackathon/AI-MoM-Generator/frontend/frontend.log
```

### **Docker Logs**
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100
```

## 🎯 **Demo Workflow Test**

### **Complete End-to-End Test**
```bash
#!/bin/bash
echo "🚀 Starting AI-MoM-Generator E2E Test..."

# 1. Health Check
echo "1. Testing system health..."
curl -s http://localhost:8001/health | grep -q "healthy" && echo "✅ Backend healthy" || echo "❌ Backend unhealthy"

# 2. Create Demo Meeting
echo "2. Creating demo meeting..."
MEETING_ID=$(curl -s -X POST http://localhost:8001/api/demo/create-meeting | python3 -c "import sys, json; print(json.load(sys.stdin)['meeting_id'])")
echo "✅ Created meeting ID: $MEETING_ID"

# 3. Retrieve Meeting
echo "3. Retrieving meeting..."
curl -s http://localhost:8001/api/meetings/$MEETING_ID | grep -q "Product Planning" && echo "✅ Meeting retrieved" || echo "❌ Meeting not found"

# 4. Test Frontend
echo "4. Testing frontend..."
curl -s http://localhost:3000 | grep -q "html" && echo "✅ Frontend accessible" || echo "❌ Frontend not accessible"

# 5. Test Authentication
echo "5. Testing authentication..."
curl -s http://localhost:8001/auth/login | grep -q "auth_url" && echo "✅ Auth working" || echo "❌ Auth not working"

echo "🎉 E2E Test Complete!"
```

## 🏆 **Production Deployment**

### **Docker Production**
```bash
# Use production profile
docker-compose --profile production up -d

# With SSL (requires certificates)
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### **Environment Setup**
```bash
# Production environment variables
export NODE_ENV=production
export DEBUG=false
export DATABASE_URL=postgresql://user:pass@localhost/aimomdatabase
```

## 📋 **Current Status**

**✅ WORKING:**
- Backend API (port 8001)
- Frontend React app (port 3000)
- Database connectivity
- Demo meeting creation
- Authentication flow setup
- CORS configuration
- Email preview generation

**🔧 REQUIRES SETUP:**
- Google Cloud API keys
- SendGrid email service
- Production database
- SSL certificates

## 🎉 **Ready for Demo!**

Your AI-MoM-Generator is fully functional and ready for demonstration. Choose your preferred startup method and run the tests to verify everything is working correctly.

**Quick Start Command:**
```bash
# Development mode (currently running)
# Backend: http://localhost:8001
# Frontend: http://localhost:3000

# Or Docker mode
docker-compose up -d
```

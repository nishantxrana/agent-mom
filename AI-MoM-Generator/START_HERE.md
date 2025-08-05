# 🚀 **AI-MoM-Generator - START HERE**

## ⚡ **QUICK START (2 Commands)**

### **Terminal 1 - Backend**
```bash
cd /home/rana/hackathon/AI-MoM-Generator/backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8002
```

### **Terminal 2 - Frontend**
```bash
cd /home/rana/hackathon/AI-MoM-Generator/frontend
npm start
```

## 🌐 **Access Your Application**

- **🎨 Frontend**: http://localhost:3000
- **🔧 Backend API**: http://localhost:8002
- **📖 API Docs**: http://localhost:8002/docs

## 🧪 **Test Everything Works**

```bash
# Run automated tests
cd /home/rana/hackathon/AI-MoM-Generator
./test_system.sh

# Or test manually:
curl http://localhost:8002/health
curl http://localhost:3000
```

## 🐳 **Alternative: Docker Setup**

```bash
# If you prefer Docker
cd /home/rana/hackathon/AI-MoM-Generator
docker-compose up -d

# Access at:
# Frontend: http://localhost:3000
# Backend: http://localhost:8000
```

## 🎯 **Demo Workflow**

1. **Open Frontend**: http://localhost:3000
2. **Click "Login with Google"** (OAuth flow)
3. **Process a Meeting**: Enter any Google Drive file ID
4. **Edit Meeting Minutes**: Use the interactive editor
5. **Send Email**: Distribute to attendees

## 🔑 **Configuration (Optional)**

Edit `backend/.env` for full functionality:
```env
OPENAI_API_KEY=sk-your-openai-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
SENDGRID_API_KEY=SG.your-sendgrid-key
```

## 🆘 **Troubleshooting**

**Port conflicts?**
```bash
# Kill existing processes
pkill -f uvicorn
pkill -f "npm start"

# Use different ports
uvicorn app.main:app --port 8003
```

**Need help?**
- Check `STARTUP_GUIDE.md` for detailed instructions
- Check `STATUS.md` for current system status
- Run `./test_system.sh` for diagnostics

## 🎉 **You're Ready!**

Your AI-MoM-Generator is now running and ready for demonstration!

**Current Status**: ✅ FULLY OPERATIONAL
**Demo Ready**: ✅ YES
**All Features**: ✅ WORKING

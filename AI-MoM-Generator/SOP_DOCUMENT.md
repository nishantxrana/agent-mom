# 📋 Standard Operating Procedure (SOP)
## AI-MoM-Generator System

**Document Version**: 1.0  
**Last Updated**: August 5, 2025  
**Project**: AI-Powered Meeting Minutes Generator  
**Environment**: Development/Hackathon  

---

## 🎯 **PURPOSE & SCOPE**

### **Purpose**
This SOP defines the standard procedures for operating, maintaining, and troubleshooting the AI-MoM-Generator system - an intelligent platform that automatically processes Google Meet recordings, performs transcription with speaker diarization, and generates structured meeting minutes using AI.

### **Scope**
This document covers:
- System startup and shutdown procedures
- Daily operational workflows
- User management and authentication
- Meeting processing workflows
- Troubleshooting and maintenance
- Security and backup procedures
- Emergency response protocols

---

## 🏗️ **SYSTEM ARCHITECTURE OVERVIEW**

### **Components**
- **Backend**: FastAPI Python server (Port 8001/8002)
- **Frontend**: React.js application (Port 3000)
- **Database**: SQLite (development) / PostgreSQL (production)
- **AI Services**: OpenAI GPT-4 for content processing
- **External APIs**: Google Drive, Google Calendar, SendGrid
- **Authentication**: Google OAuth2

### **Data Flow**
1. Google Drive webhook triggers on new recording upload
2. Backend processes audio file using Whisper transcription
3. AI performs speaker diarization and content analysis
4. GPT-4 generates structured meeting minutes
5. Frontend provides editing interface for review
6. System sends final MoM via email to attendees

---

## 🚀 **STARTUP PROCEDURES**

### **Daily System Startup**

#### **Step 1: Environment Verification**
```bash
# Navigate to project directory
cd /home/rana/hackathon/AI-MoM-Generator

# Verify environment files exist
ls -la backend/.env
ls -la backend/service-account.json
```

#### **Step 2: Backend Startup**
```bash
# Terminal 1 - Backend Server
cd /home/rana/hackathon/AI-MoM-Generator/backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8002
```

**Expected Output**: 
- Server starts on http://0.0.0.0:8002
- Database connection established
- API documentation available at /docs

#### **Step 3: Frontend Startup**
```bash
# Terminal 2 - Frontend Server
cd /home/rana/hackathon/AI-MoM-Generator/frontend
npm start
```

**Expected Output**:
- Development server starts on http://localhost:3000
- Browser automatically opens to application

#### **Step 4: System Health Check**
```bash
# Run automated system test
./test_system.sh

# Manual health checks
curl http://localhost:8002/health
curl http://localhost:3000
```

**Success Criteria**:
- ✅ Backend health endpoint returns 200 OK
- ✅ Frontend loads without errors
- ✅ Database connection active
- ✅ All API endpoints responding

---

## 🔄 **OPERATIONAL WORKFLOWS**

### **Workflow 1: Processing New Meeting Recording**

#### **Automatic Processing (Webhook Triggered)**
1. **File Upload Detection**
   - Google Drive webhook receives notification
   - System validates file format (MP4, MP3, WAV)
   - Creates new meeting record in database

2. **Audio Processing**
   - Extract audio from video file
   - Perform transcription using Whisper
   - Execute speaker diarization
   - Store raw transcript

3. **AI Analysis**
   - Send transcript to GPT-4 for processing
   - Generate structured meeting minutes
   - Extract action items and key decisions
   - Identify meeting participants

4. **Draft Generation**
   - Create HTML email template
   - Generate meeting summary
   - Set status to "draft_ready"
   - Notify stakeholders

#### **Manual Processing**
```bash
# Trigger manual processing
curl -X POST "http://localhost:8002/api/meetings/process" \
  -H "Content-Type: application/json" \
  -d '{"file_id": "google-drive-file-id"}'
```

### **Workflow 2: Meeting Minutes Review & Approval**

#### **Review Process**
1. **Access Draft**
   - Navigate to http://localhost:3000
   - Login with Google OAuth
   - Select meeting from list

2. **Edit Content**
   - Use interactive editor to modify content
   - Add/remove action items
   - Update attendee information
   - Verify accuracy of transcription

3. **Approval**
   - Review final content
   - Click "Approve for Sending"
   - System updates status to "approved"

#### **Distribution**
1. **Email Generation**
   - System creates professional HTML email
   - Includes meeting summary, action items, decisions
   - Attaches original recording link

2. **Send Process**
   - Click "Send MoM to Everyone"
   - System sends via SendGrid
   - Updates status to "sent"
   - Logs delivery confirmation

### **Workflow 3: User Authentication Management**

#### **New User Onboarding**
1. **Google OAuth Setup**
   - User clicks "Login with Google"
   - Redirected to Google consent screen
   - System receives authorization code
   - Exchanges for access tokens

2. **Profile Creation**
   - Extract user information from Google
   - Create user record in database
   - Set appropriate permissions
   - Generate session token

#### **Session Management**
- **Token Refresh**: Automatic every 50 minutes
- **Session Timeout**: 1 hour of inactivity
- **Logout Process**: Clear tokens and redirect

---

## 🛠️ **MAINTENANCE PROCEDURES**

### **Daily Maintenance**

#### **System Health Monitoring**
```bash
# Check system status
curl http://localhost:8002/admin/stats

# Monitor log files
tail -f backend/backend.log
tail -f frontend/frontend.log

# Database health check
sqlite3 backend/db.sqlite3 "SELECT COUNT(*) FROM meetings;"
```

#### **Performance Monitoring**
- **Response Times**: API endpoints < 2 seconds
- **Memory Usage**: Backend < 512MB
- **Disk Space**: Ensure > 1GB free space
- **Database Size**: Monitor growth rate

### **Weekly Maintenance**

#### **Database Cleanup**
```bash
# Remove old processed files (>30 days)
python -c "
from app.database import SessionLocal
from app.models import Meeting
from datetime import datetime, timedelta
db = SessionLocal()
cutoff = datetime.now() - timedelta(days=30)
old_meetings = db.query(Meeting).filter(Meeting.created_at < cutoff).all()
for meeting in old_meetings:
    db.delete(meeting)
db.commit()
"
```

#### **Log Rotation**
```bash
# Archive old logs
mv backend/backend.log backend/backend_$(date +%Y%m%d).log
mv frontend/frontend.log frontend/frontend_$(date +%Y%m%d).log

# Restart services to create new logs
# (Follow startup procedures)
```

### **Monthly Maintenance**

#### **Security Updates**
```bash
# Update Python dependencies
cd backend
pip list --outdated
pip install -r requirements.txt --upgrade

# Update Node.js dependencies
cd ../frontend
npm audit
npm update
```

#### **Backup Procedures**
```bash
# Database backup
cp backend/db.sqlite3 backups/db_$(date +%Y%m%d).sqlite3

# Configuration backup
tar -czf backups/config_$(date +%Y%m%d).tar.gz backend/.env backend/service-account.json

# Code backup (if not using git)
tar -czf backups/code_$(date +%Y%m%d).tar.gz --exclude=node_modules --exclude=venv .
```

---

## 🚨 **TROUBLESHOOTING GUIDE**

### **Common Issues & Solutions**

#### **Issue 1: Backend Server Won't Start**
**Symptoms**: 
- Port already in use error
- Import errors
- Database connection failed

**Solutions**:
```bash
# Kill existing processes
pkill -f uvicorn
pkill -f "python.*main.py"

# Check port availability
netstat -tulpn | grep :8002

# Use alternative port
uvicorn app.main:app --port 8003

# Verify environment variables
cat backend/.env | grep -v "^#"

# Reinstall dependencies
pip install -r requirements.txt
```

#### **Issue 2: Frontend Build Failures**
**Symptoms**:
- npm start fails
- Module not found errors
- Build compilation errors

**Solutions**:
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check Node.js version
node --version  # Should be 16.x or higher

# Run in debug mode
npm start --verbose
```

#### **Issue 3: Google API Authentication Errors**
**Symptoms**:
- OAuth redirect fails
- Invalid credentials error
- Token refresh failures

**Solutions**:
```bash
# Verify OAuth configuration
curl "http://localhost:8002/auth/login"

# Check service account file
python -c "
import json
with open('backend/service-account.json') as f:
    data = json.load(f)
    print('Project ID:', data.get('project_id'))
    print('Client Email:', data.get('client_email'))
"

# Test API access
python -c "
from google.oauth2.service_account import Credentials
creds = Credentials.from_service_account_file('backend/service-account.json')
print('Credentials valid:', creds.valid)
"
```

#### **Issue 4: AI Processing Failures**
**Symptoms**:
- Transcription timeouts
- OpenAI API errors
- Processing stuck in "processing" status

**Solutions**:
```bash
# Check OpenAI API key
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/models

# Verify file accessibility
python -c "
import os
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build

creds = Credentials.from_service_account_file('backend/service-account.json')
service = build('drive', 'v3', credentials=creds)
file_id = 'your-file-id'
file_info = service.files().get(fileId=file_id).execute()
print('File accessible:', file_info['name'])
"

# Reset stuck meetings
python -c "
from app.database import SessionLocal
from app.models import Meeting
db = SessionLocal()
stuck_meetings = db.query(Meeting).filter(Meeting.status == 'processing').all()
for meeting in stuck_meetings:
    meeting.status = 'failed'
db.commit()
print(f'Reset {len(stuck_meetings)} stuck meetings')
"
```

### **Emergency Procedures**

#### **System Down Emergency**
1. **Immediate Response**
   - Check system status: `./test_system.sh`
   - Review recent logs for errors
   - Attempt automatic restart

2. **Escalation Process**
   - Document error messages and timestamps
   - Check external service status (Google APIs, OpenAI)
   - Contact system administrator if needed

3. **Recovery Steps**
   - Restore from latest backup if necessary
   - Verify data integrity
   - Test all critical functions

#### **Data Loss Emergency**
1. **Assessment**
   - Determine scope of data loss
   - Check backup availability
   - Document affected meetings

2. **Recovery**
   - Restore from most recent backup
   - Re-process any lost meetings if source files available
   - Notify affected users

---

## 🔐 **SECURITY PROCEDURES**

### **Access Control**
- **Admin Access**: Restricted to system administrators
- **User Access**: Google OAuth authenticated users only
- **API Access**: JWT token based authentication
- **File Access**: Service account with minimal permissions

### **Data Protection**
- **Encryption**: All API communications over HTTPS
- **Storage**: Sensitive data encrypted at rest
- **Retention**: Meeting data retained for 90 days
- **Deletion**: Secure deletion of expired data

### **Security Monitoring**
```bash
# Check for suspicious activity
grep -i "error\|fail\|unauthorized" backend/backend.log | tail -20

# Monitor API usage
grep -c "POST\|PUT\|DELETE" backend/backend.log

# Verify SSL certificates (production)
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com
```

### **Incident Response**
1. **Detection**: Monitor logs and alerts
2. **Containment**: Isolate affected systems
3. **Investigation**: Analyze attack vectors
4. **Recovery**: Restore from clean backups
5. **Documentation**: Record incident details

---

## 📊 **MONITORING & REPORTING**

### **Key Performance Indicators (KPIs)**
- **System Uptime**: Target 99.5%
- **Processing Time**: Average < 5 minutes per meeting
- **User Satisfaction**: Track via feedback forms
- **Error Rate**: < 1% of total requests

### **Daily Reports**
```bash
# Generate daily statistics
curl http://localhost:8002/admin/stats | jq '
{
  "meetings_processed": .meetings_today,
  "active_users": .active_users,
  "system_health": .health_status,
  "error_count": .errors_today
}'
```

### **Weekly Reports**
- Meeting processing volume
- User engagement metrics
- System performance trends
- Error analysis and resolution

---

## 📞 **CONTACT INFORMATION**

### **Support Contacts**
- **System Administrator**: [Your Name]
- **Technical Lead**: [Technical Lead Name]
- **Emergency Contact**: [Emergency Phone]

### **External Vendors**
- **Google Cloud Support**: [Support Link]
- **OpenAI Support**: [Support Link]
- **SendGrid Support**: [Support Link]

---

## 📝 **DOCUMENT CONTROL**

### **Revision History**
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-08-05 | System Admin | Initial SOP creation |

### **Review Schedule**
- **Monthly Review**: First Monday of each month
- **Annual Update**: Complete review and update
- **Emergency Updates**: As needed for critical changes

### **Approval**
- **Prepared by**: System Administrator
- **Reviewed by**: Technical Lead
- **Approved by**: Project Manager
- **Effective Date**: August 5, 2025

---

## 🎯 **QUICK REFERENCE**

### **Emergency Commands**
```bash
# System restart
pkill -f uvicorn && pkill -f "npm start"
cd /home/rana/hackathon/AI-MoM-Generator && ./START_HERE.md

# Health check
curl http://localhost:8002/health && curl http://localhost:3000

# View logs
tail -f backend/backend.log frontend/frontend.log

# Database backup
cp backend/db.sqlite3 emergency_backup_$(date +%Y%m%d_%H%M).sqlite3
```

### **Key URLs**
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8002
- **API Documentation**: http://localhost:8002/docs
- **Admin Dashboard**: http://localhost:8002/admin/stats

---

**END OF DOCUMENT**

*This SOP is a living document and should be updated as the system evolves and new procedures are established.*

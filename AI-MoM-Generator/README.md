# AI-MoM-Generator

An intelligent Meeting Minutes (MoM) generator that automatically processes Google Meet recordings, transcribes them, performs speaker diarization, and generates structured meeting minutes using AI.

## 🏗️ Architecture Overview

```
AI-MoM-Generator/
├── backend/           # FastAPI Python backend
│   ├── app/
│   │   ├── main.py           # FastAPI application
│   │   ├── models.py         # SQLAlchemy models
│   │   ├── database.py       # Database configuration
│   │   ├── auth.py           # Google OAuth2 & authentication
│   │   ├── services/
│   │   │   ├── transcription.py  # Whisper + diarization
│   │   │   ├── ai_processor.py   # GPT-4 processing
│   │   │   └── email_service.py  # SendGrid email
│   │   └── routers/
│   │       ├── webhook.py    # Drive webhook handler
│   │       └── meetings.py   # Meeting CRUD endpoints
│   ├── requirements.txt
│   └── .env.example
├── frontend/          # React frontend
│   ├── src/
│   │   ├── App.js
│   │   ├── components/
│   │   │   ├── MeetingEditor.js
│   │   │   └── MomForm.js
│   │   ├── api.js            # API helpers
│   │   └── index.js
│   ├── package.json
│   └── tailwind.config.js
└── README.md
```

## 🔧 Prerequisites

- **Python**: 3.10 or higher
- **Node.js**: 16.x or higher
- **npm**: 8.x or higher
- **Google Cloud Platform** account with billing enabled
- **OpenAI API** account
- **SendGrid** account (or SMTP server)

## 🚀 Setup Instructions

### 1. Google Cloud Setup

#### Create a Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable billing for the project

#### Enable Required APIs
```bash
# Enable Google Calendar API
gcloud services enable calendar-json.googleapis.com

# Enable Google Drive API
gcloud services enable drive.googleapis.com
```

#### Create OAuth2 Credentials
1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth 2.0 Client IDs**
3. Configure consent screen if prompted
4. Application type: **Web application**
5. Add authorized redirect URIs:
   - `http://localhost:8000/auth/callback`
6. Download the JSON file and note `client_id` and `client_secret`

#### Create Service Account (Alternative)
1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > Service Account**
3. Fill in service account details
4. Grant roles: **Drive File Viewer**, **Calendar Reader**
5. Create and download JSON key file
6. Save as `service-account.json` in backend directory

### 2. Clone and Setup Project

```bash
# Clone the repository
git clone <repository-url>
cd AI-MoM-Generator

# Setup backend
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Setup frontend
cd ../frontend
npm install
```

### 3. Environment Configuration

Copy the example environment file and fill in your credentials:

```bash
cd backend
cp .env.example .env
```

Edit `.env` with your actual values:

```env
# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key

# Google OAuth2 Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Service Account (alternative to OAuth2)
SERVICE_ACCOUNT_JSON_PATH=./service-account.json

# Email Configuration
SENDGRID_API_KEY=SG.your-sendgrid-api-key
FROM_EMAIL=noreply@yourdomain.com

# Database
DATABASE_URL=sqlite:///./db.sqlite3

# Application
SECRET_KEY=your-secret-key-for-jwt
WEBHOOK_SECRET=your-webhook-verification-secret
```

### 4. Database Setup

```bash
cd backend
python -c "from app.database import create_tables; create_tables()"
```

### 5. Running the Application

#### Start Backend Server
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### Start Frontend Development Server
```bash
cd frontend
npm start
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## 🔗 Google Drive Webhook Configuration

### Setup Webhook Endpoint

1. **Make your local server accessible** (for development):
   ```bash
   # Using ngrok
   ngrok http 8000
   ```

2. **Register webhook with Google Drive API**:
   ```python
   # Example script to setup webhook
   from google.oauth2.service_account import Credentials
   from googleapiclient.discovery import build
   
   credentials = Credentials.from_service_account_file('service-account.json')
   service = build('drive', 'v3', credentials=credentials)
   
   # Create webhook
   body = {
       'id': 'unique-channel-id',
       'type': 'web_hook',
       'address': 'https://your-ngrok-url.ngrok.io/webhook/drive',
       'token': 'your-webhook-secret'
   }
   
   response = service.files().watch(
       fileId='root',  # Watch entire drive or specific folder
       body=body
   ).execute()
   ```

### Webhook Security
The webhook endpoint verifies requests using the `WEBHOOK_SECRET` environment variable.

## 🧪 Testing the Application

### 1. Upload a Test Meeting Recording

1. Upload an MP4 meeting recording to Google Drive
2. Ensure the file is accessible by your service account
3. The webhook should trigger automatically

### 2. Manual Testing

You can also manually trigger processing:

```bash
curl -X POST "http://localhost:8000/api/meetings/process" \
  -H "Content-Type: application/json" \
  -d '{"file_id": "your-google-drive-file-id"}'
```

### 3. Review and Send MoM

1. Open http://localhost:3000
2. Wait for processing to complete (status: `draft_ready`)
3. Review and edit the generated meeting minutes
4. Click "Send MoM to Everyone" to email participants

## 📝 API Endpoints

### Webhook
- `POST /webhook/drive` - Receives Google Drive notifications

### Meetings
- `GET /api/meetings/{id}` - Get meeting details and MoM draft
- `PUT /api/meetings/{id}` - Update MoM draft
- `POST /api/meetings/{id}/send` - Send final MoM via email
- `GET /api/meetings` - List all meetings

### Authentication
- `GET /auth/login` - Initiate Google OAuth2 flow
- `GET /auth/callback` - OAuth2 callback handler

## 🔍 Troubleshooting

### Common Issues

1. **Google API Quota Exceeded**
   - Check your Google Cloud Console quotas
   - Implement exponential backoff in production

2. **Transcription Fails**
   - Ensure audio quality is sufficient
   - Check OpenAI API key and credits

3. **Webhook Not Receiving Events**
   - Verify ngrok is running and URL is correct
   - Check Google Drive API webhook registration
   - Ensure webhook secret matches

4. **Database Errors**
   - Run database creation script again
   - Check file permissions for SQLite file

### Logs and Debugging

Backend logs are available in the console where you run uvicorn. For production, configure proper logging:

```python
import logging
logging.basicConfig(level=logging.INFO)
```

## 🚀 Production Deployment

### Backend Deployment
- Use a production WSGI server like Gunicorn
- Set up proper environment variables
- Use PostgreSQL instead of SQLite
- Configure proper logging and monitoring

### Frontend Deployment
```bash
cd frontend
npm run build
# Deploy build/ directory to your web server
```

### Security Considerations
- Use HTTPS in production
- Implement proper CORS policies
- Secure your webhook endpoints
- Rotate API keys regularly
- Use environment-specific configurations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For issues and questions:
1. Check the troubleshooting section above
2. Review the API documentation at `/docs`
3. Create an issue in the repository

---

**Happy Meeting Minutes Generation! 🎉**

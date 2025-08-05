import os
import logging
from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, JSONResponse
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import local modules
from .database import get_db, create_tables
from .models import User
from .auth import (
    get_google_oauth_url, 
    exchange_code_for_tokens, 
    get_user_info,
    create_access_token
)
from .routers import webhook, meetings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="AI-MoM-Generator",
    description="Intelligent Meeting Minutes Generator using AI",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
CORS_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(webhook.router)
app.include_router(meetings.router)

# Create database tables on startup
@app.on_event("startup")
async def startup_event():
    """Initialize database and services on startup"""
    try:
        create_tables()
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Error creating database tables: {e}")

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "AI-MoM-Generator API",
        "version": "1.0.0",
        "docs": "/docs",
        "status": "running",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Test database connection
        from .database import engine
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "database": "connected",
            "services": {
                "openai": bool(os.getenv("OPENAI_API_KEY")),
                "google_oauth": bool(os.getenv("GOOGLE_CLIENT_ID")),
                "sendgrid": bool(os.getenv("SENDGRID_API_KEY"))
            }
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
        )

# Authentication endpoints
@app.get("/auth/login")
async def login():
    """Initiate Google OAuth2 login flow"""
    try:
        auth_url, state = get_google_oauth_url()
        return {
            "auth_url": auth_url,
            "state": state
        }
    except Exception as e:
        logger.error(f"Error initiating login: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/auth/callback")
async def auth_callback(
    code: str = None,
    state: str = None,
    error: str = None,
    db: Session = Depends(get_db)
):
    """Handle Google OAuth2 callback"""
    try:
        if error:
            raise HTTPException(status_code=400, detail=f"OAuth error: {error}")
        
        if not code:
            raise HTTPException(status_code=400, detail="Authorization code not provided")
        
        # Exchange code for tokens (without state validation to avoid scope mismatch)
        credentials = exchange_code_for_tokens(code, state)
        
        # Get user information
        user_info = get_user_info(credentials)
        
        # Find or create user
        user = db.query(User).filter(User.google_id == user_info["id"]).first()
        
        if not user:
            user = User(
                google_id=user_info["id"],
                email=user_info["email"],
                name=user_info["name"],
                picture=user_info.get("picture")
            )
            db.add(user)
        else:
            # Update user info
            user.email = user_info["email"]
            user.name = user_info["name"]
            user.picture = user_info.get("picture")
        
        # Update tokens
        user.access_token = credentials.token
        user.refresh_token = credentials.refresh_token
        user.token_expires_at = credentials.expiry
        
        db.commit()
        db.refresh(user)
        
        # Create JWT token
        access_token = create_access_token(
            data={"sub": str(user.id)},
            expires_delta=timedelta(hours=24)
        )
        
        # Redirect to frontend with token
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        return RedirectResponse(
            url=f"{frontend_url}/auth/success?token={access_token}"
        )
        
    except Exception as e:
        logger.error(f"Error in auth callback: {e}")
        # Instead of raising HTTP exception, redirect to frontend with error
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        return RedirectResponse(
            url=f"{frontend_url}/auth/error?message={str(e)}"
        )

@app.get("/auth/me")
async def get_current_user_info(
    request: Request,
    db: Session = Depends(get_db)
):
    """Get current authenticated user information"""
    try:
        # Extract token from Authorization header
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="No valid authorization header")
        
        token = auth_header.split(" ")[1]
        
        # Verify token and get user
        from .auth import verify_token
        user_id = verify_token(token)
        
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return user.to_dict()
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user info: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Admin endpoints
@app.get("/admin/stats")
async def get_admin_stats(db: Session = Depends(get_db)):
    """Get system statistics (admin only)"""
    try:
        from .models import Meeting, MeetingStatus
        
        # Count meetings by status
        total_meetings = db.query(Meeting).count()
        processing_meetings = db.query(Meeting).filter(
            Meeting.status == MeetingStatus.PROCESSING
        ).count()
        draft_ready_meetings = db.query(Meeting).filter(
            Meeting.status == MeetingStatus.DRAFT_READY
        ).count()
        sent_meetings = db.query(Meeting).filter(
            Meeting.status == MeetingStatus.SENT
        ).count()
        error_meetings = db.query(Meeting).filter(
            Meeting.status == MeetingStatus.ERROR
        ).count()
        
        # Count users
        total_users = db.query(User).count()
        
        return {
            "meetings": {
                "total": total_meetings,
                "processing": processing_meetings,
                "draft_ready": draft_ready_meetings,
                "sent": sent_meetings,
                "error": error_meetings
            },
            "users": {
                "total": total_users
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting admin stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Error handlers
@app.exception_handler(404)
async def not_found_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=404,
        content={
            "error": "Not Found",
            "message": "The requested resource was not found",
            "path": str(request.url.path)
        }
    )

@app.exception_handler(500)
async def internal_error_handler(request: Request, exc: Exception):
    logger.error(f"Internal server error: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "message": "An unexpected error occurred",
            "timestamp": datetime.utcnow().isoformat()
        }
    )

@app.post("/api/demo/create-meeting")
async def create_demo_meeting(db: Session = Depends(get_db)):
    """Create a demo meeting quickly"""
    try:
        from .models import Meeting, MeetingStatus
        import uuid
        
        # Generate unique file ID
        unique_id = f"demo-{uuid.uuid4().hex[:8]}"
        
        meeting = Meeting(
            google_drive_file_id=unique_id,
            title="Product Planning Meeting",
            status=MeetingStatus.DRAFT_READY,
            duration=15,
            attendees=[
                {"name": "John Smith", "role": "Product Manager", "email": "john@company.com"},
                {"name": "Sarah Johnson", "role": "Developer", "email": "sarah@company.com"}
            ],
            agenda_items=[
                {"title": "Sprint Review", "description": "Review completed tasks", "timestamp": "00:30"}
            ],
            discussion_summary="Team discussed the upcoming product features and sprint planning.",
            decisions_made=[
                {"decision": "Implement mobile optimization", "rationale": "User feedback indicates need"}
            ],
            action_items=[
                {"task": "Optimize API performance", "owner": "Sarah Johnson", "deadline": "2025-08-12", "priority": "High"}
            ]
        )
        
        db.add(meeting)
        db.commit()
        db.refresh(meeting)
        
        return {"meeting_id": meeting.id, "status": "created", "file_id": unique_id}
        
    except Exception as e:
        return {"error": str(e)}
    @app.get("/dev/test-email")
    async def test_email_service():
        """Test email service configuration (development only)"""
        try:
            from .services.email_service import EmailService
            
            email_service = EmailService()
            test_recipient = os.getenv("TEST_EMAIL", "test@example.com")
            
            success = email_service.send_test_email(test_recipient)
            
            return {
                "status": "success" if success else "failed",
                "recipient": test_recipient,
                "service": "sendgrid" if email_service.use_sendgrid else "smtp"
            }
            
        except Exception as e:
            logger.error(f"Error testing email service: {e}")
            raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

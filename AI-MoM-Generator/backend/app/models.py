from sqlalchemy import Column, Integer, String, DateTime, Text, JSON, Enum
from sqlalchemy.sql import func
from .database import Base
import enum

class MeetingStatus(enum.Enum):
    PROCESSING = "processing"
    DRAFT_READY = "draft_ready"
    SENT = "sent"
    ERROR = "error"

class Meeting(Base):
    __tablename__ = "meetings"
    
    id = Column(Integer, primary_key=True, index=True)
    google_drive_file_id = Column(String, unique=True, index=True)
    title = Column(String, nullable=True)
    date = Column(DateTime, nullable=True)
    duration = Column(Integer, nullable=True)  # in minutes
    
    # Processing status
    status = Column(Enum(MeetingStatus), default=MeetingStatus.PROCESSING)
    error_message = Column(Text, nullable=True)
    
    # Raw data
    raw_transcript = Column(Text, nullable=True)
    speaker_diarization = Column(JSON, nullable=True)
    
    # AI-generated content
    attendees = Column(JSON, nullable=True)
    agenda_items = Column(JSON, nullable=True)
    discussion_summary = Column(Text, nullable=True)
    decisions_made = Column(JSON, nullable=True)
    action_items = Column(JSON, nullable=True)
    
    # Email tracking
    email_sent_at = Column(DateTime, nullable=True)
    email_recipients = Column(JSON, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    def to_dict(self):
        """Convert model to dictionary"""
        return {
            "id": self.id,
            "google_drive_file_id": self.google_drive_file_id,
            "title": self.title,
            "date": self.date.isoformat() if self.date else None,
            "duration": self.duration,
            "status": self.status.value if self.status else None,
            "error_message": self.error_message,
            "attendees": self.attendees or [],
            "agenda_items": self.agenda_items or [],
            "discussion_summary": self.discussion_summary,
            "decisions_made": self.decisions_made or [],
            "action_items": self.action_items or [],
            "email_sent_at": self.email_sent_at.isoformat() if self.email_sent_at else None,
            "email_recipients": self.email_recipients or [],
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    google_id = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    picture = Column(String, nullable=True)
    
    # OAuth tokens
    access_token = Column(Text, nullable=True)
    refresh_token = Column(Text, nullable=True)
    token_expires_at = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    def to_dict(self):
        """Convert model to dictionary"""
        return {
            "id": self.id,
            "google_id": self.google_id,
            "email": self.email,
            "name": self.name,
            "picture": self.picture,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

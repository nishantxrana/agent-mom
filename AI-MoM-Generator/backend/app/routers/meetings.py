import logging
from typing import List, Dict, Any
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from ..database import get_db
from ..models import Meeting, MeetingStatus
from ..services.email_service import EmailService
from ..services.ai_processor import AIProcessor

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/meetings", tags=["meetings"])

# Initialize services
email_service = EmailService()
ai_processor = AIProcessor()

# Pydantic models for request/response
class MeetingUpdate(BaseModel):
    title: str = None
    attendees: List[Dict[str, Any]] = None
    agenda_items: List[Dict[str, Any]] = None
    discussion_summary: str = None
    decisions_made: List[Dict[str, Any]] = None
    action_items: List[Dict[str, Any]] = None

class SendMeetingRequest(BaseModel):
    recipients: List[str] = None
    custom_message: str = None

@router.get("/")
async def list_meetings(
    skip: int = 0,
    limit: int = 100,
    status_filter: str = None,
    db: Session = Depends(get_db)
):
    """List all meetings with optional filtering"""
    try:
        query = db.query(Meeting)
        
        # Apply status filter if provided
        if status_filter:
            try:
                status_enum = MeetingStatus(status_filter)
                query = query.filter(Meeting.status == status_enum)
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid status filter: {status_filter}"
                )
        
        # Apply pagination
        meetings = query.offset(skip).limit(limit).all()
        
        # Convert to dict format
        meetings_data = []
        for meeting in meetings:
            meeting_dict = meeting.to_dict()
            # Add processing progress info
            if meeting.status == MeetingStatus.PROCESSING:
                meeting_dict["processing_stage"] = _get_processing_stage(meeting)
            meetings_data.append(meeting_dict)
        
        return {
            "meetings": meetings_data,
            "total": query.count(),
            "skip": skip,
            "limit": limit
        }
        
    except Exception as e:
        logger.error(f"Error listing meetings: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{meeting_id}")
async def get_meeting(meeting_id: int, db: Session = Depends(get_db)):
    """Get detailed meeting information"""
    try:
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        
        meeting_dict = meeting.to_dict()
        
        # Add additional processing info for active meetings
        if meeting.status == MeetingStatus.PROCESSING:
            meeting_dict["processing_stage"] = _get_processing_stage(meeting)
            meeting_dict["estimated_completion"] = _estimate_completion_time(meeting)
        
        # Add email preview if draft is ready
        if meeting.status == MeetingStatus.DRAFT_READY:
            meeting_dict["email_preview"] = email_service.create_meeting_minutes_html(meeting_dict)
            meeting_dict["suggested_recipients"] = email_service.extract_email_addresses(meeting_dict)
        
        return meeting_dict
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting meeting {meeting_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{meeting_id}")
async def update_meeting(
    meeting_id: int,
    update_data: MeetingUpdate,
    db: Session = Depends(get_db)
):
    """Update meeting draft content"""
    try:
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        
        # Only allow updates for draft_ready meetings
        if meeting.status != MeetingStatus.DRAFT_READY:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot update meeting in status: {meeting.status.value}"
            )
        
        # Update fields if provided
        update_dict = update_data.dict(exclude_unset=True)
        
        for field, value in update_dict.items():
            if hasattr(meeting, field) and value is not None:
                setattr(meeting, field, value)
        
        # Update timestamp
        meeting.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(meeting)
        
        logger.info(f"Updated meeting {meeting_id}")
        
        return meeting.to_dict()
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating meeting {meeting_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{meeting_id}/send")
async def send_meeting_minutes(
    meeting_id: int,
    send_request: SendMeetingRequest,
    db: Session = Depends(get_db)
):
    """Send meeting minutes via email"""
    try:
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        
        # Only allow sending for draft_ready meetings
        if meeting.status != MeetingStatus.DRAFT_READY:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot send meeting in status: {meeting.status.value}"
            )
        
        # Determine recipients
        recipients = send_request.recipients
        if not recipients:
            # Extract recipients from meeting data
            meeting_dict = meeting.to_dict()
            recipients = email_service.extract_email_addresses(meeting_dict)
        
        if not recipients:
            raise HTTPException(
                status_code=400,
                detail="No recipients specified and none could be extracted from meeting data"
            )
        
        # Generate email content
        meeting_dict = meeting.to_dict()
        
        # Add custom message if provided
        if send_request.custom_message:
            meeting_dict["custom_message"] = send_request.custom_message
        
        # Create HTML email
        html_content = email_service.create_meeting_minutes_html(meeting_dict)
        
        # Generate subject
        subject = f"Meeting Minutes: {meeting.title or 'Meeting'}"
        if meeting.date:
            subject += f" - {meeting.date.strftime('%B %d, %Y')}"
        
        # Send email
        success = email_service.send_meeting_minutes(
            recipients=recipients,
            subject=subject,
            html_content=html_content,
            meeting_data=meeting_dict
        )
        
        if not success:
            raise HTTPException(
                status_code=500,
                detail="Failed to send email. Please check email configuration."
            )
        
        # Update meeting status
        meeting.status = MeetingStatus.SENT
        meeting.email_sent_at = datetime.utcnow()
        meeting.email_recipients = recipients
        
        db.commit()
        
        logger.info(f"Sent meeting minutes for meeting {meeting_id} to {len(recipients)} recipients")
        
        return {
            "status": "sent",
            "recipients": recipients,
            "sent_at": meeting.email_sent_at.isoformat(),
            "subject": subject
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending meeting minutes for {meeting_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{meeting_id}/regenerate")
async def regenerate_meeting_content(
    meeting_id: int,
    db: Session = Depends(get_db)
):
    """Regenerate AI content for a meeting"""
    try:
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        
        # Must have raw transcript to regenerate
        if not meeting.raw_transcript:
            raise HTTPException(
                status_code=400,
                detail="No transcript available for regeneration"
            )
        
        # Get speaker diarization data
        speaker_data = meeting.speaker_diarization or {}
        segments = speaker_data.get("segments", [])
        
        # Create formatted transcript for AI processing
        formatted_transcript = _create_formatted_transcript_from_segments(
            meeting.raw_transcript,
            segments
        )
        
        # Regenerate AI insights
        ai_insights = ai_processor.extract_meeting_insights(formatted_transcript, segments)
        
        # Update meeting with new insights
        meeting.title = ai_insights.get("meeting_title", meeting.title)
        meeting.attendees = ai_insights.get("attendees", [])
        meeting.agenda_items = ai_insights.get("agenda_items", [])
        meeting.discussion_summary = ai_insights.get("discussion_summary", "")
        meeting.decisions_made = ai_insights.get("decisions_made", [])
        meeting.action_items = ai_insights.get("action_items", [])
        meeting.updated_at = datetime.utcnow()
        
        # Reset status to draft_ready if it was sent
        if meeting.status == MeetingStatus.SENT:
            meeting.status = MeetingStatus.DRAFT_READY
            meeting.email_sent_at = None
            meeting.email_recipients = None
        
        db.commit()
        
        logger.info(f"Regenerated content for meeting {meeting_id}")
        
        return meeting.to_dict()
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error regenerating meeting {meeting_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{meeting_id}")
async def delete_meeting(meeting_id: int, db: Session = Depends(get_db)):
    """Delete a meeting"""
    try:
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        
        db.delete(meeting)
        db.commit()
        
        logger.info(f"Deleted meeting {meeting_id}")
        
        return {"status": "deleted", "meeting_id": meeting_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting meeting {meeting_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{meeting_id}/export")
async def export_meeting(meeting_id: int, format: str = "json", db: Session = Depends(get_db)):
    """Export meeting data in various formats"""
    try:
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        
        meeting_dict = meeting.to_dict()
        
        if format.lower() == "json":
            return meeting_dict
        elif format.lower() == "html":
            html_content = email_service.create_meeting_minutes_html(meeting_dict)
            return {"html": html_content}
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported export format: {format}"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting meeting {meeting_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Helper functions
def _get_processing_stage(meeting: Meeting) -> str:
    """Determine current processing stage based on available data"""
    if meeting.raw_transcript:
        if meeting.attendees or meeting.action_items:
            return "ai_processing"
        else:
            return "transcription_complete"
    else:
        return "downloading"

def _estimate_completion_time(meeting: Meeting) -> str:
    """Estimate completion time based on processing stage"""
    stage = _get_processing_stage(meeting)
    
    estimates = {
        "downloading": "2-5 minutes",
        "transcription_complete": "1-3 minutes",
        "ai_processing": "30-60 seconds"
    }
    
    return estimates.get(stage, "Unknown")

def _create_formatted_transcript_from_segments(transcript: str, segments: List[Dict]) -> str:
    """Create formatted transcript from raw transcript and segments"""
    if not segments:
        return transcript
    
    formatted_lines = []
    for segment in segments:
        speaker = segment.get("speaker", "Unknown")
        text = segment.get("text", "")
        start_time = segment.get("start", 0)
        
        # Format timestamp
        minutes = int(start_time // 60)
        seconds = int(start_time % 60)
        timestamp = f"{minutes:02d}:{seconds:02d}"
        
        formatted_lines.append(f"{speaker} [{timestamp}]: {text}")
    
    return "\n".join(formatted_lines)

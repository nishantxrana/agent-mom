import os
import json
import logging
import tempfile
from typing import Dict
from fastapi import APIRouter, Request, HTTPException, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Meeting, MeetingStatus
from ..auth import get_drive_service
from ..services.transcription import TranscriptionService
from ..services.ai_processor import AIProcessor

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhook", tags=["webhooks"])

# Initialize services
transcription_service = TranscriptionService()
ai_processor = AIProcessor()

@router.post("/drive")
async def handle_drive_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Handle Google Drive webhook notifications for new Meet recordings"""
    try:
        # Get request headers and body
        headers = dict(request.headers)
        body = await request.body()
        
        logger.info(f"Received Drive webhook: {headers}")
        
        # Verify webhook authenticity
        webhook_secret = os.getenv("WEBHOOK_SECRET")
        if webhook_secret:
            token = headers.get("x-goog-channel-token")
            if token != webhook_secret:
                raise HTTPException(status_code=401, detail="Invalid webhook token")
        
        # Parse webhook data
        resource_id = headers.get("x-goog-resource-id")
        resource_state = headers.get("x-goog-resource-state")
        changed_file_id = headers.get("x-goog-changed")
        
        logger.info(f"Webhook data - Resource ID: {resource_id}, State: {resource_state}, File ID: {changed_file_id}")
        
        # Only process 'sync' or 'update' events
        if resource_state not in ["sync", "update"]:
            return {"status": "ignored", "reason": f"State {resource_state} not processed"}
        
        # If we have a specific file ID, process it
        if changed_file_id:
            # Check if this is a video file (Meet recording)
            drive_service = get_drive_service()
            file_metadata = drive_service.files().get(
                fileId=changed_file_id,
                fields="id,name,mimeType,size,createdTime,parents"
            ).execute()
            
            # Check if it's a video file
            mime_type = file_metadata.get("mimeType", "")
            file_name = file_metadata.get("name", "")
            
            if not (mime_type.startswith("video/") or file_name.lower().endswith(('.mp4', '.mov', '.avi'))):
                return {"status": "ignored", "reason": "Not a video file"}
            
            # Check if it's likely a Meet recording (contains "Meet" or "Recording" in name)
            if not any(keyword in file_name.lower() for keyword in ["meet", "recording", "zoom", "teams"]):
                logger.info(f"File {file_name} doesn't appear to be a meeting recording")
                # Still process it, but with lower priority
            
            # Check if we already have this meeting
            existing_meeting = db.query(Meeting).filter(
                Meeting.google_drive_file_id == changed_file_id
            ).first()
            
            if existing_meeting:
                logger.info(f"Meeting {changed_file_id} already exists, skipping")
                return {"status": "already_exists", "meeting_id": existing_meeting.id}
            
            # Create new meeting record
            meeting = Meeting(
                google_drive_file_id=changed_file_id,
                title=file_name,
                status=MeetingStatus.PROCESSING
            )
            db.add(meeting)
            db.commit()
            db.refresh(meeting)
            
            # Process the meeting in the background
            background_tasks.add_task(
                process_meeting_recording,
                meeting.id,
                changed_file_id
            )
            
            logger.info(f"Started processing meeting {meeting.id} for file {changed_file_id}")
            
            return {
                "status": "processing",
                "meeting_id": meeting.id,
                "file_id": changed_file_id
            }
        
        return {"status": "no_file_id"}
        
    except Exception as e:
        logger.error(f"Error handling Drive webhook: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/process/{file_id}")
async def manual_process_file(
    file_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Manually trigger processing of a Google Drive file"""
    try:
        # Check if meeting already exists
        existing_meeting = db.query(Meeting).filter(
            Meeting.google_drive_file_id == file_id
        ).first()
        
        if existing_meeting:
            if existing_meeting.status == MeetingStatus.PROCESSING:
                return {"status": "already_processing", "meeting_id": existing_meeting.id}
            else:
                # Reprocess existing meeting
                existing_meeting.status = MeetingStatus.PROCESSING
                existing_meeting.error_message = None
                db.commit()
                
                background_tasks.add_task(process_meeting_recording, existing_meeting.id, file_id)
                return {"status": "reprocessing", "meeting_id": existing_meeting.id}
        
        # Get file metadata
        drive_service = get_drive_service()
        file_metadata = drive_service.files().get(
            fileId=file_id,
            fields="id,name,mimeType,size,createdTime"
        ).execute()
        
        # Create new meeting record
        meeting = Meeting(
            google_drive_file_id=file_id,
            title=file_metadata.get("name", "Unknown Meeting"),
            status=MeetingStatus.PROCESSING
        )
        db.add(meeting)
        db.commit()
        db.refresh(meeting)
        
        # Process in background
        background_tasks.add_task(process_meeting_recording, meeting.id, file_id)
        
        return {"status": "processing", "meeting_id": meeting.id}
        
    except Exception as e:
        logger.error(f"Error manually processing file {file_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def process_meeting_recording(meeting_id: int, file_id: str):
    """Background task to process meeting recording"""
    from ..database import SessionLocal
    
    db = SessionLocal()
    try:
        # Get meeting record
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if not meeting:
            logger.error(f"Meeting {meeting_id} not found")
            return
        
        logger.info(f"Starting processing for meeting {meeting_id}, file {file_id}")
        
        # Step 1: Download file from Google Drive
        logger.info("Downloading file from Google Drive...")
        video_path = await download_drive_file(file_id)
        
        try:
            # Step 2: Transcribe and process audio
            logger.info("Processing audio and transcription...")
            transcription_result = transcription_service.process_meeting_recording(video_path)
            
            # Update meeting with transcription data
            meeting.raw_transcript = transcription_result["raw_transcript"]
            meeting.speaker_diarization = {
                "segments": transcription_result["segments"],
                "speaker_count": transcription_result["speaker_count"],
                "total_duration": transcription_result["total_duration"]
            }
            db.commit()
            
            # Step 3: Extract insights using AI
            logger.info("Extracting meeting insights with AI...")
            ai_insights = ai_processor.extract_meeting_insights(
                transcription_result["formatted_transcript"],
                transcription_result["segments"]
            )
            
            # Update meeting with AI insights
            meeting.title = ai_insights.get("meeting_title", meeting.title)
            meeting.attendees = ai_insights.get("attendees", [])
            meeting.agenda_items = ai_insights.get("agenda_items", [])
            meeting.discussion_summary = ai_insights.get("discussion_summary", "")
            meeting.decisions_made = ai_insights.get("decisions_made", [])
            meeting.action_items = ai_insights.get("action_items", [])
            meeting.duration = transcription_result["total_duration"] // 60  # Convert to minutes
            
            # Mark as draft ready
            meeting.status = MeetingStatus.DRAFT_READY
            meeting.error_message = None
            
            db.commit()
            
            logger.info(f"Successfully processed meeting {meeting_id}")
            
        finally:
            # Clean up downloaded file
            try:
                os.remove(video_path)
            except:
                pass
        
    except Exception as e:
        logger.error(f"Error processing meeting {meeting_id}: {e}")
        
        # Update meeting with error
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if meeting:
            meeting.status = MeetingStatus.ERROR
            meeting.error_message = str(e)
            db.commit()
    
    finally:
        db.close()

async def download_drive_file(file_id: str) -> str:
    """Download file from Google Drive to temporary location"""
    try:
        drive_service = get_drive_service()
        
        # Get file metadata
        file_metadata = drive_service.files().get(fileId=file_id).execute()
        file_name = file_metadata.get("name", "meeting_recording.mp4")
        
        # Download file content
        file_content = drive_service.files().get_media(fileId=file_id).execute()
        
        # Save to temporary file
        temp_dir = tempfile.gettempdir()
        temp_path = os.path.join(temp_dir, f"meeting_{file_id}_{file_name}")
        
        with open(temp_path, "wb") as f:
            f.write(file_content)
        
        logger.info(f"Downloaded file {file_id} to {temp_path}")
        return temp_path
        
    except Exception as e:
        logger.error(f"Error downloading file {file_id}: {e}")
        raise

@router.get("/status/{meeting_id}")
async def get_processing_status(meeting_id: int, db: Session = Depends(get_db)):
    """Get processing status of a meeting"""
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    return {
        "meeting_id": meeting.id,
        "status": meeting.status.value,
        "title": meeting.title,
        "error_message": meeting.error_message,
        "created_at": meeting.created_at.isoformat() if meeting.created_at else None,
        "updated_at": meeting.updated_at.isoformat() if meeting.updated_at else None
    }

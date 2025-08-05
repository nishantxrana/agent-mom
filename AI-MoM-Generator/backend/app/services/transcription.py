import os
import tempfile
import logging
from typing import Dict, List, Tuple
import openai
import torch
from pyannote.audio import Pipeline
import ffmpeg
from datetime import timedelta

logger = logging.getLogger(__name__)

class TranscriptionService:
    def __init__(self):
        self.openai_client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        # Initialize speaker diarization pipeline
        try:
            self.diarization_pipeline = Pipeline.from_pretrained(
                "pyannote/speaker-diarization-3.1",
                use_auth_token=os.getenv("HUGGINGFACE_TOKEN")  # Optional: for better models
            )
        except Exception as e:
            logger.warning(f"Could not load diarization pipeline: {e}")
            self.diarization_pipeline = None
    
    def extract_audio_from_video(self, video_path: str) -> str:
        """Extract audio from video file using ffmpeg"""
        try:
            audio_path = video_path.replace('.mp4', '.wav')
            
            (
                ffmpeg
                .input(video_path)
                .output(audio_path, acodec='pcm_s16le', ac=1, ar='16000')
                .overwrite_output()
                .run(quiet=True)
            )
            
            return audio_path
        except Exception as e:
            logger.error(f"Error extracting audio: {e}")
            raise
    
    def transcribe_audio(self, audio_path: str) -> Dict:
        """Transcribe audio using OpenAI Whisper API"""
        try:
            with open(audio_path, 'rb') as audio_file:
                transcript = self.openai_client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    response_format="verbose_json",
                    timestamp_granularities=["segment"]
                )
            
            return {
                "text": transcript.text,
                "segments": transcript.segments if hasattr(transcript, 'segments') else [],
                "language": transcript.language if hasattr(transcript, 'language') else "en"
            }
        except Exception as e:
            logger.error(f"Error transcribing audio: {e}")
            raise
    
    def perform_speaker_diarization(self, audio_path: str) -> List[Dict]:
        """Perform speaker diarization using pyannote.audio"""
        if not self.diarization_pipeline:
            logger.warning("Diarization pipeline not available, skipping speaker diarization")
            return []
        
        try:
            # Apply diarization
            diarization = self.diarization_pipeline(audio_path)
            
            # Convert to list of segments
            segments = []
            for turn, _, speaker in diarization.itertracks(yield_label=True):
                segments.append({
                    "start": turn.start,
                    "end": turn.end,
                    "speaker": speaker,
                    "duration": turn.end - turn.start
                })
            
            return segments
        except Exception as e:
            logger.error(f"Error in speaker diarization: {e}")
            return []
    
    def merge_transcript_with_speakers(
        self, 
        transcript_segments: List[Dict], 
        speaker_segments: List[Dict]
    ) -> List[Dict]:
        """Merge transcript segments with speaker information"""
        if not speaker_segments:
            # If no speaker diarization, assign generic speakers
            return [
                {
                    "start": seg.get("start", 0),
                    "end": seg.get("end", 0),
                    "text": seg.get("text", ""),
                    "speaker": "Speaker_1"
                }
                for seg in transcript_segments
            ]
        
        merged_segments = []
        
        for transcript_seg in transcript_segments:
            transcript_start = transcript_seg.get("start", 0)
            transcript_end = transcript_seg.get("end", 0)
            transcript_text = transcript_seg.get("text", "")
            
            # Find overlapping speaker segment
            best_speaker = "Unknown"
            max_overlap = 0
            
            for speaker_seg in speaker_segments:
                speaker_start = speaker_seg["start"]
                speaker_end = speaker_seg["end"]
                
                # Calculate overlap
                overlap_start = max(transcript_start, speaker_start)
                overlap_end = min(transcript_end, speaker_end)
                overlap_duration = max(0, overlap_end - overlap_start)
                
                if overlap_duration > max_overlap:
                    max_overlap = overlap_duration
                    best_speaker = speaker_seg["speaker"]
            
            merged_segments.append({
                "start": transcript_start,
                "end": transcript_end,
                "text": transcript_text,
                "speaker": best_speaker,
                "duration": transcript_end - transcript_start
            })
        
        return merged_segments
    
    def format_timestamp(self, seconds: float) -> str:
        """Format seconds to MM:SS format"""
        td = timedelta(seconds=seconds)
        total_seconds = int(td.total_seconds())
        minutes = total_seconds // 60
        seconds = total_seconds % 60
        return f"{minutes:02d}:{seconds:02d}"
    
    def process_meeting_recording(self, video_path: str) -> Dict:
        """Complete processing pipeline for meeting recording"""
        try:
            logger.info(f"Starting transcription process for {video_path}")
            
            # Step 1: Extract audio from video
            logger.info("Extracting audio from video...")
            audio_path = self.extract_audio_from_video(video_path)
            
            # Step 2: Transcribe audio
            logger.info("Transcribing audio...")
            transcript_result = self.transcribe_audio(audio_path)
            
            # Step 3: Perform speaker diarization
            logger.info("Performing speaker diarization...")
            speaker_segments = self.perform_speaker_diarization(audio_path)
            
            # Step 4: Merge transcript with speaker information
            logger.info("Merging transcript with speaker information...")
            merged_segments = self.merge_transcript_with_speakers(
                transcript_result.get("segments", []),
                speaker_segments
            )
            
            # Step 5: Create formatted transcript
            formatted_transcript = self.create_formatted_transcript(merged_segments)
            
            # Cleanup temporary audio file
            try:
                os.remove(audio_path)
            except:
                pass
            
            return {
                "raw_transcript": transcript_result["text"],
                "language": transcript_result.get("language", "en"),
                "segments": merged_segments,
                "formatted_transcript": formatted_transcript,
                "speaker_count": len(set(seg["speaker"] for seg in merged_segments)),
                "total_duration": max(seg["end"] for seg in merged_segments) if merged_segments else 0
            }
            
        except Exception as e:
            logger.error(f"Error processing meeting recording: {e}")
            raise
    
    def create_formatted_transcript(self, segments: List[Dict]) -> str:
        """Create a formatted transcript with timestamps and speakers"""
        formatted_lines = []
        current_speaker = None
        current_text = []
        
        for segment in segments:
            speaker = segment["speaker"]
            text = segment["text"].strip()
            timestamp = self.format_timestamp(segment["start"])
            
            if speaker != current_speaker:
                # Save previous speaker's text
                if current_speaker and current_text:
                    formatted_lines.append(f"{current_speaker}: {' '.join(current_text)}")
                
                # Start new speaker section
                current_speaker = speaker
                current_text = [f"[{timestamp}] {text}"]
            else:
                # Continue with same speaker
                current_text.append(text)
        
        # Add final speaker's text
        if current_speaker and current_text:
            formatted_lines.append(f"{current_speaker}: {' '.join(current_text)}")
        
        return "\n\n".join(formatted_lines)

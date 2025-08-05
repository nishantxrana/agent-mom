import os
import json
import logging
from typing import Dict, List
import openai
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class AIProcessor:
    def __init__(self):
        self.openai_client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    
    def extract_meeting_insights(self, formatted_transcript: str, segments: List[Dict]) -> Dict:
        """Extract structured meeting insights using GPT-4"""
        try:
            # Prepare the prompt
            prompt = self._create_analysis_prompt(formatted_transcript, segments)
            
            # Call GPT-4 Turbo
            response = self.openai_client.chat.completions.create(
                model="gpt-4-turbo-preview",
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert meeting analyst. Extract structured information from meeting transcripts and provide detailed, actionable meeting minutes."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.3,
                max_tokens=4000
            )
            
            # Parse the response
            content = response.choices[0].message.content
            return self._parse_gpt_response(content)
            
        except Exception as e:
            logger.error(f"Error extracting meeting insights: {e}")
            raise
    
    def _create_analysis_prompt(self, transcript: str, segments: List[Dict]) -> str:
        """Create a comprehensive prompt for GPT-4 analysis"""
        
        # Calculate meeting duration
        total_duration = max(seg["end"] for seg in segments) if segments else 0
        duration_str = f"{int(total_duration // 60)}:{int(total_duration % 60):02d}"
        
        # Get unique speakers
        speakers = list(set(seg["speaker"] for seg in segments))
        
        prompt = f"""
Please analyze the following meeting transcript and extract comprehensive, detailed information. The meeting lasted {duration_str} and had {len(speakers)} participants.

TRANSCRIPT:
{transcript}

Please provide a detailed JSON response with the following structure:

{{
    "meeting_title": "Generate a descriptive, professional title based on the main topics and purpose discussed",
    "meeting_context": {{
        "meeting_type": "Classify as: Planning, Review, Brainstorming, Status Update, Decision Making, Training, etc.",
        "main_objective": "What was the primary purpose of this meeting?",
        "urgency_level": "Low, Medium, High based on tone and content"
    }},
    "attendees": [
        {{
            "name": "If person introduced themselves clearly, use their actual name. Otherwise use 'Speaker_1', 'Speaker_2', etc.",
            "role": "Infer role/title from context if mentioned (e.g., 'Product Manager', 'Developer', 'Designer'), otherwise 'Participant'",
            "email": "Only if explicitly mentioned in the transcript, otherwise null",
            "key_contributions": "Summarize what this person contributed to the meeting - their main points, suggestions, or expertise shared"
        }}
    ],
    "agenda_items": [
        {{
            "title": "Clear, descriptive title for this discussion topic",
            "description": "Detailed description of what was discussed, including key points and context",
            "timestamp": "MM:SS when this topic started being discussed",
            "duration": "Estimate how long this topic was discussed (e.g., '5 minutes')",
            "participants": ["List speakers who were actively involved in this specific discussion"],
            "outcome": "What was concluded, decided, or resolved for this topic"
        }}
    ],
    "discussion_summary": "Provide a comprehensive 4-5 paragraph summary covering: 1) Meeting opening, introductions, and context setting, 2) Main discussion topics and different viewpoints presented, 3) Key debates, concerns, or challenges raised, 4) Problem-solving approaches and solutions proposed, 5) How the meeting concluded and next steps outlined. Include specific details and quotes where relevant.",
    "decisions_made": [
        {{
            "decision": "Clear, specific statement of what was decided",
            "rationale": "Detailed explanation of why this decision was made, including factors considered",
            "impact": "What this decision affects, changes, or enables",
            "decision_maker": "Who made or approved this decision (use speaker name or 'Team consensus')",
            "confidence_level": "High, Medium, Low - how certain or final was this decision",
            "implementation_timeline": "When this should be implemented if discussed",
            "timestamp": "MM:SS when this decision was made"
        }}
    ],
    "action_items": [
        {{
            "task": "Specific, actionable task description with clear deliverables",
            "owner": "Person responsible (use actual name if mentioned, otherwise 'Speaker_X')",
            "deadline": "Specific date if mentioned (YYYY-MM-DD format), otherwise 'TBD'",
            "priority": "High, Medium, Low based on urgency and importance discussed",
            "dependencies": "What needs to happen before this task can be completed",
            "success_criteria": "How completion will be measured or what defines success",
            "estimated_effort": "Time or effort estimate if discussed",
            "timestamp": "MM:SS when this action item was assigned"
        }}
    ],
    "key_insights": [
        {{
            "insight": "Important observation, pattern, or realization that emerged",
            "category": "Risk, Opportunity, Concern, Trend, Best Practice, etc.",
            "supporting_evidence": "Specific quotes or examples from the transcript that support this insight"
        }}
    ],
    "follow_up_needed": [
        {{
            "item": "What specifically needs follow-up",
            "reason": "Why follow-up is necessary",
            "suggested_timeline": "When to follow up",
            "responsible_party": "Who should handle the follow-up"
        }}
    ],
    "meeting_effectiveness": {{
        "clarity_score": "1-10 rating of how clear and focused discussions were",
        "participation_balance": "Assessment of whether all attendees were engaged equally",
        "time_management": "How effectively was meeting time used",
        "outcome_achievement": "Did the meeting achieve its stated or implied objectives"
    }},
    "attendee_guidance": {{
        "names_identified": "true if attendee names were clearly mentioned, false if using Speaker_X format",
        "improvement_suggestions": "If names weren't identified, provide specific guidance for future meetings to get better AI analysis"
    }},
    "key_metrics": {{
        "total_speakers": {len(speakers)},
        "meeting_duration_minutes": {int(total_duration // 60)},
        "topics_covered": "Number of distinct topics discussed",
        "decisions_count": "Number of decisions made",
        "action_items_count": "Number of action items assigned"
    }}
}}

IMPORTANT ANALYSIS GUIDELINES:
1. Be extremely detailed and specific in all descriptions
2. Extract actual quotes and specific examples where possible
3. If attendee names aren't clearly mentioned, use Speaker_1, Speaker_2, etc. and note this in attendee_guidance
4. Provide timestamps based on context clues and flow of conversation
5. Focus on actionable insights and concrete outcomes
6. Be objective and professional in tone
7. If information is unclear or missing, indicate this rather than making assumptions
8. Pay special attention to tone, urgency, and emotional context
9. Identify both explicit and implicit decisions or agreements
10. Look for patterns in communication and participation"""
        "duration_minutes": {int(total_duration // 60)},
        "action_items_count": "number of action items",
        "decisions_count": "number of decisions"
    }},
    "next_steps": [
        "List of immediate next steps or follow-up actions needed"
    ],
    "parking_lot": [
        "Items mentioned but not resolved, to be addressed later"
    ]
}}

IMPORTANT GUIDELINES:
1. Be specific and actionable in all extracted information
2. Use actual timestamps from the transcript when available
3. Infer speaker names from context when possible (e.g., if someone says "Hi, I'm John")
4. For action items, be very specific about what needs to be done
5. Include context and background in the discussion summary
6. If information is not available, use appropriate defaults (null, "TBD", etc.)
7. Ensure all JSON is properly formatted and valid
8. Focus on business value and actionable outcomes

Respond ONLY with the JSON object, no additional text.
"""
        return prompt
    
    def _parse_gpt_response(self, content: str) -> Dict:
        """Parse and validate GPT-4 response"""
        try:
            # Try to extract JSON from the response
            content = content.strip()
            
            # Remove any markdown code blocks
            if content.startswith("```json"):
                content = content[7:]
            if content.startswith("```"):
                content = content[3:]
            if content.endswith("```"):
                content = content[:-3]
            
            # Parse JSON
            parsed_data = json.loads(content)
            
            # Validate and set defaults for required fields
            validated_data = {
                "meeting_title": parsed_data.get("meeting_title", "Meeting Minutes"),
                "attendees": parsed_data.get("attendees", []),
                "agenda_items": parsed_data.get("agenda_items", []),
                "discussion_summary": parsed_data.get("discussion_summary", ""),
                "decisions_made": parsed_data.get("decisions_made", []),
                "action_items": parsed_data.get("action_items", []),
                "key_metrics": parsed_data.get("key_metrics", {}),
                "next_steps": parsed_data.get("next_steps", []),
                "parking_lot": parsed_data.get("parking_lot", [])
            }
            
            # Validate action items structure
            for item in validated_data["action_items"]:
                if "task" not in item:
                    item["task"] = "Task description missing"
                if "owner" not in item:
                    item["owner"] = "TBD"
                if "deadline" not in item:
                    item["deadline"] = "TBD"
                if "priority" not in item:
                    item["priority"] = "Medium"
                if "status" not in item:
                    item["status"] = "Assigned"
            
            # Validate attendees structure
            for attendee in validated_data["attendees"]:
                if "name" not in attendee:
                    attendee["name"] = "Unknown"
                if "role" not in attendee:
                    attendee["role"] = None
                if "email" not in attendee:
                    attendee["email"] = None
            
            return validated_data
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse GPT response as JSON: {e}")
            logger.error(f"Response content: {content}")
            
            # Return a basic structure if parsing fails
            return {
                "meeting_title": "Meeting Minutes",
                "attendees": [],
                "agenda_items": [],
                "discussion_summary": "Failed to process meeting content automatically.",
                "decisions_made": [],
                "action_items": [],
                "key_metrics": {},
                "next_steps": [],
                "parking_lot": []
            }
        except Exception as e:
            logger.error(f"Error parsing GPT response: {e}")
            raise
    
    def enhance_meeting_data(self, meeting_data: Dict, additional_context: Dict = None) -> Dict:
        """Enhance meeting data with additional context and formatting"""
        try:
            # Add metadata
            meeting_data["generated_at"] = datetime.utcnow().isoformat()
            meeting_data["ai_confidence"] = "high"  # Could be calculated based on response quality
            
            # Add additional context if provided
            if additional_context:
                meeting_data.update(additional_context)
            
            # Format deadlines
            for action_item in meeting_data.get("action_items", []):
                if action_item.get("deadline") and action_item["deadline"] != "TBD":
                    try:
                        # Try to parse and format deadline
                        deadline = datetime.fromisoformat(action_item["deadline"])
                        action_item["deadline_formatted"] = deadline.strftime("%B %d, %Y")
                    except:
                        action_item["deadline_formatted"] = action_item["deadline"]
            
            return meeting_data
            
        except Exception as e:
            logger.error(f"Error enhancing meeting data: {e}")
            return meeting_data
    
    def generate_meeting_summary_email(self, meeting_data: Dict) -> str:
        """Generate a formatted email summary"""
        try:
            prompt = f"""
Create a professional email summary for the following meeting data. The email should be well-formatted, concise, and actionable.

MEETING DATA:
{json.dumps(meeting_data, indent=2)}

Please create an HTML email with the following structure:
1. Professional subject line
2. Brief meeting overview
3. Key decisions made
4. Action items with owners and deadlines
5. Next steps
6. Professional closing

The email should be ready to send to meeting participants and stakeholders.
Format it as clean HTML that will render well in email clients.
"""
            
            response = self.openai_client.chat.completions.create(
                model="gpt-4-turbo-preview",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a professional executive assistant creating meeting summaries. Create clear, actionable, and well-formatted email content."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.2,
                max_tokens=2000
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"Error generating email summary: {e}")
            return self._create_fallback_email(meeting_data)
    
    def _create_fallback_email(self, meeting_data: Dict) -> str:
        """Create a basic email template if AI generation fails"""
        title = meeting_data.get("meeting_title", "Meeting Minutes")
        summary = meeting_data.get("discussion_summary", "Meeting summary not available.")
        action_items = meeting_data.get("action_items", [])
        
        html = f"""
        <html>
        <body>
            <h2>{title}</h2>
            <p><strong>Date:</strong> {datetime.now().strftime('%B %d, %Y')}</p>
            
            <h3>Meeting Summary</h3>
            <p>{summary}</p>
            
            <h3>Action Items</h3>
            <ul>
        """
        
        for item in action_items:
            html += f"<li><strong>{item.get('task', 'Task')}</strong> - Owner: {item.get('owner', 'TBD')}, Deadline: {item.get('deadline', 'TBD')}</li>"
        
        html += """
            </ul>
            
            <p>Best regards,<br>AI Meeting Assistant</p>
        </body>
        </html>
        """
        
        return html

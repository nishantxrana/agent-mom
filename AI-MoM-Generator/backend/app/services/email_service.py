import os
import logging
from typing import List, Dict
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content
import smtplib
from email.mime.text import MimeText
from email.mime.multipart import MimeMultipart

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.sendgrid_api_key = os.getenv("SENDGRID_API_KEY")
        self.from_email = os.getenv("FROM_EMAIL", "noreply@example.com")
        self.use_sendgrid = bool(self.sendgrid_api_key)
        
        if self.use_sendgrid:
            self.sg = SendGridAPIClient(api_key=self.sendgrid_api_key)
        else:
            # Fallback to SMTP
            self.smtp_server = os.getenv("SMTP_SERVER", "localhost")
            self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
            self.smtp_username = os.getenv("SMTP_USERNAME")
            self.smtp_password = os.getenv("SMTP_PASSWORD")
    
    def send_meeting_minutes(
        self, 
        recipients: List[str], 
        subject: str, 
        html_content: str,
        meeting_data: Dict = None
    ) -> bool:
        """Send meeting minutes email to recipients"""
        try:
            if self.use_sendgrid:
                return self._send_via_sendgrid(recipients, subject, html_content)
            else:
                return self._send_via_smtp(recipients, subject, html_content)
        except Exception as e:
            logger.error(f"Error sending email: {e}")
            return False
    
    def _send_via_sendgrid(self, recipients: List[str], subject: str, html_content: str) -> bool:
        """Send email using SendGrid"""
        try:
            # Create recipient list
            to_emails = [To(email) for email in recipients]
            
            # Create mail object
            mail = Mail(
                from_email=Email(self.from_email),
                to_emails=to_emails,
                subject=subject,
                html_content=Content("text/html", html_content)
            )
            
            # Send email
            response = self.sg.send(mail)
            
            if response.status_code in [200, 201, 202]:
                logger.info(f"Email sent successfully to {len(recipients)} recipients")
                return True
            else:
                logger.error(f"SendGrid error: {response.status_code} - {response.body}")
                return False
                
        except Exception as e:
            logger.error(f"SendGrid error: {e}")
            return False
    
    def _send_via_smtp(self, recipients: List[str], subject: str, html_content: str) -> bool:
        """Send email using SMTP (fallback)"""
        try:
            # Create message
            msg = MimeMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = self.from_email
            msg['To'] = ', '.join(recipients)
            
            # Add HTML content
            html_part = MimeText(html_content, 'html')
            msg.attach(html_part)
            
            # Send email
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                if self.smtp_username and self.smtp_password:
                    server.starttls()
                    server.login(self.smtp_username, self.smtp_password)
                
                server.send_message(msg)
            
            logger.info(f"Email sent successfully via SMTP to {len(recipients)} recipients")
            return True
            
        except Exception as e:
            logger.error(f"SMTP error: {e}")
            return False
    
    def extract_email_addresses(self, meeting_data: Dict) -> List[str]:
        """Extract email addresses from meeting data"""
        emails = []
        
        # Extract from attendees
        attendees = meeting_data.get("attendees", [])
        for attendee in attendees:
            email = attendee.get("email")
            if email and self._is_valid_email(email):
                emails.append(email)
        
        # Extract from action item owners (if they have email format)
        action_items = meeting_data.get("action_items", [])
        for item in action_items:
            owner = item.get("owner", "")
            if self._is_valid_email(owner):
                emails.append(owner)
        
        # Remove duplicates
        return list(set(emails))
    
    def _is_valid_email(self, email: str) -> bool:
        """Basic email validation"""
        if not email or not isinstance(email, str):
            return False
        return "@" in email and "." in email.split("@")[-1]
    
    def create_meeting_minutes_html(self, meeting_data: Dict) -> str:
        """Create HTML email template for meeting minutes"""
        title = meeting_data.get("meeting_title", "Meeting Minutes")
        summary = meeting_data.get("discussion_summary", "")
        attendees = meeting_data.get("attendees", [])
        agenda_items = meeting_data.get("agenda_items", [])
        decisions = meeting_data.get("decisions_made", [])
        action_items = meeting_data.get("action_items", [])
        next_steps = meeting_data.get("next_steps", [])
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>{title}</title>
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .header {{
                    background-color: #f8f9fa;
                    padding: 20px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                }}
                .section {{
                    margin-bottom: 25px;
                }}
                .section h3 {{
                    color: #2c3e50;
                    border-bottom: 2px solid #3498db;
                    padding-bottom: 5px;
                }}
                .attendee-list, .agenda-list, .decision-list, .action-list {{
                    background-color: #f8f9fa;
                    padding: 15px;
                    border-radius: 5px;
                    margin: 10px 0;
                }}
                .action-item {{
                    background-color: #fff3cd;
                    border-left: 4px solid #ffc107;
                    padding: 10px;
                    margin: 10px 0;
                }}
                .decision-item {{
                    background-color: #d1ecf1;
                    border-left: 4px solid #17a2b8;
                    padding: 10px;
                    margin: 10px 0;
                }}
                .priority-high {{ border-left-color: #dc3545; }}
                .priority-medium {{ border-left-color: #ffc107; }}
                .priority-low {{ border-left-color: #28a745; }}
                .footer {{
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #dee2e6;
                    font-size: 0.9em;
                    color: #6c757d;
                }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>{title}</h1>
                <p><strong>Generated:</strong> {meeting_data.get('generated_at', 'N/A')}</p>
                <p><strong>Duration:</strong> {meeting_data.get('key_metrics', {}).get('duration_minutes', 'N/A')} minutes</p>
            </div>
        """
        
        # Attendees section
        if attendees:
            html += """
            <div class="section">
                <h3>📋 Attendees</h3>
                <div class="attendee-list">
            """
            for attendee in attendees:
                name = attendee.get("name", "Unknown")
                role = attendee.get("role", "")
                role_text = f" ({role})" if role else ""
                html += f"<p>• {name}{role_text}</p>"
            html += "</div></div>"
        
        # Summary section
        if summary:
            html += f"""
            <div class="section">
                <h3>📝 Discussion Summary</h3>
                <p>{summary}</p>
            </div>
            """
        
        # Agenda items
        if agenda_items:
            html += """
            <div class="section">
                <h3>📅 Agenda Items</h3>
                <div class="agenda-list">
            """
            for item in agenda_items:
                title_text = item.get("title", "Agenda Item")
                description = item.get("description", "")
                timestamp = item.get("timestamp", "")
                timestamp_text = f" [{timestamp}]" if timestamp else ""
                html += f"<p><strong>{title_text}</strong>{timestamp_text}</p>"
                if description:
                    html += f"<p style='margin-left: 20px; color: #666;'>{description}</p>"
            html += "</div></div>"
        
        # Decisions made
        if decisions:
            html += """
            <div class="section">
                <h3>✅ Decisions Made</h3>
            """
            for decision in decisions:
                decision_text = decision.get("decision", "Decision")
                rationale = decision.get("rationale", "")
                timestamp = decision.get("timestamp", "")
                timestamp_text = f" [{timestamp}]" if timestamp else ""
                
                html += f"""
                <div class="decision-item">
                    <p><strong>{decision_text}</strong>{timestamp_text}</p>
                """
                if rationale:
                    html += f"<p><em>Rationale:</em> {rationale}</p>"
                html += "</div>"
            html += "</div>"
        
        # Action items
        if action_items:
            html += """
            <div class="section">
                <h3>🎯 Action Items</h3>
            """
            for item in action_items:
                task = item.get("task", "Task")
                owner = item.get("owner", "TBD")
                deadline = item.get("deadline", "TBD")
                priority = item.get("priority", "Medium").lower()
                
                html += f"""
                <div class="action-item priority-{priority}">
                    <p><strong>{task}</strong></p>
                    <p><strong>Owner:</strong> {owner} | <strong>Deadline:</strong> {deadline} | <strong>Priority:</strong> {priority.title()}</p>
                </div>
                """
            html += "</div>"
        
        # Next steps
        if next_steps:
            html += """
            <div class="section">
                <h3>🚀 Next Steps</h3>
                <ul>
            """
            for step in next_steps:
                html += f"<li>{step}</li>"
            html += "</ul></div>"
        
        # Footer
        html += """
            <div class="footer">
                <p>This meeting summary was automatically generated by AI-MoM-Generator.</p>
                <p>Please review and contact the meeting organizer if you have any questions or corrections.</p>
            </div>
        </body>
        </html>
        """
        
        return html
    
    def send_test_email(self, recipient: str) -> bool:
        """Send a test email to verify configuration"""
        try:
            subject = "AI-MoM-Generator Test Email"
            html_content = """
            <html>
            <body>
                <h2>Test Email</h2>
                <p>This is a test email from AI-MoM-Generator to verify email configuration.</p>
                <p>If you received this email, the email service is working correctly!</p>
            </body>
            </html>
            """
            
            return self.send_meeting_minutes([recipient], subject, html_content)
        except Exception as e:
            logger.error(f"Error sending test email: {e}")
            return False

"""Email service for sending notifications via SMTP."""
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending email notifications."""
    
    def __init__(self):
        self.smtp_server = getattr(settings, 'SMTP_SERVER', 'smtp.gmail.com')
        self.smtp_port = getattr(settings, 'SMTP_PORT', 587)
        self.sender_email = getattr(settings, 'SENDER_EMAIL', None)
        self.sender_password = getattr(settings, 'SENDER_PASSWORD', None)
    
    def _send_email(self, to_email: str, subject: str, body_html: str) -> bool:
        """Send an email using SMTP."""
        if not self.sender_email or not self.sender_password:
            logger.warning("Email not configured - skipping email send")
            return False
        
        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = self.sender_email
            msg['To'] = to_email
            
            html_part = MIMEText(body_html, 'html')
            msg.attach(html_part)
            
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.sender_email, self.sender_password)
                server.sendmail(self.sender_email, to_email, msg.as_string())
            
            logger.info(f"Email sent to {to_email}: {subject}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return False
    
    def send_verification_otp(self, email: str, name: str, otp: str) -> bool:
        """Send verification OTP email."""
        subject = "Verify Your Email - WhatsApp AI Assistant"
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Email Verification</h2>
            <p>Hello {name},</p>
            <p>Your verification code is:</p>
            <h1 style="color: #ed7a1c; font-size: 32px; letter-spacing: 5px;">{otp}</h1>
            <p>This code expires in 10 minutes.</p>
            <p>If you didn't request this, please ignore this email.</p>
        </body>
        </html>
        """
        return self._send_email(email, subject, body)
    
    def send_welcome_email(self, email: str, name: str) -> bool:
        """Send welcome email after verification."""
        subject = "Welcome to WhatsApp AI Assistant!"
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Welcome!</h2>
            <p>Hello {name},</p>
            <p>Your email has been verified. You can now log in to your account.</p>
            <p>Thank you for joining us!</p>
        </body>
        </html>
        """
        return self._send_email(email, subject, body)
    
    def send_password_reset_otp(self, email: str, name: str, otp: str) -> bool:
        """Send password reset OTP email."""
        subject = "Password Reset - WhatsApp AI Assistant"
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Password Reset</h2>
            <p>Hello {name},</p>
            <p>Your password reset code is:</p>
            <h1 style="color: #ed7a1c; font-size: 32px; letter-spacing: 5px;">{otp}</h1>
            <p>This code expires in 10 minutes.</p>
            <p>If you didn't request this, please ignore this email.</p>
        </body>
        </html>
        """
        return self._send_email(email, subject, body)
    
    def send_password_reset_confirmation(self, email: str, name: str) -> bool:
        """Send password reset confirmation email."""
        subject = "Password Changed - WhatsApp AI Assistant"
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Password Changed</h2>
            <p>Hello {name},</p>
            <p>Your password has been successfully changed.</p>
            <p>If you didn't make this change, please contact support immediately.</p>
        </body>
        </html>
        """
        return self._send_email(email, subject, body)
    
    def send_temp_password_email(self, email: str, name: str, temp_password: str) -> bool:
        """Send temporary password email for admin reset."""
        subject = "Your Temporary Password - WhatsApp AI Assistant"
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Password Reset by Admin</h2>
            <p>Hello {name},</p>
            <p>Your password has been reset by an administrator.</p>
            <p>Your temporary password is:</p>
            <h1 style="color: #ed7a1c; font-size: 24px;">{temp_password}</h1>
            <p>You will be required to change this password on your next login.</p>
        </body>
        </html>
        """
        return self._send_email(email, subject, body)
    
    def send_message_notification(self, phone: str, message: str, timestamp: str) -> bool:
        """Send notification about incoming WhatsApp message."""
        recipient = getattr(settings, 'RECIPIENT_EMAIL', None)
        if not recipient:
            logger.warning("No recipient email configured for message notifications")
            return False
        
        subject = f"New WhatsApp Message from {phone}"
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>New WhatsApp Message</h2>
            <p><strong>From:</strong> {phone}</p>
            <p><strong>Time:</strong> {timestamp}</p>
            <p><strong>Message:</strong></p>
            <p style="background: #f5f5f5; padding: 10px; border-radius: 5px;">{message}</p>
        </body>
        </html>
        """
        return self._send_email(recipient, subject, body)

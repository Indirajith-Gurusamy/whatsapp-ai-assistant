"""Email notification service."""
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

logger = logging.getLogger(__name__)


def get_verification_otp_email_html(name: str, otp: str) -> str:
    """Generate HTML for OTP verification email."""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .otp-box {{ background: white; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }}
            .otp-code {{ font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px; }}
            .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Welcome to WhatsApp AI Assistant!</h1>
            </div>
            <div class="content">
                <h2>Hi {name},</h2>
                <p>Thank you for signing up! Please use the following OTP to verify your email address:</p>
                <div class="otp-box">
                    <div class="otp-code">{otp}</div>
                </div>
                <p><strong>This OTP will expire in 5 minutes.</strong></p>
                <p>If you didn't create an account, you can safely ignore this email.</p>
            </div>
            <div class="footer">
                <p>&copy; 2026 WhatsApp AI Assistant. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """


def get_welcome_email_html(name: str) -> str:
    """Generate HTML for welcome email."""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 Email Verified!</h1>
            </div>
            <div class="content">
                <h2>Welcome aboard, {name}!</h2>
                <p>Your email has been successfully verified. You can now log in to your account and start using WhatsApp AI Assistant.</p>
                <p>Here's what you can do:</p>
                <ul>
                    <li>Manage WhatsApp conversations</li>
                    <li>View analytics and insights</li>
                    <li>Track customer interactions</li>
                </ul>
                <p>If you have any questions, feel free to reach out to our support team.</p>
            </div>
            <div class="footer">
                <p>&copy; 2026 WhatsApp AI Assistant. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """


def get_password_reset_otp_email_html(name: str, otp: str) -> str:
    """Generate HTML for password reset OTP email."""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .otp-box {{ background: white; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }}
            .otp-code {{ font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px; }}
            .warning {{ background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔐 Password Reset Request</h1>
            </div>
            <div class="content">
                <h2>Hi {name},</h2>
                <p>We received a request to reset your password. Please use the following OTP to proceed:</p>
                <div class="otp-box">
                    <div class="otp-code">{otp}</div>
                </div>
                <p><strong>This OTP will expire in 10 minutes.</strong></p>
                <div class="warning">
                    <strong>⚠️ Security Notice:</strong> If you didn't request a password reset, please ignore this email. Your account is safe.
                </div>
            </div>
            <div class="footer">
                <p>&copy; 2026 WhatsApp AI Assistant. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """


def get_password_reset_confirmation_email_html(name: str) -> str:
    """Generate HTML for password reset confirmation email."""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .info-box {{ background: #d1ecf1; border-left: 4px solid #0c5460; padding: 15px; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>✅ Password Reset Successful</h1>
            </div>
            <div class="content">
                <h2>Hi {name},</h2>
                <p>Your password has been successfully reset.</p>
                <div class="info-box">
                    <strong>🔒 Security Update:</strong> For your security, all active sessions have been logged out. You'll need to log in again with your new password.
                </div>
                <p>If you didn't make this change, please contact our support team immediately.</p>
                <p><strong>Security Tips:</strong></p>
                <ul>
                    <li>Use a unique password for this account</li>
                    <li>Enable two-factor authentication if available</li>
                    <li>Never share your password with anyone</li>
                </ul>
            </div>
            <div class="footer">
                <p>&copy; 2026 WhatsApp AI Assistant. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """


class EmailService:
    """Service for sending email notifications."""
    
    @staticmethod
    def send_message_notification(phone: str, message: str, timestamp: str) -> bool:
        """
        Send email notification for incoming WhatsApp message.
        
        Args:
            phone: Sender's WhatsApp phone number
            message: Message text
            timestamp: Message timestamp
            
        Returns:
            True if sent successfully, False otherwise
        """
        
        if not all([settings.SENDER_EMAIL, settings.SENDER_PASSWORD, settings.RECIPIENT_EMAIL]):
            logger.warning("Email credentials not configured")
            return False
        
        try:
            # Create email
            msg = MIMEMultipart()
            msg["From"] = settings.SENDER_EMAIL
            msg["To"] = settings.RECIPIENT_EMAIL
            msg["Subject"] = f"WhatsApp Message from +{phone}"
            
            # Email body
            body = f"""Phone: +{phone}
Timestamp: {timestamp}

user enquiry: {message}"""
            
            msg.attach(MIMEText(body, "plain"))
            
            # Send email
            with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT) as server:
                server.starttls()
                server.login(settings.SENDER_EMAIL, settings.SENDER_PASSWORD)
                server.send_message(msg)
            
            logger.info(f"Email sent for message from +{phone}")
            return True
        
        except Exception as e:
            logger.error(f"Failed to send email: {e}")
            return False
    
    @staticmethod
    def send_verification_otp(email: str, name: str, otp: str) -> bool:
        """
        Send OTP code for email verification.
        
        Args:
            email: User's email address
            name: User's name
            otp: 6-digit OTP code
            
        Returns:
            True if sent successfully, False otherwise
        """
        if not all([settings.SENDER_EMAIL, settings.SENDER_PASSWORD]):
            logger.warning("Email credentials not configured")
            return False
        
        try:
            # Create email
            msg = MIMEMultipart("alternative")
            msg["From"] = settings.SENDER_EMAIL
            msg["To"] = email
            msg["Subject"] = "Your Verification Code - WhatsApp AI Assistant"
            
            # HTML body
            html_body = get_verification_otp_email_html(name, otp)
            msg.attach(MIMEText(html_body, "html"))
            
            # Send email
            with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT) as server:
                server.starttls()
                server.login(settings.SENDER_EMAIL, settings.SENDER_PASSWORD)
                server.send_message(msg)
            
            logger.info(f"Verification OTP sent to {email}")
            return True
        
        except Exception as e:
            logger.error(f"Failed to send verification OTP: {e}")
            return False
    
    @staticmethod
    def send_welcome_email(email: str, name: str) -> bool:
        """
        Send welcome email after successful verification.
        
        Args:
            email: User's email address
            name: User's name
            
        Returns:
            True if sent successfully, False otherwise
        """
        if not all([settings.SENDER_EMAIL, settings.SENDER_PASSWORD]):
            logger.warning("Email credentials not configured")
            return False
        
        try:
            # Create email
            msg = MIMEMultipart("alternative")
            msg["From"] = settings.SENDER_EMAIL
            msg["To"] = email
            msg["Subject"] = "Welcome to WhatsApp AI Assistant!"
            
            # HTML body
            html_body = get_welcome_email_html(name)
            msg.attach(MIMEText(html_body, "html"))
            
            # Send email
            with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT) as server:
                server.starttls()
                server.login(settings.SENDER_EMAIL, settings.SENDER_PASSWORD)
                server.send_message(msg)
            
            logger.info(f"Welcome email sent to {email}")
            return True
        
        except Exception as e:
            logger.error(f"Failed to send welcome email: {e}")
            return False
    
    @staticmethod
    def send_password_reset_otp(email: str, name: str, otp: str) -> bool:
        """
        Send OTP code for password reset.
        
        Args:
            email: User's email address
            name: User's name
            otp: 6-digit OTP code
            
        Returns:
            True if sent successfully, False otherwise
        """
        if not all([settings.SENDER_EMAIL, settings.SENDER_PASSWORD]):
            logger.warning("Email credentials not configured")
            return False
        
        try:
            # Create email
            msg = MIMEMultipart("alternative")
            msg["From"] = settings.SENDER_EMAIL
            msg["To"] = email
            msg["Subject"] = "Password Reset Code - WhatsApp AI Assistant"
            
            # HTML body
            html_body = get_password_reset_otp_email_html(name, otp)
            msg.attach(MIMEText(html_body, "html"))
            
            # Send email
            with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT) as server:
                server.starttls()
                server.login(settings.SENDER_EMAIL, settings.SENDER_PASSWORD)
                server.send_message(msg)
            
            logger.info(f"Password reset OTP sent to {email}")
            return True
        
        except Exception as e:
            logger.error(f"Failed to send password reset OTP: {e}")
            return False
    
    @staticmethod
    def send_password_reset_confirmation(email: str, name: str) -> bool:
        """
        Send password reset confirmation email.
        
        Args:
            email: User's email address
            name: User's name
            
        Returns:
            True if sent successfully, False otherwise
        """
        if not all([settings.SENDER_EMAIL, settings.SENDER_PASSWORD]):
            logger.warning("Email credentials not configured")
            return False
        
        try:
            # Create email
            msg = MIMEMultipart("alternative")
            msg["From"] = settings.SENDER_EMAIL
            msg["To"] = email
            msg["Subject"] = "Password Reset Successful - WhatsApp AI Assistant"
            
            # HTML body
            html_body = get_password_reset_confirmation_email_html(name)
            msg.attach(MIMEText(html_body, "html"))
            
            # Send email
            with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT) as server:
                server.starttls()
                server.login(settings.SENDER_EMAIL, settings.SENDER_PASSWORD)
                server.send_message(msg)
            
            logger.info(f"Password reset confirmation sent to {email}")
            return True
        
        except Exception as e:
            logger.error(f"Failed to send password reset confirmation: {e}")
            return False


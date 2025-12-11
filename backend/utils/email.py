"""
Email Service - Send verification and password reset emails
Uses aiosmtplib for async email sending with Gmail SMTP
"""
import logging
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from config.settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


async def send_email(to_email: str, subject: str, html_content: str) -> bool:
    """
    Send an email using SMTP
    Returns True if successful, False otherwise
    """
    try:
        # Create message
        message = MIMEMultipart("alternative")
        message["From"] = f"Smart Traffic Detection <{settings.smtp_user}>"
        message["To"] = to_email
        message["Subject"] = subject
        
        # Attach HTML content
        html_part = MIMEText(html_content, "html")
        message.attach(html_part)
        
        # Send email
        await aiosmtplib.send(
            message,
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.smtp_user,
            password=settings.smtp_password,
            start_tls=True
        )
        
        logger.info(f"✉️ Email sent successfully to {to_email}")
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to send email to {to_email}: {e}")
        return False


async def send_verification_email(email: str, token: str, username: str) -> bool:
    """Send email verification link"""
    
    verification_url = f"{settings.frontend_url}/verify-email?token={token}"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: 'Arial', sans-serif; background: #f5f5f5; padding: 20px; }}
            .container {{ max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; padding: 40px; }}
            .header {{ text-align: center; color: #3498db; }}
            .button {{ display: inline-block; background: linear-gradient(135deg, #2ecc71, #3498db); color: white !important; 
                       padding: 15px 30px; text-decoration: none; border-radius: 25px; margin: 20px 0; }}
            .footer {{ text-align: center; color: #888; font-size: 12px; margin-top: 30px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1 class="header">🚦 Welcome to Smart Traffic Detection!</h1>
            <p>Hi <strong>{username}</strong>,</p>
            <p>Thanks for signing up! Please verify your email address to activate your account.</p>
            <p style="text-align: center;">
                <a href="{verification_url}" class="button">✅ Verify My Email</a>
            </p>
            <p>Or copy this link: <br><code>{verification_url}</code></p>
            <p>This link expires in <strong>24 hours</strong>.</p>
            <div class="footer">
                <p>If you didn't create this account, you can safely ignore this email.</p>
                <p>© 2024 Smart Traffic Detection System</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return await send_email(email, "✅ Verify your email - Smart Traffic Detection", html_content)


async def send_password_reset_email(email: str, token: str, username: str) -> bool:
    """Send password reset link"""
    
    reset_url = f"{settings.frontend_url}/reset-password?token={token}"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: 'Arial', sans-serif; background: #f5f5f5; padding: 20px; }}
            .container {{ max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; padding: 40px; }}
            .header {{ text-align: center; color: #e74c3c; }}
            .button {{ display: inline-block; background: linear-gradient(135deg, #e74c3c, #c0392b); color: white !important; 
                       padding: 15px 30px; text-decoration: none; border-radius: 25px; margin: 20px 0; }}
            .footer {{ text-align: center; color: #888; font-size: 12px; margin-top: 30px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1 class="header">🔐 Password Reset Request</h1>
            <p>Hi <strong>{username}</strong>,</p>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <p style="text-align: center;">
                <a href="{reset_url}" class="button">🔑 Reset My Password</a>
            </p>
            <p>Or copy this link: <br><code>{reset_url}</code></p>
            <p>This link expires in <strong>1 hour</strong>.</p>
            <div class="footer">
                <p>If you didn't request this, please ignore this email. Your password will remain unchanged.</p>
                <p>© 2024 Smart Traffic Detection System</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return await send_email(email, "🔐 Password Reset - Smart Traffic Detection", html_content)

"""
Simple SMTP email sender for transactional notifications.
Configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS environment secrets
to enable email delivery.
"""
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)


def send_email(to: str, subject: str, html: str, text: Optional[str] = None) -> bool:
    """Send an email. Returns True on success, False if SMTP is unconfigured or fails."""
    if not settings.SMTP_HOST or not settings.SMTP_USER:
        logger.info("SMTP not configured — skipping email to %s: %s", to, subject)
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.SMTP_FROM
        msg["To"] = to

        if text:
            msg.attach(MIMEText(text, "plain"))
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASS)
            server.sendmail(settings.SMTP_FROM, [to], msg.as_string())

        logger.info("Email sent to %s: %s", to, subject)
        return True
    except Exception as exc:
        logger.error("Failed to send email to %s: %s", to, exc)
        return False


def send_partner_signup_notification(partner_email: str, partner_name: str, new_user_email: str) -> None:
    """Notify a partner when someone signs up through their referral link."""
    subject = "🎉 New signup through your Sure Odds link!"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:12px;">
      <div style="text-align:center;margin-bottom:24px;">
        <h1 style="color:#ef4444;font-size:24px;margin:0;">Sure Odds</h1>
        <p style="color:#94a3b8;font-size:12px;margin:4px 0 0;">AI-Powered Football Predictions</p>
      </div>
      <h2 style="color:#ffffff;font-size:20px;">New referral signup! 🔥</h2>
      <p style="color:#94a3b8;line-height:1.6;">
        Hi <strong style="color:#ffffff;">{partner_name}</strong>,<br><br>
        Great news — someone just signed up through your Sure Odds partner link!
      </p>
      <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:16px;margin:20px 0;">
        <p style="margin:0;color:#94a3b8;font-size:14px;">New user: <strong style="color:#ffffff;">{new_user_email}</strong></p>
      </div>
      <p style="color:#94a3b8;line-height:1.6;font-size:14px;">
        When they purchase a pick package, you'll earn 30% commission automatically.
        Log in to your partner dashboard to track your referrals and earnings.
      </p>
      <div style="text-align:center;margin-top:24px;">
        <a href="https://sureodds.pro/partner-dashboard"
           style="background:#ef4444;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:bold;font-size:14px;display:inline-block;">
          View Partner Dashboard
        </a>
      </div>
      <hr style="border:none;border-top:1px solid #334155;margin:28px 0;">
      <p style="color:#475569;font-size:12px;text-align:center;">
        Sure Odds · Calea Floreasca 169A, Sector 1, 014459 Bucharest, Romania<br>
        <a href="mailto:info@sureodds.pro" style="color:#ef4444;">info@sureodds.pro</a>
      </p>
    </div>
    """
    text = f"Hi {partner_name}, someone signed up through your Sure Odds link: {new_user_email}. Visit https://sureodds.pro/partner-dashboard to see your stats."
    send_email(partner_email, subject, html, text)

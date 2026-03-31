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


def send_partner_approval_email(partner_email: str, partner_name: str) -> None:
    """Send approval email to a newly approved partner with setup instructions."""
    dashboard_url = "https://sureodds.pro/partner-dashboard"
    reset_url = "https://sureodds.pro/auth/login"
    subject = "🎉 You're approved as a Sure Odds Partner!"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:12px;">
      <div style="text-align:center;margin-bottom:28px;">
        <div style="width:48px;height:48px;background:#ef4444;border-radius:10px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
          <span style="color:#fff;font-size:22px;">⚡</span>
        </div>
        <h1 style="color:#ef4444;font-size:24px;margin:0;">Sure Odds</h1>
        <p style="color:#94a3b8;font-size:12px;margin:4px 0 0;">AI-Powered Football Predictions</p>
      </div>

      <h2 style="color:#ffffff;font-size:22px;margin-bottom:8px;">Welcome to the Partner Program! 🔥</h2>
      <p style="color:#94a3b8;line-height:1.7;margin-bottom:20px;">
        Hi <strong style="color:#ffffff;">{partner_name}</strong>,<br><br>
        Great news — your Sure Odds partner application has been <strong style="color:#22c55e;">approved!</strong>
        You are now an official Sure Odds affiliate and can start earning <strong style="color:#ffffff;">30% commission</strong>
        on every sale you generate.
      </p>

      <div style="background:#1e293b;border:1px solid #334155;border-radius:10px;padding:20px;margin-bottom:24px;">
        <h3 style="color:#ffffff;margin:0 0 14px;font-size:15px;">🚀 Getting Started — 3 Steps</h3>
        <div style="display:flex;gap:12px;margin-bottom:12px;align-items:flex-start;">
          <span style="background:#ef4444;color:#fff;border-radius:50%;width:22px;height:22px;min-width:22px;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;">1</span>
          <div>
            <p style="color:#ffffff;margin:0;font-size:14px;font-weight:bold;">Log in to your account</p>
            <p style="color:#94a3b8;margin:2px 0 0;font-size:12px;">Visit <a href="{reset_url}" style="color:#ef4444;">{reset_url}</a> and sign in with your email (<strong>{partner_email}</strong>). If you haven't set a password yet, use the "Forgot Password" link on the login page.</p>
          </div>
        </div>
        <div style="display:flex;gap:12px;margin-bottom:12px;align-items:flex-start;">
          <span style="background:#ef4444;color:#fff;border-radius:50%;width:22px;height:22px;min-width:22px;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;">2</span>
          <div>
            <p style="color:#ffffff;margin:0;font-size:14px;font-weight:bold;">Open your Partner Dashboard</p>
            <p style="color:#94a3b8;margin:2px 0 0;font-size:12px;">Go to <a href="{dashboard_url}" style="color:#ef4444;">sureodds.pro/partner-dashboard</a> — your referral link, click stats, signups, earnings and payout settings are all there.</p>
          </div>
        </div>
        <div style="display:flex;gap:12px;align-items:flex-start;">
          <span style="background:#ef4444;color:#fff;border-radius:50%;width:22px;height:22px;min-width:22px;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;">3</span>
          <div>
            <p style="color:#ffffff;margin:0;font-size:14px;font-weight:bold;">Share your referral link</p>
            <p style="color:#94a3b8;margin:2px 0 0;font-size:12px;">Copy your unique link from the dashboard and share it with your audience. Every purchase they make earns you 30% automatically.</p>
          </div>
        </div>
      </div>

      <div style="background:#052e16;border:1px solid #166534;border-radius:10px;padding:16px;margin-bottom:24px;">
        <h3 style="color:#22c55e;margin:0 0 10px;font-size:14px;">💰 Commission Structure</h3>
        <ul style="color:#94a3b8;margin:0;padding-left:18px;font-size:13px;line-height:1.8;">
          <li>30% commission on every package and bundle sale</li>
          <li>Commissions tracked automatically in real time</li>
          <li>Paid out every 72 hours (minimum $10)</li>
          <li>USDT TRC-20 or Bank Transfer options available</li>
        </ul>
      </div>

      <div style="text-align:center;margin-bottom:24px;">
        <a href="{dashboard_url}"
           style="background:#ef4444;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:bold;font-size:15px;display:inline-block;">
          Open Partner Dashboard →
        </a>
      </div>

      <p style="color:#94a3b8;font-size:13px;line-height:1.6;">
        Questions? Reply to this email or reach us at
        <a href="mailto:info@sureodds.pro" style="color:#ef4444;">info@sureodds.pro</a>.
        We're here to help you succeed.
      </p>

      <hr style="border:none;border-top:1px solid #334155;margin:28px 0;">
      <p style="color:#475569;font-size:11px;text-align:center;">
        Sure Odds · <a href="mailto:info@sureodds.pro" style="color:#ef4444;">info@sureodds.pro</a>
      </p>
    </div>
    """
    text = (
        f"Hi {partner_name}, your Sure Odds partner application has been approved!\n\n"
        f"GETTING STARTED:\n"
        f"1. Log in at https://sureodds.pro/auth/login (use 'Forgot Password' if needed)\n"
        f"2. Go to https://sureodds.pro/partner-dashboard to see your referral link & stats\n"
        f"3. Share your referral link — earn 30% on every sale\n\n"
        f"Payouts every 72h (min $10) via USDT TRC-20 or bank transfer.\n\n"
        f"Questions? Email info@sureodds.pro"
    )
    send_email(partner_email, subject, html, text)


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

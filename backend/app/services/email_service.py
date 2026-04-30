import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from app.core.config import get_settings

settings = get_settings()


def _send(to_email: str, subject: str, html: str) -> bool:
    """Low-level send via configured SMTP (Mailtrap or any TLS-capable server)."""
    if not settings.email_enabled:
        print(f"Email disabled — skipping '{subject}' to {to_email}")
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = settings.email_from
        msg["To"]      = to_email
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.ehlo()
            server.starttls()
            server.login(settings.smtp_user, settings.smtp_password)
            server.sendmail(settings.email_from, to_email, msg.as_string())

        print(f"Email sent: '{subject}' → {to_email}")
        return True
    except Exception as e:
        print(f"Email failed: {e}")
        return False


def send_welcome_credentials(
    to_email : str,
    full_name: str,
    email    : str,
    password : str,
    role     : str,
) -> bool:
    """Send welcome email with login credentials to a newly created user or student."""
    role_label = {
        "LECTURER"           : "Lecturer",
        "PROGRAMME_DIRECTOR" : "Programme Director",
        "SYSTEM_ADMIN"       : "System Administrator",
        "STUDENT"            : "Student",
    }.get(role, role.replace("_", " ").title())

    html = f"""
    <!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;background:#f3f4f6;margin:0;padding:24px">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
        <div style="background:#0f172a;padding:24px">
            <h1 style="color:#fff;margin:0;font-size:20px">FaceAttend</h1>
            <p style="color:#94a3b8;margin:4px 0 0;font-size:13px">Your account is ready</p>
        </div>
        <div style="padding:24px">
            <p style="color:#374151;margin-top:0">Hi {full_name},</p>
            <p style="color:#374151">
                Your <strong>{role_label}</strong> account has been created on FaceAttend.
                Use the credentials below to sign in for the first time.
            </p>

            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0">
                <table style="width:100%;font-size:14px;border-collapse:collapse">
                    <tr>
                        <td style="padding:6px 0;color:#6b7280;width:110px">Login URL</td>
                        <td style="padding:6px 0;color:#1d4ed8">
                            <a href="{settings.frontend_url}/login" style="color:#1d4ed8">{settings.frontend_url}/login</a>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:6px 0;color:#6b7280">Email</td>
                        <td style="padding:6px 0;font-weight:600;color:#111827">{email}</td>
                    </tr>
                    <tr>
                        <td style="padding:6px 0;color:#6b7280">Password</td>
                        <td style="padding:6px 0;font-family:monospace;font-size:15px;font-weight:700;
                            color:#111827;background:#f1f5f9;padding:4px 8px;border-radius:4px">{password}</td>
                    </tr>
                </table>
            </div>

            <p style="color:#374151;font-size:13px">
                On first login you will be asked to scan a QR code with Google Authenticator
                to set up two-factor authentication. Please change your password after signing in.
            </p>
            <p style="color:#9ca3af;font-size:12px;margin-top:24px;padding-top:16px;
               border-top:1px solid #f3f4f6">
                If you did not expect this email, please contact your system administrator.
            </p>
        </div>
    </div>
    </body></html>
    """
    return _send(to_email, "Your FaceAttend account credentials", html)


def send_lecture_summary(
    to_email     : str,
    lecturer_name: str,
    summary      : dict,
) -> bool:
    """Send HTML attendance summary email on lecture close."""
    present_count = summary.get("full_count", 0) + summary.get("partial_count", 0)
    absent_count  = summary.get("absent_count", 0)
    avg_rate      = summary.get("avg_rate", 0)

    rows = ""
    for i, s in enumerate(summary.get("students", [])):
        grade_color = {
            "FULL"        : "#16a34a",
            "PARTIAL"     : "#d97706",
            "LEFT_EARLY"  : "#d97706",
            "ARRIVED_LATE": "#d97706",
            "SUSPICIOUS"  : "#dc2626",
            "ABSENT"      : "#dc2626",
        }.get(s["grade"], "#6b7280")

        rows += f"""
        <tr style="background:{'#f9fafb' if i % 2 == 0 else '#ffffff'}">
            <td style="padding:8px 12px;color:#374151">{s['full_name']}</td>
            <td style="padding:8px 12px;color:#6b7280">{s['student_number']}</td>
            <td style="padding:8px 12px;text-align:center">{'✅' if s['scan1_present'] else '❌'}</td>
            <td style="padding:8px 12px;text-align:center">{'✅' if s['scan2_present'] else '❌'}</td>
            <td style="padding:8px 12px;text-align:center">{'✅' if s['scan3_present'] else '❌'}</td>
            <td style="padding:8px 12px;font-weight:600;color:{grade_color}">{s['grade']}</td>
        </tr>
        """

    html = f"""
    <!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;background:#f3f4f6;margin:0;padding:24px">
    <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
        <div style="background:#0f172a;padding:24px">
            <h1 style="color:#fff;margin:0;font-size:20px">FaceAttend</h1>
            <p style="color:#94a3b8;margin:4px 0 0;font-size:13px">Three-Scan Lecture Summary</p>
        </div>
        <div style="padding:24px">
            <p style="color:#374151;margin-top:0">Hi {lecturer_name},<br>
            Here is the attendance summary for your lecture on {summary.get('date', '')}
            in {summary.get('room', '')}.</p>

            <div style="display:flex;gap:12px;margin-bottom:16px">
                <div style="flex:1;background:#f0fdf4;border-radius:8px;padding:12px;text-align:center">
                    <p style="margin:0;font-size:24px;font-weight:700;color:#16a34a">{present_count}</p>
                    <p style="margin:4px 0 0;font-size:12px;color:#15803d">Present</p>
                </div>
                <div style="flex:1;background:#fef2f2;border-radius:8px;padding:12px;text-align:center">
                    <p style="margin:0;font-size:24px;font-weight:700;color:#dc2626">{absent_count}</p>
                    <p style="margin:4px 0 0;font-size:12px;color:#b91c1c">Absent</p>
                </div>
                <div style="flex:1;background:#eff6ff;border-radius:8px;padding:12px;text-align:center">
                    <p style="margin:0;font-size:24px;font-weight:700;color:#2563eb">{avg_rate}%</p>
                    <p style="margin:4px 0 0;font-size:12px;color:#1d4ed8">Avg Rate</p>
                </div>
            </div>

            <table style="width:100%;border-collapse:collapse;font-size:13px">
                <thead>
                    <tr style="background:#f3f4f6">
                        <th style="padding:8px 12px;text-align:left;color:#6b7280">Name</th>
                        <th style="padding:8px 12px;text-align:left;color:#6b7280">ID</th>
                        <th style="padding:8px 12px;text-align:center;color:#6b7280">Scan 1</th>
                        <th style="padding:8px 12px;text-align:center;color:#6b7280">Scan 2</th>
                        <th style="padding:8px 12px;text-align:center;color:#6b7280">Scan 3</th>
                        <th style="padding:8px 12px;text-align:left;color:#6b7280">Grade</th>
                    </tr>
                </thead>
                <tbody>{rows}</tbody>
            </table>

            <p style="color:#9ca3af;font-size:12px;margin-top:24px;padding-top:16px;
               border-top:1px solid #f3f4f6">
                Sent automatically by FaceAttend when lecture scan 3 closed.
            </p>
        </div>
    </div>
    </body></html>
    """
    return _send(to_email, f"[FaceAttend] Lecture Summary — {summary.get('date', '')} · {avg_rate}% attendance", html)

"""
Email Service
Handles sending emails for:
- Inquiry notifications
- Account alerts
- System notifications
"""

def send_email(to_email: str, subject: str, message: str):
    """
    Dummy email sender (future SMTP integration)
    """
    print("----- EMAIL SERVICE -----")
    print(f"To: {to_email}")
    print(f"Subject: {subject}")
    print(f"Message: {message}")
    print("-------------------------")

    return True
"""
Email-to-SMS gateway helper.

Usage (Unix SMTP):
  python3 scripts/sms-gateway.py "3472495985" "hi"

Tries known US carrier email-to-SMS gateways.
Uses localhost SMTP (sendmail) or --smtp user:pass@host:port
If localhost has a sendmail alias (e.g. company relay), it works with no credentials.
"""

import sys
import smtplib
from email.mime.text import MIMEText
from email.header import Header

CARRIER_GATEWAYS = [
    ("tmo",       "tmomail.net",       "T-Mobile"),
    ("verizon",   "vtext.com",         "Verizon"),
    ("att",       "txt.att.net",       "AT&T"),
    ("sprint",    "messaging.sprintpcs.com", "Sprint"),
    ("uscellular","email.uscc.net",    "US Cellular"),
    ("boost",     "sms.myboostmobile.com",   "Boost Mobile"),
    ("cricket",   "sms.cricketwireless.net",  "Cricket"),
    ("metro",     "mymetropcs.com",    "MetroPCS"),
    ("google",    "msg.fi.google.com", "Google Fi"),
    ("visible",   "vtext.com",         "Visible"),
]

def send_via_smtp(to: str, message: str, smtp_cfg: str | None = None) -> str | None:
    """Attempt to send via localhost sendmail or given smtp URL."""
    domain = to[-10:]   # last 10 digits for NANP

    for carrier, gateway, name in CARRIER_GATEWAYS:
        addr = f"{to}@{gateway}"
        body = f"Subject: SMS\n\n{message}"

        try:
            if smtp_cfg:
                # smtp_cfg: user:pass@host:port
                user_pass, host_port = smtp_cfg.rsplit("@", 1)
                h, p = host_port.rsplit(":", 1)
                if ":" in user_pass:
                    u, pw = user_pass.split(":", 1)
                else:
                    u, pw = user_pass, ""
                s = smtplib.SMTP(h, int(p), timeout=10)
                s.starttls()
                s.login(u, pw)
            else:
                s = smtplib.SMTP("localhost", 25, timeout=5)

            msg = MIMEText(message, _charset="utf-8")
            msg["From"] = "sms-gateway@local"
            msg["To"] = addr
            msg["Subject"] = "SMS"

            s.sendmail("sms-gateway@local", [addr], str(msg))
            s.quit()
            return name
        except Exception as e:
            print(f"  [{carrier}/{gateway}] skip: {e}")
            continue

    return None


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/sms-gateway.py <phone> <message> [smtp://user:pass@host:port]")
        sys.exit(1)

    to = sys.argv[1].lstrip("+")
    message = sys.argv[2] if len(sys.argv) > 2 else "hi"
    smtp = sys.argv[3] if len(sys.argv) > 3 else None

    print(f"Sending SMS to {to}...")
    carrier = send_via_smtp(to, message, smtp)
    if carrier:
        print(f"OK – likely delivered via {carrier} email-to-SMS gateway.")
    else:
        print("FAILED – no carrier gateway accepted the message.")
        print("Try: python3 scripts/sms-gateway.py 3472495985 'hi' smtp://you@gmail.com:app_password@smtp.gmail.com:587")
        sys.exit(1)


if __name__ == "__main__":
    main()

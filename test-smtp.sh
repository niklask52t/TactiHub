#!/usr/bin/env bash
set -euo pipefail

# Resolve project root (works even when called via symlink)
SCRIPT_DIR="$(cd "$(dirname "$(readlink -f "$0" 2>/dev/null || echo "$0")")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: .env file not found at $ENV_FILE"
  exit 1
fi

# Read SMTP values from .env
get_env() {
  local key="$1"
  local default="${2:-}"
  local val
  val=$(grep -E "^${key}=" "$ENV_FILE" | head -1 | cut -d'=' -f2- | sed 's/^["'"'"']//;s/["'"'"']$//')
  echo "${val:-$default}"
}

SMTP_HOST=$(get_env SMTP_HOST "")
SMTP_PORT=$(get_env SMTP_PORT "587")
SMTP_SECURE=$(get_env SMTP_SECURE "")
SMTP_USER=$(get_env SMTP_USER "")
SMTP_PASS=$(get_env SMTP_PASS "")
SMTP_FROM=$(get_env SMTP_FROM "noreply@tactihub.local")
APP_URL=$(get_env APP_URL "http://localhost:5173")

echo "=== TactiHub SMTP Test ==="
echo ""
echo "Configuration from .env:"
echo "  SMTP_HOST:   ${SMTP_HOST:-(not set)}"
echo "  SMTP_PORT:   $SMTP_PORT"
echo "  SMTP_SECURE: ${SMTP_SECURE:-(auto)}"
echo "  SMTP_USER:   ${SMTP_USER:-(not set)}"
echo "  SMTP_PASS:   ${SMTP_PASS:+****}${SMTP_PASS:-(not set)}"
echo "  SMTP_FROM:   $SMTP_FROM"
echo "  APP_URL:     $APP_URL"
echo ""

if [ -z "$SMTP_HOST" ]; then
  echo "ERROR: SMTP_HOST is not set in .env"
  exit 1
fi

read -p "Enter recipient email address: " RECIPIENT

if [ -z "$RECIPIENT" ]; then
  echo "ERROR: No recipient entered."
  exit 1
fi

echo ""
echo "Sending test email to $RECIPIENT ..."
echo ""

# Pass config via environment to avoid shell escaping issues
export TEST_SMTP_HOST="$SMTP_HOST"
export TEST_SMTP_PORT="$SMTP_PORT"
export TEST_SMTP_SECURE="$SMTP_SECURE"
export TEST_SMTP_USER="$SMTP_USER"
export TEST_SMTP_PASS="$SMTP_PASS"
export TEST_SMTP_FROM="$SMTP_FROM"
export TEST_APP_URL="$APP_URL"
export TEST_RECIPIENT="$RECIPIENT"

cd "$SCRIPT_DIR"
node -e '
const path = require("path");
const nodemailer = require(path.join(process.cwd(), "packages/server/node_modules/nodemailer"));

const port = parseInt(process.env.TEST_SMTP_PORT);
const secure = process.env.TEST_SMTP_SECURE === "true" || port === 465;

const transporter = nodemailer.createTransport({
  host: process.env.TEST_SMTP_HOST,
  port,
  secure,
  auth: process.env.TEST_SMTP_USER
    ? { user: process.env.TEST_SMTP_USER, pass: process.env.TEST_SMTP_PASS }
    : undefined,
});

(async () => {
  try {
    console.log("Verifying SMTP connection...");
    await transporter.verify();
    console.log("SMTP connection OK\n");

    const info = await transporter.sendMail({
      from: process.env.TEST_SMTP_FROM,
      to: process.env.TEST_RECIPIENT,
      subject: "TactiHub SMTP Test",
      text: "This is a test email from TactiHub. If you received this, SMTP is working correctly.",
      html: `<div style="font-family:sans-serif;padding:20px;background:#2a2f38;color:#c3c9cc;border-radius:8px;">
        <h2 style="color:#fd7100;">TactiHub SMTP Test</h2>
        <p>This is a test email from TactiHub.</p>
        <p>If you received this, <strong>SMTP is working correctly.</strong></p>
        <hr style="border-color:#3c4653;">
        <p style="color:#6b7280;font-size:12px;">Sent from ${process.env.TEST_APP_URL}</p>
      </div>`,
    });

    console.log("Email sent successfully!");
    console.log("Message ID:", info.messageId);
    if (info.response) console.log("Server response:", info.response);
  } catch (err) {
    console.error("SMTP ERROR:", err.message);
    if (err.code) console.error("Error code:", err.code);
    if (err.responseCode) console.error("Response code:", err.responseCode);
    process.exit(1);
  }
})();
'

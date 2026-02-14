import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

let transporter: Transporter;

function getTransporter(): Transporter {
  if (!transporter) {
    const port = parseInt(process.env.SMTP_PORT || '587');
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;

    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port,
      secure,
      auth: process.env.SMTP_USER ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      } : undefined,
    });
  }
  return transporter;
}

const FROM = process.env.SMTP_FROM || 'noreply@tactihub.local';
const APP_URL = (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '');

/**
 * Wraps email content in a styled HTML template matching the TactiHub dark theme.
 */
function emailTemplate(content: string): string {
  const logoUrl = `${APP_URL}/tactihub_logo.png`;
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#2a2f38;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#2a2f38;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <!-- Logo -->
        <tr><td align="center" style="padding-bottom:32px;">
          <a href="${APP_URL}" style="text-decoration:none;">
            <img src="${logoUrl}" alt="TactiHub" height="48" style="height:48px;" />
          </a>
        </td></tr>
        <!-- Card -->
        <tr><td>
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#323842;border-radius:10px;border:1px solid #3c4653;">
            <!-- Orange top accent line -->
            <tr><td style="height:3px;background:linear-gradient(90deg,#fd7100,#da2c00);border-radius:10px 10px 0 0;"></td></tr>
            <!-- Content -->
            <tr><td style="padding:32px 40px;">
              ${content}
            </td></tr>
          </table>
        </td></tr>
        <!-- Footer -->
        <tr><td align="center" style="padding-top:24px;">
          <p style="color:#6b7280;font-size:12px;margin:0;">
            &copy; TactiHub &mdash; Collaborative tactical strategy planning
          </p>
          <p style="color:#4b5563;font-size:11px;margin:8px 0 0 0;">
            <a href="${APP_URL}" style="color:#fd7100;text-decoration:none;">${APP_URL.replace(/^https?:\/\//, '')}</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buttonHtml(label: string, url: string): string {
  return `<table cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td>
    <a href="${url}" style="display:inline-block;padding:12px 32px;background-color:#fd7100;color:#ffffff;font-weight:600;font-size:14px;text-decoration:none;border-radius:8px;letter-spacing:0.5px;text-transform:uppercase;">
      ${label}
    </a>
  </td></tr></table>`;
}

export async function sendVerificationEmail(email: string, token: string) {
  const verifyUrl = `${APP_URL}/auth/verify-email/${token}`;

  await getTransporter().sendMail({
    from: FROM,
    to: email,
    subject: 'Verify your TactiHub email',
    html: emailTemplate(`
      <h1 style="color:#c3c9cc;font-size:22px;margin:0 0 16px 0;">Welcome to TactiHub!</h1>
      <p style="color:#9ca3af;font-size:14px;line-height:1.6;margin:0 0 8px 0;">
        Thanks for signing up. Please verify your email address by clicking the button below:
      </p>
      ${buttonHtml('Verify Email', verifyUrl)}
      <p style="color:#6b7280;font-size:12px;line-height:1.6;margin:0;">
        Or copy this link: <a href="${verifyUrl}" style="color:#fd7100;word-break:break-all;">${verifyUrl}</a>
      </p>
      <p style="color:#6b7280;font-size:12px;margin:16px 0 0 0;">This link expires in 24 hours.</p>
    `),
  });
}

export async function sendAdminVerifiedEmail(email: string, username: string) {
  const loginUrl = `${APP_URL}/auth/login`;

  await getTransporter().sendMail({
    from: FROM,
    to: email,
    subject: 'Your TactiHub account has been verified',
    html: emailTemplate(`
      <h1 style="color:#c3c9cc;font-size:22px;margin:0 0 16px 0;">Account Verified</h1>
      <p style="color:#9ca3af;font-size:14px;line-height:1.6;margin:0 0 8px 0;">
        Hi <strong style="color:#c3c9cc;">${username}</strong>,
      </p>
      <p style="color:#9ca3af;font-size:14px;line-height:1.6;margin:0 0 8px 0;">
        An administrator has manually verified your TactiHub account. You can now log in and start using all features.
      </p>
      ${buttonHtml('Log In', loginUrl)}
      <p style="color:#6b7280;font-size:12px;margin:0;">Welcome to TactiHub!</p>
    `),
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${APP_URL}/auth/reset-password/${token}`;

  await getTransporter().sendMail({
    from: FROM,
    to: email,
    subject: 'Reset your TactiHub password',
    html: emailTemplate(`
      <h1 style="color:#c3c9cc;font-size:22px;margin:0 0 16px 0;">Password Reset</h1>
      <p style="color:#9ca3af;font-size:14px;line-height:1.6;margin:0 0 8px 0;">
        You requested a password reset for your TactiHub account. Click the button below to set a new password:
      </p>
      ${buttonHtml('Reset Password', resetUrl)}
      <p style="color:#6b7280;font-size:12px;line-height:1.6;margin:0;">
        Or copy this link: <a href="${resetUrl}" style="color:#fd7100;word-break:break-all;">${resetUrl}</a>
      </p>
      <p style="color:#6b7280;font-size:12px;margin:16px 0 0 0;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
    `),
  });
}

export async function sendDeletionConfirmationEmail(email: string, username: string, token: string) {
  const confirmUrl = `${APP_URL}/auth/confirm-deletion/${token}`;

  await getTransporter().sendMail({
    from: FROM,
    to: email,
    subject: 'Confirm your TactiHub account deletion',
    html: emailTemplate(`
      <h1 style="color:#c3c9cc;font-size:22px;margin:0 0 16px 0;">Account Deletion Request</h1>
      <p style="color:#9ca3af;font-size:14px;line-height:1.6;margin:0 0 8px 0;">
        Hi <strong style="color:#c3c9cc;">${username}</strong>,
      </p>
      <p style="color:#9ca3af;font-size:14px;line-height:1.6;margin:0 0 8px 0;">
        You requested to delete your TactiHub account. Click the button below to confirm:
      </p>
      ${buttonHtml('Confirm Deletion', confirmUrl)}
      <p style="color:#6b7280;font-size:12px;line-height:1.6;margin:0;">
        Or copy this link: <a href="${confirmUrl}" style="color:#fd7100;word-break:break-all;">${confirmUrl}</a>
      </p>
      <p style="color:#6b7280;font-size:12px;margin:16px 0 0 0;">This link expires in 24 hours. If you didn't request this, you can safely ignore this email.</p>
    `),
  });
}

export async function sendAccountDeactivatedEmail(email: string, username: string) {
  await getTransporter().sendMail({
    from: FROM,
    to: email,
    subject: 'Your TactiHub account has been deactivated',
    html: emailTemplate(`
      <h1 style="color:#c3c9cc;font-size:22px;margin:0 0 16px 0;">Account Deactivated</h1>
      <p style="color:#9ca3af;font-size:14px;line-height:1.6;margin:0 0 8px 0;">
        Hi <strong style="color:#c3c9cc;">${username}</strong>,
      </p>
      <p style="color:#9ca3af;font-size:14px;line-height:1.6;margin:0 0 8px 0;">
        Your TactiHub account has been deactivated. You can reactivate it by contacting an administrator within the next 30 days.
      </p>
      <p style="color:#9ca3af;font-size:14px;line-height:1.6;margin:0 0 8px 0;">
        After 30 days, your account and all associated data (battle plans, drawings, rooms) will be permanently deleted.
      </p>
      <p style="color:#6b7280;font-size:12px;margin:16px 0 0 0;">If you did not request this, please contact an administrator immediately.</p>
    `),
  });
}

export async function sendMagicLinkEmail(email: string, token: string) {
  const loginUrl = `${APP_URL}/auth/magic-login/${token}`;

  await getTransporter().sendMail({
    from: FROM,
    to: email,
    subject: 'Your TactiHub login link',
    html: emailTemplate(`
      <h1 style="color:#c3c9cc;font-size:22px;margin:0 0 16px 0;">Magic Login Link</h1>
      <p style="color:#9ca3af;font-size:14px;line-height:1.6;margin:0 0 8px 0;">
        You requested a passwordless login link for your TactiHub account. Click the button below to log in:
      </p>
      ${buttonHtml('Log In to TactiHub', loginUrl)}
      <p style="color:#6b7280;font-size:12px;line-height:1.6;margin:0;">
        Or copy this link: <a href="${loginUrl}" style="color:#fd7100;word-break:break-all;">${loginUrl}</a>
      </p>
      <p style="color:#6b7280;font-size:12px;margin:16px 0 0 0;">This link expires in 15 minutes. If you didn't request this, you can safely ignore this email.</p>
    `),
  });
}

export async function sendEmailChangeVerification(newEmail: string, token: string) {
  const confirmUrl = `${APP_URL}/auth/confirm-email-change/${token}`;

  await getTransporter().sendMail({
    from: FROM,
    to: newEmail,
    subject: 'Confirm your new TactiHub email address',
    html: emailTemplate(`
      <h1 style="color:#c3c9cc;font-size:22px;margin:0 0 16px 0;">Confirm Email Change</h1>
      <p style="color:#9ca3af;font-size:14px;line-height:1.6;margin:0 0 8px 0;">
        You requested to change your TactiHub email address to this address. Click the button below to confirm:
      </p>
      ${buttonHtml('Confirm New Email', confirmUrl)}
      <p style="color:#6b7280;font-size:12px;line-height:1.6;margin:0;">
        Or copy this link: <a href="${confirmUrl}" style="color:#fd7100;word-break:break-all;">${confirmUrl}</a>
      </p>
      <p style="color:#6b7280;font-size:12px;margin:16px 0 0 0;">This link expires in 24 hours. If you didn't request this, you can safely ignore this email.</p>
    `),
  });
}

export async function sendAccountDeletedEmail(email: string) {
  await getTransporter().sendMail({
    from: FROM,
    to: email,
    subject: 'Your TactiHub account has been permanently deleted',
    html: emailTemplate(`
      <h1 style="color:#c3c9cc;font-size:22px;margin:0 0 16px 0;">Account Deleted</h1>
      <p style="color:#9ca3af;font-size:14px;line-height:1.6;margin:0 0 8px 0;">
        Your TactiHub account has been permanently deleted along with all associated data.
      </p>
      <p style="color:#9ca3af;font-size:14px;line-height:1.6;margin:0 0 8px 0;">
        If you wish to use TactiHub again, you can create a new account.
      </p>
    `),
  });
}

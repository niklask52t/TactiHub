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
const BASE_URL = process.env.VITE_API_URL || 'http://localhost:3001';

export async function sendVerificationEmail(email: string, token: string) {
  const verifyUrl = `${BASE_URL}/auth/verify-email/${token}`;

  await getTransporter().sendMail({
    from: FROM,
    to: email,
    subject: 'Verify your TactiHub email',
    html: `
      <h1>Welcome to TactiHub!</h1>
      <p>Please verify your email address by clicking the link below:</p>
      <a href="${verifyUrl}">${verifyUrl}</a>
      <p>This link will expire in 24 hours.</p>
    `,
  });
}

export async function sendAdminVerifiedEmail(email: string, username: string) {
  await getTransporter().sendMail({
    from: FROM,
    to: email,
    subject: 'Your TactiHub account has been verified',
    html: `
      <h1>Account Verified</h1>
      <p>Hi ${username},</p>
      <p>An administrator has manually verified your TactiHub account. You can now log in and use all features.</p>
      <p>Welcome to TactiHub!</p>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${BASE_URL}/auth/reset-password/${token}`;

  await getTransporter().sendMail({
    from: FROM,
    to: email,
    subject: 'Reset your TactiHub password',
    html: `
      <h1>Password Reset</h1>
      <p>You requested a password reset. Click the link below to set a new password:</p>
      <a href="${resetUrl}">${resetUrl}</a>
      <p>This link will expire in 1 hour. If you didn't request this, ignore this email.</p>
    `,
  });
}

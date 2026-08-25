import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as dns from 'dns';

// Force Node.js to use IPv4 instead of IPv6 for all DNS lookups
// This fixes the ENETUNREACH bug on Render free tier
dns.setDefaultResultOrder('ipv4first');

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private defaultFrom: string;
  private frontendUrl: string;
  private smtpTransporter: nodemailer.Transporter | null = null;

  constructor(private configService: ConfigService) {
    this.defaultFrom = this.configService.get<string>('EMAIL_FROM') || 'SafeVitals XR <no-reply@safevitals.in>';
    this.frontendUrl = (this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000').replace(/\/+$/, '');
  }

  async onModuleInit() {
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpPort = this.configService.get<number>('SMTP_PORT') || 587;
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');

    if (smtpHost && smtpUser && smtpPass) {
      try {
        // ULTIMATE FIX: Manually resolve the host to IPv4 to guarantee we bypass the ENETUNREACH bug
        const { address } = await dns.promises.lookup(smtpHost, { family: 4 });
        this.logger.log(`Resolved SMTP Host ${smtpHost} to IPv4: ${address}`);

        this.smtpTransporter = nodemailer.createTransport({
          host: address, // Pass the raw IPv4 address!
          port: Number(smtpPort),
          secure: Number(smtpPort) === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
          tls: {
            // Gmail requires the servername to match the cert when connecting by raw IP
            servername: smtpHost,
          },
        });

        await this.smtpTransporter.verify();
        this.logger.log(`Nodemailer SMTP transporter verified successfully (${smtpHost}:${smtpPort})`);
      } catch (err: any) {
        this.logger.error(`SMTP Connection Failed: ${err.message}. Emails will be simulated in server logs.`);
        this.smtpTransporter = null;
      }
    } else {
      this.logger.warn('SMTP credentials (Nodemailer) not fully set in .env. Outgoing emails will be simulated in server logs.');
    }
  }

  /**
   * Generic sender via Nodemailer SMTP (or simulated console logs when offline/dev)
   */
  async send(options: SendEmailOptions): Promise<boolean> {
    const recipients = Array.isArray(options.to) ? options.to : [options.to];
    const fromAddress = this.defaultFrom.includes('<') ? this.defaultFrom : `SafeVitals XR <${this.defaultFrom}>`;

    // 1. If Nodemailer SMTP is configured, dispatch via Nodemailer
    if (this.smtpTransporter) {
      try {
        await this.smtpTransporter.sendMail({
          from: fromAddress,
          to: recipients.join(', '),
          subject: options.subject,
          html: options.html,
          text: options.text,
        });
        this.logger.log(`[Nodemailer] Email dispatched to ${recipients.join(', ')} [Subject: "${options.subject}"]`);
        return true;
      } catch (err: any) {
        this.logger.error(`Nodemailer delivery error: ${err.message}`);
        return false;
      }
    }

    // 2. Fallback: Log email simulation to console (for development and tests)
    this.logger.log(`[SIMULATED EMAIL DISPATCH]
To: ${recipients.join(', ')}
From: ${fromAddress}
Subject: ${options.subject}
Body:\n${options.text || options.html}`);
    return true;
  }

  /**
   * Send 2-Factor Authentication OTP (Ultra-Premium SafeVitals XR Branded)
   */
  async sendOtp(to: string, otp: string, firstName = 'Team Member'): Promise<boolean> {
    const subject = `[Security] SafeVitals XR Verification Code: ${otp}`;
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SafeVitals XR Security Verification</title>
</head>
<body style="margin: 0; padding: 0; background-color: #07090e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e6edf3;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #07090e; padding: 40px 15px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table role="presentation" width="100%" style="max-width: 560px; background: linear-gradient(180deg, #0d1117 0%, #090d13 100%); border: 1px solid #1f2937; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6);" cellspacing="0" cellpadding="0" border="0">
          
          <!-- Top Accent Gradient Line -->
          <tr>
            <td style="height: 4px; background: linear-gradient(90deg, #10b981 0%, #06b6d4 50%, #3b82f6 100%);"></td>
          </tr>

          <!-- Header with SafeVitals Branding -->
          <tr>
            <td style="padding: 32px 32px 20px 32px; text-align: center;">
              <div style="display: inline-block; padding: 10px 16px; border-radius: 12px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.25); margin-bottom: 16px;">
                <span style="font-size: 14px; font-weight: 800; letter-spacing: 2px; color: #10b981; text-transform: uppercase;">
                  ✦ SAFEVITALS <span style="color: #06b6d4;">XR</span>
                </span>
              </div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                Two-Factor Security Challenge
              </h1>
              <p style="margin: 8px 0 0 0; font-size: 13px; color: #9ca3af;">
                Zero-Trust Spatial Telemetry & Command Center
              </p>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 10px 32px 24px 32px;">
              <p style="font-size: 14px; line-height: 1.6; color: #d1d5db; margin: 0 0 20px 0;">
                Hello <strong style="color: #ffffff;">${firstName}</strong>,
              </p>
              <p style="font-size: 13px; line-height: 1.5; color: #9ca3af; margin: 0 0 20px 0;">
                A sign-in request was initiated for your SafeVitals XR account. Use the one-time authentication code below to verify your identity:
              </p>

              <!-- 6-Digit OTP Box -->
              <div style="background: #111827; border: 1px solid #374151; border-radius: 12px; padding: 24px 16px; text-align: center; margin: 24px 0;">
                <span style="font-size: 38px; font-weight: 800; letter-spacing: 12px; color: #10b981; font-family: 'SF Mono', Consolas, Monaco, monospace; text-shadow: 0 0 20px rgba(16, 185, 129, 0.4); margin-left: 12px;">
                  ${otp}
                </span>
                <div style="margin-top: 14px;">
                  <span style="display: inline-block; background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); color: #f59e0b; font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 20px;">
                    ⏱ Expires in 5 minutes
                  </span>
                </div>
              </div>

              <!-- Security Notice Box -->
              <div style="background: rgba(31, 41, 55, 0.5); border-left: 3px solid #06b6d4; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-top: 20px;">
                <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #9ca3af;">
                  <strong style="color: #e5e7eb;">Security Reminder:</strong> SafeVitals personnel will never ask for your authentication code. If you did not request this login, please contact your Super Administrator immediately.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px 32px 32px; border-top: 1px solid #1f2937; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #6b7280;">
                SafeVitals XR Inc. &bull; Next-Gen Spatial Workforce & Telemetry Health
              </p>
              <a href="https://safevitals.in" style="font-size: 11px; color: #10b981; text-decoration: none; font-weight: 600;">
                safevitals.in &rarr;
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    return this.send({
      to,
      subject,
      html,
      text: `Your SafeVitals XR 2FA verification code is: ${otp}. It expires in 5 minutes.`,
    });
  }

  /**
   * Send Employee Account Invitation Link (Ultra-Premium SafeVitals XR Branded)
   */
  async sendInvitation(
    to: string, 
    token: string, 
    firstName = 'Team Member',
    roleName = 'Employee',
    departmentName?: string,
    employeeId?: string
  ): Promise<boolean> {
    const inviteUrl = `${this.frontendUrl}/setup-password?token=${encodeURIComponent(token)}`;
    const subject = `Welcome to SafeVitals XR — Activate Your Enterprise Workspace`;
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to SafeVitals XR</title>
</head>
<body style="margin: 0; padding: 0; background-color: #07090e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e6edf3;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #07090e; padding: 40px 15px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table role="presentation" width="100%" style="max-width: 580px; background: linear-gradient(180deg, #0d1117 0%, #090d13 100%); border: 1px solid #1f2937; border-radius: 16px; overflow: hidden; box-shadow: 0 25px 50px rgba(0,0,0,0.7);" cellspacing="0" cellpadding="0" border="0">
          
          <!-- Top Cyber Glow Line -->
          <tr>
            <td style="height: 4px; background: linear-gradient(90deg, #10b981 0%, #06b6d4 50%, #8b5cf6 100%);"></td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="padding: 36px 36px 20px 36px; text-align: center;">
              <div style="display: inline-block; padding: 10px 18px; border-radius: 12px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); margin-bottom: 20px;">
                <span style="font-size: 14px; font-weight: 800; letter-spacing: 2px; color: #10b981; text-transform: uppercase;">
                  ✦ SAFEVITALS <span style="color: #06b6d4;">XR</span>
                </span>
              </div>
              <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                Welcome to SafeVitals XR
              </h1>
              <p style="margin: 10px 0 0 0; font-size: 14px; color: #9ca3af; line-height: 1.5;">
                Your enterprise spatial telemetry and workforce command account has been provisioned by Super Administration.
              </p>
            </td>
          </tr>

          <!-- Employee Profile & Role Credentials Card -->
          <tr>
            <td style="padding: 10px 36px 24px 36px;">
              <div style="background: #111827; border: 1px solid #1f2937; border-radius: 12px; padding: 20px; margin: 10px 0 24px 0;">
                <table width="100%" cellspacing="0" cellpadding="6" border="0">
                  <tr>
                    <td style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600; width: 40%;">Appointee Name</td>
                    <td style="font-size: 13px; color: #ffffff; font-weight: 700;">${firstName}</td>
                  </tr>
                  ${employeeId ? `
                  <tr>
                    <td style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600;">Employee ID</td>
                    <td style="font-size: 13px; color: #10b981; font-family: monospace; font-weight: 700;">${employeeId}</td>
                  </tr>` : ''}
                  <tr>
                    <td style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600;">Assigned Role</td>
                    <td style="font-size: 13px; color: #06b6d4; font-weight: 700;">${roleName}</td>
                  </tr>
                  ${departmentName ? `
                  <tr>
                    <td style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600;">Department</td>
                    <td style="font-size: 13px; color: #e5e7eb; font-weight: 600;">${departmentName}</td>
                  </tr>` : ''}
                  <tr>
                    <td style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600;">Access Scope</td>
                    <td style="font-size: 12px; color: #10b981;">● Zero-Trust Enterprise Verified</td>
                  </tr>
                </table>
              </div>

              <p style="font-size: 13px; color: #9ca3af; line-height: 1.6; margin: 0 0 24px 0; text-align: center;">
                Click the button below to activate your account and configure your secure permanent credentials:
              </p>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 28px 0;">
                <a href="${inviteUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; padding: 14px 32px; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 8px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4); text-transform: uppercase; letter-spacing: 0.5px;">
                  Activate My Account &rarr;
                </a>
              </div>

              <!-- Direct URL Fallback -->
              <p style="font-size: 11px; color: #6b7280; line-height: 1.5; margin: 20px 0 0 0; text-align: center;">
                This invitation link will expire in <strong style="color: #9ca3af;">7 days</strong>. If the button above does not work, copy and paste this secure URL into your browser:
              </p>
              <p style="font-size: 11px; color: #06b6d4; word-break: break-all; text-align: center; margin: 6px 0 0 0; font-family: monospace;">
                ${inviteUrl}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 36px 36px 36px; border-top: 1px solid #1f2937; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #6b7280;">
                SafeVitals XR Inc. &bull; Spatial Computing & Enterprise Health Telemetry
              </p>
              <a href="https://safevitals.in" style="font-size: 11px; color: #10b981; text-decoration: none; font-weight: 600;">
                Explore SafeVitals XR Platform &rarr;
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    return this.send({
      to,
      subject,
      html,
      text: `Welcome to SafeVitals XR! Complete your employee onboarding and activate your workspace here: ${inviteUrl}`,
    });
  }

  /**
   * Send Password Reset Link (Ultra-Premium SafeVitals XR Branded)
   */
  async sendPasswordReset(to: string, resetToken: string, firstName = 'User'): Promise<boolean> {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;
    const subject = `[Action Required] SafeVitals XR Password Reset Authorization`;
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SafeVitals XR Password Reset</title>
</head>
<body style="margin: 0; padding: 0; background-color: #07090e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e6edf3;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #07090e; padding: 40px 15px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table role="presentation" width="100%" style="max-width: 560px; background: linear-gradient(180deg, #0d1117 0%, #090d13 100%); border: 1px solid #1f2937; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6);" cellspacing="0" cellpadding="0" border="0">
          
          <!-- Top Alert Gradient Line -->
          <tr>
            <td style="height: 4px; background: linear-gradient(90deg, #ef4444 0%, #f59e0b 50%, #10b981 100%);"></td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 20px 32px; text-align: center;">
              <div style="display: inline-block; padding: 10px 16px; border-radius: 12px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); margin-bottom: 16px;">
                <span style="font-size: 13px; font-weight: 800; letter-spacing: 2px; color: #ef4444; text-transform: uppercase;">
                  ✦ SECURITY GATEWAY
                </span>
              </div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                Password Reset Authorization
              </h1>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 10px 32px 24px 32px;">
              <p style="font-size: 14px; line-height: 1.6; color: #d1d5db; margin: 0 0 16px 0;">
                Hello <strong style="color: #ffffff;">${firstName}</strong>,
              </p>
              <p style="font-size: 13px; line-height: 1.6; color: #9ca3af; margin: 0 0 24px 0;">
                A credential reset request was registered for your SafeVitals XR Command Center account. Click the button below to authorize and configure a new password:
              </p>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 28px 0;">
                <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: #ffffff; padding: 14px 32px; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 8px; box-shadow: 0 4px 14px rgba(239, 68, 68, 0.4); text-transform: uppercase; letter-spacing: 0.5px;">
                  Reset Account Password &rarr;
                </a>
              </div>

              <!-- Expiry Alert -->
              <div style="background: #111827; border: 1px solid #374151; border-radius: 8px; padding: 12px 16px; margin: 20px 0;">
                <p style="margin: 0; font-size: 12px; color: #9ca3af; line-height: 1.5;">
                  ⏱ This authorization link is valid for <strong style="color: #f59e0b;">1 hour</strong>. If you did not initiate this request, no action is required — your current password remains secure.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px 32px 32px; border-top: 1px solid #1f2937; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #6b7280;">
                SafeVitals XR Inc. &bull; Enterprise Access & Security
              </p>
              <a href="https://safevitals.in" style="font-size: 11px; color: #10b981; text-decoration: none; font-weight: 600;">
                safevitals.in
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    return this.send({
      to,
      subject,
      html,
      text: `Reset your SafeVitals XR password: ${resetUrl}. This link expires in 1 hour.`,
    });
  }

  /**
   * Send Registration OTP for self-registration email verification
   */
  async sendRegistrationOtp(to: string, otp: string, firstName = 'User'): Promise<boolean> {
    const subject = `[SafeVitals XR] Verify your email – OTP: ${otp}`;
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SafeVitals XR – Email Verification</title>
</head>
<body style="margin: 0; padding: 0; background-color: #07090e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e6edf3;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #07090e; padding: 40px 15px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table role="presentation" width="100%" style="max-width: 560px; background: linear-gradient(180deg, #0d1117 0%, #090d13 100%); border: 1px solid #1f2937; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6);" cellspacing="0" cellpadding="0" border="0">

          <!-- Top Accent Gradient Line -->
          <tr>
            <td style="height: 4px; background: linear-gradient(90deg, #8b5cf6 0%, #06b6d4 50%, #10b981 100%);"></td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 20px 32px; text-align: center;">
              <div style="display: inline-block; padding: 10px 16px; border-radius: 12px; background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.25); margin-bottom: 16px;">
                <span style="font-size: 14px; font-weight: 800; letter-spacing: 2px; color: #8b5cf6; text-transform: uppercase;">
                  ✦ SAFEVITALS <span style="color: #06b6d4;">XR</span>
                </span>
              </div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                Verify Your Email Address
              </h1>
              <p style="margin: 8px 0 0 0; font-size: 13px; color: #9ca3af;">
                Complete your registration to join SafeVitals XR
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 10px 32px 24px 32px;">
              <p style="font-size: 14px; line-height: 1.6; color: #d1d5db; margin: 0 0 20px 0;">
                Hello <strong style="color: #ffffff;">${firstName}</strong>,
              </p>
              <p style="font-size: 14px; line-height: 1.6; color: #d1d5db; margin: 0 0 24px 0;">
                You've initiated self-registration on <strong style="color: #8b5cf6;">SafeVitals XR</strong>. Use the verification code below to confirm your email address. This code is valid for <strong style="color: #ffffff;">5 minutes</strong>.
              </p>

              <!-- OTP Block -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 28px;">
                <tr>
                  <td align="center">
                    <div style="background: linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(6,182,212,0.08) 100%); border: 1px solid rgba(139,92,246,0.35); border-radius: 14px; padding: 28px 24px; display: inline-block; min-width: 200px;">
                      <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: 700; letter-spacing: 2.5px; text-transform: uppercase; color: #8b5cf6;">Verification Code</p>
                      <p style="margin: 0; font-size: 44px; font-weight: 900; letter-spacing: 10px; color: #ffffff; font-variant-numeric: tabular-nums;">${otp}</p>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Warning Box -->
              <div style="background: rgba(239,68,68,0.07); border: 1px solid rgba(239,68,68,0.2); border-radius: 10px; padding: 14px 16px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 12.5px; color: #fca5a5; line-height: 1.5;">
                  🔒 <strong>Never share this code.</strong> SafeVitals XR will never ask for your OTP via phone, chat, or email. If you did not request this, please ignore this email.
                </p>
              </div>

              <p style="font-size: 13px; color: #6b7280; margin: 0;">
                After email verification, your account will be reviewed by an administrator who will assign your role and department before you can log in.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; border-top: 1px solid #1f2937; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #4b5563;">
                © ${new Date().getFullYear()} SafeVitals XR · Spatial Telemetry &amp; Command Platform<br>
                This is an automated security notification. Please do not reply.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    return this.send({
      to,
      subject,
      html,
      text: `Your SafeVitals XR email verification code is: ${otp}. It expires in 5 minutes.`,
    });
  }

  /**
   * Send Workspace Access Granted Notification
   */
  async sendWorkspaceAccessGranted(to: string, firstName = 'User', role = 'Employee', department = 'Workspace'): Promise<boolean> {
    const loginUrl = `${this.frontendUrl}/login`;
    const subject = `[Welcome] Your SafeVitals XR Workspace is Ready`;
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SafeVitals XR Access Granted</title>
</head>
<body style="margin: 0; padding: 0; background-color: #07090e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e6edf3;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #07090e; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 560px; background: linear-gradient(180deg, #0d1117 0%, #090d13 100%); border: 1px solid #1f2937; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6);" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td style="height: 4px; background: linear-gradient(90deg, #10b981 0%, #3b82f6 100%);"></td>
          </tr>
          <tr>
            <td style="padding: 32px 32px 20px 32px; text-align: center;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                Workspace Access Granted
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px 32px 32px;">
              <div style="background: rgba(255,255,255,0.02); border: 1px solid #1f2937; border-radius: 12px; padding: 24px;">
                <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #9ca3af;">
                  Hello <strong style="color: #ffffff;">${firstName}</strong>,
                </p>
                <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #9ca3af;">
                  Your SafeVitals XR enterprise onboarding is fully complete! Your administrator has granted you access and assigned you the role of <strong style="color: #ffffff;">${role}</strong>.
                </p>
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${loginUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 8px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); border: 1px solid rgba(255,255,255,0.1);">
                    Log In to Workspace
                  </a>
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px 32px 32px; border-top: 1px solid #1f2937; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #6b7280;">
                SafeVitals XR Inc. &bull; Next-Gen Spatial Workforce & Telemetry Health
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    return this.send({
      to,
      subject,
      html,
      text: 'Your SafeVitals XR enterprise onboarding is complete! You can now log in.',
    });
  }
}

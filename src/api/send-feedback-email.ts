// api/send-feedback-email.ts
// Backend API route for sending feedback notification emails

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface FeedbackEmailPayload {
  recipientEmail: string;
  recipientName?: string;
  feedbackType: string;
  feedbackMessage: string;
  feedbackRating?: number;
  feedbackId: string;
  timestamp: string;
  dashboardUrl: string;
}

interface EmailProvider {
  sendEmail(payload: FeedbackEmailPayload): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

// Resend Provider Implementation
class ResendProvider implements EmailProvider {
  async sendEmail(payload: FeedbackEmailPayload) {
    try {
      const { data, error } = await resend.emails.send({
        from: 'noreply@notex.com.ng', // Update with your verified domain
        to: [payload.recipientEmail],
        subject: 'New Feedback Received on NoteX',
        html: this.generateEmailHTML(payload),
        text: this.generateEmailText(payload),
      });

      if (error) {
        console.error('Resend API error:', error);
        return { success: false, error: error.message };
      }

      return { success: true, messageId: data?.id };
    } catch (error) {
      console.error('Failed to send email via Resend:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  private generateEmailHTML(payload: FeedbackEmailPayload): string {
    const ratingStars = payload.feedbackRating 
      ? '⭐'.repeat(payload.feedbackRating) 
      : 'N/A';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Feedback Received</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px 40px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                        🎉 New Feedback Received!
                      </h1>
                      <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                        Someone just shared their thoughts on NoteX
                      </p>
                    </td>
                  </tr>

                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <p style="margin: 0 0 24px; color: #333333; font-size: 16px; line-height: 1.6;">
                        ${payload.recipientName ? `Hi ${payload.recipientName},` : 'Hello,'}
                      </p>
                      
                      <p style="margin: 0 0 24px; color: #555555; font-size: 15px; line-height: 1.6;">
                        You've received new feedback on your NoteX platform. Here are the details:
                      </p>

                      <!-- Feedback Card -->
                      <div style="background-color: #f8f9fa; border-left: 4px solid #667eea; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="padding-bottom: 12px;">
                              <strong style="color: #333333; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Feedback Type</strong>
                              <p style="margin: 4px 0 0; color: #667eea; font-size: 15px; font-weight: 600;">
                                ${payload.feedbackType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </p>
                            </td>
                          </tr>
                          
                          ${payload.feedbackRating ? `
                          <tr>
                            <td style="padding-bottom: 12px;">
                              <strong style="color: #333333; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Rating</strong>
                              <p style="margin: 4px 0 0; color: #555555; font-size: 20px;">
                                ${ratingStars}
                              </p>
                            </td>
                          </tr>
                          ` : ''}

                          <tr>
                            <td style="padding-bottom: 12px;">
                              <strong style="color: #333333; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Message</strong>
                              <p style="margin: 8px 0 0; color: #555555; font-size: 15px; line-height: 1.6; font-style: italic;">
                                "${payload.feedbackMessage}"
                              </p>
                            </td>
                          </tr>

                          <tr>
                            <td>
                              <strong style="color: #333333; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Received</strong>
                              <p style="margin: 4px 0 0; color: #888888; font-size: 14px;">
                                ${new Date(payload.timestamp).toLocaleString('en-US', { 
                                  dateStyle: 'full', 
                                  timeStyle: 'short' 
                                })}
                              </p>
                            </td>
                          </tr>
                        </table>
                      </div>

                      <!-- CTA Button -->
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding: 20px 0;">
                            <a href="https://notex.com.ng/dashboard" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">
                              View in Dashboard →
                            </a>
                          </td>
                        </tr>
                      </table>

                      <p style="margin: 24px 0 0; color: #888888; font-size: 13px; line-height: 1.6;">
                        You can review this feedback, analyze sentiment, and generate AI-powered responses directly from your dashboard.
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f8f9fa; padding: 24px 40px; border-top: 1px solid #e9ecef;">
                      <p style="margin: 0 0 8px; color: #888888; font-size: 12px; line-height: 1.5;">
                        This is an automated notification from NoteX. To manage your notification preferences, visit your dashboard settings.
                      </p>
                      <p style="margin: 0; color: #aaaaaa; font-size: 11px;">
                        © ${new Date().getFullYear()} NoteX. All rights reserved.
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
  }

  private generateEmailText(payload: FeedbackEmailPayload): string {
    const ratingText = payload.feedbackRating 
      ? `Rating: ${'⭐'.repeat(payload.feedbackRating)} (${payload.feedbackRating}/5)` 
      : '';

    return `
New Feedback Received on NoteX

${payload.recipientName ? `Hi ${payload.recipientName},` : 'Hello,'}

You've received new feedback on your NoteX platform.

Feedback Details:
------------------
Type: ${payload.feedbackType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
${ratingText}
Message: "${payload.feedbackMessage}"
Received: ${new Date(payload.timestamp).toLocaleString()}

View and respond to this feedback in your dashboard:
${payload.dashboardUrl}

---
This is an automated notification from NoteX.
© ${new Date().getFullYear()} NoteX. All rights reserved.
    `.trim();
  }
}

// SendGrid Provider (Alternative - commented out)
/*
import sgMail from '@sendgrid/mail';

class SendGridProvider implements EmailProvider {
  constructor() {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
  }

  async sendEmail(payload: FeedbackEmailPayload) {
    try {
      const msg = {
        to: payload.recipientEmail,
        from: 'notifications@yourdomain.com',
        subject: 'New Feedback Received on NoteX',
        text: this.generateEmailText(payload),
        html: this.generateEmailHTML(payload),
      };

      const [response] = await sgMail.send(msg);
      return { success: true, messageId: response.headers['x-message-id'] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  // Same HTML/Text generation methods as ResendProvider
}
*/

// Nodemailer Provider (Alternative - commented out)
/*
import nodemailer from 'nodemailer';

class NodemailerProvider implements EmailProvider {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendEmail(payload: FeedbackEmailPayload) {
    try {
      const info = await this.transporter.sendMail({
        from: '"NoteX Feedback" <notifications@yourdomain.com>',
        to: payload.recipientEmail,
        subject: 'New Feedback Received on NoteX',
        text: this.generateEmailText(payload),
        html: this.generateEmailHTML(payload),
      });

      return { success: true, messageId: info.messageId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  // Same HTML/Text generation methods as ResendProvider
}
*/

// Email Service Factory
class EmailService {
  private provider: EmailProvider;

  constructor() {
    // Switch providers easily by changing this line
    this.provider = new ResendProvider();
    // this.provider = new SendGridProvider();
    // this.provider = new NodemailerProvider();
  }

  async sendFeedbackNotification(payload: FeedbackEmailPayload) {
    return this.provider.sendEmail(payload);
  }
}

// Rate limiting store (in-memory, use Redis for production)
const emailRateLimiter = new Map<string, number[]>();

function isRateLimited(userId: string, maxEmails = 10, windowMs = 60000): boolean {
  const now = Date.now();
  const userAttempts = emailRateLimiter.get(userId) || [];
  
  // Remove attempts outside the time window
  const recentAttempts = userAttempts.filter(timestamp => now - timestamp < windowMs);
  
  if (recentAttempts.length >= maxEmails) {
    return true;
  }
  
  recentAttempts.push(now);
  emailRateLimiter.set(userId, recentAttempts);
  return false;
}

// API Handler (for Vercel/Next.js/Express)
export default async function handler(req: any, res: any) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication (example using Supabase JWT)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing token' });
    }

    // Extract and verify token with Supabase (implement based on your auth setup)
    const token = authHeader.replace('Bearer ', '');
    
    // For production, verify the token with Supabase:
    // const { data: { user }, error } = await supabase.auth.getUser(token);
    // if (error || !user) return res.status(401).json({ error: 'Invalid token' });

    const {
      recipientEmail,
      recipientName,
      feedbackType,
      feedbackMessage,
      feedbackRating,
      feedbackId,
      timestamp,
      userId
    } = req.body;

    // Validate required fields
    if (!recipientEmail || !feedbackMessage || !feedbackType || !userId) {
      return res.status(400).json({ 
        error: 'Missing required fields: recipientEmail, feedbackMessage, feedbackType, userId' 
      });
    }

    // Rate limiting check
    if (isRateLimited(userId)) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded. Please try again later.' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Prepare email payload
    const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/feedback`;
    
    const emailPayload: FeedbackEmailPayload = {
      recipientEmail,
      recipientName,
      feedbackType,
      feedbackMessage: feedbackMessage.substring(0, 500), // Limit message length
      feedbackRating,
      feedbackId,
      timestamp: timestamp || new Date().toISOString(),
      dashboardUrl
    };

    // Send email
    const emailService = new EmailService();
    const result = await emailService.sendFeedbackNotification(emailPayload);

    if (!result.success) {
      console.error('Email sending failed:', result.error);
      return res.status(500).json({ 
        error: 'Failed to send email notification',
        details: result.error 
      });
    }

    // Log success (optional: store in database)
    console.log(`✅ Email sent successfully to ${recipientEmail} (Message ID: ${result.messageId})`);

    return res.status(200).json({ 
      success: true, 
      message: 'Email notification sent successfully',
      messageId: result.messageId 
    });

  } catch (error) {
    console.error('Email API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// For Express.js usage:
/*
import express from 'express';
const app = express();
app.use(express.json());
app.post('/api/send-feedback-email', handler);
*/
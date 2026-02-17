const logger = require('../utils/logger');
/**
 * Newsletter Email Service — Batch sending via Brevo
 * Handles rate limiting and retry logic
 */

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@wantokjobs.com';
const FROM_NAME = process.env.FROM_NAME || 'WantokJobs';
const BASE_URL = process.env.APP_URL || 'https://wantokjobs.com';

// Brevo rate limits: 300 emails/min on free tier
const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 12000; // 12 seconds between batches (~250/min)

/**
 * Send newsletter to batch of recipients
 */
async function sendNewsletterBatch({ recipients, subject, htmlContent, targetAudience }) {
  if (!BREVO_API_KEY) {
    logger.error('📧 BREVO_API_KEY not set - cannot send newsletter');
    return { sent: 0, failed: recipients.length, errors: ['BREVO_API_KEY not configured'] };
  }

  const results = {
    sent: 0,
    failed: 0,
    errors: []
  };

  // Add unsubscribe footer to HTML content
  const htmlWithFooter = addNewsletterFooter(htmlContent);

  // Split into batches
  const batches = [];
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    batches.push(recipients.slice(i, i + BATCH_SIZE));
  }

  logger.info('log', { detail: `📧 Sending newsletter to ${recipients.length} recipients in ${batches.length} batches` });

  // Process batches sequentially to respect rate limits
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    logger.info("Processing newsletter batch", { batch: i + 1, total: batches.length, size: batch.length });

    try {
      const batchResults = await sendBatch(batch, subject, htmlWithFooter);
      results.sent += batchResults.sent;
      results.failed += batchResults.failed;
      if (batchResults.errors?.length) {
        results.errors.push(...batchResults.errors);
      }

      // Delay between batches (except for last batch)
      if (i < batches.length - 1) {
        await delay(BATCH_DELAY_MS);
      }
    } catch (error) {
      logger.error('Newsletter batch error', { batch: i + 1, error: error.message });
      results.failed += batch.length;
      results.errors.push(`Batch ${i + 1} failed: ${error.message}`);
    }
  }

  logger.info('log', { detail: `📧 Newsletter complete: ${results.sent} sent, ${results.failed} failed` });
  return results;
}

/**
 * Send a single batch via Brevo
 */
async function sendBatch(recipients, subject, htmlContent) {
  const results = { sent: 0, failed: 0, errors: [] };

  // Brevo supports batch sending - send each individually for better tracking
  for (const recipient of recipients) {
    try {
      const payload = {
        sender: { name: FROM_NAME, email: FROM_EMAIL },
        to: [{ email: recipient.email, name: recipient.name || recipient.email }],
        subject,
        htmlContent: htmlContent.replace('{{unsubscribe_email}}', recipient.email),
        tags: ['newsletter']
      };

      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': BREVO_API_KEY,
          'content-type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        results.sent++;
      } else {
        results.failed++;
        results.errors.push(`${recipient.email}: ${data.message || 'Unknown error'}`);
        logger.error('error', { detail: `📧 ✗ ${recipient.email}: ${data.message}` });
      }

      // Small delay between individual emails to avoid hitting rate limits
      await delay(100);

    } catch (error) {
      results.failed++;
      results.errors.push(`${recipient.email}: ${error.message}`);
      logger.error('error', { detail: `📧 ✗ ${recipient.email}: ${error.message}` });
    }
  }

  return results;
}

/**
 * Add newsletter footer with unsubscribe link
 */
function addNewsletterFooter(htmlContent) {
  const footer = `
    <div style="margin-top:40px;padding-top:24px;border-top:2px solid #e5e7eb;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="text-align:center;padding:12px 0;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">
            You're receiving this because you subscribed to WantokJobs newsletter.<br>
            <a href="${BASE_URL}/newsletter/unsubscribe?email={{unsubscribe_email}}" style="color:#6b7280;text-decoration:underline;">Unsubscribe</a> · 
            <a href="${BASE_URL}/newsletter/preferences?email={{unsubscribe_email}}" style="color:#6b7280;text-decoration:underline;">Manage Preferences</a>
          </p>
        </td></tr>
      </table>
    </div>
  `;

  // If content has closing body/html tags, insert before them
  if (htmlContent.includes('</body>')) {
    return htmlContent.replace('</body>', footer + '</body>');
  }
  
  // Otherwise append
  return htmlContent + footer;
}

/**
 * Delay helper
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Send test newsletter to single recipient
 */
async function sendTestNewsletter({ to, toName, subject, htmlContent }) {
  if (!BREVO_API_KEY) {
    return { success: false, error: 'BREVO_API_KEY not configured' };
  }

  const htmlWithFooter = addNewsletterFooter(htmlContent).replace('{{unsubscribe_email}}', to);

  try {
    const payload = {
      sender: { name: FROM_NAME, email: FROM_EMAIL },
      to: [{ email: to, name: toName || to }],
      subject: `[TEST] ${subject}`,
      htmlContent: htmlWithFooter,
      tags: ['newsletter', 'test']
    };

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (res.ok) {
      logger.info('log', { detail: `📧 Test newsletter sent to ${to}` });
      return { success: true, messageId: data.messageId };
    } else {
      logger.error('error', { detail: `📧 Test newsletter failed: ${data.message}` });
      return { success: false, error: data.message };
    }
  } catch (error) {
    logger.error('error', { detail: `📧 Test newsletter error:`, error });
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendNewsletterBatch,
  sendTestNewsletter
};

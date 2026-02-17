/**
 * WantokJobs Notification Engine
 * 
 * Centralized notification system for all in-app + email notifications.
 * Every user action that matters flows through here.
 * 
 * Philosophy: Proactive, caring, professional. Notifications should feel
 * like a helpful friend who's looking out for you, not a robot.
 */

const db = require('../database');
const { sendNotificationEmail } = require('./notification-emails');

// ============================================================
// NOTIFICATION TYPES & TEMPLATES
// ============================================================

const NOTIFICATION_TEMPLATES = {
  // === JOBSEEKER NOTIFICATIONS ===
  welcome_jobseeker: {
    title: 'Welcome to WantokJobs! 🎉',
    message: (data) => `Hi ${data.name}! Welcome to WantokJobs — PNG's AI-powered job platform. Complete your profile to get matched with the best opportunities. Let's find your dream job!`,
    icon: '👋'
  },
  application_status_changed: {
    title: (data) => `Application Update: ${data.status}`,
    message: (data) => {
      const msgs = {
        screening: `Great news! Your application for "${data.jobTitle}" is being reviewed. The employer is interested!`,
        shortlisted: `Congratulations! 🎉 You've been shortlisted for "${data.jobTitle}". The employer wants to know more about you!`,
        interview: `Exciting! 🌟 You've been selected for an interview for "${data.jobTitle}". Check your email for details.`,
        offered: `Amazing news! 🎊 You've received an offer for "${data.jobTitle}"! Log in to review the details.`,
        rejected: `We appreciate your interest in "${data.jobTitle}". While this role wasn't the right match, don't give up — new opportunities are posted daily!`,
        withdrawn: `Your application for "${data.jobTitle}" has been withdrawn.`
      };
      return msgs[data.status] || `Your application for "${data.jobTitle}" status changed to ${data.status}.`;
    },
    icon: '📋'
  },
  new_matching_job: {
    title: 'New Job Match! 🎯',
    message: (data) => `"${data.jobTitle}" at ${data.companyName} matches your profile (${data.matchScore}% match). This could be the one!`,
    icon: '🎯'
  },
  profile_viewed: {
    title: 'Someone viewed your profile 👀',
    message: (data) => `An employer${data.companyName ? ` (${data.companyName})` : ''} viewed your profile. Make sure it's up to date!`,
    icon: '👀'
  },
  saved_job_expiring: {
    title: 'Saved job closing soon ⏰',
    message: (data) => `"${data.jobTitle}" closes in ${data.daysLeft} days. Apply now before it's too late!`,
    icon: '⏰'
  },
  profile_incomplete: {
    title: 'Complete your profile for better matches 📝',
    message: (data) => `Your profile is ${data.completeness}% complete. Add your ${data.missingSections} to increase your visibility to employers by ${data.boostEstimate}%.`,
    icon: '📝'
  },
  weekly_digest_jobseeker: {
    title: 'Your Weekly Job Digest 📬',
    message: (data) => `${data.newJobs} new jobs match your profile this week. ${data.topMatch ? `Top match: "${data.topMatch}" (${data.topScore}%)` : 'Update your profile to improve matches!'}`,
    icon: '📬'
  },
  interview_scheduled: {
    title: 'Interview Scheduled! 🎤',
    message: (data) => `Your interview for "${data.jobTitle}" is scheduled for ${data.interviewDate} at ${data.interviewTime}. ${data.interviewType === 'video' ? 'Video call link in your email.' : data.interviewType === 'phone' ? 'They will call you.' : 'Check your email for location details.'}`,
    icon: '🎤'
  },

  // === EMPLOYER NOTIFICATIONS ===
  welcome_employer: {
    title: 'Welcome to WantokJobs! 🏢',
    message: (data) => `Welcome, ${data.companyName || data.name}! You now have access to 30,000+ job seekers across PNG. Post your first job to start receiving applications.`,
    icon: '🏢'
  },
  new_application: {
    title: 'New Application Received 📩',
    message: (data) => `${data.applicantName} applied for "${data.jobTitle}". ${data.matchScore ? `AI Match Score: ${data.matchScore}%` : 'Review their application now!'}`,
    icon: '📩'
  },
  job_expiring: {
    title: 'Job posting expiring soon ⏳',
    message: (data) => `"${data.jobTitle}" expires in ${data.daysLeft} days (${data.applicationsCount} applications so far). Renew or close it?`,
    icon: '⏳'
  },
  job_expired: {
    title: 'Job posting expired',
    message: (data) => `"${data.jobTitle}" has expired after receiving ${data.applicationsCount} applications. Repost it or post a new one?`,
    icon: '📅'
  },
  application_milestone: {
    title: (data) => `${data.count} applications received! 🎉`,
    message: (data) => `"${data.jobTitle}" has received ${data.count} applications. Time to review and shortlist your top candidates.`,
    icon: '🎉'
  },
  ai_match_found: {
    title: 'High-quality candidate found! ⭐',
    message: (data) => `${data.candidateName} is a ${data.matchScore}% match for "${data.jobTitle}". Their skills in ${data.topSkills} make them a strong fit.`,
    icon: '⭐'
  },
  quality_score_alert: {
    title: 'Improve your job posting 📊',
    message: (data) => `"${data.jobTitle}" scored ${data.score}/100 on quality. ${data.suggestion}`,
    icon: '📊'
  },
  subscription_expiring: {
    title: 'Subscription expiring soon 🔔',
    message: (data) => `Your ${data.planName} plan expires in ${data.daysLeft} days. Renew to keep your jobs active and access to candidate search.`,
    icon: '🔔'
  },
  subscription_expired: {
    title: 'Subscription expired',
    message: (data) => `Your ${data.planName} plan has expired. Active job postings will be hidden. Renew to restore them.`,
    icon: '⚠️'
  },
  payment_confirmed: {
    title: 'Payment confirmed ✅',
    message: (data) => `Payment of K${data.amount} for ${data.planName} received. Invoice #${data.invoiceNumber}. Thank you!`,
    icon: '✅'
  },
  weekly_digest_employer: {
    title: 'Your Weekly Recruitment Summary 📊',
    message: (data) => `This week: ${data.newApplications} new applications, ${data.totalViews} job views. ${data.topJob ? `Most popular: "${data.topJob}"` : ''}`,
    icon: '📊'
  },
  new_company_review: {
    title: 'New company review posted',
    message: (data) => `Someone left a ${data.rating}-star review for ${data.companyName}. ${data.approved ? 'It\'s now visible on your profile.' : 'It\'s pending admin approval.'}`,
    icon: '⭐'
  },

  // === ADMIN NOTIFICATIONS ===
  new_employer_registered: {
    title: 'New employer registered 🏢',
    message: (data) => `${data.companyName || data.name} (${data.email}) just registered as an employer. Review and verify their account.`,
    icon: '🏢'
  },
  new_job_posted: {
    title: 'New job posted',
    message: (data) => `"${data.jobTitle}" posted by ${data.companyName}. ${data.qualityScore ? `Quality score: ${data.qualityScore}/100.` : 'Review for approval.'}`,
    icon: '💼'
  },
  order_received: {
    title: 'New order received 💰',
    message: (data) => `${data.companyName} placed an order for ${data.planName} (K${data.amount}). ${data.paymentMethod === 'bank_transfer' ? 'Awaiting bank transfer confirmation.' : 'Payment processed.'}`,
    icon: '💰'
  },
  suspicious_activity: {
    title: 'Suspicious activity detected ⚠️',
    message: (data) => `${data.activityType}: ${data.details}. User: ${data.userEmail || 'Unknown'}. IP: ${data.ipAddress || 'Unknown'}.`,
    icon: '⚠️'
  },
  agent_run_failed: {
    title: 'AI Agent failed ❌',
    message: (data) => `${data.agentName} agent failed: ${data.error}. Last successful run: ${data.lastSuccess || 'Never'}.`,
    icon: '❌'
  },
  daily_platform_summary: {
    title: 'Daily Platform Summary 📈',
    message: (data) => `Today: ${data.newUsers} new users, ${data.newJobs} new jobs, ${data.newApplications} applications, K${data.revenue} revenue.`,
    icon: '📈'
  },
  contact_form_received: {
    title: 'New contact message 📧',
    message: (data) => `From ${data.name} (${data.email}): "${data.subject}". Reply from the admin panel.`,
    icon: '📧'
  },
  job_reported: {
    title: 'Job reported by user 🚩',
    message: (data) => `"${data.jobTitle}" was reported by ${data.reporterEmail}. Reason: ${data.reason}.`,
    icon: '🚩'
  },

  // === SHARED ===
  new_message: {
    title: 'New message received 💬',
    message: (data) => `${data.senderName} sent you a message: "${data.subject || data.preview}"`,
    icon: '💬'
  },
  password_changed: {
    title: 'Password changed 🔒',
    message: () => 'Your password has been changed successfully. If you didn\'t do this, contact support immediately.',
    icon: '🔒'
  },
};

// ============================================================
// CORE NOTIFICATION FUNCTIONS
// ============================================================

/**
 * Create an in-app notification
 */
function notify(userId, type, data = {}) {
  try {
    const template = NOTIFICATION_TEMPLATES[type];
    if (!template) {
      console.warn(`Unknown notification type: ${type}`);
      return null;
    }

    const title = typeof template.title === 'function' ? template.title(data) : template.title;
    const message = typeof template.message === 'function' ? template.message(data) : template.message;

    // Generate deep link if applicable
    let link = null;
    if (data.jobId) {
      link = `/jobs/${data.jobId}`;
    } else if (data.applicationId) {
      link = `/dashboard/applications/${data.applicationId}`;
    } else if (data.messageId) {
      link = `/dashboard/messages/${data.messageId}`;
    }

    // Check if notification table has link column (backward compatible)
    const hasLinkColumn = db.prepare("SELECT * FROM pragma_table_info('notifications') WHERE name='link'").get();
    
    let result;
    if (hasLinkColumn) {
      result = db.prepare(`
        INSERT INTO notifications (user_id, type, title, message, data, link)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(userId, type, title, message, JSON.stringify(data), link);
    } else {
      result = db.prepare(`
        INSERT INTO notifications (user_id, type, title, message, data)
        VALUES (?, ?, ?, ?, ?)
      `).run(userId, type, title, message, JSON.stringify(data));
    }

    // Send email notification for critical types (async, don't block)
    setImmediate(() => {
      sendNotificationEmail(userId, type, data, title, message).catch(err => {
        console.error('Email notification failed:', err.message);
      });
    });

    return result.lastInsertRowid;
  } catch (error) {
    console.error(`Notification error (${type} for user ${userId}):`, error.message);
    return null;
  }
}

/**
 * Notify multiple users
 */
function notifyMany(userIds, type, data = {}) {
  const results = [];
  for (const userId of userIds) {
    results.push(notify(userId, type, data));
  }
  return results;
}

/**
 * Notify all admins
 */
function notifyAdmins(type, data = {}) {
  try {
    const admins = db.prepare("SELECT id FROM users WHERE role = 'admin'").all();
    return notifyMany(admins.map(a => a.id), type, data);
  } catch (error) {
    console.error('Notify admins error:', error.message);
    return [];
  }
}

/**
 * Get unread notification count for a user
 */
function getUnreadCount(userId) {
  try {
    const result = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0').get(userId);
    return result.count;
  } catch (error) {
    return 0;
  }
}

/**
 * Auto-detect and fire notifications based on events
 * Called from route handlers after key actions
 */
const events = {
  // When a jobseeker registers
  onUserRegistered(user) {
    if (user.role === 'jobseeker') {
      notify(user.id, 'welcome_jobseeker', { name: user.name });
    } else if (user.role === 'employer') {
      notify(user.id, 'welcome_employer', { name: user.name, companyName: user.companyName });
      notifyAdmins('new_employer_registered', { name: user.name, email: user.email, companyName: user.companyName });
    }
  },

  // When application status changes
  onApplicationStatusChanged(application, newStatus, job) {
    notify(application.jobseeker_id, 'application_status_changed', {
      jobTitle: job.title,
      status: newStatus,
      applicationId: application.id,
      jobId: job.id
    });
  },

  // When a new application is submitted
  onNewApplication(application, job, applicant) {
    notify(job.employer_id, 'new_application', {
      applicantName: applicant.name,
      jobTitle: job.title,
      jobId: job.id,
      applicationId: application.id,
      matchScore: application.match_score
    });

    // Check milestones
    const count = db.prepare('SELECT COUNT(*) as c FROM applications WHERE job_id = ?').get(job.id).c;
    if ([10, 25, 50, 100].includes(count)) {
      notify(job.employer_id, 'application_milestone', {
        jobTitle: job.title,
        jobId: job.id,
        count
      });
    }
  },

  // When a new job is posted
  onJobPosted(job, employer) {
    notifyAdmins('new_job_posted', {
      jobTitle: job.title,
      companyName: employer.company_name || employer.name,
      jobId: job.id,
      qualityScore: job.quality_score
    });
  },

  // When an order is placed
  onOrderCreated(order, employer, plan) {
    notify(employer.id, 'payment_confirmed', {
      amount: order.amount,
      planName: plan.name,
      invoiceNumber: order.invoice_number
    });
    notifyAdmins('order_received', {
      companyName: employer.company_name || employer.name,
      planName: plan.name,
      amount: order.amount,
      paymentMethod: order.payment_method
    });
  },

  // When a message is sent
  onMessageSent(message, sender) {
    notify(message.to_user_id, 'new_message', {
      senderName: sender.name,
      subject: message.subject,
      preview: message.body?.substring(0, 100),
      messageId: message.id
    });
  },

  // When a contact form is submitted
  onContactFormSubmitted(contactMsg) {
    notifyAdmins('contact_form_received', {
      name: contactMsg.name,
      email: contactMsg.email,
      subject: contactMsg.subject
    });
  },

  // When password is changed
  onPasswordChanged(user) {
    notify(user.id, 'password_changed', {});
  },

  // When an interview is scheduled
  onInterviewScheduled(application, interview) {
    const dateObj = new Date(interview.scheduled_at);
    const dateStr = dateObj.toLocaleDateString('en-US', { 
      month: 'short', day: 'numeric', year: 'numeric' 
    });
    const timeStr = dateObj.toLocaleTimeString('en-US', { 
      hour: 'numeric', minute: '2-digit', hour12: true 
    });

    notify(application.jobseeker_id, 'interview_scheduled', {
      jobTitle: application.job_title,
      interviewDate: dateStr,
      interviewTime: timeStr,
      interviewType: interview.type,
      location: interview.location,
      videoLink: interview.video_link,
      applicationId: application.id,
      jobId: application.job_id
    });
  },

  // When a company review is posted
  onCompanyReviewPosted(review, company) {
    notify(company.user_id, 'new_company_review', {
      rating: review.rating,
      companyName: company.company_name,
      approved: false // pending admin approval
    });
  },

  // Batch: check for expiring jobs (run by agent/cron)
  checkExpiringJobs() {
    try {
      // Jobs expiring in 7 days
      const expiring = db.prepare(`
        SELECT j.*, u.id as employer_user_id,
          (SELECT COUNT(*) FROM applications WHERE job_id = j.id) as app_count
        FROM jobs j
        JOIN users u ON j.employer_id = u.id
        WHERE j.status = 'active'
          AND j.application_deadline IS NOT NULL
          AND date(j.application_deadline) BETWEEN date('now') AND date('now', '+7 days')
      `).all();

      for (const job of expiring) {
        const daysLeft = Math.ceil((new Date(job.application_deadline) - new Date()) / 86400000);
        notify(job.employer_user_id, 'job_expiring', {
          jobTitle: job.title,
          jobId: job.id,
          daysLeft,
          applicationsCount: job.app_count
        });
      }

      // Jobs that just expired
      const expired = db.prepare(`
        SELECT j.*, u.id as employer_user_id,
          (SELECT COUNT(*) FROM applications WHERE job_id = j.id) as app_count
        FROM jobs j
        JOIN users u ON j.employer_id = u.id
        WHERE j.status = 'active'
          AND j.application_deadline IS NOT NULL
          AND date(j.application_deadline) < date('now')
      `).all();

      for (const job of expired) {
        db.prepare("UPDATE jobs SET status = 'closed', updated_at = datetime('now') WHERE id = ?").run(job.id);
        notify(job.employer_user_id, 'job_expired', {
          jobTitle: job.title,
          jobId: job.id,
          applicationsCount: job.app_count
        });
      }

      return { expiringSoon: expiring.length, justExpired: expired.length };
    } catch (error) {
      console.error('checkExpiringJobs error:', error.message);
      return { error: error.message };
    }
  },

  // Batch: check for incomplete profiles (run by agent/cron)
  checkIncompleteProfiles() {
    try {
      const incomplete = db.prepare(`
        SELECT u.id, u.name, p.skills, p.education, p.work_history, p.cv_url, p.bio, p.phone, p.location
        FROM users u
        JOIN profiles_jobseeker p ON p.user_id = u.id
        WHERE u.role = 'jobseeker'
          AND p.profile_complete = 0
          AND u.created_at < datetime('now', '-1 day')
      `).all();

      let nudged = 0;
      for (const user of incomplete) {
        const missing = [];
        if (!user.skills || user.skills === '[]') missing.push('skills');
        if (!user.education || user.education === '[]') missing.push('education');
        if (!user.work_history || user.work_history === '[]') missing.push('work experience');
        if (!user.cv_url) missing.push('CV/resume');
        if (!user.bio) missing.push('bio');

        if (missing.length > 0) {
          const filled = 7 - missing.length;
          const completeness = Math.round((filled / 7) * 100);

          // Only nudge once per week
          const recentNudge = db.prepare(`
            SELECT id FROM notifications 
            WHERE user_id = ? AND type = 'profile_incomplete'
              AND created_at > datetime('now', '-7 days')
          `).get(user.id);

          if (!recentNudge) {
            notify(user.id, 'profile_incomplete', {
              completeness,
              missingSections: missing.slice(0, 3).join(', '),
              boostEstimate: missing.length * 15
            });
            nudged++;
          }
        }
      }
      return { checked: incomplete.length, nudged };
    } catch (error) {
      console.error('checkIncompleteProfiles error:', error.message);
      return { error: error.message };
    }
  },

  // Batch: saved jobs about to expire
  checkExpiringaSavedJobs() {
    try {
      const expiring = db.prepare(`
        SELECT sj.user_id, j.title, j.id as job_id, j.application_deadline
        FROM saved_jobs sj
        JOIN jobs j ON sj.job_id = j.id
        WHERE j.status = 'active'
          AND j.application_deadline IS NOT NULL
          AND date(j.application_deadline) BETWEEN date('now') AND date('now', '+3 days')
      `).all();

      for (const item of expiring) {
        const daysLeft = Math.ceil((new Date(item.application_deadline) - new Date()) / 86400000);
        
        const recentNotif = db.prepare(`
          SELECT id FROM notifications 
          WHERE user_id = ? AND type = 'saved_job_expiring'
            AND json_extract(data, '$.jobId') = ?
            AND created_at > datetime('now', '-2 days')
        `).get(item.user_id, item.job_id);

        if (!recentNotif) {
          notify(item.user_id, 'saved_job_expiring', {
            jobTitle: item.title,
            jobId: item.job_id,
            daysLeft
          });
        }
      }
      return { expiringNotified: expiring.length };
    } catch (error) {
      console.error('checkExpiringSavedJobs error:', error.message);
      return { error: error.message };
    }
  }
};

module.exports = { notify, notifyMany, notifyAdmins, getUnreadCount, events, NOTIFICATION_TEMPLATES };

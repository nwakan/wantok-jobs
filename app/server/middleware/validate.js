const { z } = require('zod');

/**
 * Zod validation middleware factory
 * Usage: router.post('/path', validate(schema), handler)
 */
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error?.errors || [];
      return res.status(400).json({
        error: errors[0]?.message || 'Validation failed',
        details: errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    req.body = result.data;
    next();
  };
}

// === Auth schemas ===
const registerSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128),
  name: z.string().min(1, 'Name is required').max(255).trim(),
  role: z.enum(['jobseeker', 'employer'], { message: 'Role must be jobseeker or employer' }),
  phone: z.string().max(20).optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  password: z.string().min(1, 'Password is required').max(128),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required').max(128),
  newPassword: z.string().min(6, 'New password must be at least 6 characters').max(128),
});

// === Job schemas ===
const postJobSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(255).trim(),
  description: z.string().min(20, 'Description must be at least 20 characters').max(10000).trim(),
  location: z.string().max(255).trim().optional(),
  country: z.string().max(100).optional().default('Papua New Guinea'),
  job_type: z.enum(['full-time', 'part-time', 'contract', 'casual', 'internship']).optional().default('full-time'),
  experience_level: z.string().max(50).optional(),
  industry: z.string().max(100).optional(),
  category_slug: z.string().min(1, 'Category is required').max(100),
  skills: z.string().max(5000).optional(), // JSON array
  remote_work: z.boolean().optional().default(false),
  salary_min: z.union([z.string(), z.number()]).optional().transform(v => v ? Number(v) : undefined),
  salary_max: z.union([z.string(), z.number()]).optional().transform(v => v ? Number(v) : undefined),
  salary_currency: z.string().max(3).optional().default('PGK'),
  application_deadline: z.string().optional(),
  application_method: z.enum(['internal', 'external_url', 'email']).optional().default('internal'),
  application_url: z.string().url().max(500).optional().or(z.literal('')),
  application_email: z.string().email().max(255).optional().or(z.literal('')),
  requirements: z.string().max(5000).optional(), // JSON array
  screening_questions: z.string().max(5000).optional(), // JSON array
  status: z.enum(['draft', 'active', 'closed']).optional().default('active'),
  category_id: z.number().int().positive().optional(),
  benefits: z.string().max(5000).optional(),
  expires_at: z.string().optional(),
  is_remote: z.number().int().min(0).max(1).optional().default(0),
}).refine(data => {
  if (data.salary_min && data.salary_max) return Number(data.salary_max) >= Number(data.salary_min);
  return true;
}, { message: 'salary_max must be >= salary_min' })
.refine(data => {
  if (data.application_method === 'external_url') return !!data.application_url;
  return true;
}, { message: 'application_url is required when using external URL method' })
.refine(data => {
  if (data.application_method === 'email') return !!data.application_email;
  return true;
}, { message: 'application_email is required when using email method' });

// === Application schemas ===
const applySchema = z.object({
  job_id: z.number().int().positive('Valid job ID is required'),
  cover_letter: z.string().max(5000).optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['pending', 'screening', 'shortlisted', 'interview', 'offered', 'hired', 'rejected', 'withdrawn']),
  notes: z.string().max(1000).optional(),
});

// === Contact schema ===
const contactSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255).trim(),
  email: z.string().email('Invalid email address').max(255),
  subject: z.string().min(1, 'Subject is required').max(255).trim(),
  message: z.string().min(10, 'Message must be at least 10 characters').max(5000).trim(),
});

// === Job Alert schema ===
const jobAlertSchema = z.object({
  keywords: z.string().min(1).max(255).trim(),
  location: z.string().max(255).optional(),
  job_type: z.string().max(50).optional(),
  category_id: z.number().int().positive().optional(),
  frequency: z.enum(['daily', 'weekly', 'instant']).default('daily'),
});

// === Message schema ===
const messageSchema = z.object({
  to_user_id: z.number().int().positive('Recipient is required'),
  subject: z.string().min(1, 'Subject is required').max(255).trim(),
  body: z.string().min(1, 'Message body is required').max(5000).trim(),
});

// === Order schema ===
const orderSchema = z.object({
  plan_id: z.number().int().positive('Plan is required'),
  payment_method: z.enum(['bank_transfer']).default('bank_transfer'),
  notes: z.string().max(500).optional(),
});

// === Screening Question schema ===
const screeningQuestionSchema = z.object({
  question: z.string().min(5, 'Question must be at least 5 characters').max(500).trim(),
  question_type: z.enum(['text', 'yes_no', 'multiple_choice', 'number']),
  options: z.any().optional(),
  required: z.number().int().min(0).max(1).optional().default(1),
  sort_order: z.number().int().min(0).optional().default(0),
});

// === Screening Answers schema ===
const screeningAnswersSchema = z.object({
  answers: z.array(z.object({
    question_id: z.number().int().positive('Question ID is required'),
    answer: z.string().max(2000, 'Answer is too long')
  })).min(1, 'At least one answer is required')
});

// === Application Notes schema ===
const applicationNotesSchema = z.object({
  notes: z.string().max(5000, 'Notes are too long').optional()
});

// === Job Status Update schema ===
const jobStatusSchema = z.object({
  status: z.enum(['draft', 'active', 'closed', 'filled'], { message: 'Invalid status' })
});

// === Saved Resume schema ===
const savedResumeSchema = z.object({
  notes: z.string().max(1000).optional(),
  folder: z.string().max(100).optional().default('default')
});

module.exports = {
  validate,
  schemas: {
    register: registerSchema,
    login: loginSchema,
    forgotPassword: forgotPasswordSchema,
    resetPassword: resetPasswordSchema,
    changePassword: changePasswordSchema,
    postJob: postJobSchema,
    apply: applySchema,
    updateStatus: updateStatusSchema,
    contact: contactSchema,
    jobAlert: jobAlertSchema,
    message: messageSchema,
    order: orderSchema,
    screeningQuestion: screeningQuestionSchema,
    screeningAnswers: screeningAnswersSchema,
    applicationNotes: applicationNotesSchema,
    jobStatus: jobStatusSchema,
    savedResume: savedResumeSchema,
  },
};

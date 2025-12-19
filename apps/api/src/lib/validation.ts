import { z } from 'zod';

// ============================================
// PASSWORD VALIDATION
// ============================================

/**
 * Password strength requirements:
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters')
  .refine(
    (password) => /[A-Z]/.test(password),
    'Password must contain at least one uppercase letter'
  )
  .refine(
    (password) => /[a-z]/.test(password),
    'Password must contain at least one lowercase letter'
  )
  .refine(
    (password) => /[0-9]/.test(password),
    'Password must contain at least one number'
  )
  .refine(
    // eslint-disable-next-line no-useless-escape
    (password) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    'Password must contain at least one special character (!@#$%^&*()_+-=[]{};\':"|,.<>/?)'
  );

/**
 * Email validation with additional checks
 */
export const emailSchema = z
  .string()
  .email('Invalid email address')
  .min(5, 'Email is too short')
  .max(255, 'Email is too long')
  .transform((email) => email.toLowerCase().trim())
  .refine(
    (email) => !email.includes('..'),
    'Email contains invalid characters'
  )
  .refine(
    (email) => {
      // Block disposable email domains
      const disposableDomains = [
        'tempmail.com',
        'throwaway.com',
        'guerrillamail.com',
        'mailinator.com',
        'temp-mail.org',
        'fakeinbox.com',
        '10minutemail.com',
        'trashmail.com',
      ];
      const domain = email.split('@')[1];
      return !disposableDomains.includes(domain);
    },
    'Disposable email addresses are not allowed'
  );

/**
 * Name validation
 */
export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name is too long')
  .trim()
  .refine(
    (name) => /^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s\-']+$/.test(name),
    'Name contains invalid characters'
  );

/**
 * Phone validation (Polish format)
 */
export const phoneSchema = z
  .string()
  .optional()
  .refine(
    (phone) => {
      if (!phone) return true;
      // Polish phone number formats
      const cleaned = phone.replace(/[\s()+-]/g, '');
      return /^(\+48)?[0-9]{9}$/.test(cleaned);
    },
    'Invalid phone number format'
  );

// ============================================
// AUTH VALIDATION SCHEMAS
// ============================================

/**
 * Registration validation schema
 */
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  phone: phoneSchema,
  acceptTerms: z
    .boolean()
    .optional()
    .refine((val) => val === undefined || val === true, 'You must accept the terms and conditions'),
});

/**
 * Login validation schema
 */
export const loginSchema = z.object({
  email: z.string().email('Invalid email address').transform((e) => e.toLowerCase().trim()),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
});

/**
 * Forgot password validation schema
 */
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

/**
 * Reset password validation schema
 */
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }
);

/**
 * Change password validation schema
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine(
  (data) => data.newPassword === data.confirmPassword,
  {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }
).refine(
  (data) => data.currentPassword !== data.newPassword,
  {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  }
);

/**
 * Update profile validation schema
 */
export const updateProfileSchema = z.object({
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  phone: phoneSchema,
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check password strength and return score (0-100)
 */
export function getPasswordStrength(password: string): {
  score: number;
  level: 'weak' | 'fair' | 'good' | 'strong';
  suggestions: string[];
} {
  let score = 0;
  const suggestions: string[] = [];

  // Length scoring
  if (password.length >= 8) score += 10;
  if (password.length >= 12) score += 10;
  if (password.length >= 16) score += 10;
  else suggestions.push('Use at least 16 characters for better security');

  // Character variety
  if (/[a-z]/.test(password)) score += 10;
  else suggestions.push('Add lowercase letters');
  
  if (/[A-Z]/.test(password)) score += 10;
  else suggestions.push('Add uppercase letters');
  
  if (/[0-9]/.test(password)) score += 10;
  else suggestions.push('Add numbers');
  
  // eslint-disable-next-line no-useless-escape
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 15;
  else suggestions.push('Add special characters');

  // Bonus for mixing character types
  const charTypes = [
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    // eslint-disable-next-line no-useless-escape
    /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  ].filter(Boolean).length;
  
  if (charTypes >= 3) score += 15;
  if (charTypes === 4) score += 10;

  // Penalty for common patterns
  if (/(.)\1{2,}/.test(password)) {
    score -= 10;
    suggestions.push('Avoid repeated characters');
  }
  
  if (/^[0-9]+$/.test(password)) {
    score -= 20;
    suggestions.push('Don\'t use only numbers');
  }
  
  if (/^[a-zA-Z]+$/.test(password)) {
    score -= 10;
    suggestions.push('Mix letters with numbers and symbols');
  }

  // Common password patterns
  const commonPatterns = [
    'password', 'qwerty', 'abc123', '123456', 'letmein',
    'welcome', 'admin', 'login', 'master', 'dragon',
  ];
  
  if (commonPatterns.some((p) => password.toLowerCase().includes(p))) {
    score -= 30;
    suggestions.push('Avoid common password patterns');
  }

  // Normalize score
  score = Math.max(0, Math.min(100, score));

  // Determine level
  let level: 'weak' | 'fair' | 'good' | 'strong';
  if (score < 30) level = 'weak';
  else if (score < 50) level = 'fair';
  else if (score < 70) level = 'good';
  else level = 'strong';

  return { score, level, suggestions };
}

/**
 * Check if password is in common passwords list
 */
export function isCommonPassword(password: string): boolean {
  const commonPasswords = [
    'password', 'password1', 'password123', '123456', '12345678', '123456789',
    'qwerty', 'abc123', 'monkey', 'master', 'dragon', 'letmein', 'login',
    'admin', 'welcome', 'shadow', 'sunshine', 'princess', 'football',
    'baseball', 'iloveyou', 'trustno1', 'superman', 'batman', 'passw0rd',
    'qwerty123', 'password!', '1234567890', 'zaq12wsx', 'qazwsx',
  ];
  
  return commonPasswords.includes(password.toLowerCase());
}

/**
 * Validate password against common checks
 */
export function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Zod validation
  const result = passwordSchema.safeParse(password);
  if (!result.success) {
    errors.push(...result.error.errors.map((e) => e.message));
  }

  // Common password check
  if (isCommonPassword(password)) {
    errors.push('This password is too common. Please choose a more unique password.');
  }

  // Keyboard pattern check
  const keyboardPatterns = ['qwerty', 'asdfgh', 'zxcvbn', '123456', '098765'];
  if (keyboardPatterns.some((p) => password.toLowerCase().includes(p))) {
    errors.push('Avoid keyboard patterns in your password.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

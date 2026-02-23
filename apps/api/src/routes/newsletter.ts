import express from 'express';
import { prisma } from '../db';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { emailService } from '../services/email.service';
import { discountService } from '../services/discount.service';

const router = express.Router();

// Subscribe to newsletter
// Accepts optional `source` field: 'registration' = auto-verify (user already confirmed email during registration)
router.post('/subscribe', async (req, res) => {
  try {
    const { email, source } = req.body;
    const autoVerify = source === 'registration';

    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'Proszę podać poprawny adres email',
      });
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Check if already subscribed
    const existing = await prisma.newsletter_subscriptions.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      if (existing.unsubscribed_at) {
        // Re-subscribe
        const newToken = crypto.randomBytes(32).toString('hex');
        await prisma.newsletter_subscriptions.update({
          where: { email: normalizedEmail },
          data: {
            unsubscribed_at: null,
            is_verified: autoVerify ? true : false,
            verified_at: autoVerify ? new Date() : null,
            token: newToken,
            subscribed_at: new Date(),
          },
        });

        if (autoVerify) {
          // Generate newsletter discount coupon immediately
          try {
            await discountService.generateNewsletterDiscount(normalizedEmail);
          } catch (e) {
            console.warn('Newsletter discount generation failed (re-sub):', e);
          }
          return res.status(200).json({
            success: true,
            message: 'Zapisano do newslettera! Kupon rabatowy -10% czeka w zakładce Moje Rabaty.',
            verified: true,
          });
        }

        // Send verification email
        await emailService.sendNewsletterVerificationEmail(normalizedEmail, newToken);
        
        return res.status(200).json({
          success: true,
          message: 'Dziękujemy! Na podany adres e-mail wysłaliśmy link potwierdzający.',
        });
      }

      if (existing.is_verified) {
        return res.status(200).json({
          success: true,
          message: 'Ten adres e-mail jest już zapisany do newslettera.',
          verified: true,
        });
      }

      if (autoVerify) {
        // Auto-verify existing unverified subscription
        await prisma.newsletter_subscriptions.update({
          where: { email: normalizedEmail },
          data: {
            is_verified: true,
            verified_at: new Date(),
          },
        });
        try {
          await discountService.generateNewsletterDiscount(normalizedEmail);
        } catch (e) {
          console.warn('Newsletter discount generation failed (auto-verify):', e);
        }
        return res.status(200).json({
          success: true,
          message: 'Zapisano do newslettera! Kupon rabatowy -10% czeka w zakładce Moje Rabaty.',
          verified: true,
        });
      }

      // Not verified yet - resend verification
      await emailService.sendNewsletterVerificationEmail(normalizedEmail, existing.token);
      
      return res.status(200).json({
        success: true,
        message: 'Na podany adres wysłaliśmy ponownie link potwierdzający.',
      });
    }

    // Create new subscription
    const token = crypto.randomBytes(32).toString('hex');
    await prisma.newsletter_subscriptions.create({
      data: {
        id: uuidv4(),
        email: normalizedEmail,
        token,
        is_verified: autoVerify ? true : false,
        verified_at: autoVerify ? new Date() : undefined,
      },
    });

    if (autoVerify) {
      // Generate newsletter discount coupon immediately
      try {
        await discountService.generateNewsletterDiscount(normalizedEmail);
      } catch (e) {
        console.warn('Newsletter discount generation failed (new sub):', e);
      }
      return res.status(201).json({
        success: true,
        message: 'Zapisano do newslettera! Kupon rabatowy -10% czeka w zakładce Moje Rabaty.',
        verified: true,
      });
    }

    // Send verification email
    await emailService.sendNewsletterVerificationEmail(normalizedEmail, token);

    return res.status(201).json({
      success: true,
      message: 'Dziękujemy! Na podany adres e-mail wysłaliśmy link potwierdzający.',
    });
  } catch (error) {
    console.error('Newsletter subscribe error:', error);
    return res.status(500).json({
      success: false,
      message: 'Wystąpił błąd. Spróbuj ponownie później.',
    });
  }
});

// Verify subscription
router.get('/verify/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const subscription = await prisma.newsletter_subscriptions.findUnique({
      where: { token },
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Link weryfikacyjny jest nieprawidłowy lub wygasł.',
      });
    }

    if (subscription.is_verified) {
      return res.status(200).json({
        success: true,
        message: 'Ten adres e-mail został już potwierdzony.',
      });
    }

    await prisma.newsletter_subscriptions.update({
      where: { token },
      data: {
        is_verified: true,
        verified_at: new Date(),
      },
    });

    // Generate newsletter discount coupon
    try {
      await discountService.generateNewsletterDiscount(subscription.email);
    } catch (e) {
      console.warn('Newsletter discount generation failed (verify):', e);
    }

    // Send welcome email
    await emailService.sendNewsletterWelcomeEmail(subscription.email, token);

    return res.status(200).json({
      success: true,
      message: 'Dziękujemy! Twój adres e-mail został potwierdzony.',
    });
  } catch (error) {
    console.error('Newsletter verify error:', error);
    return res.status(500).json({
      success: false,
      message: 'Wystąpił błąd. Spróbuj ponownie później.',
    });
  }
});

// Unsubscribe
router.get('/unsubscribe/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const subscription = await prisma.newsletter_subscriptions.findUnique({
      where: { token },
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Link jest nieprawidłowy.',
      });
    }

    if (subscription.unsubscribed_at) {
      return res.status(200).json({
        success: true,
        message: 'Ten adres e-mail został już wypisany z newslettera.',
      });
    }

    await prisma.newsletter_subscriptions.update({
      where: { token },
      data: {
        unsubscribed_at: new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Zostałeś wypisany z newslettera. Możesz zapisać się ponownie w dowolnym momencie.',
    });
  } catch (error) {
    console.error('Newsletter unsubscribe error:', error);
    return res.status(500).json({
      success: false,
      message: 'Wystąpił błąd. Spróbuj ponownie później.',
    });
  }
});

// Check newsletter subscription status by email
router.get('/status', async (req, res) => {
  try {
    const email = req.query.email as string;

    if (!email) {
      return res.status(400).json({
        success: false,
        subscribed: false,
        verified: false,
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const subscription = await prisma.newsletter_subscriptions.findUnique({
      where: { email: normalizedEmail },
    });

    if (!subscription || subscription.unsubscribed_at) {
      return res.status(200).json({
        success: true,
        subscribed: false,
        verified: false,
      });
    }

    return res.status(200).json({
      success: true,
      subscribed: true,
      verified: subscription.is_verified,
    });
  } catch (error) {
    console.error('Newsletter status error:', error);
    return res.status(200).json({
      success: true,
      subscribed: false,
      verified: false,
    });
  }
});

export default router;

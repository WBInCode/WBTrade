import express from 'express';
import { prisma } from '../db';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { emailService } from '../services/email.service';

const router = express.Router();

// Subscribe to newsletter
router.post('/subscribe', async (req, res) => {
  try {
    const { email } = req.body;

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
            is_verified: false,
            token: newToken,
            subscribed_at: new Date(),
          },
        });

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
        is_verified: false,
      },
    });

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

export default router;

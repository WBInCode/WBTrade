/**
 * Test script for welcome discount email
 * Run with: npx ts-node test-welcome-email.ts
 */

import { discountService } from './src/services/discount.service';
import { emailService } from './src/services/email.service';
import { prisma } from './src/db';

async function testWelcomeEmail() {
  console.log('='.repeat(50));
  console.log('TEST: Welcome Discount Email');
  console.log('='.repeat(50));

  const testEmail = 'milosz.wiater@wb-partners.pl'; // Twój prawdziwy email
  const testFirstName = 'Miłosz';

  try {
    // 1. Find or create test user
    console.log('\n1. Finding/creating test user...');
    let user = await prisma.user.findUnique({
      where: { email: testEmail },
    });

    if (!user) {
      console.log('   Creating new test user...');
      user = await prisma.user.create({
        data: {
          email: testEmail,
          firstName: testFirstName,
          lastName: 'Test',
          password: 'test-password-hash',
          role: 'CUSTOMER',
        },
      });
      console.log(`   ✅ User created: ${user.id}`);
    } else {
      console.log(`   ✅ User exists: ${user.id}`);
    }

    // 2. Generate discount code
    console.log('\n2. Generating discount code...');
    try {
      const discount = await discountService.generateWelcomeDiscount(user.id, user.email);
      console.log(`   ✅ Discount code: ${discount.couponCode}`);
      console.log(`   ✅ Discount percent: ${discount.discountPercent}%`);
      console.log(`   ✅ Expires at: ${discount.expiresAt}`);

      // 3. Send email
      console.log('\n3. Sending email...');
      const result = await emailService.sendWelcomeDiscountEmail(
        user.email,
        user.firstName || 'Użytkowniku',
        discount.couponCode,
        discount.discountPercent,
        discount.expiresAt
      );

      if (result.success) {
        console.log(`   ✅ Email sent! MessageId: ${result.messageId}`);
      } else {
        console.log(`   ❌ Email failed: ${result.error}`);
      }
    } catch (discountError: any) {
      console.log(`   ⚠️ Discount error: ${discountError.message}`);
      
      // Check if user already has a discount
      const existingCoupon = await prisma.coupon.findFirst({
        where: { userId: user.id, couponSource: 'WELCOME_DISCOUNT' },
      });
      
      if (existingCoupon) {
        console.log(`   ℹ️ User already has coupon: ${existingCoupon.code}`);
        console.log(`   ℹ️ Expires: ${existingCoupon.expiresAt}`);
        console.log(`   ℹ️ Used: ${existingCoupon.usedCount} times`);
      }
    }

    // 4. Check RESEND_API_KEY
    console.log('\n4. Checking Resend config...');
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      console.log(`   ✅ RESEND_API_KEY is set (starts with: ${resendKey.substring(0, 10)}...)`);
    } else {
      console.log('   ❌ RESEND_API_KEY is NOT set!');
    }

    const fromEmail = process.env.FROM_EMAIL;
    console.log(`   ℹ️ FROM_EMAIL: ${fromEmail || 'NOT SET'}`);

  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n' + '='.repeat(50));
  console.log('TEST COMPLETE');
  console.log('='.repeat(50));
}

testWelcomeEmail();

/**
 * Loyalty Cron Worker
 *
 * Runs periodic loyalty tasks:
 * - Daily at 08:00: Generate birthday coupons for eligible users
 * - First day of each quarter: Generate quarterly coupons for Platynowy+ users
 * - Monthly for VIP users: Generate monthly coupons
 *
 * Works WITHOUT Redis/BullMQ — uses setInterval with time-of-day checks.
 */

import { loyaltyService } from '../services/loyalty.service';

let lastBirthdayCheckDate = '';
let lastQuarterlyCheckQuarter = '';
let lastMonthlyCheckMonth = '';

function getCurrentQuarter(): string {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3) + 1;
  return `${now.getFullYear()}-Q${q}`;
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}`;
}

async function checkLoyaltyTasks() {
  const now = new Date();
  const today = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const hour = now.getHours();

  // Birthday coupons - run once daily after 8:00 AM
  if (hour >= 8 && today !== lastBirthdayCheckDate) {
    lastBirthdayCheckDate = today;
    try {
      const result = await loyaltyService.processBirthdayCoupons();
      if (result.processed > 0) {
        console.log(`[LoyaltyCron] Birthday coupons: ${result.processed} generated`);
      }
    } catch (error) {
      console.error('[LoyaltyCron] Error processing birthday coupons:', error);
    }
  }

  // Quarterly coupons - run on the 1st of each quarter
  const currentQuarter = getCurrentQuarter();
  const isQuarterStart = now.getDate() === 1 && [0, 3, 6, 9].includes(now.getMonth());
  if (isQuarterStart && hour >= 8 && currentQuarter !== lastQuarterlyCheckQuarter) {
    lastQuarterlyCheckQuarter = currentQuarter;
    try {
      const result = await loyaltyService.processQuarterlyCoupons();
      console.log(`[LoyaltyCron] Quarterly coupons: ${result.processed} generated`);
    } catch (error) {
      console.error('[LoyaltyCron] Error processing quarterly coupons:', error);
    }
  }

  // Monthly coupons for VIP - run on the 1st of each month
  const currentMonth = getCurrentMonth();
  if (now.getDate() === 1 && hour >= 8 && currentMonth !== lastMonthlyCheckMonth) {
    lastMonthlyCheckMonth = currentMonth;
    try {
      const result = await loyaltyService.processMonthlyCoupons();
      if (result.processed > 0) {
        console.log(`[LoyaltyCron] Monthly VIP coupons: ${result.processed} generated`);
      }
    } catch (error) {
      console.error('[LoyaltyCron] Error processing monthly coupons:', error);
    }
  }
}

export function startLoyaltyCronWorker() {
  // Check every 30 minutes
  setInterval(checkLoyaltyTasks, 30 * 60 * 1000);
  // Run initial check after 10 seconds (let server boot first)
  setTimeout(checkLoyaltyTasks, 10 * 1000);
  console.log('✅ Loyalty cron worker started (birthday/quarterly/monthly checks)');
}

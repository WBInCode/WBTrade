'use client';

import { useState, useEffect } from 'react';

interface CountdownTimerProps {
  endTime?: Date;
}

export default function CountdownTimer({ endTime }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({ hours: 2, minutes: 45, seconds: 30 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        let { hours, minutes, seconds } = prev;
        
        if (seconds > 0) {
          seconds--;
        } else if (minutes > 0) {
          minutes--;
          seconds = 59;
        } else if (hours > 0) {
          hours--;
          minutes = 59;
          seconds = 59;
        }
        
        return { hours, minutes, seconds };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatNumber = (num: number) => num.toString().padStart(2, '0');

  return (
    <div className="flex items-center gap-0.5">
      <div className="flex items-baseline gap-0.5">
        <span className="text-xl font-bold text-primary-500">{formatNumber(timeLeft.hours)}</span>
        <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase mr-1">godz</span>
      </div>
      <span className="text-primary-500 font-bold text-lg">:</span>
      <div className="flex items-baseline gap-0.5">
        <span className="text-xl font-bold text-primary-500">{formatNumber(timeLeft.minutes)}</span>
        <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase mr-1">min</span>
      </div>
      <span className="text-primary-500 font-bold text-lg">:</span>
      <div className="flex items-baseline gap-0.5">
        <span className="text-xl font-bold text-primary-500">{formatNumber(timeLeft.seconds)}</span>
        <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase">sek</span>
      </div>
    </div>
  );
}

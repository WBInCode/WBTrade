'use client';

import Link from 'next/link';

interface CategoryIconProps {
  name: string;
  icon: React.ReactNode;
  href: string;
}

export default function CategoryIcon({ name, icon, href }: CategoryIconProps) {
  return (
    <Link 
      href={href}
      className="flex flex-col items-center gap-2 p-3 hover:bg-gray-50 dark:hover:bg-secondary-700 rounded-xl transition-colors group"
    >
      <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-secondary-700 group-hover:bg-primary-50 dark:group-hover:bg-primary-900/30 flex items-center justify-center transition-colors">
        {icon}
      </div>
      <span className="text-xs text-secondary-600 dark:text-secondary-400 group-hover:text-secondary-900 dark:group-hover:text-white text-center">
        {name}
      </span>
    </Link>
  );
}

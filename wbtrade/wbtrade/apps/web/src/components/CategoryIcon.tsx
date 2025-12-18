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
      className="flex flex-col items-center gap-2 p-3 hover:bg-gray-50 rounded-xl transition-colors group"
    >
      <div className="w-14 h-14 rounded-full bg-gray-100 group-hover:bg-primary-50 flex items-center justify-center transition-colors">
        {icon}
      </div>
      <span className="text-xs text-secondary-600 group-hover:text-secondary-900 text-center">
        {name}
      </span>
    </Link>
  );
}

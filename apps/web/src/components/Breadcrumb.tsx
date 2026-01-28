import Link from 'next/link';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm mb-3 sm:mb-4 overflow-x-auto whitespace-nowrap pb-1 -mx-1 px-1 scrollbar-hide">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-1.5 sm:gap-2 shrink-0 last:shrink min-w-0">
          {index > 0 && (
            <span className="text-gray-400">/</span>
          )}
          {item.href ? (
            <Link 
              href={item.href}
              className="text-gray-500 hover:text-primary-500 transition-colors truncate max-w-[80px] sm:max-w-[120px] md:max-w-none"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-primary-500 font-medium truncate max-w-[150px] sm:max-w-[250px] md:max-w-none">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}

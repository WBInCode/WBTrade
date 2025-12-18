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
    <nav className="flex items-center gap-2 text-sm mb-4">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          {index > 0 && (
            <span className="text-gray-400">/</span>
          )}
          {item.href ? (
            <Link 
              href={item.href}
              className="text-gray-500 hover:text-primary-500 transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-primary-500 font-medium">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}

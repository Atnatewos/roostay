'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Breadcrumb({ items, separator = '/', homeLabel = 'Home' }) {
  const pathname = usePathname();

  const generateFromPath = () => {
    const segments = pathname.split('/').filter(Boolean);
    const crumbs = [{ label: homeLabel, href: '/' }];
    let currentPath = '';
    segments.forEach((seg) => {
      currentPath += '/' + seg;
      const label = seg.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      crumbs.push({ label, href: currentPath });
    });
    return crumbs;
  };

  const breadcrumbs = items || generateFromPath();
  if (breadcrumbs.length <= 1) return null;

  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      <ol className="breadcrumb__list">
        {breadcrumbs.map((item, i) => {
          const isLast = i === breadcrumbs.length - 1;
          return (
            <li key={item.href || i} className="breadcrumb__item">
              {isLast ? (
                <span className="breadcrumb__current" aria-current="page">{item.label}</span>
              ) : (
                <>
                  <Link href={item.href} className="breadcrumb__link">{item.label}</Link>
                  <span className="breadcrumb__separator">{separator}</span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

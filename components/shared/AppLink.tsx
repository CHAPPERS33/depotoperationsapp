
'use client'; // Add 'use client' as it uses client-side hooks

import React, { ReactNode, MouseEvent } from 'react';
import Link from 'next/link'; // Import Next.js Link
import { usePathname } from 'next/navigation'; // Import usePathname

interface AppLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  activeClassName?: string; // This can be simplified if using Tailwind variants or similar
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
}

const AppLink: React.FC<AppLinkProps> = ({ href, children, className, activeClassName, onClick }) => {
  const currentPathname = usePathname(); // Get current pathname from Next.js router
  
  // Determine if the link is active. For App Router, compare pathnames directly.
  // query parameters are not part of pathname.
  const isActive = currentPathname === href || (href !== '/' && currentPathname.startsWith(href + '/'));

  const combinedClassName = `${className || ''} ${isActive && activeClassName ? activeClassName : ''}`.trim();

  // For Next.js Link, the href should be the direct path.
  // The # is not needed for App Router navigation.
  return (
    <Link href={href} onClick={onClick} className={combinedClassName || undefined} aria-current={isActive ? 'page' : undefined}>
      {children}
    </Link>
  );
};

export default AppLink;

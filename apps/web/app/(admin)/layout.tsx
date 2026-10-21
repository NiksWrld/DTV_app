'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { apiClient } from '@/lib/api-client';

const adminNav = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/providers', label: 'Providers & Partners' },
  { href: '/admin/users', label: 'Users' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.replace('/login'); return; }
    apiClient.account.get().then((acct) => {
      if (acct.role !== 'admin') { router.replace('/dashboard'); return; }
      setChecked(true);
    }).catch(() => router.replace('/login'));
  }, [router]);

  if (!checked) return null;

  return (
    <div className="min-h-dvh flex">
      <aside className="sticky top-0 h-dvh w-56 border-r bg-card flex flex-col shrink-0">
        <div className="p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Admin</p>
          <Link href="/dashboard" className="text-sm text-primary hover:underline">
            ← Back to App
          </Link>
        </div>
        <Separator />
        <nav className="flex-1 p-2 space-y-1">
          {adminNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                pathname === item.href
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-6 lg:p-8 max-w-5xl">
        {children}
      </main>
    </div>
  );
}

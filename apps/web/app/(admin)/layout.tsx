'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Store, Users } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { apiClient } from '@/lib/api-client';

const adminNav = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/providers', label: 'Providers', icon: Store },
  { href: '/admin/users', label: 'Users', icon: Users },
];

function isActive(href: string, pathname: string) {
  if (href === '/admin') return pathname === '/admin';
  return pathname === href || pathname.startsWith(`${href}/`);
}

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
    <div className="min-h-dvh md:flex">
      <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r bg-card md:flex">
        <div className="p-4">
          <p className="mb-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">Admin</p>
          <Link href="/dashboard" className="text-sm text-primary hover:underline">
            ← Back to App
          </Link>
        </div>
        <Separator />
        <nav className="flex-1 space-y-1 p-2" aria-label="Admin">
          {adminNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href, pathname) ? 'page' : undefined}
              className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                isActive(item.href, pathname)
                  ? 'bg-primary/10 font-medium text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              {item.href === '/admin/providers' ? 'Providers & Partners' : item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex min-h-14 items-center justify-between border-b bg-background/95 px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[env(safe-area-inset-top)] backdrop-blur md:hidden">
          <Link href="/dashboard" className="inline-flex min-h-11 items-center text-sm font-medium text-primary">
            ← App
          </Link>
          <span className="font-bold text-primary">Admin</span>
          <span className="w-11" aria-hidden="true" />
        </header>

        <main
          id="main"
          className="mx-auto w-full min-w-0 max-w-5xl flex-1 px-[max(1rem,env(safe-area-inset-left))] pt-4 pr-[max(1rem,env(safe-area-inset-right))] pb-[calc(5.25rem+env(safe-area-inset-bottom))] sm:px-6 sm:pt-6 md:px-8 md:pt-8 md:pb-8"
        >
          {children}
        </main>

        <nav
          className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
          aria-label="Admin"
        >
          <div className="grid grid-cols-3">
            {adminNav.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href, pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium ${
                    active ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  <Icon aria-hidden="true" className="size-5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}

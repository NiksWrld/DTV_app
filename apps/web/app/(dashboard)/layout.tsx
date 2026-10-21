'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { apiClient } from '@/lib/api-client';

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/onboarding', label: 'Onboarding' },
  { href: '/checklist', label: 'Application' },
  { href: '/compliance', label: 'In Thailand' },
  { href: '/documents', label: 'Documents' },
  { href: '/providers', label: 'DTV Programs' },
  { href: '/partners', label: 'Partners' },
  { href: '/plan', label: 'My Plan' },
  { href: '/guides', label: 'Guides' },
  { href: '/review', label: 'Review' },
];

type AccountSummary = { display_name?: string; email: string; avatar_url?: string; role?: string };

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const [acct, setAcct] = useState<AccountSummary | null>(null);

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      router.replace('/login');
    } else {
      setChecked(true);
      apiClient.account.get().then((a) =>
        setAcct({ display_name: a.display_name, email: a.email, avatar_url: a.avatar_url, role: a.role })
      ).catch(() => {});
    }
  }, [router]);

  if (!checked) return null;

  return (
    <div className="min-h-dvh flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 h-dvh w-64 border-r bg-card flex flex-col transition-transform md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4">
          <Link href="/dashboard" className="text-lg font-bold text-primary">
            DTV Workspace
          </Link>
        </div>
        <Separator />
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
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
        <Separator />
        <div className="p-3 space-y-1">
          <Link
            href="/account"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-accent transition-colors"
          >
            {acct?.avatar_url ? (
              <img src={acct.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                {(acct?.display_name ?? acct?.email ?? '?').slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {acct?.display_name ?? acct?.email ?? 'Account'}
              </p>
              {acct?.display_name && (
                <p className="text-xs text-muted-foreground truncate">{acct.email}</p>
              )}
            </div>
          </Link>
          {acct?.role === 'admin' && (
            <Link
              href="/admin"
              onClick={() => setSidebarOpen(false)}
              className="block px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              ⚙ Admin
            </Link>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground"
            onClick={() => {
              localStorage.removeItem('token');
              router.push('/login');
            }}
          >
            Log out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-dvh">
        {/* Mobile header */}
        <header className="md:hidden border-b h-14 flex items-center px-4 gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 rounded-md hover:bg-accent"
            aria-label="Open menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="font-bold text-primary">DTV Workspace</span>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-5xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

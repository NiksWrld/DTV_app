'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ClipboardList, Compass, FileText, LayoutDashboard, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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

const primaryNav = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/checklist', label: 'Apply', icon: ClipboardList },
  { href: '/documents', label: 'Docs', icon: FileText },
  { href: '/providers', label: 'Programs', icon: Compass },
];

const moreItems = [
  { href: '/onboarding', label: 'Onboarding' },
  { href: '/compliance', label: 'In Thailand' },
  { href: '/partners', label: 'Partners' },
  { href: '/plan', label: 'My Plan' },
  { href: '/guides', label: 'Guides' },
  { href: '/review', label: 'Review' },
  { href: '/account', label: 'Profile' },
];

type AccountSummary = { display_name?: string; email: string; avatar_url?: string; role?: string };

function isActive(href: string, pathname: string) {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const [acct, setAcct] = useState<AccountSummary | null>(null);

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      router.replace('/login');
      return;
    }
    let leave = false;
    apiClient.account.get().then((a) => {
      if (a.role === 'provider') {
        leave = true;
        router.replace('/provider');
        return;
      }
      setAcct({ display_name: a.display_name, email: a.email, avatar_url: a.avatar_url, role: a.role });
    }).catch(() => {}).finally(() => {
      if (!leave) setChecked(true);
    });
  }, [router]);

  if (!checked) return null;

  const moreActive = moreItems.some((item) => isActive(item.href, pathname)) || pathname.startsWith('/admin');

  function logout() {
    localStorage.removeItem('token');
    router.push('/login');
  }

  return (
    <div className="min-h-dvh md:flex">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r bg-card md:flex">
        <div className="p-4">
          <Link href="/dashboard" className="text-lg font-bold text-primary">
            DTV Workspace
          </Link>
        </div>
        <Separator />
        <nav className="flex-1 space-y-1 p-2" aria-label="Primary">
          {navItems.map((item) => (
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
              {item.label}
            </Link>
          ))}
        </nav>
        <Separator />
        <div className="space-y-1 p-3">
          <Link
            href="/account"
            className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-accent"
          >
            <AccountMark acct={acct} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {acct?.display_name ?? acct?.email ?? 'Account'}
              </p>
              {acct?.display_name && (
                <p className="truncate text-xs text-muted-foreground">{acct.email}</p>
              )}
            </div>
          </Link>
          {acct?.role === 'admin' && (
            <Link
              href="/admin"
              className="block rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              ⚙ Admin
            </Link>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground"
            onClick={logout}
          >
            Log out
          </Button>
        </div>
      </aside>

      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex min-h-14 items-center justify-between gap-3 border-b bg-background/95 px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[env(safe-area-inset-top)] backdrop-blur md:hidden">
          <Link href="/dashboard" className="text-lg font-bold text-primary">
            DTV
          </Link>
          <Link
            href="/account"
            aria-label="Account"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full"
          >
            <AccountMark acct={acct} />
          </Link>
        </header>

        <main
          id="main"
          className="mx-auto w-full min-w-0 max-w-5xl flex-1 px-[max(1rem,env(safe-area-inset-left))] pt-4 pr-[max(1rem,env(safe-area-inset-right))] pb-[calc(5.25rem+env(safe-area-inset-bottom))] sm:px-6 sm:pt-6 md:px-8 md:pt-8 md:pb-8"
        >
          {children}
        </main>

        <nav
          className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
          aria-label="Primary"
        >
          <div className="grid grid-cols-5">
            {primaryNav.map((item) => {
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
            <button
              type="button"
              className={`flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium ${
                moreActive ? 'text-primary' : 'text-muted-foreground'
              }`}
              aria-expanded={moreOpen}
              aria-haspopup="dialog"
              onClick={() => setMoreOpen(true)}
            >
              <MoreHorizontal aria-hidden="true" className="size-5" />
              More
            </button>
          </div>
        </nav>

        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetContent
            side="bottom"
            className="max-h-[85dvh] overflow-y-auto rounded-t-xl pb-[max(1.5rem,env(safe-area-inset-bottom))]"
          >
            <SheetHeader>
              <SheetTitle>More</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col px-2 pb-2" aria-label="More">
              {moreItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  aria-current={isActive(item.href, pathname) ? 'page' : undefined}
                  className={`flex min-h-11 items-center rounded-md px-3 text-sm ${
                    isActive(item.href, pathname)
                      ? 'bg-primary/10 font-medium text-primary'
                      : 'text-foreground hover:bg-accent'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              {acct?.role === 'admin' && (
                <Link
                  href="/admin"
                  onClick={() => setMoreOpen(false)}
                  className="flex min-h-11 items-center rounded-md px-3 text-sm text-foreground hover:bg-accent"
                >
                  Admin
                </Link>
              )}
              <Button
                variant="ghost"
                className="mt-1 w-full justify-start text-muted-foreground"
                onClick={logout}
              >
                Log out
              </Button>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

function AccountMark({ acct }: { acct: AccountSummary | null }) {
  if (acct?.avatar_url) {
    return (
      <img src={acct.avatar_url} alt="" className="size-7 shrink-0 rounded-full object-cover" />
    );
  }
  return (
    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
      {(acct?.display_name ?? acct?.email ?? '?').slice(0, 2).toUpperCase()}
    </div>
  );
}

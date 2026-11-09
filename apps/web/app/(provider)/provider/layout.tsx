'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';

export default function ProviderLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      router.replace('/login');
      return;
    }
    apiClient.account.get().then((account) => {
      if (account.role !== 'provider' && account.role !== 'admin') {
        router.replace('/dashboard');
        return;
      }
      setReady(true);
    }).catch(() => router.replace('/login'));
  }, [router]);

  if (!ready) return null;

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 flex min-h-14 items-center justify-between border-b bg-background/95 px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[env(safe-area-inset-top)] backdrop-blur">
        <Link href="/provider" className="text-lg font-bold text-primary">DTV providers</Link>
        <button
          type="button"
          className="inline-flex min-h-11 items-center text-sm text-muted-foreground"
          onClick={() => {
            localStorage.removeItem('token');
            router.push('/login');
          }}
        >
          Log out
        </button>
      </header>
      <main id="main" className="mx-auto w-full max-w-2xl px-[max(1rem,env(safe-area-inset-left))] py-6 pr-[max(1rem,env(safe-area-inset-right))] pb-[max(2rem,env(safe-area-inset-bottom))]">
        {children}
      </main>
    </div>
  );
}

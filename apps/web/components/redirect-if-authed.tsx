'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function RedirectIfAuthed({ to }: { to: string }) {
  const router = useRouter();

  useEffect(() => {
    if (localStorage.getItem('token')) {
      router.replace(to);
    }
  }, [router, to]);

  return null;
}

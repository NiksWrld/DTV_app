'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api-client';

export default function AdminOverviewPage() {
  const [providerCount, setProviderCount] = useState<number | null>(null);
  const [userCount, setUserCount] = useState<number | null>(null);

  useEffect(() => {
    apiClient.admin.providers.list().then((p) => setProviderCount(p.length)).catch(() => {});
    apiClient.admin.users.list().then((u) => setUserCount(u.length)).catch(() => {});
  }, []);

  const stats = [
    { label: 'Providers', value: providerCount, href: '/admin/providers' },
    { label: 'Users', value: userCount, href: '/admin/users' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Overview</h1>
        <p className="text-muted-foreground mt-1">Manage content and users for dtvbase.com</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{s.value ?? '—'}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Link href="/admin/providers/new" className="block text-primary hover:underline">+ Add new provider</Link>
            <Link href="/admin/providers" className="block text-primary hover:underline">Manage providers & partners</Link>
            <Link href="/admin/users" className="block text-primary hover:underline">Manage users</Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

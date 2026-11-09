'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { apiClient } from '@/lib/api-client';
import type { ChecklistItem } from '@/types/dtv';

interface DashboardData {
  profile: {
    intended_path: string;
    nationality: string;
    current_country?: string;
  } | null;
  checklistProgress: number;
  documentCount: number;
  missing: ChecklistItem[];
}

function pathLabel(path: string) {
  if (path === 'workcation') return 'Remote work';
  if (path === 'soft_power') return 'Soft Power';
  if (path === 'dependent') return 'Dependent';
  return path;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.onboarding.getProfile()
      .then(async (profile) => {
        const checklist = await apiClient.checklist.get().catch(() => null);
        const docs = await apiClient.documents.list().catch(() => []);
        const items = checklist?.items ?? [];
        const total = items.length;
        const completed = items.filter((i) => i.status === 'accepted' || i.status === 'uploaded').length;
        const missing = items.filter((i) => i.status === 'missing');
        setData({
          profile,
          checklistProgress: total > 0 ? Math.round((completed / total) * 100) : 0,
          documentCount: Array.isArray(docs) ? docs.length : 0,
          missing,
        });
      })
      .catch(() => setData({ profile: null, checklistProgress: 0, documentCount: 0, missing: [] }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-muted-foreground">Loading dashboard...</p>;
  }

  if (!data?.profile) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome</h1>
          <p className="mt-2 text-muted-foreground">
            A short profile unlocks your checklist and the embassy that covers where you are.
          </p>
        </div>
        <Link
          href="/onboarding"
          className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-primary px-6 text-base font-medium text-primary-foreground hover:bg-primary/90 sm:w-auto"
        >
          Continue setup
        </Link>
      </div>
    );
  }

  const continueHref = data.missing.length > 0 || data.checklistProgress > 0 ? '/checklist' : '/onboarding';

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">{pathLabel(data.profile.intended_path)}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Your application</h1>
        <p className="mt-1 text-muted-foreground">
          {data.profile.nationality}
          {data.profile.current_country ? ` · now in ${data.profile.current_country}` : ''}
        </p>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="flex flex-col gap-5 pt-6 sm:flex-row sm:items-center">
          <ProgressRing value={data.checklistProgress} />
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Checklist</p>
              <p className="text-2xl font-bold">{data.checklistProgress}% ready</p>
              <p className="text-sm text-muted-foreground">
                {data.missing.length} still missing · {data.documentCount} file{data.documentCount === 1 ? '' : 's'} uploaded
              </p>
            </div>
            <Progress value={data.checklistProgress} />
            <Link
              href={continueHref}
              className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-primary px-6 text-base font-medium text-primary-foreground hover:bg-primary/90"
            >
              Continue application
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Next steps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.missing.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing missing on the checklist. Review the file before you submit.</p>
          ) : (
            data.missing.slice(0, 4).map((item) => (
              <Link
                key={item.id}
                href="/checklist"
                className="flex min-h-11 items-center justify-between gap-3 rounded-lg border px-3 text-sm hover:bg-accent"
              >
                <span className="min-w-0 truncate">{item.title}</span>
                <span className="shrink-0 text-muted-foreground">Upload</span>
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <QuickTile href="/documents" kicker="Documents" title="Your files" />
        <QuickTile href="/account" kicker="Embassy" title="Where you apply" />
        <QuickTile href="/providers" kicker="Programs" title="Schools and gyms" />
      </div>
    </div>
  );
}

function QuickTile({ href, kicker, title }: { href: string; kicker: string; title: string }) {
  return (
    <Link href={href} className="rounded-2xl border bg-card p-4 hover:shadow-md">
      <p className="text-xs font-semibold tracking-wide text-primary uppercase">{kicker}</p>
      <p className="mt-2 font-medium">{title}</p>
    </Link>
  );
}

function ProgressRing({ value }: { value: number }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference;
  return (
    <svg viewBox="0 0 88 88" className="size-28 shrink-0" aria-hidden="true">
      <circle cx="44" cy="44" r={radius} className="fill-none stroke-muted" strokeWidth="8" />
      <circle
        cx="44"
        cy="44"
        r={radius}
        className="fill-none stroke-primary"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 44 44)"
      />
      <text x="44" y="49" textAnchor="middle" className="fill-foreground text-[15px] font-bold">
        {value}%
      </text>
    </svg>
  );
}

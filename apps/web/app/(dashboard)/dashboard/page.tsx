'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';

interface DashboardData {
  profile: {
    intended_path: string;
    nationality: string;
  } | null;
  checklistProgress: number;
  documentCount: number;
  missingCount: number;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const profile = await apiClient.onboarding.getProfile().catch(() => null);
        const checklist = await apiClient.checklist.get().catch(() => null);
        const docs = await apiClient.documents.list().catch(() => []);

        const items = checklist?.items ?? [];
        const total = items.length;
        const completed = items.filter(
          (i) => i.status === 'accepted' || i.status === 'uploaded',
        ).length;
        const missing = items.filter((i) => i.status === 'missing').length;

        setData({
          profile,
          checklistProgress: total > 0 ? Math.round((completed / total) * 100) : 0,
          documentCount: docs.length,
          missingCount: missing,
        });
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <p className="text-muted-foreground">Loading dashboard...</p>;
  }

  if (!data?.profile) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Welcome to DTV Workspace</h1>
          <p className="text-muted-foreground mt-1">
            Let&apos;s get started with your profile.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Complete your onboarding</CardTitle>
            <CardDescription>
              Tell us about yourself so we can generate a personalized checklist.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/onboarding"
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md bg-primary text-primary-foreground text-sm font-medium h-10 px-4 py-2 hover:bg-primary/90 transition-colors"
            >
              Start onboarding
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          {data.profile.intended_path === 'workcation'
            ? 'Workcation'
            : data.profile.intended_path === 'soft_power'
              ? 'Thai Soft Power'
              : 'Dependent'}{' '}
          · {data.profile.nationality}
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Checklist progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.checklistProgress}%</div>
            <Progress value={data.checklistProgress} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Documents uploaded
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.documentCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Missing items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.missingCount > 0 ? (
                <span className="text-destructive">{data.missingCount}</span>
              ) : (
                <span className="text-success">0</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Next steps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.missingCount > 0 && (
              <Link
                href="/checklist"
                className="w-full justify-start inline-flex items-center gap-2 whitespace-nowrap rounded-md border border-input bg-background text-sm font-medium h-10 px-4 py-2 hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                View checklist →
              </Link>
            )}
            <Link
              href="/documents"
              className="w-full justify-start inline-flex items-center gap-2 whitespace-nowrap rounded-md border border-input bg-background text-sm font-medium h-10 px-4 py-2 hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              Manage documents →
            </Link>
            <Link
              href="/review"
              className="w-full justify-start inline-flex items-center gap-2 whitespace-nowrap rounded-md border border-input bg-background text-sm font-medium h-10 px-4 py-2 hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              Check readiness →
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              href="/providers"
              className="w-full justify-start inline-flex items-center gap-2 whitespace-nowrap rounded-md border border-input bg-background text-sm font-medium h-10 px-4 py-2 hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              Find providers →
            </Link>
            <Link
              href="/guides"
              className="w-full justify-start inline-flex items-center gap-2 whitespace-nowrap rounded-md border border-input bg-background text-sm font-medium h-10 px-4 py-2 hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              Read guides →
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

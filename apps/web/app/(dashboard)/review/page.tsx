'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import type { ReadinessReview } from '@/types/dtv';

export default function ReviewPage() {
  const [review, setReview] = useState<ReadinessReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  async function loadReview() {
    try {
      const data = await apiClient.review.get();
      setReview(data);
    } catch {
      setReview(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadReview(); }, []);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const data = await apiClient.review.generate();
      setReview(data);
      toast.success('Readiness review generated');
    } catch {
      toast.error('Failed to generate review');
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return <p className="text-muted-foreground">Loading review...</p>;
  }

  const total = review?.total_items_count ?? 0;
  const completed = review?.completed_items_count ?? 0;
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Readiness Review</h1>
          <p className="text-muted-foreground mt-1">
            Check your application readiness before submitting.
          </p>
        </div>
        <Button onClick={handleGenerate} disabled={generating}>
          {generating ? 'Generating...' : 'Refresh review'}
        </Button>
      </div>

      {!review || total === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No data yet</CardTitle>
            <CardDescription>
              Complete your onboarding and checklist to see your readiness review.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <a
              href="/onboarding"
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border border-input bg-background text-sm font-medium h-10 px-4 py-2 hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              Complete onboarding
            </a>
            <a
              href="/checklist"
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border border-input bg-background text-sm font-medium h-10 px-4 py-2 hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              View checklist
            </a>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Status card */}
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="text-5xl font-bold">
                  {review.overall_status === 'ready' ? (
                    <span className="text-success">✓</span>
                  ) : review.overall_status === 'needs_review' ? (
                    <span className="text-warning">!</span>
                  ) : (
                    <span className="text-destructive">✗</span>
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-semibold">
                    {review.overall_status === 'ready'
                      ? 'Ready for submission'
                      : review.overall_status === 'needs_review'
                        ? 'Needs attention'
                        : 'Incomplete'}
                  </h2>
                  <p className="text-muted-foreground text-sm mt-1">
                    {completed} of {total} items completed
                  </p>
                </div>
                <Progress value={progressPct} className="max-w-xs mx-auto" />
              </div>
            </CardContent>
          </Card>

          {/* Stats grid */}
          <div className="grid sm:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Completed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">{review.completed_items_count}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Missing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{review.missing_items_count}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Needs review
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-warning">{review.risky_items_count}</div>
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Next steps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {review.missing_items_count > 0 && (
                <a
                  href="/checklist"
                  className="w-full justify-start inline-flex items-center gap-2 whitespace-nowrap rounded-md border border-input bg-background text-sm font-medium h-10 px-4 py-2 hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  Complete missing items →
                </a>
              )}
              <a
                href="/documents"
                className="w-full justify-start inline-flex items-center gap-2 whitespace-nowrap rounded-md border border-input bg-background text-sm font-medium h-10 px-4 py-2 hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                Review documents →
              </a>
              <Separator />
              <div className="bg-muted rounded-lg p-4 text-sm space-y-2">
                <p className="font-medium">Ready to submit?</p>
                <p className="text-muted-foreground">
                  Final applications are submitted through the official Thai e-Visa system.
                </p>
                <a
                  href="https://www.thaievisa.go.th"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md bg-primary text-primary-foreground text-sm font-medium h-9 px-4 py-2 hover:bg-primary/90 transition-colors"
                >
                  Go to Thai e-Visa
                </a>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

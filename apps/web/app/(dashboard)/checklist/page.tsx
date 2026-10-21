'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import type { ChecklistItem } from '@/types/dtv';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  missing: { label: 'Missing', variant: 'destructive' },
  uploaded: { label: 'Uploaded', variant: 'secondary' },
  under_review: { label: 'Under Review', variant: 'outline' },
  accepted: { label: 'Accepted', variant: 'default' },
  risky: { label: 'Risky', variant: 'destructive' },
};

export default function ChecklistPage() {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadChecklist() {
    try {
      const data = await apiClient.checklist.get();
      setItems(data.items);
    } catch {
      // Try generating first
      try {
        const data = await apiClient.checklist.generate();
        setItems(data.items);
      } catch {
        toast.error('Failed to load checklist. Complete onboarding first.');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadChecklist(); }, []);

  async function updateStatus(id: string, status: ChecklistItem['status']) {
    try {
      await apiClient.checklist.updateStatus(id, status);
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, status } : i)),
      );
      toast.success(`Item marked as ${statusConfig[status]?.label || status}`);
    } catch {
      toast.error('Failed to update status');
    }
  }

  const total = items.length;
  const completed = items.filter((i) => i.status === 'accepted' || i.status === 'uploaded').length;
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  if (loading) {
    return <p className="text-muted-foreground">Loading checklist...</p>;
  }

  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Visa Application Checklist</h1>
        <Card>
          <CardHeader>
            <CardTitle>No checklist yet</CardTitle>
            <CardDescription>
              Complete your onboarding profile to generate a personalized checklist.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => apiClient.checklist.generate().then(loadChecklist)}>
              Generate checklist
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Visa Application Checklist</h1>
        <p className="text-muted-foreground mt-1">
          Documents required before you apply · {completed} of {total} completed
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Progress value={progressPct} className="flex-1" />
            <span className="text-sm font-medium tabular-nums">{progressPct}%</span>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {items.map((item) => {
          const cfg = statusConfig[item.status] || statusConfig.missing;
          return (
            <Card key={item.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium">{item.title}</h3>
                      <Badge variant={cfg.variant}>{cfg.label}</Badge>
                      {item.required && (
                        <span className="text-xs text-destructive">*Required</span>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {item.description}
                      </p>
                    )}
                    {item.evidence_examples && item.evidence_examples.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Examples: {item.evidence_examples.join(', ')}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {item.status === 'missing' && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(item.id, 'uploaded')}>
                        Mark uploaded
                      </Button>
                    )}
                    {item.status === 'uploaded' && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(item.id, 'accepted')}>
                        Mark complete
                      </Button>
                    )}
                    {item.status !== 'missing' && item.status !== 'accepted' && (
                      <Button size="sm" variant="ghost" onClick={() => updateStatus(item.id, 'missing')}>
                        Reset
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

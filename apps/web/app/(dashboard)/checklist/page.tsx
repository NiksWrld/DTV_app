'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import type { ChecklistItem, ChecklistItemStatus, Document } from '@/types/dtv';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  missing: { label: 'Missing', variant: 'destructive' },
  uploaded: { label: 'Uploaded', variant: 'secondary' },
  under_review: { label: 'Under Review', variant: 'outline' },
  accepted: { label: 'Accepted', variant: 'default' },
  risky: { label: 'Risky', variant: 'destructive' },
};

const FILE_ACCEPT = 'application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png';

function asDocuments(value: unknown): Document[] {
  return Array.isArray(value) ? value : [];
}

function latestDocument(docs: Document[], itemId: string) {
  return asDocuments(docs)
    .filter((doc) => doc.checklist_item_id === itemId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
}

export default function ChecklistPage() {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadChecklist() {
    const data = await apiClient.checklist.get().catch(() => apiClient.checklist.generate());
    setItems(data.items);
    const files = await apiClient.documents.list().catch(() => [] as Document[]);
    setDocs(asDocuments(files));
  }

  useEffect(() => {
    apiClient.checklist
      .get()
      .then((data) => setItems(data.items))
      .catch(() =>
        apiClient.checklist
          .generate()
          .then((data) => setItems(data.items))
          .catch(() => toast.error('Failed to load checklist. Complete onboarding first.')),
      )
      .finally(() => setLoading(false));
    apiClient.documents.list().then((files) => setDocs(asDocuments(files))).catch(() => setDocs([]));
  }, []);

  async function refresh() {
    await loadChecklist();
  }

  async function updateStatus(id: string, status: ChecklistItemStatus) {
    setBusyId(id);
    try {
      await apiClient.checklist.updateStatus(id, status);
      await refresh();
      toast.success(status === 'missing' ? 'Marked as not done' : `Item marked as ${statusConfig[status]?.label || status}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setBusyId(null);
    }
  }

  async function uploadFile(itemId: string, file: File) {
    setBusyId(itemId);
    try {
      await apiClient.documents.upload(file, itemId);
      await refresh();
      toast.success('Document uploaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusyId(null);
    }
  }

  async function viewDocument(doc: Document) {
    try {
      const { url } = await apiClient.documents.download(doc.id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to open document');
    }
  }

  async function deleteDocument(itemId: string, doc: Document) {
    setBusyId(itemId);
    try {
      await apiClient.documents.delete(doc.id);
      await refresh();
      toast.success('Document deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete document');
    } finally {
      setBusyId(null);
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
            <Button onClick={() => loadChecklist().catch(() => toast.error('Failed to generate checklist'))}>
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
          const doc = latestDocument(docs, item.id);
          const busy = busyId === item.id;
          return (
            <Card key={item.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="pt-6">
                <div className="flex min-w-0 flex-col gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium">{item.title}</h3>
                      <Badge variant={cfg.variant}>{cfg.label}</Badge>
                      {item.required && (
                        <span className="text-xs text-destructive">*Required</span>
                      )}
                    </div>
                    {item.description && (
                      <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                    )}
                    {item.evidence_examples && item.evidence_examples.length > 0 && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Examples: {item.evidence_examples.join(', ')}
                      </p>
                    )}
                    {doc && (
                      <p className="mt-2 text-sm font-medium break-all">{doc.filename}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!doc && (
                      <>
                        <FileButton
                          label={busy ? 'Uploading...' : 'Upload file'}
                          accept={FILE_ACCEPT}
                          disabled={busy}
                          onFile={(file) => uploadFile(item.id, file)}
                        />
                        <FileButton
                          label="Take photo"
                          accept="image/*"
                          capture="environment"
                          disabled={busy}
                          className="md:hidden"
                          onFile={(file) => uploadFile(item.id, file)}
                        />
                      </>
                    )}
                    {doc && (
                      <>
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => viewDocument(doc)}>
                          View
                        </Button>
                        <FileButton
                          label={busy ? 'Uploading...' : 'Replace'}
                          accept={FILE_ACCEPT}
                          disabled={busy}
                          onFile={(file) => uploadFile(item.id, file)}
                        />
                        <FileButton
                          label="Retake photo"
                          accept="image/*"
                          capture="environment"
                          disabled={busy}
                          className="md:hidden"
                          onFile={(file) => uploadFile(item.id, file)}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          disabled={busy}
                          onClick={() => deleteDocument(item.id, doc)}
                        >
                          Delete
                        </Button>
                      </>
                    )}
                    {item.status === 'uploaded' && doc && (
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => updateStatus(item.id, 'accepted')}>
                        Mark complete
                      </Button>
                    )}
                    {item.status !== 'missing' && (
                      <Button size="sm" variant="ghost" disabled={busy} onClick={() => updateStatus(item.id, 'missing')}>
                        Mark as not done
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

function FileButton({
  label,
  accept,
  capture,
  disabled,
  className,
  onFile,
}: {
  label: string;
  accept: string;
  capture?: 'environment' | 'user';
  disabled?: boolean;
  className?: string;
  onFile: (file: File) => void;
}) {
  return (
    <label
      className={`inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium hover:bg-muted ${disabled ? 'pointer-events-none opacity-50' : ''} ${className ?? ''}`}
    >
      {label}
      <input
        type="file"
        accept={accept}
        capture={capture}
        disabled={disabled}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) onFile(file);
        }}
      />
    </label>
  );
}

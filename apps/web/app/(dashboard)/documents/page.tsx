'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import type { ChecklistItem, Document } from '@/types/dtv';

const docStatusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  uploaded: { label: 'Uploaded', variant: 'secondary' },
  under_review: { label: 'Under Review', variant: 'outline' },
  accepted: { label: 'Accepted', variant: 'default' },
  risky: { label: 'Risky', variant: 'destructive' },
};

function formatBytes(bytes?: number | null) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Upload form state
  const fileRef = useRef<HTMLInputElement>(null);
  const [linkedItemId, setLinkedItemId] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [userNotes, setUserNotes] = useState('');

  async function loadDocs() {
    try {
      const data = await apiClient.documents.list();
      setDocs(data);
    } catch {
      // empty list on error
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDocs();
    apiClient.checklist.get()
      .then((data) => setChecklistItems(data.items))
      .catch(() => {});
  }, []);

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);
      if (linkedItemId) formData.append('checklist_item_id', linkedItemId);
      if (expiryDate) formData.append('expiry_date', expiryDate);
      if (userNotes) formData.append('user_notes', userNotes);

      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Upload failed');
      }

      toast.success('Document uploaded');
      setUploadOpen(false);
      setLinkedItemId('');
      setExpiryDate('');
      setUserNotes('');
      if (fileRef.current) fileRef.current.value = '';
      await loadDocs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(doc: Document) {
    try {
      const { url, filename } = await apiClient.documents.download(doc.id);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.click();
    } catch {
      toast.error('Failed to get download link');
    }
  }

  async function handleDelete(id: string) {
    try {
      await apiClient.documents.delete(id);
      setDocs((prev) => prev.filter((d) => d.id !== id));
      toast.success('Document deleted');
    } catch {
      toast.error('Failed to delete document');
    }
  }

  if (loading) {
    return <p className="text-muted-foreground">Loading documents...</p>;
  }

  const missingItems = checklistItems.filter((i) => i.status === 'missing');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Documents</h1>
          <p className="text-muted-foreground mt-1">
            {docs.length} document{docs.length !== 1 ? 's' : ''} uploaded
          </p>
        </div>

        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger render={<Button />}>
            Upload document
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload document</DialogTitle>
              <DialogDescription>
                Upload a PDF, JPG, or PNG (max 10 MB).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="file">File *</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  ref={fileRef}
                />
              </div>

              {missingItems.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="checklist-item">Link to checklist item</Label>
                  <Select value={linkedItemId} onValueChange={(v: string | null) => setLinkedItemId(!v || v === 'none' ? '' : v)}>
                    <SelectTrigger id="checklist-item">
                      <SelectValue placeholder="Optional — auto-marks item as uploaded" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {missingItems.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="expiry">Expiry date</Label>
                <Input
                  id="expiry"
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  For passport, insurance, bank statements, etc.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  placeholder="Optional notes"
                  value={userNotes}
                  onChange={(e) => setUserNotes(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setUploadOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpload} disabled={uploading}>
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {docs.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No documents yet</CardTitle>
            <CardDescription>
              Upload your passport, bank statements, insurance, and other documents.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-3">
          {docs.map((doc) => {
            const cfg = docStatusConfig[doc.document_status] ?? docStatusConfig.uploaded;
            return (
              <Card key={doc.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium truncate">{doc.filename}</h3>
                        <Badge variant={cfg.variant}>{cfg.label}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {doc.file_type} · {formatBytes(doc.file_size)}
                        {doc.expiry_date && (
                          <span className="ml-2 text-warning">
                            Expires {doc.expiry_date}
                          </span>
                        )}
                      </p>
                      {doc.user_notes && (
                        <p className="text-xs text-muted-foreground mt-1">{doc.user_notes}</p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(doc)}
                      >
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => handleDelete(doc.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

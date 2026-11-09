'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api-client';
import { SatBadge, formatSatDate } from '@/components/providers/sat-badge';
import type { SatInfo } from '@/types/dtv';

const STATUS_TEXT: Record<string, string> = {
  none: 'Not submitted',
  pending: 'Waiting for admin review',
  approved: 'Approved',
  rejected: 'Not approved',
};

/** Provider portal: upload the Sports Authority of Thailand certificate for admin review. */
export function SatCertificationCard() {
  const [info, setInfo] = useState<SatInfo | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [number, setNumber] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiClient.providerSat
      .mine()
      .then((next) => {
        setInfo(next);
        setNumber(next.sat_certificate_number ?? '');
        setValidUntil(next.sat_valid_until ?? '');
      })
      .catch(() => setInfo(null));
  }, []);

  async function submit() {
    if (!file) return;
    setSaving(true);
    try {
      const next = await apiClient.providerSat.submit(file, number.trim(), validUntil);
      setInfo(next);
      setFile(null);
      toast.success('Certificate submitted for review');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setSaving(false);
    }
  }

  async function openEvidence() {
    try {
      const { url } = await apiClient.providerSat.evidence();
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not open the file');
    }
  }

  if (!info) return null;
  const expired = info.sat_status === 'approved' && !info.sat_certified;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          SAT certification
          <SatBadge certified={info.sat_certified} validUntil={info.sat_valid_until} showExpiry />
        </CardTitle>
        <CardDescription>
          Some embassies only accept Muay Thai camps recognised by the Sports Authority of Thailand. Upload your
          certificate and an admin will check it before the badge shows on your listing.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-muted/40 p-3 text-sm">
          <p>
            <span className="font-medium">Status:</span> {expired ? 'Expired' : STATUS_TEXT[info.sat_status]}
          </p>
          {info.sat_certificate_number && <p>Certificate no. {info.sat_certificate_number}</p>}
          {info.sat_valid_until && <p>Valid until {formatSatDate(info.sat_valid_until)}</p>}
          {info.sat_review_note && info.sat_status !== 'pending' && (
            <p className="mt-1 text-muted-foreground">Admin note: {info.sat_review_note}</p>
          )}
          {info.has_evidence && (
            <Button variant="link" size="sm" className="h-auto px-0" onClick={openEvidence}>
              View uploaded file{info.sat_evidence_filename ? ` (${info.sat_evidence_filename})` : ''}
            </Button>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="sat-number">Certificate number</Label>
            <Input id="sat-number" value={number} onChange={(e) => setNumber(e.target.value)} maxLength={120} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sat-valid">Valid until</Label>
            <Input id="sat-valid" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sat-file">Certificate (PDF, JPG or PNG, up to 10 MB)</Label>
          <Input
            id="sat-file"
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <Button className="w-full" disabled={!file || saving} onClick={submit}>
          {saving ? 'Uploading…' : info.sat_status === 'none' ? 'Submit for review' : 'Submit a new certificate'}
        </Button>
        {info.sat_status === 'approved' && (
          <p className="text-xs text-muted-foreground">
            A new upload replaces the current certificate and needs a fresh admin review.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

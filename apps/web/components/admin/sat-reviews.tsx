'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/api-client';
import { SatBadge, formatSatDate } from '@/components/providers/sat-badge';
import type { SatInfo } from '@/types/dtv';

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-indigo-100 text-indigo-800',
  rejected: 'bg-red-100 text-red-700',
};

function SatReviewRow({ info, onChange }: { info: SatInfo; onChange: (next: SatInfo) => void }) {
  const [number, setNumber] = useState(info.sat_certificate_number ?? '');
  const [validUntil, setValidUntil] = useState(info.sat_valid_until ?? '');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const expired = info.sat_status === 'approved' && !info.sat_certified;

  async function act(action: 'approve' | 'reject' | 'revoke') {
    if (action !== 'approve' && !note.trim() && !confirm(`${action === 'reject' ? 'Reject' : 'Revoke'} without a note?`)) {
      return;
    }
    setBusy(true);
    try {
      const next = await apiClient.admin.sat.review(info.provider_id, {
        action,
        certificate_number: number.trim() || undefined,
        valid_until: validUntil || undefined,
        note: note.trim() || undefined,
      });
      onChange(next);
      setNote('');
      toast.success(action === 'approve' ? 'SAT certification approved' : 'SAT certification updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  }

  async function openEvidence() {
    try {
      const { url } = await apiClient.admin.sat.evidence(info.provider_id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not open the file');
    }
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium break-words">{info.provider_name}</p>
          <p className="text-sm text-muted-foreground">
            {info.owner_email || 'No owner'}
            {info.location ? ` · ${info.location}` : ''}
            {info.sat_submitted_at ? ` · submitted ${new Date(info.sat_submitted_at).toLocaleDateString('en-GB')}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[info.sat_status] ?? ''}`}>
            {expired ? 'expired' : info.sat_status}
          </span>
          <SatBadge certified={info.sat_certified} validUntil={info.sat_valid_until} showExpiry />
        </div>
      </div>
      {info.sat_review_note && <p className="text-xs text-muted-foreground">Last note: {info.sat_review_note}</p>}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor={`sat-n-${info.provider_id}`} className="text-xs">Certificate number</Label>
          <Input id={`sat-n-${info.provider_id}`} value={number} onChange={(e) => setNumber(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`sat-v-${info.provider_id}`} className="text-xs">Valid until (expiry)</Label>
          <Input id={`sat-v-${info.provider_id}`} type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`sat-note-${info.provider_id}`} className="text-xs">Note to provider</Label>
          <Input id={`sat-note-${info.provider_id}`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={!info.has_evidence} onClick={openEvidence}>
          {info.has_evidence ? `View evidence${info.sat_evidence_filename ? ` (${info.sat_evidence_filename})` : ''}` : 'No file uploaded'}
        </Button>
        <Button size="sm" disabled={busy} onClick={() => act('approve')}>
          {info.sat_status === 'approved' ? 'Save & keep approved' : 'Approve'}
        </Button>
        {info.sat_status === 'approved' ? (
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => act('revoke')}>Revoke</Button>
        ) : (
          info.sat_status !== 'rejected' && (
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => act('reject')}>Reject</Button>
          )
        )}
      </div>
      {validUntil && <p className="text-xs text-muted-foreground">The badge disappears automatically after {formatSatDate(validUntil)}.</p>}
    </div>
  );
}

/** Admin providers page: SAT certificates submitted by providers, pending first. */
export function SatReviewsSection() {
  const [rows, setRows] = useState<SatInfo[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    apiClient.admin.sat.list().then(setRows).catch(() => setRows([]));
  }, []);

  if (rows.length === 0) return null;
  const pending = rows.filter((r) => r.sat_status === 'pending');
  const visible = showAll ? rows : pending;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          SAT certificates{pending.length > 0 ? ` · ${pending.length} to review` : ''}
        </h2>
        <Button size="sm" variant="outline" onClick={() => setShowAll((v) => !v)}>
          {showAll ? 'Show pending only' : `Show all (${rows.length})`}
        </Button>
      </div>
      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">No certificates waiting for review.</p>
      ) : (
        visible.map((info) => (
          <SatReviewRow
            key={info.provider_id}
            info={info}
            onChange={(next) => setRows((prev) => prev.map((r) => (r.provider_id === next.provider_id ? next : r)))}
          />
        ))
      )}
    </div>
  );
}

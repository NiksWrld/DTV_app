'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api-client';
import { BookingStatusPill, formatDate, openSignedUrl } from '@/components/providers/booking-status';
import type { Booking, ProviderPackage } from '@/types/dtv';

function addMonths(date: string, months: number) {
  const d = new Date(`${date}T00:00:00`);
  d.setMonth(d.getMonth() + months);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function ApproveForm({
  booking,
  packages,
  onDone,
  onCancel,
}: {
  booking: Booking;
  packages: ProviderPackage[];
  onDone: (next: Booking) => void;
  onCancel: () => void;
}) {
  const initialPackage = packages.find((p) => p.id === booking.package_id);
  const start = booking.start_date ?? booking.preferred_start ?? '';
  const [packageId, setPackageId] = useState(booking.package_id ?? '');
  const [courseName, setCourseName] = useState(booking.course_name ?? initialPackage?.name ?? '');
  const [startDate, setStartDate] = useState(start);
  const [endDate, setEndDate] = useState(booking.end_date ?? (start ? addMonths(start, 6) : ''));
  const [hours, setHours] = useState(booking.hours_per_week != null ? String(booking.hours_per_week) : '');
  const [fees, setFees] = useState(
    booking.fees_paid != null ? String(booking.fees_paid) : initialPackage?.price_amount != null ? String(initialPackage.price_amount) : '',
  );
  const [currency, setCurrency] = useState(booking.currency || 'THB');
  const [saving, setSaving] = useState(false);

  function pickPackage(id: string) {
    setPackageId(id);
    const pkg = packages.find((p) => p.id === id);
    if (!pkg) return;
    setCourseName(pkg.name);
    if (pkg.price_amount != null) setFees(String(pkg.price_amount));
    if (pkg.currency) setCurrency(pkg.currency);
    if (startDate && pkg.duration_days) {
      const d = new Date(`${startDate}T00:00:00`);
      d.setDate(d.getDate() + pkg.duration_days - 1);
      setEndDate(d.toISOString().slice(0, 10));
    }
  }

  async function submit() {
    setSaving(true);
    try {
      const next = await apiClient.providerPortal.approveRequest(booking.id, {
        course_name: courseName,
        package_id: packageId || undefined,
        start_date: startDate,
        end_date: endDate,
        hours_per_week: Number(hours),
        fees_paid: fees ? Number(fees) : undefined,
        currency,
      });
      toast.success('Letter issued and sent to the applicant');
      onDone(next);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not issue letter');
    } finally {
      setSaving(false);
    }
  }

  const valid = courseName.trim() && startDate && endDate && endDate > startDate && Number(hours) > 0;

  return (
    <div className="space-y-3 rounded-lg border bg-background p-3">
      {packages.length > 0 && (
        <div className="space-y-1.5">
          <Label htmlFor={`pkg-${booking.id}`}>Package</Label>
          <select
            id={`pkg-${booking.id}`}
            value={packageId}
            onChange={(e) => pickPackage(e.target.value)}
            className="w-full min-h-11 rounded-lg border bg-background px-3 text-base md:text-sm"
          >
            <option value="">Custom course</option>
            {packages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor={`course-${booking.id}`}>Course / programme</Label>
        <Input id={`course-${booking.id}`} value={courseName} onChange={(e) => setCourseName(e.target.value)} placeholder="e.g. 6-month Muay Thai programme" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={`start-${booking.id}`}>Start date</Label>
          <Input id={`start-${booking.id}`} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`end-${booking.id}`}>End date</Label>
          <Input id={`end-${booking.id}`} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={`hours-${booking.id}`}>Hours / week</Label>
          <Input id={`hours-${booking.id}`} inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`fees-${booking.id}`}>Fees paid</Label>
          <Input id={`fees-${booking.id}`} inputMode="decimal" value={fees} onChange={(e) => setFees(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`cur-${booking.id}`}>Currency</Label>
          <Input id={`cur-${booking.id}`} value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        The PDF includes your listing name, city and contact details, the student&rsquo;s name, nationality and passport number (if they added it), these course details, a reference ID, and a signature line.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={submit} disabled={!valid || saving}>
          {saving ? 'Issuing…' : booking.has_letter ? 'Re-issue letter' : 'Approve & issue letter'}
        </Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

export function LetterRequestsCard({
  packages,
  isPartner,
  onBookingsChange,
}: {
  packages: ProviderPackage[];
  isPartner: boolean;
  onBookingsChange?: (bookings: Booking[]) => void;
}) {
  const [requests, setRequests] = useState<Booking[]>([]);
  const [editing, setEditing] = useState<string | null>(null);

  useEffect(() => {
    apiClient.providerPortal.requests()
      .then((rows) => {
        setRequests(rows);
        onBookingsChange?.(rows);
      })
      .catch(() => setRequests([]));
  }, [onBookingsChange]);

  function replace(next: Booking) {
    const rows = requests.map((r) => (r.id === next.id ? next : r));
    setRequests(rows);
    onBookingsChange?.(rows);
  }

  async function decline(booking: Booking) {
    const reason = window.prompt('Reason for declining (optional, shown to the applicant)') ?? undefined;
    try {
      replace(await apiClient.providerPortal.declineRequest(booking.id, reason));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not decline');
    }
  }

  async function complete(booking: Booking) {
    try {
      replace(await apiClient.providerPortal.completeRequest(booking.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update');
    }
  }

  const openCount = requests.filter((r) => r.status === 'requested').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          DTV letter requests{openCount > 0 && <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{openCount} new</span>}
        </CardTitle>
        <CardDescription>
          Applicants ask you to confirm their enrollment. Fill in the course details and the app creates the PDF letter and adds it to their visa checklist.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!isPartner && (
          <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
            You can issue letters once an admin has verified your listing. Applicants can only send requests to verified DTV partners.
          </p>
        )}
        {requests.length === 0 && <p className="text-sm text-muted-foreground">No requests yet.</p>}
        {requests.map((r) => (
          <article key={r.id} className="space-y-2 rounded-lg border p-3 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium break-words">{r.student_name || r.student_email}</p>
                <p className="text-xs text-muted-foreground break-all">
                  {r.student_email}
                  {r.nationality ? ` · ${r.nationality}` : ''}
                  {r.has_passport_number ? ' · passport no. on file' : ' · no passport no.'}
                </p>
              </div>
              <BookingStatusPill status={r.status} />
            </div>
            {(r.package_name || r.preferred_start) && (
              <p className="text-muted-foreground">
                {r.package_name && <>Package: <span className="text-foreground">{r.package_name}</span></>}
                {r.package_name && r.preferred_start && ' · '}
                {r.preferred_start && <>Wants to start {formatDate(r.preferred_start)}</>}
              </p>
            )}
            {r.message && <p className="rounded-md bg-muted/50 p-2 whitespace-pre-wrap">{r.message}</p>}
            {r.course_name && r.status !== 'requested' && (
              <p>
                {r.course_name} · {formatDate(r.start_date)} – {formatDate(r.end_date)}
                {r.reference_code && <span className="text-muted-foreground"> · Ref. {r.reference_code}</span>}
              </p>
            )}

            {editing === r.id ? (
              <ApproveForm
                booking={r}
                packages={packages}
                onDone={(next) => { replace(next); setEditing(null); }}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <div className="flex flex-wrap gap-2">
                {r.status === 'requested' && (
                  <>
                    <Button size="sm" disabled={!isPartner} onClick={() => setEditing(r.id)}>Approve & issue letter</Button>
                    <Button size="sm" variant="ghost" onClick={() => decline(r)}>Decline</Button>
                  </>
                )}
                {r.has_letter && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openSignedUrl(() => apiClient.providerPortal.letter(r.id)).catch(() => toast.error('Could not open letter'))}
                  >
                    Open letter
                  </Button>
                )}
                {r.status === 'confirmed' && (
                  <>
                    <Button size="sm" variant="ghost" disabled={!isPartner} onClick={() => setEditing(r.id)}>Edit & re-issue</Button>
                    <Button size="sm" variant="ghost" onClick={() => complete(r)}>Mark completed</Button>
                  </>
                )}
              </div>
            )}
          </article>
        ))}
      </CardContent>
    </Card>
  );
}

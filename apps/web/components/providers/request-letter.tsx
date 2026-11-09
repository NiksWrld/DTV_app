'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { apiClient } from '@/lib/api-client';
import { BookingStatusPill, formatDate, openSignedUrl } from '@/components/providers/booking-status';
import type { Booking, Provider, ProviderPackage } from '@/types/dtv';

export function RequestLetterCard({
  provider,
  packages,
  onBookingsChange,
}: {
  provider: Provider;
  packages: ProviderPackage[];
  onBookingsChange?: (bookings: Booking[]) => void;
}) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [hasPassportNumber, setHasPassportNumber] = useState(true);
  const [packageId, setPackageId] = useState('');
  const [preferredStart, setPreferredStart] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    apiClient.bookings.mine()
      .then((rows) => {
        const mine = rows.filter((b) => b.provider_id === provider.id);
        setBookings(mine);
        onBookingsChange?.(mine);
      })
      .catch(() => setBookings([]));
    apiClient.onboarding.getProfile()
      .then((profile) => setHasPassportNumber(Boolean(profile.passport_number?.trim())))
      .catch(() => setHasPassportNumber(false));
  }, [provider.id, onBookingsChange]);

  function update(next: Booking[]) {
    setBookings(next);
    onBookingsChange?.(next);
  }

  async function send() {
    setSending(true);
    try {
      const created = await apiClient.bookings.create(provider.id, {
        message: message.trim() || undefined,
        package_id: packageId || undefined,
        preferred_start: preferredStart || undefined,
      });
      update([created, ...bookings]);
      setMessage('');
      toast.success(`Request sent to ${provider.name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send request');
    } finally {
      setSending(false);
    }
  }

  async function cancel(id: string) {
    try {
      const next = await apiClient.bookings.cancel(id);
      update(bookings.map((b) => (b.id === id ? next : b)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not cancel');
    }
  }

  if (!provider.is_partner) {
    return (
      <div className="space-y-1 rounded-lg border border-dashed p-4">
        <h2 className="font-semibold">DTV letter</h2>
        <p className="text-sm text-muted-foreground">
          {provider.name} is not a DTV partner yet, so it can&rsquo;t issue your enrollment letter through the app.
        </p>
      </div>
    );
  }

  const open = bookings.some((b) => b.status === 'requested');

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <FileText className="size-5" aria-hidden="true" />
        </div>
        <div>
          <h2 className="font-semibold">Get your DTV letter</h2>
          <p className="text-sm text-muted-foreground">
            Ask {provider.name} to confirm your enrollment. Once they approve, the PDF letter is added to your visa checklist automatically.
          </p>
        </div>
      </div>

      {bookings.length > 0 && (
        <ul className="space-y-2">
          {bookings.map((b) => (
            <li key={b.id} className="space-y-2 rounded-lg bg-muted/40 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <BookingStatusPill status={b.status} />
                <span className="text-xs text-muted-foreground">Sent {formatDate(b.created_at)}</span>
              </div>
              {b.course_name && (
                <p>
                  <span className="font-medium">{b.course_name}</span>
                  {b.start_date && ` · ${formatDate(b.start_date)} – ${formatDate(b.end_date)}`}
                </p>
              )}
              {b.status === 'declined' && b.decline_reason && (
                <p className="text-muted-foreground">Reason: {b.decline_reason}</p>
              )}
              <div className="flex flex-wrap gap-2">
                {b.has_letter && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openSignedUrl(() => apiClient.bookings.letter(b.id)).catch(() => toast.error('Could not open letter'))}
                  >
                    Open letter (PDF)
                  </Button>
                )}
                {b.has_letter && (
                  <Link href="/checklist" className="inline-flex min-h-9 items-center text-sm text-primary hover:underline">
                    In your checklist →
                  </Link>
                )}
                {b.status === 'requested' && (
                  <Button size="sm" variant="ghost" onClick={() => cancel(b.id)}>Cancel request</Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {!open && (
        <div className="space-y-3">
          {!hasPassportNumber && (
            <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-900">
              Tip: add your passport number under <Link href="/account" className="underline">Account</Link> so it is printed on the letter.
            </p>
          )}
          {packages.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="request-package">Package</Label>
              <select
                id="request-package"
                value={packageId}
                onChange={(e) => setPackageId(e.target.value)}
                className="w-full min-h-11 rounded-lg border bg-background px-3 text-base md:text-sm"
              >
                <option value="">Not sure yet</option>
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.price_amount != null ? ` · ${p.currency} ${p.price_amount.toLocaleString()}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="request-start">Preferred start date</Label>
            <Input id="request-start" type="date" value={preferredStart} onChange={(e) => setPreferredStart(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="request-message">Message</Label>
            <Textarea
              id="request-message"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. I'd like to train 6 months, mornings, starting in January."
            />
          </div>
          <Button className="w-full" onClick={send} disabled={sending}>
            {sending ? 'Sending…' : bookings.length ? 'Send a new request' : 'Request DTV letter'}
          </Button>
        </div>
      )}
    </div>
  );
}

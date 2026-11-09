'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { BadgeCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { apiClient } from '@/lib/api-client';
import { formatDate } from '@/components/providers/booking-status';
import { RatingSummary, StarInput, Stars } from '@/components/providers/stars';
import type { Booking, Review, ReviewSummary } from '@/types/dtv';

export function ReviewItem({ review, children }: { review: Review; children?: React.ReactNode }) {
  return (
    <li className="space-y-2 border-b pb-4 last:border-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-2">
        <Stars value={review.rating} />
        <span className="text-sm font-medium">{review.reviewer_name}</span>
        {review.verified_booking && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
            <BadgeCheck className="size-3.5" aria-hidden="true" /> Verified booking
          </span>
        )}
        <span className="text-xs text-muted-foreground">{formatDate(review.created_at)}</span>
      </div>
      {review.course_name && <p className="text-xs text-muted-foreground">{review.course_name}</p>}
      {review.body && <p className="text-sm whitespace-pre-wrap">{review.body}</p>}
      {review.provider_reply && (
        <div className="ml-3 border-l-2 pl-3 text-sm">
          <p className="text-xs font-medium text-muted-foreground">Reply from {review.provider_name}</p>
          <p className="whitespace-pre-wrap">{review.provider_reply}</p>
        </div>
      )}
      {children}
    </li>
  );
}

export function ReviewsSection({ providerId }: { providerId: string }) {
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [reviewable, setReviewable] = useState<Booking[]>([]);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiClient.reviews.forProvider(providerId).then(setSummary).catch(() => setSummary(null));
    apiClient.bookings.mine()
      .then((rows) =>
        setReviewable(rows.filter((b) => b.provider_id === providerId && !b.has_review && (b.status === 'confirmed' || b.status === 'completed'))),
      )
      .catch(() => setReviewable([]));
  }, [providerId]);

  async function submit() {
    const booking = reviewable[0];
    if (!booking || rating < 1) return;
    setSaving(true);
    try {
      const created = await apiClient.bookings.review(booking.id, { rating, body: body.trim() || undefined });
      setReviewable((prev) => prev.slice(1));
      setSummary((prev) => {
        const reviews = [created, ...(prev?.reviews ?? [])];
        const average = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
        return { reviews, count: reviews.length, average };
      });
      setRating(0);
      setBody('');
      toast.success('Thanks for your review');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save review');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">Reviews</h2>
        <RatingSummary average={summary?.average} count={summary?.count} />
      </div>
      <p className="text-xs text-muted-foreground">Only applicants who booked through the app can leave a review.</p>

      {reviewable.length > 0 && (
        <div className="space-y-3 rounded-lg bg-muted/40 p-3">
          <p className="text-sm font-medium">How was {reviewable[0].course_name || 'your booking'}?</p>
          <StarInput value={rating} onChange={setRating} />
          <div className="space-y-1.5">
            <Label htmlFor="review-body">Your review (optional)</Label>
            <Textarea id="review-body" rows={3} value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} />
          </div>
          <Button onClick={submit} disabled={rating < 1 || saving}>{saving ? 'Saving…' : 'Post review'}</Button>
        </div>
      )}

      {summary && summary.reviews.length > 0 ? (
        <ul className="space-y-4">
          {summary.reviews.map((r) => <ReviewItem key={r.id} review={r} />)}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No reviews yet.</p>
      )}
    </div>
  );
}

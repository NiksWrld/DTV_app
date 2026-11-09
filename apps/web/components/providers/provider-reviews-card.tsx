'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api-client';
import { ReviewItem } from '@/components/providers/reviews-section';
import { RatingSummary } from '@/components/providers/stars';
import type { Review } from '@/types/dtv';

function ReplyForm({ review, onDone }: { review: Review; onDone: (next: Review) => void }) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  async function submit() {
    setSaving(true);
    try {
      onDone(await apiClient.reviews.reply(review.id, text));
      toast.success('Reply posted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not reply');
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="space-y-2">
      <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Reply publicly (once)" maxLength={2000} aria-label="Reply" />
      <Button size="sm" variant="outline" disabled={!text.trim() || saving} onClick={submit}>{saving ? 'Posting…' : 'Post reply'}</Button>
    </div>
  );
}

export function ProviderReviewsCard() {
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    apiClient.reviews.mine().then(setReviews).catch(() => setReviews([]));
  }, []);

  const visible = reviews.filter((r) => !r.hidden);
  const average = visible.length ? visible.reduce((s, r) => s + r.rating, 0) / visible.length : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
          Reviews
          <RatingSummary average={average} count={visible.length} />
        </CardTitle>
        <CardDescription>From applicants with a confirmed booking. You can reply once to each review.</CardDescription>
      </CardHeader>
      <CardContent>
        {reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reviews yet. They appear after you confirm a booking.</p>
        ) : (
          <ul className="space-y-4">
            {reviews.map((r) => (
              <ReviewItem key={r.id} review={r}>
                {r.hidden && <p className="text-xs text-amber-700">Hidden by an admin</p>}
                {!r.provider_reply && (
                  <ReplyForm review={r} onDone={(next) => setReviews((prev) => prev.map((x) => (x.id === next.id ? next : x)))} />
                )}
              </ReviewItem>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

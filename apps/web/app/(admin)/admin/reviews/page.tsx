'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api-client';
import { ReviewItem } from '@/components/providers/reviews-section';
import type { Review } from '@/types/dtv';

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHidden, setShowHidden] = useState(true);

  useEffect(() => {
    apiClient.admin.reviews.list().then(setReviews).catch(() => setReviews([])).finally(() => setLoading(false));
  }, []);

  async function toggle(review: Review) {
    try {
      const next = await apiClient.admin.reviews.setHidden(review.id, !review.hidden);
      setReviews((prev) => prev.map((r) => (r.id === next.id ? next : r)));
      toast.success(next.hidden ? 'Review hidden' : 'Review visible again');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update review');
    }
  }

  if (loading) return <p className="text-muted-foreground">Loading…</p>;
  const rows = showHidden ? reviews : reviews.filter((r) => !r.hidden);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reviews</h1>
          <p className="mt-1 text-muted-foreground">
            {reviews.length} total · {reviews.filter((r) => r.hidden).length} hidden
          </p>
        </div>
        <Button variant="outline" onClick={() => setShowHidden((v) => !v)}>
          {showHidden ? 'Hide hidden reviews' : 'Show hidden reviews'}
        </Button>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No reviews yet.</p>
      ) : (
        <div className="space-y-4">
          {rows.map((r) => (
            <div key={r.id} className={`rounded-lg border p-4 ${r.hidden ? 'bg-muted/40 opacity-75' : ''}`}>
              <p className="mb-2 text-sm">
                <span className="font-semibold">{r.provider_name}</span>
                {r.reviewer_email && <span className="text-muted-foreground"> · by {r.reviewer_email}</span>}
              </p>
              <ul>
                <ReviewItem review={r}>
                  <div className="flex items-center gap-2">
                    {r.hidden && <span className="text-xs font-medium text-amber-700">Hidden from the app</span>}
                    <Button size="sm" variant={r.hidden ? 'outline' : 'ghost'} onClick={() => toggle(r)}>
                      {r.hidden ? 'Unhide' : 'Hide'}
                    </Button>
                  </div>
                </ReviewItem>
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

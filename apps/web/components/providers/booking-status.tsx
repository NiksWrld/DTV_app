import type { BookingStatus } from '@/types/dtv';

const STYLES: Record<BookingStatus, string> = {
  requested: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-emerald-100 text-emerald-800',
  completed: 'bg-blue-100 text-blue-800',
  declined: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-600',
};

const LABELS: Record<BookingStatus, string> = {
  requested: 'Requested',
  confirmed: 'Confirmed · letter issued',
  completed: 'Completed',
  declined: 'Declined',
  cancelled: 'Cancelled',
};

export function BookingStatusPill({ status }: { status: BookingStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[status] ?? STYLES.cancelled}`}>
      {LABELS[status] ?? status}
    </span>
  );
}

export function formatDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export async function openSignedUrl(load: () => Promise<{ url: string }>) {
  const tab = window.open('', '_blank');
  try {
    const { url } = await load();
    if (tab) tab.location.href = url;
    else window.location.href = url;
  } catch (err) {
    tab?.close();
    throw err;
  }
}

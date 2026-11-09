import { Medal } from 'lucide-react';
import { cn } from '@/lib/utils';

/** True when the provider holds admin-approved SAT recognition that has not expired. */
export function isSatValid(certified?: boolean, validUntil?: string | null): boolean {
  if (!certified) return false;
  if (!validUntil) return true;
  const today = new Date().toISOString().slice(0, 10);
  return validUntil >= today;
}

export function formatSatDate(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * "SAT certified" badge. Navy outline with a medal so it reads differently from the
 * grey "Verified DTV partner" chip. Renders nothing once the certificate has expired.
 */
export function SatBadge({
  certified,
  validUntil,
  showExpiry = false,
  className,
}: {
  certified?: boolean;
  validUntil?: string | null;
  showExpiry?: boolean;
  className?: string;
}) {
  if (!isSatValid(certified, validUntil)) return null;
  return (
    <span
      title={
        validUntil
          ? `Recognised by the Sports Authority of Thailand, valid until ${formatSatDate(validUntil)}`
          : 'Recognised by the Sports Authority of Thailand'
      }
      className={cn(
        'inline-flex items-center gap-1 rounded-md border border-indigo-600 bg-indigo-50 px-1.5 py-0.5 text-xs font-semibold text-indigo-800 whitespace-nowrap',
        className,
      )}
    >
      <Medal className="h-3 w-3" aria-hidden />
      SAT certified
      {showExpiry && validUntil && (
        <span className="font-normal text-indigo-700">· until {formatSatDate(validUntil)}</span>
      )}
    </span>
  );
}

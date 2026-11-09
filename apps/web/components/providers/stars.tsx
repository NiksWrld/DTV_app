import { Star } from 'lucide-react';

export function Stars({ value, size = 'size-4' }: { value: number; size?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value.toFixed(1)} out of 5 stars`} role="img">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden="true"
          className={`${size} ${value >= n - 0.25 ? 'fill-amber-400 text-amber-400' : value >= n - 0.75 ? 'fill-amber-400/50 text-amber-400' : 'text-muted-foreground/40'}`}
        />
      ))}
    </span>
  );
}

export function RatingSummary({ average, count }: { average?: number | null; count?: number }) {
  if (!count || average == null) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <Stars value={average} />
      <span className="font-medium tabular-nums">{average.toFixed(1)}</span>
      <span className="text-muted-foreground">({count})</span>
    </span>
  );
}

export function StarInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          onClick={() => onChange(n)}
          className="inline-flex size-11 items-center justify-center rounded-md hover:bg-accent"
        >
          <Star aria-hidden="true" className={`size-7 ${value >= n ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/50'}`} />
        </button>
      ))}
    </div>
  );
}

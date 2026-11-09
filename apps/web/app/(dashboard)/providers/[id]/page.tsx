'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { SafeImage } from '@/components/safe-image';
import { RequestLetterCard } from '@/components/providers/request-letter';
import { ReviewsSection } from '@/components/providers/reviews-section';
import { RatingSummary } from '@/components/providers/stars';
import { ProviderCard } from '@/components/providers/provider-card';
import { getRegionForCity, getBestMonths, SCORE_CONFIG } from '@/lib/weather-data';
import type { Provider, ProviderPackage } from '@/types/dtv';

const CATEGORY_LABELS: Record<string, string> = {
  muay_thai_gym: 'Muay Thai',
  cooking_school: 'Thai Cooking',
  medical: 'Medical',
  visa_advisory: 'Visa Advisory',
  coworking: 'Coworking',
  insurance: 'Insurance',
  relocation: 'Relocation',
};

const CATEGORY_COLORS: Record<string, string> = {
  muay_thai_gym: 'bg-red-500',
  cooking_school: 'bg-orange-500',
  medical: 'bg-blue-500',
  visa_advisory: 'bg-purple-500',
  coworking: 'bg-emerald-500',
  insurance: 'bg-yellow-500',
  relocation: 'bg-pink-500',
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function ProviderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [provider, setProvider] = useState<Provider | null>(null);
  const [packages, setPackages] = useState<ProviderPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Editable fields
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [externalUrlInput, setExternalUrlInput] = useState('');
  const [saving, setSaving] = useState(false);

  // Plan
  const [startMonth, setStartMonth] = useState('1');
  const [durationMonths, setDurationMonths] = useState('1');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    apiClient.account.get().then((a) => setIsAdmin(a.role === 'admin')).catch(() => setIsAdmin(false));
  }, []);

  useEffect(() => {
    apiClient.providerPortal.packages(id).then(setPackages).catch(() => setPackages([]));
    apiClient.providers.get(id).then((p) => {
      setProvider(p);
      setImageUrlInput(p.image_url ?? '');
      setExternalUrlInput(p.external_url ?? '');
    }).finally(() => setLoading(false));
  }, [id]);

  async function saveFields() {
    if (!provider) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/providers/${provider.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          image_url: imageUrlInput || null,
          external_url: externalUrlInput || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      setProvider((p) => p ? {
        ...p,
        image_url: imageUrlInput || undefined,
        external_url: externalUrlInput || undefined,
      } : p);
      toast.success('Saved');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function addToPlan() {
    if (!provider) return;
    setAdding(true);
    try {
      await apiClient.plan.add({
        provider_id: provider.id,
        start_month: parseInt(startMonth),
        duration_months: parseInt(durationMonths),
      });
      toast.success(`${provider.name} added to your plan`);
      router.push('/plan');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add to plan');
    } finally {
      setAdding(false);
    }
  }

  if (loading) return <p className="text-muted-foreground">Loading...</p>;
  if (!provider) return <p className="text-muted-foreground">Provider not found.</p>;

  const displayImage = imageUrlInput || provider.image_url;
  const colorClass = CATEGORY_COLORS[provider.category] ?? 'bg-gray-400';
  const region = getRegionForCity(provider.location ?? provider.cities_served?.[0]);
  const bestMonths = region ? getBestMonths(region) : [];

  return (
    <div className="max-w-2xl space-y-6">
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex min-h-11 items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        ← Back
      </button>

      {/* Hero image */}
      <div className="overflow-hidden rounded-xl border">
        <SafeImage
          src={displayImage}
          alt={provider.name}
          className="h-56 w-full object-cover"
          fallback={
            <div className={`flex h-56 w-full items-center justify-center ${colorClass}`}>
              <span className="px-4 text-center text-xl font-bold text-white/60 sm:text-3xl">
                {CATEGORY_LABELS[provider.category] ?? provider.category}
              </span>
            </div>
          }
        />
      </div>

      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-bold">{provider.name}</h1>
          {provider.verification_status === 'verified_docs_seen' && !provider.limited && (
            <Badge variant="secondary">Verified DTV Provider</Badge>
          )}
          {provider.supports_dtv && !provider.limited && (
            <Badge variant="outline">DTV Documents Issued</Badge>
          )}
        </div>
        <p className="text-muted-foreground">
          {CATEGORY_LABELS[provider.category] ?? provider.category}
          {provider.location && ` · ${provider.location}`}
        </p>
        <RatingSummary average={provider.rating_avg} count={provider.rating_count} />
        {provider.cities_served && provider.cities_served.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {provider.cities_served.map((c) => (
              <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
            ))}
          </div>
        )}
      </div>

      {provider.limited && (
        <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
          <div>
            <h2 className="font-semibold">Not a DTV partner yet</h2>
            <p className="text-sm text-muted-foreground">
              {provider.name} hasn&rsquo;t joined the app yet, so we can&rsquo;t show prices or contact details, and it
              can&rsquo;t issue your DTV letter here.
            </p>
          </div>
          {provider.alternatives && provider.alternatives.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Verified DTV partners you can book instead</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {provider.alternatives.map((alt) => (
                  <ProviderCard key={alt.id} provider={alt} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Description */}
      {provider.description && (
        <p className="text-sm leading-relaxed">{provider.description}</p>
      )}

      {/* Pricing */}
      {provider.pricing && (
        <div className="border rounded-lg p-4 space-y-3">
          <h2 className="font-semibold">Pricing ({provider.pricing.currency})</h2>
          {provider.pricing.tiers.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {provider.pricing.tiers.map((tier) => (
                <div key={tier.months} className="border rounded-lg p-3 text-center">
                  <div className="text-lg font-bold">{tier.months}mo</div>
                  <div className="text-sm text-muted-foreground">
                    {tier.price.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ~{Math.round(tier.price / tier.months).toLocaleString()}/mo
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{provider.pricing.note}</p>
          )}
        </div>
      )}

      {packages.length > 0 && (
        <div className="space-y-2 rounded-lg border p-4">
          <h2 className="font-semibold">Packages</h2>
          {packages.map((item) => (
            <div key={item.id} className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
              <span className="font-medium">{item.name}</span>
              <span className="text-muted-foreground">
                {item.price_amount != null ? `${item.currency} ${item.price_amount.toLocaleString()}` : 'Ask'}
                {item.duration_days ? ` · ${item.duration_days} days` : ''}
              </span>
            </div>
          ))}
        </div>
      )}

      {provider.listing_type === 'dtv_program' && !provider.limited && (
        <RequestLetterCard provider={provider} packages={packages} />
      )}

      <ReviewsSection providerId={provider.id} />

      {/* Weather */}
      {region && (
        <div className="border rounded-lg p-4 space-y-3">
          <h2 className="font-semibold">Best time to visit</h2>
          <p className="text-xs text-muted-foreground">{region.tip}</p>
          <div className="grid grid-cols-12 gap-1">
            {region.months.map((w, i) => {
              const cfg = SCORE_CONFIG[w.score];
              return (
                <div key={i} className="text-center" title={w.label}>
                  <div className="h-8 rounded-sm mb-1" style={{ backgroundColor: cfg.color, opacity: 0.8 }} />
                  <span className={`text-[10px] font-medium ${w.score >= 4 ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {['J','F','M','A','M','J','J','A','S','O','N','D'][i]}
                  </span>
                </div>
              );
            })}
          </div>
          {bestMonths.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Best months:{' '}
              <strong className="text-foreground">
                {bestMonths.map((m) => MONTHS[m - 1]).join(', ')}
              </strong>
            </p>
          )}
          <div className="flex gap-3 flex-wrap">
            {([5, 4, 3, 2, 1] as const).map((s) => (
              <span key={s} className="flex items-center gap-1 text-xs text-muted-foreground">
                <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: SCORE_CONFIG[s].color }} />
                {SCORE_CONFIG[s].label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Admin: image + website */}
      {isAdmin && (
      <div className="border rounded-lg p-4 space-y-4">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Admin</h2>

        <div className="space-y-1.5">
          <Label htmlFor="external-url">Website URL</Label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              id="external-url"
              value={externalUrlInput}
              onChange={(e) => setExternalUrlInput(e.target.value)}
              placeholder="https://..."
              className="flex-1"
            />
            {externalUrlInput && (
              <a
                href={externalUrlInput}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 shrink-0 items-center justify-center rounded-lg border px-3 text-sm transition-colors hover:bg-accent"
              >
                Open ↗
              </a>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Visit the site to find a good image, then paste the URL below.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="image-url">Image URL</Label>
          <Input
            id="image-url"
            value={imageUrlInput}
            onChange={(e) => setImageUrlInput(e.target.value)}
            placeholder="https://example.com/image.jpg"
          />
          {imageUrlInput && (
            <SafeImage
              src={imageUrlInput}
              alt="Preview"
              className="mt-2 h-24 w-full rounded-lg border object-cover"
              fallback={<div className="mt-2 flex h-24 w-full items-center justify-center rounded-lg border bg-muted text-xs text-muted-foreground">Image unavailable</div>}
            />
          )}
        </div>

        <Button onClick={saveFields} disabled={saving} size="sm">
          {saving ? 'Saving...' : 'Save changes'}
        </Button>
      </div>
      )}

      {/* Add to plan */}
      {provider.listing_type === 'dtv_program' && (
        <div className="border rounded-lg p-4 space-y-4">
          <h2 className="font-semibold">Add to My Plan</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start month</Label>
              <Select value={startMonth} onValueChange={(v) => setStartMonth(v ?? '1')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      Month {i + 1} ({m})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Duration</Label>
              <Select value={durationMonths} onValueChange={(v) => setDurationMonths(v ?? '1')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 9, 12].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} month{n !== 1 ? 's' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {provider.pricing?.tiers && (() => {
            const dur = parseInt(durationMonths);
            const tier = provider.pricing!.tiers.find((t) => t.months === dur)
              ?? [...provider.pricing!.tiers].sort(
                (a, b) => Math.abs(a.months - dur) - Math.abs(b.months - dur)
              )[0];
            return tier ? (
              <p className="text-sm text-muted-foreground">
                Estimated: <strong>{provider.pricing!.currency} {tier.price.toLocaleString()}</strong>
                {tier.months !== dur && ' (closest tier)'}
              </p>
            ) : null;
          })()}
          <Button onClick={addToPlan} disabled={adding} className="w-full">
            {adding ? 'Adding...' : 'Add to Plan'}
          </Button>
        </div>
      )}
    </div>
  );
}

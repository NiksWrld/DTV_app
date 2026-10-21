'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Provider } from '@/types/dtv';

export interface ProviderFormData {
  name: string;
  category: string;
  listing_type: string;
  dtv_certified: boolean;
  verification_status: string;
  location: string;
  cities_served: string;
  description: string;
  external_url: string;
  image_url: string;
  affiliate_type: string;
  pricing_currency: string;
  pricing_tiers: { months: number; price: number }[];
}

export function providerToForm(p: Provider): ProviderFormData {
  const pricing = p.pricing as { currency?: string; tiers?: { months: number; price: number }[] } | null;
  return {
    name: p.name,
    category: p.category,
    listing_type: p.listing_type,
    dtv_certified: p.dtv_certified,
    verification_status: p.verification_status,
    location: p.location ?? '',
    cities_served: (p.cities_served ?? []).join(', '),
    description: p.description ?? '',
    external_url: p.external_url ?? '',
    image_url: p.image_url ?? '',
    affiliate_type: p.affiliate_type ?? '',
    pricing_currency: pricing?.currency ?? 'THB',
    pricing_tiers: pricing?.tiers ?? [],
  };
}

export function formToPayload(f: ProviderFormData): Record<string, unknown> {
  const cities = f.cities_served.split(',').map((s) => s.trim()).filter(Boolean);
  return {
    name: f.name,
    category: f.category,
    listing_type: f.listing_type,
    dtv_certified: f.dtv_certified,
    verification_status: f.verification_status,
    location: f.location || null,
    cities_served: cities,
    description: f.description || null,
    external_url: f.external_url || null,
    image_url: f.image_url || null,
    affiliate_type: f.affiliate_type || null,
    pricing: f.pricing_tiers.length > 0
      ? { currency: f.pricing_currency || 'THB', tiers: f.pricing_tiers }
      : null,
  };
}

const EMPTY_FORM: ProviderFormData = {
  name: '', category: 'muay_thai_gym', listing_type: 'dtv_program',
  dtv_certified: false, verification_status: 'unreviewed',
  location: '', cities_served: '', description: '',
  external_url: '', image_url: '', affiliate_type: '',
  pricing_currency: 'THB', pricing_tiers: [],
};

interface Props {
  initial?: ProviderFormData;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  submitLabel: string;
}

export function ProviderForm({ initial = EMPTY_FORM, onSubmit, submitLabel }: Props) {
  const [form, setForm] = useState<ProviderFormData>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set<K extends keyof ProviderFormData>(key: K, value: ProviderFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function addTier() {
    set('pricing_tiers', [...form.pricing_tiers, { months: 1, price: 0 }]);
  }

  function removeTier(i: number) {
    set('pricing_tiers', form.pricing_tiers.filter((_, idx) => idx !== i));
  }

  function updateTier(i: number, field: 'months' | 'price', value: number) {
    set('pricing_tiers', form.pricing_tiers.map((t, idx) => idx === i ? { ...t, [field]: value } : t));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    setError('');
    try {
      await onSubmit(formToPayload(form));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  const isDtv = form.listing_type === 'dtv_program';

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {/* Core */}
      <Card>
        <CardHeader><CardTitle className="text-base">Basic info</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Provider name" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <select
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="muay_thai_gym">Muay Thai Gym</option>
                <option value="cooking_school">Cooking School</option>
                <option value="medical">Medical</option>
                <option value="visa_advisory">Visa Advisory</option>
                <option value="coworking">Coworking</option>
                <option value="insurance">Insurance</option>
                <option value="relocation">Relocation</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Listing type</Label>
              <select
                value={form.listing_type}
                onChange={(e) => set('listing_type', e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="dtv_program">DTV Program</option>
                <option value="useful_link">Partner / Useful Link</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Verification status</Label>
              <select
                value={form.verification_status}
                onChange={(e) => set('verification_status', e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="unreviewed">Unreviewed</option>
                <option value="listed">Listed</option>
                <option value="verified_docs_seen">Verified</option>
                <option value="featured">Featured</option>
              </select>
            </div>
            {isDtv && (
              <div className="space-y-1.5 flex flex-col justify-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.dtv_certified}
                    onChange={(e) => set('dtv_certified', e.target.checked)}
                    className="h-4 w-4 rounded border accent-emerald-600"
                  />
                  <span className="text-sm font-medium">DTV Certified</span>
                </label>
                <p className="text-xs text-muted-foreground">Can issue official DTV enrollment letter</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Location */}
      <Card>
        <CardHeader><CardTitle className="text-base">Location</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="location">Primary location</Label>
              <Input id="location" value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="e.g. Chiang Mai" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cities">Cities served (comma-separated)</Label>
              <Input id="cities" value={form.cities_served} onChange={(e) => set('cities_served', e.target.value)} placeholder="Bangkok, Chiang Mai" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Details */}
      <Card>
        <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="desc">Description</Label>
            <textarea
              id="desc"
              rows={3}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Short description shown on cards"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="url">Website URL</Label>
              <div className="flex gap-2">
                <Input id="url" value={form.external_url} onChange={(e) => set('external_url', e.target.value)} placeholder="https://..." />
                {form.external_url && (
                  <a href={form.external_url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-xs text-primary self-center">Open →</a>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="affiliate">Affiliate type</Label>
              <Input id="affiliate" value={form.affiliate_type} onChange={(e) => set('affiliate_type', e.target.value)} placeholder="e.g. cj, impact" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="img">Image URL</Label>
            <Input id="img" value={form.image_url} onChange={(e) => set('image_url', e.target.value)} placeholder="https://..." />
            {form.image_url && (
              <img src={form.image_url} alt="" className="mt-2 h-20 w-auto rounded border object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Pricing</CardTitle>
            <Button type="button" size="sm" variant="outline" onClick={addTier}>+ Add tier</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {form.pricing_tiers.length === 0 && (
            <p className="text-sm text-muted-foreground">No pricing tiers — add one above.</p>
          )}
          {form.pricing_tiers.length > 0 && (
            <div className="flex items-center gap-2 mb-2">
              <Label className="shrink-0 text-sm">Currency</Label>
              <Input
                value={form.pricing_currency}
                onChange={(e) => set('pricing_currency', e.target.value)}
                className="w-24"
                placeholder="THB"
              />
            </div>
          )}
          {form.pricing_tiers.map((tier, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                type="number"
                value={tier.months}
                onChange={(e) => updateTier(i, 'months', Number(e.target.value))}
                className="w-24"
                min={1}
                placeholder="Months"
              />
              <span className="text-sm text-muted-foreground shrink-0">mo ·</span>
              <Input
                type="number"
                value={tier.price}
                onChange={(e) => updateTier(i, 'price', Number(e.target.value))}
                className="w-32"
                min={0}
                placeholder="Price"
              />
              <span className="text-xs text-muted-foreground shrink-0">{form.pricing_currency}</span>
              <Button type="button" size="sm" variant="ghost" onClick={() => removeTier(i)} className="text-destructive">✕</Button>
              <span className="text-xs text-muted-foreground ml-auto">
                ~{form.pricing_currency} {Math.round(tier.price / tier.months).toLocaleString()}/mo
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={saving}>
        {saving ? 'Saving…' : submitLabel}
      </Button>
    </form>
  );
}

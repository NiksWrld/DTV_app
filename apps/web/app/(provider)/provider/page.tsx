'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { SafeImage } from '@/components/safe-image';
import { LetterRequestsCard } from '@/components/providers/letter-requests';
import { ProviderReviewsCard } from '@/components/providers/provider-reviews-card';
import { SatCertificationCard } from '@/components/providers/sat-card';
import type { OwnedListing, ProviderPackage, ViewStats } from '@/types/dtv';

const CATEGORIES = [
  ['muay_thai_gym', 'Muay Thai gym'],
  ['cooking_school', 'Cooking school'],
  ['medical', 'Medical'],
  ['visa_advisory', 'Visa advisory'],
  ['coworking', 'Coworking'],
  ['insurance', 'Insurance'],
  ['relocation', 'Relocation'],
] as const;

export default function ProviderDashboardPage() {
  const [listing, setListing] = useState<OwnedListing | null>(null);
  const [packages, setPackages] = useState<ProviderPackage[]>([]);
  const [stats, setStats] = useState<ViewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('muay_thai_gym');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<{ id: string; name: string; location?: string }>>([]);
  const [packageName, setPackageName] = useState('');
  const [packagePrice, setPackagePrice] = useState('');
  const [packageDays, setPackageDays] = useState('');

  function applyListing(next: OwnedListing | null, nextPackages: ProviderPackage[] = []) {
    setListing(next);
    setPackages(nextPackages);
    if (!next) return;
    setName(next.name);
    setCategory(next.category);
    setLocation(next.location ?? '');
    setDescription(next.description ?? '');
    setContactEmail(next.contact_email ?? '');
    setContactPhone(next.contact_phone ?? '');
  }

  useEffect(() => {
    apiClient.providerPortal.me()
      .then((data) => {
        applyListing(data.listing, data.packages);
        setStats(data.stats ?? null);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to load listing'))
      .finally(() => setLoading(false));
  }, []);

  function body() {
    return {
      name,
      category,
      location: location || undefined,
      description: description || undefined,
      contact_email: contactEmail || undefined,
      contact_phone: contactPhone || undefined,
    };
  }

  async function save(create: boolean) {
    setSaving(true);
    try {
      const next = create
        ? await apiClient.providerPortal.create(body())
        : await apiClient.providerPortal.save(body());
      applyListing(next, packages);
      toast.success(create ? 'Listing submitted for review' : 'Listing saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function search() {
    try {
      setResults(await apiClient.providerPortal.claimable(query));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Search failed');
    }
  }

  async function claim(id: string) {
    try {
      const next = await apiClient.providerPortal.claim(id);
      applyListing(next, []);
      setResults([]);
      toast.success('Claim submitted. An admin still needs to verify it.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Claim failed');
    }
  }

  async function addPackage() {
    try {
      const created = await apiClient.providerPortal.addPackage({
        name: packageName,
        price_amount: packagePrice ? Number(packagePrice) : undefined,
        duration_days: packageDays ? Number(packageDays) : undefined,
        currency: 'THB',
      });
      setPackages((prev) => [...prev, created]);
      setPackageName('');
      setPackagePrice('');
      setPackageDays('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add package');
    }
  }

  async function uploadPhoto(file: File) {
    const token = localStorage.getItem('token');
    const form = new FormData();
    form.append('photo', file);
    const res = await fetch('/api/provider/photos', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error || 'Upload failed');
      return;
    }
    applyListing(data, packages);
    toast.success('Photo added');
  }

  if (loading) return <p className="text-muted-foreground">Loading your listing...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Your listing</h1>
        <p className="mt-1 text-muted-foreground">
          {listing
            ? `Status: ${listing.claim_status.replace('_', ' ')} · ${listing.verification_status.replaceAll('_', ' ')}`
            : 'Create a new school or claim one that is already in the directory.'}
        </p>
      </div>

      {listing && stats && (
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="pt-4">
              <p className="text-3xl font-bold tabular-nums">{stats.views_30d}</p>
              <p className="text-sm text-muted-foreground">DTV applicants viewed you in the last 30 days</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-3xl font-bold tabular-nums">{stats.views_total}</p>
              <p className="text-sm text-muted-foreground">Profile views in total</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{listing ? 'Profile' : 'New listing'}</CardTitle>
          <CardDescription>Name, city, what you offer, and how applicants reach you.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Name" value={name} onChange={setName} />
          <div className="space-y-1.5">
            <Label htmlFor="category">Type</Label>
            <select id="category" value={category} onChange={(e) => setCategory(e.target.value)} className="w-full min-h-11 rounded-lg border bg-background px-3 text-base md:text-sm">
              {CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <Field label="City" value={location} onChange={setLocation} />
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <textarea id="description" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full min-h-11 rounded-lg border bg-background px-3 py-2 text-base md:text-sm" />
          </div>
          <Field label="Contact email" value={contactEmail} onChange={setContactEmail} />
          <Field label="Contact phone" value={contactPhone} onChange={setContactPhone} />
          <Button className="w-full" disabled={saving || !name.trim()} onClick={() => save(!listing)}>
            {saving ? 'Saving...' : listing ? 'Save profile' : 'Submit listing'}
          </Button>
        </CardContent>
      </Card>

      {listing && (
        <LetterRequestsCard
          packages={packages}
          isPartner={listing.claim_status === 'approved' && ['verified_docs_seen', 'featured'].includes(listing.verification_status)}
        />
      )}

      {listing && <SatCertificationCard />}

      {listing && <ProviderReviewsCard />}

      {listing && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Photos</CardTitle>
              <CardDescription>JPG or PNG, stored with your other uploads.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <SafeImage
                src={listing.image_url}
                alt=""
                className="h-40 w-full rounded-lg object-cover"
                fallback={<div className="flex h-40 w-full items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground">No photo yet</div>}
              />
              <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg border px-3 text-sm font-medium">
                Add photo
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  capture="environment"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (file) uploadPhoto(file);
                  }}
                />
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Packages</CardTitle>
              <CardDescription>Price and length, ready for booking later. No payments yet.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {packages.map((item) => (
                <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-muted-foreground">
                      {item.price_amount != null ? `${item.currency} ${item.price_amount.toLocaleString()}` : 'Price on request'}
                      {item.duration_days ? ` · ${item.duration_days} days` : ''}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => apiClient.providerPortal.removePackage(item.id).then(() => setPackages((prev) => prev.filter((p) => p.id !== item.id)))}>
                    Remove
                  </Button>
                </div>
              ))}
              <Field label="Package name" value={packageName} onChange={setPackageName} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Price (THB)" value={packagePrice} onChange={setPackagePrice} />
                <Field label="Days" value={packageDays} onChange={setPackageDays} />
              </div>
              <Button variant="outline" disabled={!packageName.trim()} onClick={addPackage}>Add package</Button>
            </CardContent>
          </Card>
        </>
      )}

      {!listing && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Claim an existing listing</CardTitle>
            <CardDescription>Search the directory, including schools already seeded in the app.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Gym or city" />
              <Button type="button" variant="outline" onClick={search}>Search</Button>
            </div>
            {results.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                <div>
                  <p className="font-medium">{item.name}</p>
                  {item.location && <p className="text-sm text-muted-foreground">{item.location}</p>}
                </div>
                <Button size="sm" onClick={() => claim(item.id)}>Claim</Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const id = label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

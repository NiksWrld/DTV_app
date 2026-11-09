'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { SafeImage } from '@/components/safe-image';
import { SatBadge } from '@/components/providers/sat-badge';
import { SatReviewsSection } from '@/components/admin/sat-reviews';
import type { Provider, ProviderViewRow } from '@/types/dtv';

const CATEGORY_LABELS: Record<string, string> = {
  muay_thai_gym: 'Muay Thai', cooking_school: 'Cooking', medical: 'Medical',
  visa_advisory: 'Visa Advisory', coworking: 'Coworking', insurance: 'Insurance', relocation: 'Relocation',
};

const STATUS_COLORS: Record<string, string> = {
  unreviewed: 'bg-gray-100 text-gray-600',
  listed: 'bg-blue-100 text-blue-700',
  verified_docs_seen: 'bg-emerald-100 text-emerald-700',
  featured: 'bg-amber-100 text-amber-700',
};

function ViewsLine({ stats }: { stats?: ProviderViewRow }) {
  const claimed = stats?.claim_status === 'approved';
  return (
    <span className="text-xs text-muted-foreground tabular-nums">
      <strong className="text-foreground">{stats?.views_30d ?? 0}</strong> views · 30 days
      {' · '}
      {stats?.views_total ?? 0} total
      {stats && !claimed && <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">{stats.claim_status}</span>}
    </span>
  );
}

function ProviderRow({
  provider,
  stats,
  deleting,
  onDelete,
}: {
  provider: Provider;
  stats?: ProviderViewRow;
  deleting: string | null;
  onDelete: (provider: Provider) => void;
}) {
  return (
    <tr className="border-b transition-colors hover:bg-muted/30">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <SafeImage
            src={provider.image_url}
            alt=""
            className="size-10 shrink-0 rounded border object-cover"
            fallback={<div className="size-10 shrink-0 rounded bg-muted" />}
          />
          <div className="min-w-0">
            <p className="text-sm font-medium break-words">{provider.name}</p>
            {provider.location && <p className="text-xs text-muted-foreground">{provider.location}</p>}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {CATEGORY_LABELS[provider.category] ?? provider.category}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[provider.verification_status] ?? STATUS_COLORS.unreviewed}`}>
            {provider.verification_status}
          </span>
          {provider.dtv_certified && (
            <Badge className="bg-emerald-600 text-xs text-white hover:bg-emerald-600">DTV Certified</Badge>
          )}
          <SatBadge certified={provider.sat_certified} validUntil={provider.sat_valid_until} />
        </div>
      </td>
      <td className="px-4 py-3 text-sm tabular-nums">
        <p><strong>{stats?.views_30d ?? 0}</strong> <span className="text-muted-foreground">/ 30d</span></p>
        <p className="text-xs text-muted-foreground">{stats?.views_total ?? 0} total</p>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-2">
          <Link href={`/admin/providers/${provider.id}`}>
            <Button size="sm" variant="outline">Edit</Button>
          </Link>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(provider)}
            disabled={deleting === provider.id}
          >
            {deleting === provider.id ? '…' : 'Delete'}
          </Button>
        </div>
      </td>
    </tr>
  );
}

function ProviderGroup({
  rows,
  title,
  stats,
  deleting,
  onDelete,
}: {
  rows: Provider[];
  title: string;
  stats: Record<string, ProviderViewRow>;
  deleting: string | null;
  onDelete: (provider: Provider) => void;
}) {
  if (rows.length === 0) return null;
  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">{title}</h2>
      <div className="space-y-3 md:hidden">
        {rows.map((provider) => (
          <article key={provider.id} className="space-y-3 rounded-lg border p-4">
            <div className="flex items-start gap-3">
              <SafeImage
                src={provider.image_url}
                alt=""
                className="size-12 shrink-0 rounded border object-cover"
                fallback={<div className="size-12 shrink-0 rounded bg-muted" />}
              />
              <div className="min-w-0">
                <p className="font-medium break-words">{provider.name}</p>
                {provider.location && <p className="text-xs text-muted-foreground">{provider.location}</p>}
                <p className="text-xs text-muted-foreground">{CATEGORY_LABELS[provider.category] ?? provider.category}</p>
                <ViewsLine stats={stats[provider.id]} />
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[provider.verification_status] ?? STATUS_COLORS.unreviewed}`}>
                {provider.verification_status}
              </span>
              {provider.dtv_certified && (
                <Badge className="bg-emerald-600 text-xs text-white hover:bg-emerald-600">DTV Certified</Badge>
              )}
              <SatBadge certified={provider.sat_certified} validUntil={provider.sat_valid_until} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`/admin/providers/${provider.id}`}>
                <Button size="sm" variant="outline">Edit</Button>
              </Link>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => onDelete(provider)}
                disabled={deleting === provider.id}
              >
                {deleting === provider.id ? '…' : 'Delete'}
              </Button>
            </div>
          </article>
        ))}
      </div>
      <div className="hidden overflow-x-auto rounded-lg border md:block" tabIndex={0} role="region" aria-label={title}>
        <table className="w-full min-w-[720px] text-left">
          <thead className="bg-muted/50 text-xs text-muted-foreground uppercase">
            <tr>
              <th className="px-4 py-2 font-medium">Provider</th>
              <th className="px-4 py-2 font-medium">Category</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Views</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((provider) => (
              <ProviderRow key={provider.id} provider={provider} stats={stats[provider.id]} deleting={deleting} onDelete={onDelete} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [claims, setClaims] = useState<Array<{ id: string; name: string; location?: string; owner_email?: string }>>([]);
  const [stats, setStats] = useState<Record<string, ProviderViewRow>>({});
  const [sortByViews, setSortByViews] = useState(false);

  function load() {
    apiClient.admin.providers.list().then(setProviders).finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    apiClient.admin.claims.list().then(setClaims).catch(() => setClaims([]));
    apiClient.admin.providers.stats()
      .then((rows) => setStats(Object.fromEntries(rows.map((row) => [row.provider_id, row]))))
      .catch(() => setStats({}));
  }, []);

  async function handleDelete(p: Provider) {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    setDeleting(p.id);
    try {
      await apiClient.admin.providers.remove(p.id);
      setProviders((prev) => prev.filter((x) => x.id !== p.id));
      toast.success(`"${p.name}" deleted`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeleting(null);
    }
  }

  const q = search.toLowerCase();
  const filtered = providers.filter((p) =>
    !search || p.name.toLowerCase().includes(q) || p.category.includes(q) || p.location?.toLowerCase().includes(q)
  );
  if (sortByViews) {
    filtered.sort((a, b) => (stats[b.id]?.views_30d ?? 0) - (stats[a.id]?.views_30d ?? 0));
  }

  const dtv = filtered.filter((p) => p.listing_type === 'dtv_program');
  const links = filtered.filter((p) => p.listing_type === 'useful_link');

  if (loading) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Providers & Partners</h1>
          <p className="text-muted-foreground mt-1">{providers.length} total</p>
        </div>
        <Link href="/admin/providers/new" className="sm:shrink-0">
          <Button className="w-full sm:w-auto">+ New provider</Button>
        </Link>
      </div>

      {claims.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Pending claims</h2>
          {claims.map((claim) => (
            <div key={claim.id} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-medium break-words">{claim.name}</p>
                <p className="text-sm text-muted-foreground">{claim.owner_email || 'No email'}{claim.location ? ` · ${claim.location}` : ''}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => apiClient.admin.claims.review(claim.id, 'approve').then(() => setClaims((prev) => prev.filter((c) => c.id !== claim.id)))}>
                  Verify
                </Button>
                <Button size="sm" variant="ghost" onClick={() => apiClient.admin.claims.review(claim.id, 'reject').then(() => setClaims((prev) => prev.filter((c) => c.id !== claim.id)))}>
                  Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <SatReviewsSection />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          placeholder="Search by name, category, city…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:max-w-sm"
        />
        <Button variant={sortByViews ? 'default' : 'outline'} onClick={() => setSortByViews((v) => !v)}>
          {sortByViews ? 'Sorted by views (30 days)' : 'Sort by views'}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Views count one signed-in applicant per provider per day. Use the 30-day number in claim emails, e.g. &ldquo;37 DTV users viewed your gym this month&rdquo;.
      </p>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm">No providers found.</p>
      ) : (
        <div className="space-y-8">
          <ProviderGroup rows={dtv} title="DTV Programs" stats={stats} deleting={deleting} onDelete={handleDelete} />
          <ProviderGroup rows={links} title="Partners & Useful Links" stats={stats} deleting={deleting} onDelete={handleDelete} />
        </div>
      )}
    </div>
  );
}

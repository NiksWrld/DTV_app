'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import type { Provider } from '@/types/dtv';

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

export default function AdminProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  function load() {
    apiClient.admin.providers.list().then(setProviders).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

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

  const dtv = filtered.filter((p) => p.listing_type === 'dtv_program');
  const links = filtered.filter((p) => p.listing_type === 'useful_link');

  if (loading) return <p className="text-muted-foreground">Loading…</p>;

  function ProviderRow({ p }: { p: Provider }) {
    return (
      <tr className="border-b hover:bg-muted/30 transition-colors">
        <td className="py-3 px-4">
          <div className="flex items-center gap-3">
            {p.image_url
              ? <img src={p.image_url} alt="" className="w-10 h-10 rounded object-cover shrink-0 border" />
              : <div className="w-10 h-10 rounded bg-muted shrink-0" />
            }
            <div>
              <p className="font-medium text-sm">{p.name}</p>
              {p.location && <p className="text-xs text-muted-foreground">{p.location}</p>}
            </div>
          </div>
        </td>
        <td className="py-3 px-4 text-sm text-muted-foreground">
          {CATEGORY_LABELS[p.category] ?? p.category}
        </td>
        <td className="py-3 px-4">
          <div className="flex gap-1 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[p.verification_status] ?? STATUS_COLORS.unreviewed}`}>
              {p.verification_status}
            </span>
            {p.dtv_certified && (
              <Badge className="text-xs bg-emerald-600 hover:bg-emerald-600 text-white">DTV Certified</Badge>
            )}
          </div>
        </td>
        <td className="py-3 px-4 text-right">
          <div className="flex justify-end gap-2">
            <Link href={`/admin/providers/${p.id}`}>
              <Button size="sm" variant="outline">Edit</Button>
            </Link>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:bg-destructive/10"
              onClick={() => handleDelete(p)}
              disabled={deleting === p.id}
            >
              {deleting === p.id ? '…' : 'Delete'}
            </Button>
          </div>
        </td>
      </tr>
    );
  }

  function Table({ rows, title }: { rows: Provider[]; title: string }) {
    if (rows.length === 0) return null;
    return (
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{title}</h2>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-muted/50 text-xs text-muted-foreground uppercase">
              <tr>
                <th className="py-2 px-4 font-medium">Provider</th>
                <th className="py-2 px-4 font-medium">Category</th>
                <th className="py-2 px-4 font-medium">Status</th>
                <th className="py-2 px-4" />
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => <ProviderRow key={p.id} p={p} />)}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Providers & Partners</h1>
          <p className="text-muted-foreground mt-1">{providers.length} total</p>
        </div>
        <Link href="/admin/providers/new">
          <Button>+ New provider</Button>
        </Link>
      </div>

      <Input
        placeholder="Search by name, category, city…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm">No providers found.</p>
      ) : (
        <div className="space-y-8">
          <Table rows={dtv} title="DTV Programs" />
          <Table rows={links} title="Partners & Useful Links" />
        </div>
      )}
    </div>
  );
}

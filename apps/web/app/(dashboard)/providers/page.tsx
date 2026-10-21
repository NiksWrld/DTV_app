'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/api-client';
import { ProviderCard, CATEGORY_LABELS } from '@/components/providers/provider-card';
import type { Provider } from '@/types/dtv';

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [certifiedOnly, setCertifiedOnly] = useState(false);

  useEffect(() => {
    apiClient.providers.list().then(setProviders).finally(() => setLoading(false));
  }, []);

  const dtv = providers.filter((p) => p.listing_type === 'dtv_program');
  const categories = Array.from(new Set(dtv.map((p) => p.category)));

  const filtered = dtv.filter((p) => {
    const q = search.toLowerCase();
    return (
      (!activeCategory || p.category === activeCategory) &&
      (!certifiedOnly || p.dtv_certified) &&
      (!search ||
        p.name.toLowerCase().includes(q) ||
        p.location?.toLowerCase().includes(q) ||
        p.cities_served?.some((c) => c.toLowerCase().includes(q)))
    );
  });

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">DTV Programs</h1>
        <p className="text-muted-foreground mt-1">
          Providers that issue DTV-compliant enrollment letters for 6-month programs
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Search by name or city..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant={activeCategory === '' ? 'default' : 'outline'}
            onClick={() => setActiveCategory('')}
          >
            All
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat}
              size="sm"
              variant={activeCategory === cat ? 'default' : 'outline'}
              onClick={() => setActiveCategory(activeCategory === cat ? '' : cat)}
            >
              {CATEGORY_LABELS[cat] ?? cat}
            </Button>
          ))}
          <Button
            size="sm"
            variant={certifiedOnly ? 'default' : 'outline'}
            onClick={() => setCertifiedOnly((v) => !v)}
            className={certifiedOnly ? 'bg-emerald-600 hover:bg-emerald-700 border-emerald-600' : 'border-emerald-600 text-emerald-700 hover:bg-emerald-50'}
          >
            ✓ DTV Certified
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm">No providers found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => <ProviderCard key={p.id} provider={p} />)}
        </div>
      )}
    </div>
  );
}

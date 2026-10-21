'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { getRegionForCity, SCORE_CONFIG, type RegionWeather } from '@/lib/weather-data';
import type { PlanItem } from '@/types/dtv';

const CATEGORY_COLORS: Record<string, string> = {
  muay_thai_gym: '#ef4444',
  cooking_school: '#f97316',
  medical: '#3b82f6',
  visa_advisory: '#8b5cf6',
  coworking: '#10b981',
  insurance: '#eab308',
  relocation: '#ec4899',
};

const CATEGORY_LABELS: Record<string, string> = {
  muay_thai_gym: 'Muay Thai',
  cooking_school: 'Cooking',
  medical: 'Medical',
  visa_advisory: 'Visa Advisory',
  coworking: 'Coworking',
  insurance: 'Insurance',
  relocation: 'Relocation',
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getColor(category: string) {
  return CATEGORY_COLORS[category] ?? '#6b7280';
}

export default function PlanPage() {
  const router = useRouter();
  const [items, setItems] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalMonths, setTotalMonths] = useState(12);

  useEffect(() => {
    apiClient.plan.list().then(setItems).finally(() => setLoading(false));
  }, []);

  async function remove(id: string) {
    try {
      await apiClient.plan.remove(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success('Removed from plan');
    } catch {
      toast.error('Failed to remove item');
    }
  }

  async function updateDuration(item: PlanItem, delta: number) {
    const next = Math.max(1, Math.min(totalMonths - item.start_month + 1, item.duration_months + delta));
    if (next === item.duration_months) return;
    try {
      const updated = await apiClient.plan.update(item.id, { duration_months: next });
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
    } catch {
      toast.error('Failed to update');
    }
  }

  async function updateStartMonth(item: PlanItem, delta: number) {
    const next = Math.max(1, Math.min(totalMonths, item.start_month + delta));
    if (next === item.start_month) return;
    try {
      const updated = await apiClient.plan.update(item.id, { start_month: next });
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
    } catch {
      toast.error('Failed to update');
    }
  }

  // Coverage analysis
  const coveredSet = new Set<number>();
  items.forEach((item) => {
    for (let m = item.start_month; m < item.start_month + item.duration_months && m <= totalMonths; m++) {
      coveredSet.add(m);
    }
  });
  const coveredCount = coveredSet.size;
  const isCompliant = coveredCount >= 6;

  // Total cost estimate
  const totalCost = items.reduce((sum, item) => {
    const tiers = item.provider_pricing?.tiers ?? [];
    const tier = tiers.find((t) => t.months === item.duration_months)
      ?? tiers.sort((a, b) => Math.abs(a.months - item.duration_months) - Math.abs(b.months - item.duration_months))[0];
    return sum + (tier?.price ?? 0);
  }, 0);

  const months = Array.from({ length: totalMonths }, (_, i) => i + 1);

  if (loading) return <p className="text-muted-foreground">Loading plan...</p>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">My DTV Plan</h1>
          <p className="text-muted-foreground mt-1">
            Plan your 6–12 month program for the DTV visa
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Timeline:</span>
          {[6, 9, 12].map((n) => (
            <Button
              key={n}
              size="sm"
              variant={totalMonths === n ? 'default' : 'outline'}
              onClick={() => setTotalMonths(n)}
            >
              {n} mo
            </Button>
          ))}
        </div>
      </div>

      {/* Compliance badge */}
      <div className={`rounded-lg border p-4 flex items-center gap-3 ${isCompliant ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-yellow-500/30 bg-yellow-500/5'}`}>
        <span className="text-2xl">{isCompliant ? '✓' : '⚠'}</span>
        <div>
          <p className={`font-medium ${isCompliant ? 'text-emerald-700 dark:text-emerald-400' : 'text-yellow-700 dark:text-yellow-400'}`}>
            {coveredCount} of {totalMonths} months covered
            {isCompliant ? ' — DTV minimum met' : ' — Need at least 6 months'}
          </p>
          {!isCompliant && (
            <p className="text-sm text-muted-foreground">
              Add more providers to cover {6 - coveredCount} additional month{6 - coveredCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div className="ml-auto text-right">
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push('/providers')}
          >
            + Add Provider
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="border rounded-xl p-12 text-center space-y-3">
          <p className="text-muted-foreground">Your plan is empty.</p>
          <Button onClick={() => router.push('/providers')}>Browse Providers</Button>
        </div>
      ) : (
        <>
          {/* Gantt Chart */}
          <div className="border rounded-xl overflow-hidden">
            <div className="bg-muted/50 px-4 py-2 border-b">
              <h2 className="font-medium text-sm">Timeline</h2>
            </div>
            <div className="p-4 overflow-x-auto">
              <div className="min-w-[500px]">
                {/* Month headers */}
                <div className="flex mb-2 pl-[200px]">
                  {months.map((m) => (
                    <div
                      key={m}
                      className={`flex-1 text-center text-xs font-medium py-1 rounded ${
                        coveredSet.has(m)
                          ? 'text-foreground'
                          : 'text-muted-foreground/50'
                      }`}
                    >
                      {MONTH_NAMES[m - 1]}
                    </div>
                  ))}
                </div>

                {/* Gap indicator row */}
                <div className="flex mb-3 pl-[200px]">
                  {months.map((m) => (
                    <div key={m} className="flex-1 h-1.5 mx-0.5 rounded-full"
                      style={{ backgroundColor: coveredSet.has(m) ? '#10b981' : '#fca5a520' }}
                    />
                  ))}
                </div>

                {/* Plan item rows */}
                {items.map((item) => (
                  <div key={item.id} className="flex items-center mb-2 gap-2">
                    {/* Label */}
                    <div className="w-[192px] shrink-0 pr-2">
                      <p className="text-sm font-medium truncate">{item.provider_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {CATEGORY_LABELS[item.provider_category] ?? item.provider_category}
                        {item.provider_location && ` · ${item.provider_location}`}
                      </p>
                    </div>

                    {/* Bar grid */}
                    <div className="flex flex-1 relative">
                      {months.map((m) => {
                        const active = m >= item.start_month && m < item.start_month + item.duration_months;
                        const isFirst = m === item.start_month;
                        const isLast = m === item.start_month + item.duration_months - 1;
                        return (
                          <div
                            key={m}
                            className="flex-1 h-8 mx-0.5"
                            style={{
                              backgroundColor: active ? getColor(item.provider_category) : 'transparent',
                              borderRadius: isFirst && isLast ? '6px' : isFirst ? '6px 0 0 6px' : isLast ? '0 6px 6px 0' : '0',
                              opacity: active ? 0.85 : 1,
                            }}
                          />
                        );
                      })}
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => updateStartMonth(item, -1)}
                        className="text-muted-foreground hover:text-foreground text-xs px-1"
                        title="Shift left"
                      >←</button>
                      <button
                        onClick={() => updateStartMonth(item, 1)}
                        className="text-muted-foreground hover:text-foreground text-xs px-1"
                        title="Shift right"
                      >→</button>
                      <button
                        onClick={() => updateDuration(item, -1)}
                        className="text-muted-foreground hover:text-foreground text-xs px-1 ml-1"
                        title="Shorter"
                      >−</button>
                      <button
                        onClick={() => updateDuration(item, 1)}
                        className="text-muted-foreground hover:text-foreground text-xs px-1"
                        title="Longer"
                      >+</button>
                      <button
                        onClick={() => remove(item.id)}
                        className="text-destructive hover:text-destructive/80 text-xs px-1 ml-1"
                        title="Remove"
                      >✕</button>
                    </div>
                  </div>
                ))}

                {/* Coverage summary row */}
                <div className="flex mt-3 border-t pt-3">
                  <div className="w-[192px] shrink-0 pr-2">
                    <p className="text-xs font-medium text-muted-foreground">Total coverage</p>
                  </div>
                  <div className="flex flex-1">
                    {months.map((m) => (
                      <div
                        key={m}
                        className="flex-1 h-2 mx-0.5 rounded-full"
                        style={{ backgroundColor: coveredSet.has(m) ? '#10b981' : '#e5e7eb' }}
                      />
                    ))}
                  </div>
                  <div className="w-24 shrink-0" />
                </div>

                {/* Weather rows — one per unique region in the plan */}
                {(() => {
                  const seen = new Set<string>();
                  const regions: Array<{ region: RegionWeather; label: string }> = [];
                  items.forEach((item) => {
                    const r = getRegionForCity(item.provider_location);
                    if (r && !seen.has(r.id)) {
                      seen.add(r.id);
                      regions.push({ region: r, label: item.provider_location ?? r.name });
                    }
                  });
                  if (regions.length === 0) return null;
                  return (
                    <div className="mt-4 border-t pt-4 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground pl-0">Weather</p>
                      {regions.map(({ region, label }) => (
                        <div key={region.id} className="flex items-center gap-2">
                          <div className="w-[192px] shrink-0 pr-2">
                            <p className="text-xs text-muted-foreground truncate">{label}</p>
                          </div>
                          <div className="flex flex-1">
                            {months.map((m) => {
                              const w = region.months[m - 1];
                              const cfg = SCORE_CONFIG[w.score];
                              return (
                                <div
                                  key={m}
                                  className="flex-1 h-5 mx-0.5 rounded cursor-default"
                                  style={{ backgroundColor: cfg.color, opacity: 0.75 }}
                                  title={`${region.name} — ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m-1]}: ${w.label}`}
                                />
                              );
                            })}
                          </div>
                          <div className="w-24 shrink-0" />
                        </div>
                      ))}
                      <div className="flex items-center gap-3 pt-1">
                        {([5,4,3,2,1] as const).map((s) => (
                          <span key={s} className="flex items-center gap-1 text-xs text-muted-foreground">
                            <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: SCORE_CONFIG[s].color }} />
                            {SCORE_CONFIG[s].label}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Item cards */}
          <div className="space-y-2">
            <h2 className="font-semibold">Items ({items.length})</h2>
            {items.map((item) => {
              const tiers = item.provider_pricing?.tiers ?? [];
              const tier = tiers.sort(
                (a, b) => Math.abs(a.months - item.duration_months) - Math.abs(b.months - item.duration_months)
              )[0];
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 border rounded-lg p-3"
                >
                  <div
                    className="w-1 self-stretch rounded-full shrink-0"
                    style={{ backgroundColor: getColor(item.provider_category) }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{item.provider_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Month {item.start_month}–{item.start_month + item.duration_months - 1}
                      {' · '}{item.duration_months} month{item.duration_months !== 1 ? 's' : ''}
                      {item.provider_location && ` · ${item.provider_location}`}
                    </p>
                  </div>
                  {tier && (
                    <Badge variant="outline" className="text-xs shrink-0">
                      {item.provider_pricing!.currency} {tier.price.toLocaleString()}
                    </Badge>
                  )}
                  <button
                    onClick={() => remove(item.id)}
                    className="text-muted-foreground hover:text-destructive text-xs shrink-0"
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>

          {/* Footer summary */}
          {totalCost > 0 && (
            <div className="border rounded-lg p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Estimated total program cost</p>
                <p className="text-2xl font-bold">THB {totalCost.toLocaleString()}</p>
              </div>
              <Button variant="outline" disabled>
                Generate proof document
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

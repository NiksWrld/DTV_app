import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import type { Provider } from '@/types/dtv';

export const CATEGORY_LABELS: Record<string, string> = {
  muay_thai_gym: 'Muay Thai',
  cooking_school: 'Thai Cooking',
  medical: 'Medical',
  visa_advisory: 'Visa Advisory',
  coworking: 'Coworking',
  insurance: 'Insurance',
  relocation: 'Relocation',
};

export const CATEGORY_COLORS: Record<string, string> = {
  muay_thai_gym: 'bg-red-500',
  cooking_school: 'bg-orange-500',
  medical: 'bg-blue-500',
  visa_advisory: 'bg-purple-500',
  coworking: 'bg-emerald-500',
  insurance: 'bg-yellow-600',
  relocation: 'bg-pink-500',
};

export function CategoryPlaceholder({ category }: { category: string }) {
  const color = CATEGORY_COLORS[category] ?? 'bg-gray-400';
  return (
    <div className={`w-full h-44 ${color} flex items-center justify-center`}>
      <span className="text-white/60 text-2xl font-bold tracking-tight">
        {CATEGORY_LABELS[category] ?? category}
      </span>
    </div>
  );
}

export function ProviderCard({ provider }: { provider: Provider }) {
  return (
    <Link
      href={`/providers/${provider.id}`}
      className="group block rounded-xl border bg-card hover:shadow-md transition-shadow overflow-hidden"
    >
      {provider.image_url ? (
        <img src={provider.image_url} alt={provider.name} className="w-full h-44 object-cover" />
      ) : (
        <CategoryPlaceholder category={provider.category} />
      )}
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-tight group-hover:text-primary transition-colors">
            {provider.name}
          </h3>
          <div className="flex gap-1 shrink-0 flex-wrap justify-end">
            {provider.dtv_certified && (
              <Badge className="text-xs bg-emerald-600 hover:bg-emerald-600 text-white">DTV Certified</Badge>
            )}
            {provider.affiliate_type && (
              <Badge variant="secondary" className="text-xs">Affiliate</Badge>
            )}
            {provider.verification_status === 'verified_docs_seen' && (
              <Badge variant="secondary" className="text-xs">Verified</Badge>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {CATEGORY_LABELS[provider.category] ?? provider.category}
          {provider.location && ` · ${provider.location}`}
        </p>
        {provider.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{provider.description}</p>
        )}
        {provider.pricing && provider.pricing.tiers.length > 0 && (
          <div className="pt-2 border-t flex gap-1.5 flex-wrap">
            {provider.pricing.tiers.map((tier) => (
              <span key={tier.months} className="text-xs bg-muted rounded-md px-2 py-0.5 font-medium">
                {tier.months}mo · {provider.pricing!.currency} {tier.price.toLocaleString()}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

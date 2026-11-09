'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { SatBadge, isSatValid } from '@/components/providers/sat-badge';
import type { Embassy, Provider } from '@/types/dtv';

/**
 * The user's chosen embassy, but only when it asks for a SAT-certified Muay Thai camp.
 * Resolves to null for everyone else (or while loading / without a profile).
 */
export function useSatEmbassy(): Embassy | null {
  const [embassy, setEmbassy] = useState<Embassy | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const profile = await apiClient.onboarding.getProfile();
        if (!profile?.preferred_embassy_id) return;
        const embassies = await apiClient.embassies.list();
        const match = embassies.find((e) => e.id === profile.preferred_embassy_id);
        if (!cancelled && match?.requires_sat_for_muay_thai) setEmbassy(match);
      } catch {
        // No profile yet, or the lookup failed. No warning is the safe default.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return embassy;
}

export function needsSatWarning(
  embassy: Embassy | null,
  category: string | undefined,
  satCertified?: boolean,
  satValidUntil?: string | null,
): boolean {
  return !!embassy && category === 'muay_thai_gym' && !isSatValid(satCertified, satValidUntil);
}

export function embassyLabel(embassy: Embassy): string {
  return embassy.name || `${embassy.country}, ${embassy.city}`;
}

const DEFAULT_NOTE =
  'Embassy requirements change often. Check the current rules with your embassy before you book.';

/** Short inline version, for plan rows and similar tight spots. */
export function SatEmbassyNotice({ embassy }: { embassy: Embassy }) {
  return (
    <p className="flex items-start gap-1.5 text-xs font-medium text-amber-800">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>
        Your embassy requires a SAT-certified camp ({embassyLabel(embassy)}). This camp is not SAT certified.{' '}
        <Link href="/providers?category=muay_thai_gym&sat=1" className="underline">
          See SAT-certified camps
        </Link>
      </span>
    </p>
  );
}

/** Full warning card with up to three SAT-certified alternatives, same city first. */
export function SatEmbassyWarning({ embassy, provider }: { embassy: Embassy; provider: Provider }) {
  const [alternatives, setAlternatives] = useState<Provider[] | null>(null);

  useEffect(() => {
    apiClient.providers
      .list({ category: 'muay_thai_gym', sat: '1' })
      .then((list) => {
        const city = provider.location?.split(',')[0]?.trim().toLowerCase();
        const others = list.filter(
          (p) => p.id !== provider.id && p.category === 'muay_thai_gym' && isSatValid(p.sat_certified, p.sat_valid_until),
        );
        others.sort((a, b) => {
          const aSame = city && a.location?.toLowerCase().includes(city) ? 0 : 1;
          const bSame = city && b.location?.toLowerCase().includes(city) ? 0 : 1;
          return aSame - bSame;
        });
        setAlternatives(others.slice(0, 3));
      })
      .catch(() => setAlternatives([]));
  }, [provider.id, provider.location]);

  return (
    <div role="alert" className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden />
        <div className="space-y-1">
          <p className="font-semibold text-amber-900">Your embassy requires a SAT-certified camp</p>
          <p className="text-sm text-amber-900">
            {embassyLabel(embassy)} asks Muay Thai applicants for a camp recognised by the Sports Authority of
            Thailand. {provider.name} has no valid SAT certification on file, so a letter from them may not be
            accepted.
          </p>
          <p className="text-xs text-amber-800">{embassy.sat_note || DEFAULT_NOTE}</p>
        </div>
      </div>
      {alternatives && alternatives.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-amber-900">SAT-certified camps you could use instead</p>
          <ul className="space-y-1.5">
            {alternatives.map((alt) => (
              <li key={alt.id}>
                <Link
                  href={`/providers/${alt.id}`}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm hover:border-amber-400"
                >
                  <span className="font-medium">{alt.name}</span>
                  {alt.location && <span className="text-xs text-muted-foreground">{alt.location}</span>}
                  <SatBadge certified={alt.sat_certified} validUntil={alt.sat_valid_until} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {alternatives && alternatives.length === 0 && (
        <p className="text-sm text-amber-900">No SAT-certified camps are listed yet.</p>
      )}
    </div>
  );
}

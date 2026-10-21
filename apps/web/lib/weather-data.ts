// Static seasonal weather data for Thailand.
// Score 1–5: 5 = excellent (dry, comfortable), 1 = avoid (heavy monsoon / extreme heat).
// "note" shown as tooltip. Based on historical averages, not real-time.

export interface MonthWeather {
  score: 1 | 2 | 3 | 4 | 5;
  label: string; // shown in tooltip
}

export interface RegionWeather {
  id: string;
  name: string;
  cities: string[]; // matched against provider.location / provider.cities_served
  months: [
    MonthWeather, MonthWeather, MonthWeather, MonthWeather,
    MonthWeather, MonthWeather, MonthWeather, MonthWeather,
    MonthWeather, MonthWeather, MonthWeather, MonthWeather,
  ];
  tip: string; // one-liner for the region's weather pattern
}

// Month index 0 = January
export const REGIONS: RegionWeather[] = [
  {
    id: 'bangkok_central',
    name: 'Bangkok / Pattaya / Hua Hin',
    cities: ['Bangkok', 'Pattaya', 'Hua Hin', 'Ayutthaya', 'Kanchanaburi'],
    tip: 'Cool & dry Nov–Feb, very hot Mar–May, monsoon Jun–Oct. Oct is manageable — much drier than Phuket.',
    months: [
      { score: 5, label: 'Cool & dry — peak season' },
      { score: 5, label: 'Warm & sunny — ideal' },
      { score: 4, label: 'Getting hot, still dry' },
      { score: 3, label: 'Very hot (35–38°C)' },
      { score: 3, label: 'Hot, first rains begin' },
      { score: 2, label: 'Monsoon starts' },
      { score: 2, label: 'Rainy season' },
      { score: 2, label: 'Heavy rain periods' },
      { score: 2, label: 'Peak rain month' },
      { score: 3, label: 'Rain easing, still humid' },
      { score: 4, label: 'Drying out — great month' },
      { score: 5, label: 'Cool & dry — peak season' },
    ],
  },
  {
    id: 'chiang_mai',
    name: 'Chiang Mai / North',
    cities: ['Chiang Mai', 'Chiang Rai', 'Pai', 'Mae Hong Son'],
    tip: 'Cool winters, smoky burning season Mar–Apr, monsoon Jul–Sep. Nov–Feb is the best time.',
    months: [
      { score: 5, label: 'Cool, clear & beautiful' },
      { score: 5, label: 'Warm days, cool nights' },
      { score: 2, label: 'Burning/haze season — avoid' },
      { score: 2, label: 'Smoke season peaks — avoid' },
      { score: 3, label: 'Hot, haze clearing' },
      { score: 3, label: 'Early monsoon' },
      { score: 2, label: 'Heavy rain' },
      { score: 2, label: 'Wettest month' },
      { score: 2, label: 'Very wet' },
      { score: 3, label: 'Rain easing' },
      { score: 4, label: 'Cool & dry — good' },
      { score: 5, label: 'Cool & dry — peak season' },
    ],
  },
  {
    id: 'phuket_andaman',
    name: 'Phuket / Krabi / Andaman Coast',
    cities: ['Phuket', 'Krabi', 'Koh Phi Phi', 'Koh Lanta', 'Khao Lak'],
    tip: 'Best Nov–Apr. Monsoon May–Oct with rough seas. Koh Lanta better than Phuket in shoulder months.',
    months: [
      { score: 5, label: 'Peak season — stunning' },
      { score: 5, label: 'Dry & sunny — ideal' },
      { score: 5, label: 'Hot & dry — still great' },
      { score: 4, label: 'Getting hot, mostly dry' },
      { score: 2, label: 'Monsoon begins — rough seas' },
      { score: 1, label: 'Heavy monsoon — many closures' },
      { score: 1, label: 'Peak monsoon' },
      { score: 1, label: 'Very wet, rough seas' },
      { score: 2, label: 'Monsoon continuing' },
      { score: 2, label: 'Still quite wet' },
      { score: 4, label: 'Season reopens — good' },
      { score: 5, label: 'Peak season starts' },
    ],
  },
  {
    id: 'koh_samui',
    name: 'Koh Samui / Koh Phangan / Koh Tao',
    cities: ['Koh Samui', 'Koh Phangan', 'Koh Tao', 'Samui', 'Phangan'],
    tip: 'Opposite to west coast! Best Mar–Sep. Monsoon hits Oct–Dec — Koh Tao is slightly better.',
    months: [
      { score: 3, label: 'Can be wet, tail of monsoon' },
      { score: 4, label: 'Drying out — good' },
      { score: 5, label: 'Dry & sunny — great' },
      { score: 5, label: 'Warm & dry — ideal' },
      { score: 5, label: 'Hot & sunny — peak' },
      { score: 4, label: 'Warm, some showers' },
      { score: 4, label: 'Mostly sunny with showers' },
      { score: 4, label: 'Good — brief rains' },
      { score: 3, label: 'Wetter, still ok' },
      { score: 1, label: 'Heavy monsoon — avoid' },
      { score: 1, label: 'Peak monsoon — very wet' },
      { score: 2, label: 'Still wet, improving late month' },
    ],
  },
];

export const SCORE_CONFIG = {
  5: { label: 'Excellent',  color: '#22c55e', bg: 'bg-green-500' },
  4: { label: 'Good',       color: '#86efac', bg: 'bg-green-300' },
  3: { label: 'OK',         color: '#fbbf24', bg: 'bg-yellow-400' },
  2: { label: 'Rainy',      color: '#fb923c', bg: 'bg-orange-400' },
  1: { label: 'Avoid',      color: '#ef4444', bg: 'bg-red-500' },
} as const;

export function getRegionForCity(city: string | undefined | null): RegionWeather | null {
  if (!city) return null;
  const lower = city.toLowerCase();
  return (
    REGIONS.find((r) =>
      r.cities.some((c) => lower.includes(c.toLowerCase()) || c.toLowerCase().includes(lower))
    ) ?? null
  );
}

export function getBestMonths(region: RegionWeather): number[] {
  return region.months
    .map((m, i) => ({ score: m.score, i }))
    .filter((m) => m.score >= 4)
    .map((m) => m.i + 1); // 1-based month numbers
}

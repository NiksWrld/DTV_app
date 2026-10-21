'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';

const STEPS = ['Nationality & Location', 'Visa Path', 'Embassy', 'Details'] as const;

const PATH_OPTIONS = [
  { value: 'workcation', label: 'Workcation', desc: 'For remote workers, freelancers, employees' },
  { value: 'soft_power', label: 'Thai Soft Power', desc: 'Muay Thai, cooking, medical treatment' },
  { value: 'dependent', label: 'Dependent', desc: 'Spouse or child of DTV holder' },
];

const SOFT_POWER_OPTIONS = [
  { value: 'muay_thai', label: 'Muay Thai' },
  { value: 'cooking', label: 'Thai Cooking' },
  { value: 'medical', label: 'Medical Treatment' },
  { value: 'seminar', label: 'Seminar / Workshop' },
];

const EMPLOYMENT_OPTIONS = [
  { value: 'employed', label: 'Employed (full-time)' },
  { value: 'freelancer', label: 'Freelancer' },
  { value: 'remote_worker', label: 'Remote worker' },
  { value: 'other', label: 'Other' },
];

const STAY_DURATION_OPTIONS = [
  { value: 'less_than_30', label: 'Less than 30 days' },
  { value: '30_90', label: '30–90 days' },
  { value: '90_180', label: '90–180 days' },
  { value: 'over_180', label: 'Over 180 days' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [embassies, setEmbassies] = useState<Array<{ id: string; name: string; country: string; city: string }>>([]);

  // Form state
  const [nationality, setNationality] = useState('');
  const [currentCountry, setCurrentCountry] = useState('');
  const [currentCity, setCurrentCity] = useState('');
  const [intendedPath, setIntendedPath] = useState('');
  const [hasDependents, setHasDependents] = useState(false);
  const [preferredEmbassyId, setPreferredEmbassyId] = useState('');
  const [intendedStayDuration, setIntendedStayDuration] = useState('');
  const [softPowerInterest, setSoftPowerInterest] = useState('');
  const [employmentType, setEmploymentType] = useState('');

  useEffect(() => {
    apiClient.embassies.list()
      .then(setEmbassies)
      .catch(() => toast.error('Failed to load embassies'));
  }, []);

  const progress = ((step + 1) / STEPS.length) * 100;

  async function handleSubmit() {
    setLoading(true);
    try {
      await apiClient.onboarding.createProfile({
        nationality,
        current_country: currentCountry,
        current_city: currentCity || undefined,
        intended_path: intendedPath,
        has_dependents: hasDependents,
        preferred_embassy_id: preferredEmbassyId || undefined,
        intended_stay_duration: intendedStayDuration || undefined,
        soft_power_interest: softPowerInterest || undefined,
        employment_type: employmentType || undefined,
      });

      // Generate checklist after onboarding
      await apiClient.checklist.generate().catch(() => {});

      toast.success('Profile created!');
      router.push('/dashboard');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  }

  function canProceed(): boolean {
    switch (step) {
      case 0: return nationality.length > 0 && currentCountry.length > 0;
      case 1: return intendedPath.length > 0;
      case 2: return true; // embassy is optional
      case 3:
        if (intendedPath === 'soft_power' && !softPowerInterest) return false;
        if (intendedPath === 'workcation' && !employmentType) return false;
        return true;
      default: return false;
    }
  }

  return (
    <div className="max-w-lg mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Set up your profile</h1>
        <p className="text-muted-foreground mt-1">
          Step {step + 1} of {STEPS.length}: {STEPS[step]}
        </p>
        <Progress value={progress} className="mt-4" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{STEPS[step]}</CardTitle>
          <CardDescription>
            {step === 0 && 'Tell us about yourself so we can tailor the requirements.'}
            {step === 1 && 'Which DTV path are you applying for?'}
            {step === 2 && 'Select your embassy (optional — we\'ll use general rules if skipped).'}
            {step === 3 && 'A few more details to personalize your checklist.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 0 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="nationality">Nationality *</Label>
                <Input
                  id="nationality"
                  placeholder="e.g. United States, United Kingdom"
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currentCountry">Current country of residence *</Label>
                <Input
                  id="currentCountry"
                  placeholder="e.g. United States"
                  value={currentCountry}
                  onChange={(e) => setCurrentCountry(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currentCity">Current city</Label>
                <Input
                  id="currentCity"
                  placeholder="e.g. New York"
                  value={currentCity}
                  onChange={(e) => setCurrentCity(e.target.value)}
                />
              </div>
            </>
          )}

          {step === 1 && (
            <div className="space-y-3">
              {PATH_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setIntendedPath(opt.value)}
                  className={`w-full text-left p-4 rounded-lg border transition-colors ${
                    intendedPath === opt.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground'
                  }`}
                >
                  <div className="font-medium">{opt.label}</div>
                  <div className="text-sm text-muted-foreground mt-1">{opt.desc}</div>
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-2">
              <Label htmlFor="embassy">Embassy / Consulate</Label>
              <Select value={preferredEmbassyId} onValueChange={(v) => setPreferredEmbassyId(v ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your embassy (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {embassies.map((emb) => (
                    <SelectItem key={emb.id} value={emb.id}>
                      {emb.name} — {emb.city}, {emb.country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Selecting your embassy lets us apply location-specific requirements.
              </p>
            </div>
          )}

          {step === 3 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="stayDuration">Intended stay duration</Label>
                <Select value={intendedStayDuration} onValueChange={(v) => setIntendedStayDuration(v ?? '')}>
                  <SelectTrigger>
                    <SelectValue placeholder="How long do you plan to stay?" />
                  </SelectTrigger>
                  <SelectContent>
                    {STAY_DURATION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {intendedPath === 'workcation' && (
                <div className="space-y-2">
                  <Label htmlFor="employmentType">Employment type *</Label>
                  <Select value={employmentType} onValueChange={(v) => setEmploymentType(v ?? '')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your employment type" />
                    </SelectTrigger>
                    <SelectContent>
                      {EMPLOYMENT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {intendedPath === 'soft_power' && (
                <div className="space-y-2">
                  <Label htmlFor="softPowerInterest">Soft Power activity *</Label>
                  <Select value={softPowerInterest} onValueChange={(v) => setSoftPowerInterest(v ?? '')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your activity" />
                    </SelectTrigger>
                    <SelectContent>
                      {SOFT_POWER_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="hasDependents"
                  checked={hasDependents}
                  onChange={(e) => setHasDependents(e.target.checked)}
                  className="rounded border-border"
                />
                <Label htmlFor="hasDependents" className="cursor-pointer">
                  I am applying with dependents (spouse / children)
                </Label>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
        >
          Back
        </Button>

        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
            Continue
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={!canProceed() || loading}>
            {loading ? 'Saving...' : 'Complete setup'}
          </Button>
        )}
      </div>
    </div>
  );
}

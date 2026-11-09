'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api-client';
import type { AppSettings } from '@/types/dtv';

function Toggle({
  id,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50 ${
        checked ? 'bg-primary' : 'bg-muted-foreground/30'
      }`}
    >
      <span
        aria-hidden="true"
        className={`inline-block size-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`}
      />
    </button>
  );
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiClient.admin.settings.get().then(setSettings).catch(() => toast.error('Could not load settings'));
  }, []);

  async function setHide(value: boolean) {
    if (!settings) return;
    setSaving(true);
    try {
      setSettings(await apiClient.admin.settings.update({ ...settings, hide_unclaimed_contacts: value }));
      toast.success(value ? 'Unclaimed providers now show basics only' : 'All providers fully visible again');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-muted-foreground">App-wide switches. Changes apply right away.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-base">
                <label htmlFor="hide-unclaimed">Hide contact details of unclaimed providers</label>
              </CardTitle>
              <CardDescription>
                When on, providers that are not claimed and verified show only their name, city, and type, with a
                &ldquo;Not a DTV partner yet&rdquo; notice and up to 3 verified alternatives. Website, prices,
                packages, description, and photos are withheld by the API. Admins still see everything.
              </CardDescription>
            </div>
            <Toggle
              id="hide-unclaimed"
              checked={Boolean(settings?.hide_unclaimed_contacts)}
              disabled={!settings || saving}
              onChange={setHide}
            />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            Status:{' '}
            <strong>{settings == null ? '…' : settings.hide_unclaimed_contacts ? 'On: basics only for non-partners' : 'Off: everything visible'}</strong>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

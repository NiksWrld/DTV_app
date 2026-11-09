'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api-client';
import type { AppSettings, Embassy } from '@/types/dtv';

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

function EmbassyRuleRow({ embassy, onSaved }: { embassy: Embassy; onSaved: (next: Embassy) => void }) {
  const [note, setNote] = useState(embassy.sat_note ?? '');
  const [saving, setSaving] = useState(false);
  const toggleId = `sat-rule-${embassy.id}`;

  async function save(requires: boolean, nextNote: string) {
    setSaving(true);
    try {
      onSaved(await apiClient.admin.sat.embassyRule(embassy.id, { requires_sat_for_muay_thai: requires, sat_note: nextNote }));
      toast.success('Embassy rule saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="space-y-2 border-b py-3 last:border-0">
      <div className="flex items-center justify-between gap-4">
        <label htmlFor={toggleId} className="min-w-0 text-sm">
          <span className="font-medium">{embassy.country}, {embassy.city}</span>
          <span className="block text-xs text-muted-foreground">{embassy.name}</span>
        </label>
        <Toggle
          id={toggleId}
          checked={Boolean(embassy.requires_sat_for_muay_thai)}
          disabled={saving}
          onChange={(value) => save(value, note)}
        />
      </div>
      {embassy.requires_sat_for_muay_thai && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            aria-label={`Note for ${embassy.name}`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note shown to applicants, e.g. where the rule comes from"
          />
          <Button size="sm" variant="outline" disabled={saving || note === (embassy.sat_note ?? '')} onClick={() => save(true, note)}>
            Save note
          </Button>
        </div>
      )}
    </li>
  );
}

function EmbassyRulesCard() {
  const [embassies, setEmbassies] = useState<Embassy[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    apiClient.embassies.list().then(setEmbassies).catch(() => toast.error('Could not load embassies'));
  }, []);

  const q = search.trim().toLowerCase();
  const visible = embassies
    .filter((e) => (q ? `${e.country} ${e.city} ${e.name}`.toLowerCase().includes(q) : e.requires_sat_for_muay_thai))
    .sort((a, b) => Number(Boolean(b.requires_sat_for_muay_thai)) - Number(Boolean(a.requires_sat_for_muay_thai)));
  const active = embassies.filter((e) => e.requires_sat_for_muay_thai).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Embassies that require a SAT-certified Muay Thai camp</CardTitle>
        <CardDescription>
          Applicants who picked one of these embassies get a warning on Muay Thai camps without valid SAT
          certification and an extra checklist item. Embassy rules change, so check them from time to time.
          {' '}{active} active.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Input
          placeholder="Search embassies to add one…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search embassies"
        />
        <ul>
          {visible.slice(0, 50).map((embassy) => (
            <EmbassyRuleRow
              key={embassy.id}
              embassy={embassy}
              onSaved={(next) => setEmbassies((prev) => prev.map((e) => (e.id === next.id ? next : e)))}
            />
          ))}
        </ul>
        {visible.length === 0 && <p className="text-sm text-muted-foreground">No embassies match.</p>}
      </CardContent>
    </Card>
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

      <EmbassyRulesCard />
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import type { ComplianceOverview, ComplianceTask, ComplianceTaskType } from '@/types/dtv';

// ─── Helpers ────────────────────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - new Date(today()).getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function urgencyColor(days: number): string {
  if (days < 0) return 'bg-red-100 text-red-700 border-red-200';
  if (days <= 7) return 'bg-red-100 text-red-700 border-red-200';
  if (days <= 14) return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-green-100 text-green-700 border-green-200';
}

function stampColor(days: number): string {
  if (days < 0) return 'text-red-600';
  if (days <= 30) return 'text-amber-600';
  if (days <= 60) return 'text-yellow-600';
  return 'text-green-600';
}

const TYPE_META: Record<ComplianceTaskType | string, { icon: string; label: string }> = {
  tm30:          { icon: '🏠', label: 'TM30 — Residence Notice' },
  '90_day_notice': { icon: '🗓️', label: '90-Day Report' },
  stamp_renewal: { icon: '✈️', label: 'Stamp Renewal' },
  custom:        { icon: '📌', label: 'Custom' },
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function StampBanner({
  entry,
  onSetEntry,
}: {
  entry: ComplianceOverview['entry'];
  onSetEntry: (date: string, port?: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(!entry);
  const [entryDate, setEntryDate] = useState(entry?.entry_date ?? today());
  const [port, setPort] = useState(entry?.port_of_entry ?? '');
  const [saving, setSaving] = useState(false);

  const stampExpires = entry?.stamp_expires ?? addDays(entryDate, 180);
  const daysLeft = daysUntil(stampExpires);

  async function save() {
    setSaving(true);
    try {
      await onSetEntry(entryDate, port || undefined);
      setEditing(false);
      toast.success('Entry date saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Current Stamp</CardTitle>
          {entry && !editing && (
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Edit</Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Entry date</Label>
                <Input
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Port of entry</Label>
                <Input
                  placeholder="e.g. Suvarnabhumi"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                />
              </div>
            </div>
            {entryDate && (
              <p className="text-sm text-muted-foreground">
                Stamp expires: <strong>{formatDate(addDays(entryDate, 180))}</strong>
              </p>
            )}
            <div className="flex gap-2">
              <Button size="sm" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : 'Save entry'}
              </Button>
              {entry && (
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">
                Entered Thailand <strong>{formatDate(entry!.entry_date)}</strong>
                {entry!.port_of_entry && <> via {entry!.port_of_entry}</>}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Stamp expires <strong>{formatDate(entry!.stamp_expires)}</strong>
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className={`text-3xl font-bold tabular-nums ${stampColor(daysLeft)}`}>
                {daysLeft < 0 ? 'EXPIRED' : daysLeft}
              </p>
              {daysLeft >= 0 && (
                <p className={`text-xs font-medium ${stampColor(daysLeft)}`}>days left</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TaskCard({
  task,
  onComplete,
  onDelete,
}: {
  task: ComplianceTask;
  onComplete: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [completing, setCompleting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const meta = TYPE_META[task.type] ?? TYPE_META.custom;
  const days = daysUntil(task.due_date);
  const isDone = !!task.completed_at;

  async function handleComplete() {
    setCompleting(true);
    try { await onComplete(task.id); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Failed'); }
    finally { setCompleting(false); }
  }

  async function handleDelete() {
    setDeleting(true);
    try { await onDelete(task.id); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Failed'); }
    finally { setDeleting(false); }
  }

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border transition-opacity ${isDone ? 'opacity-50' : ''}`}>
      <span className="text-xl shrink-0">{meta.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{task.title}</p>
        <p className="text-xs text-muted-foreground">
          {isDone
            ? `Done ${formatDate(task.completed_at!.slice(0, 10))}`
            : formatDate(task.due_date)
          }
        </p>
      </div>
      {!isDone && (
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${urgencyColor(days)}`}>
          {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Today' : `${days}d`}
        </span>
      )}
      {!isDone && (
        <Button size="sm" variant="outline" onClick={handleComplete} disabled={completing}>
          {completing ? '…' : 'Done'}
        </Button>
      )}
      <Button size="sm" variant="ghost" onClick={handleDelete} disabled={deleting} className="text-muted-foreground">
        ✕
      </Button>
    </div>
  );
}

function AddTaskForm({ onAdd }: { onAdd: (data: { type: string; title: string; due_date: string }) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<string>('tm30');
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState(today());
  const [saving, setSaving] = useState(false);

  const presets: { type: ComplianceTaskType; label: string }[] = [
    { type: 'tm30', label: '+ TM30' },
    { type: '90_day_notice', label: '+ 90-Day Notice' },
  ];

  function fillPreset(t: ComplianceTaskType) {
    setType(t);
    setTitle(TYPE_META[t].label);
    setOpen(true);
  }

  async function save() {
    if (!title.trim() || !dueDate) return;
    setSaving(true);
    try {
      await onAdd({ type, title: title.trim(), due_date: dueDate });
      setTitle('');
      setDueDate(today());
      setOpen(false);
      toast.success('Task added');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2 flex-wrap">
        {presets.map((p) => (
          <Button key={p.type} size="sm" variant="outline" onClick={() => fillPreset(p.type)}>
            {p.label}
          </Button>
        ))}
        <Button size="sm" variant="ghost" onClick={() => { setType('custom'); setTitle(''); setOpen(true); }}>
          + Custom
        </Button>
      </div>

      {open && (
        <Card className="border-dashed">
          <CardContent className="pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task name" />
              </div>
              <div className="space-y-1.5">
                <Label>Due date</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              {type === 'custom' && (
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="tm30">TM30</option>
                    <option value="90_day_notice">90-Day Notice</option>
                    <option value="stamp_renewal">Stamp Renewal</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={save} disabled={saving || !title.trim()}>
                {saving ? 'Adding…' : 'Add task'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function CompliancePage() {
  const [data, setData] = useState<ComplianceOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    apiClient.compliance.get()
      .then(setData)
      .catch(() => toast.error('Failed to load compliance data'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSetEntry(date: string, port?: string) {
    const entry = await apiClient.compliance.setEntry({ entry_date: date, port_of_entry: port });
    setData((prev) => prev ? { ...prev, entry } : prev);
  }

  async function handleAddTask(task: { type: string; title: string; due_date: string }) {
    const newTask = await apiClient.compliance.createTask(task);
    setData((prev) => prev ? { ...prev, tasks: [...prev.tasks, newTask] } : prev);
  }

  async function handleComplete(id: string) {
    const updated = await apiClient.compliance.completeTask(id, {});
    setData(updated);
    toast.success(
      updated.tasks.find((t) => t.type === '90_day_notice' && !t.completed_at)
        ? 'Done — next 90-day notice scheduled'
        : 'Marked as complete'
    );
  }

  async function handleDelete(id: string) {
    await apiClient.compliance.deleteTask(id);
    setData((prev) => prev ? { ...prev, tasks: prev.tasks.filter((t) => t.id !== id) } : prev);
  }

  if (loading) return <p className="text-muted-foreground">Loading…</p>;
  if (!data) return <p className="text-muted-foreground">Failed to load.</p>;

  const pending = data.tasks.filter((t) => !t.completed_at).sort(
    (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  );
  const completed = data.tasks.filter((t) => !!t.completed_at).sort(
    (a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime()
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">In Thailand</h1>
        <p className="text-muted-foreground mt-1">Track your stamp, TM30 filings, and 90-day reports</p>
      </div>

      {/* Stamp banner */}
      <StampBanner entry={data.entry} onSetEntry={handleSetEntry} />

      {/* Upcoming */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Upcoming</CardTitle>
            {pending.length > 0 && (
              <Badge variant="outline">{pending.length}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No upcoming tasks. Add one below.</p>
          ) : (
            pending.map((t) => (
              <TaskCard key={t.id} task={t} onComplete={handleComplete} onDelete={handleDelete} />
            ))
          )}
          <div className="pt-2">
            <AddTaskForm onAdd={handleAddTask} />
          </div>
        </CardContent>
      </Card>

      {/* History */}
      {completed.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <button
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
              onClick={() => setShowHistory((v) => !v)}
            >
              <span>{showHistory ? '▾' : '▸'}</span>
              Completed ({completed.length})
            </button>
            {showHistory && (
              <div className="mt-3 space-y-2">
                {completed.map((t) => (
                  <TaskCard key={t.id} task={t} onComplete={handleComplete} onDelete={handleDelete} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

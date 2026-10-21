'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';

type Account = Awaited<ReturnType<typeof apiClient.account.get>>;

function Initials({ name, email }: { name?: string; email: string }) {
  const text = name ?? email;
  const parts = text.split(/[\s@]/);
  const letters = parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : text.slice(0, 2).toUpperCase();
  return (
    <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center text-primary text-2xl font-bold select-none">
      {letters}
    </div>
  );
}

export default function AccountPage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);

  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);

  const [uploading, setUploading] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiClient.account.get().then((a) => {
      setAccount(a);
      setDisplayName(a.display_name ?? '');
      setPhone(a.phone ?? '');
      setBio(a.bio ?? '');
    }).finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    try {
      const updated = await apiClient.account.update({
        display_name: displayName || undefined,
        phone: phone || undefined,
        bio: bio || undefined,
      });
      setAccount((prev) => prev ? { ...prev, ...updated } : prev);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function uploadAvatar(file: File) {
    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      const form = new FormData();
      form.append('avatar', file);
      const res = await fetch('/api/account/avatar', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const updated: Account = await res.json();
      setAccount((prev) => prev ? { ...prev, avatar_url: updated.avatar_url } : prev);
      toast.success('Avatar updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  if (loading) return <p className="text-muted-foreground">Loading...</p>;
  if (!account) return <p className="text-muted-foreground">Failed to load account.</p>;

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Account</h1>
        <p className="text-muted-foreground mt-1">Manage your profile and personal details</p>
      </div>

      {/* Avatar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile photo</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-6">
          {account.avatar_url ? (
            <img
              src={account.avatar_url}
              alt="Avatar"
              className="w-24 h-24 rounded-full object-cover border"
            />
          ) : (
            <Initials name={account.display_name} email={account.email} />
          )}
          <div className="space-y-2">
            <input
              ref={avatarRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadAvatar(file);
              }}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => avatarRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Upload photo'}
            </Button>
            <p className="text-xs text-muted-foreground">JPG, PNG or WebP · max 5 MB</p>
          </div>
        </CardContent>
      </Card>

      {/* Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={account.email} readOnly className="bg-muted text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Email cannot be changed here.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="display-name">Display name</Label>
            <Input
              id="display-name"
              placeholder="Your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone number</Label>
            <Input
              id="phone"
              placeholder="+66 81 234 5678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bio">About</Label>
            <textarea
              id="bio"
              rows={3}
              placeholder="A short bio..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <Button onClick={save} disabled={saving}>
            {saving ? 'Saving...' : 'Save changes'}
          </Button>
        </CardContent>
      </Card>

      {/* Account info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account info</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2 text-muted-foreground">
          <p>Role: <span className="text-foreground font-medium capitalize">{account.role}</span></p>
          <p>User ID: <span className="font-mono text-xs">{account.id}</span></p>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';

type AdminUser = { id: string; email: string; role: string; display_name?: string; created_at: string };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    apiClient.admin.users.list().then(setUsers).finally(() => setLoading(false));
  }, []);

  async function toggleRole(user: AdminUser) {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    if (newRole === 'admin' && !confirm(`Make ${user.email} an admin?`)) return;
    setUpdating(user.id);
    try {
      await apiClient.admin.users.updateRole(user.id, newRole);
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, role: newRole } : u));
      toast.success(`${user.email} is now ${newRole}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    } finally {
      setUpdating(null);
    }
  }

  if (loading) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-muted-foreground mt-1">{users.length} registered</p>
      </div>

      <div className="space-y-3 md:hidden">
        {users.map((u) => (
          <article key={u.id} className="space-y-3 rounded-lg border p-4">
            <div className="min-w-0">
              <p className="font-medium break-all">{u.email}</p>
              <p className="text-sm text-muted-foreground">{u.display_name ?? '—'}</p>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <Badge variant={u.role === 'admin' ? 'default' : 'secondary'} className="capitalize">
                  {u.role}
                </Badge>
                <p className="text-xs text-muted-foreground">
                  {new Date(u.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleRole(u)}
                disabled={updating === u.id}
                className="inline-flex min-h-11 items-center text-sm font-medium text-primary disabled:opacity-50"
              >
                {updating === u.id ? '…' : u.role === 'admin' ? 'Revoke admin' : 'Make admin'}
              </button>
            </div>
          </article>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-lg border md:block" tabIndex={0} role="region" aria-label="Registered users">
        <table className="w-full min-w-[640px] text-left">
          <thead className="bg-muted/50 text-xs text-muted-foreground uppercase">
            <tr>
              <th className="py-2 px-4 font-medium">Email</th>
              <th className="py-2 px-4 font-medium">Name</th>
              <th className="py-2 px-4 font-medium">Role</th>
              <th className="py-2 px-4 font-medium">Registered</th>
              <th className="py-2 px-4" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b hover:bg-muted/30 transition-colors">
                <td className="py-3 px-4 text-sm font-medium">{u.email}</td>
                <td className="py-3 px-4 text-sm text-muted-foreground">{u.display_name ?? '—'}</td>
                <td className="py-3 px-4">
                  <Badge variant={u.role === 'admin' ? 'default' : 'secondary'} className="capitalize">
                    {u.role}
                  </Badge>
                </td>
                <td className="py-3 px-4 text-sm text-muted-foreground">
                  {new Date(u.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td className="py-3 px-4 text-right">
                  <button
                    onClick={() => toggleRole(u)}
                    disabled={updating === u.id}
                    className="text-xs text-primary hover:underline disabled:opacity-50"
                  >
                    {updating === u.id ? '…' : u.role === 'admin' ? 'Revoke admin' : 'Make admin'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

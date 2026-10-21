'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { ProviderForm, providerToForm } from '@/components/admin/provider-form';
import type { Provider } from '@/types/dtv';

export default function EditProviderPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.providers.get(id).then(setProvider).finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(data: Record<string, unknown>) {
    await apiClient.admin.providers.update(id, data);
    toast.success('Provider updated');
    router.push('/admin/providers');
  }

  if (loading) return <p className="text-muted-foreground">Loading…</p>;
  if (!provider) return <p className="text-muted-foreground">Provider not found.</p>;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/providers" className="text-sm text-muted-foreground hover:text-foreground">← Back</Link>
        <h1 className="text-2xl font-bold mt-2">Edit: {provider.name}</h1>
      </div>
      <ProviderForm
        initial={providerToForm(provider)}
        onSubmit={handleSubmit}
        submitLabel="Save changes"
      />
    </div>
  );
}

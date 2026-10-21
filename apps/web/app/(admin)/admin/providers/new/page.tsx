'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { ProviderForm } from '@/components/admin/provider-form';

export default function NewProviderPage() {
  const router = useRouter();

  async function handleSubmit(data: Record<string, unknown>) {
    await apiClient.admin.providers.create(data);
    toast.success('Provider created');
    router.push('/admin/providers');
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/providers" className="text-sm text-muted-foreground hover:text-foreground">← Back</Link>
        <h1 className="text-2xl font-bold mt-2">New Provider</h1>
      </div>
      <ProviderForm onSubmit={handleSubmit} submitLabel="Create provider" />
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { apiClient } from '@/lib/api-client';
import type { Guide } from '@/types/dtv';

export default function GuideDetailPage() {
  const params = useParams();
  const [guide, setGuide] = useState<Guide | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.slug) {
      apiClient.guides
        .get(params.slug as string)
        .then(setGuide)
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [params.slug]);

  if (loading) {
    return <p className="text-muted-foreground">Loading...</p>;
  }

  if (!guide) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Guide not found</h1>
        <a
          href="/guides"
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border border-input bg-background text-sm font-medium h-10 px-4 py-2 hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          Back to guides
        </a>
      </div>
    );
  }

  // Simple markdown rendering — split on headings
  const sections = guide.body.split(/(?=^## )/m);

  return (
    <div className="max-w-3xl space-y-6">
      <a
        href="/guides"
        className="inline-flex items-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-9 px-3 hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        ← Back to guides
      </a>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline">{guide.content_type.replace(/_/g, ' ')}</Badge>
          {guide.related_paths?.map((path) => (
            <Badge key={path} variant="secondary" className="text-xs">
              {path === 'workcation' ? 'Workcation' : path === 'soft_power' ? 'Soft Power' : 'Dependent'}
            </Badge>
          ))}
        </div>
        <h1 className="text-3xl font-bold">{guide.title}</h1>
      </div>

      <Separator />

      <div className="prose prose-sm max-w-none space-y-4">
        {sections.map((section, i) => {
          const headingMatch = section.match(/^## (.+)$/m);
          if (headingMatch) {
            const content = section.replace(/^## .+\n?/, '');
            return (
              <div key={i}>
                <h2 className="text-xl font-semibold mt-6 mb-3">{headingMatch[1]}</h2>
                <div className="text-muted-foreground whitespace-pre-line leading-relaxed">
                  {content}
                </div>
              </div>
            );
          }
          return (
            <div key={i} className="text-muted-foreground whitespace-pre-line leading-relaxed">
              {section}
            </div>
          );
        })}
      </div>

      {guide.tags && guide.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-4">
          {guide.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

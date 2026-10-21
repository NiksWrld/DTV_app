'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiClient } from '@/lib/api-client';
import type { Guide } from '@/types/dtv';

const typeLabels: Record<string, string> = {
  guide: 'Guide',
  faq: 'FAQ',
  embassy_note: 'Embassy Note',
  provider_explainer: 'Provider Explainer',
  common_mistake: 'Common Mistake',
  checklist_explainer: 'Checklist Explainer',
};

export default function GuidesPage() {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [faqs, setFaqs] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([
      apiClient.guides.list().catch(() => [] as Guide[]),
      apiClient.guides.list().catch(() => [] as Guide[]),
    ])
      .then(([g, f]) => {
        setGuides(g.filter((x) => x.content_type !== 'faq'));
        setFaqs(g.filter((x) => x.content_type === 'faq'));
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredGuides = guides.filter(
    (g) =>
      !search ||
      g.title.toLowerCase().includes(search.toLowerCase()) ||
      g.tags?.some((t) => t.toLowerCase().includes(search.toLowerCase())),
  );

  const filteredFaqs = faqs.filter(
    (f) =>
      !search ||
      f.title.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) {
    return <p className="text-muted-foreground">Loading guides...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Guides & FAQ</h1>
        <p className="text-muted-foreground mt-1">
          Learn about the DTV process and common requirements.
        </p>
      </div>

      <Input
        placeholder="Search guides and FAQ..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md"
      />

      <Tabs defaultValue="guides">
        <TabsList>
          <TabsTrigger value="guides">Guides ({filteredGuides.length})</TabsTrigger>
          <TabsTrigger value="faq">FAQ ({filteredFaqs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="guides" className="mt-4 space-y-3">
          {filteredGuides.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No guides found</CardTitle>
                <CardDescription>Try a different search term.</CardDescription>
              </CardHeader>
            </Card>
          ) : (
            filteredGuides.map((guide) => (
              <Link key={guide.id} href={`/guides/${guide.slug}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{guide.title}</CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {typeLabels[guide.content_type] || guide.content_type}
                      </Badge>
                    </div>
                    <CardDescription className="line-clamp-2">
                      {guide.body.replace(/[#*\[\]]/g, '').slice(0, 200)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1">
                      {guide.tags?.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </TabsContent>

        <TabsContent value="faq" className="mt-4 space-y-3">
          {filteredFaqs.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No FAQ found</CardTitle>
                <CardDescription>Try a different search term.</CardDescription>
              </CardHeader>
            </Card>
          ) : (
            filteredFaqs.map((faq) => (
              <Link key={faq.id} href={`/guides/${faq.slug}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader>
                    <CardTitle className="text-base">{faq.title}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {faq.body.replace(/[#*\[\]]/g, '').slice(0, 200)}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const paths = [
  {
    title: 'Workcation',
    description: 'For remote workers, freelancers, and employees wanting to work from Thailand.',
    icon: '💼',
  },
  {
    title: 'Thai Soft Power',
    description: 'For Muay Thai, cooking, medical treatment, and cultural activities.',
    icon: '🎭',
  },
  {
    title: 'Dependent',
    description: 'For spouses and children of DTV holders.',
    icon: '👨‍👩‍👧‍👦',
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-dvh">
      <header className="border-b pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex min-h-16 max-w-5xl flex-wrap items-center justify-between gap-2 px-[max(1rem,env(safe-area-inset-left))] py-2 pr-[max(1rem,env(safe-area-inset-right))] sm:px-6 lg:px-8">
          <span className="text-lg font-bold whitespace-nowrap text-primary sm:text-xl">DTV Workspace</span>
          <div className="flex gap-2">
            <Link
              href="/login"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium whitespace-nowrap text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main id="main" className="flex-1">
        <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8 lg:py-28">
          <div className="space-y-6 text-center">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Your Destination Thailand Visa,{' '}
              <span className="text-primary">organized</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Prepare your DTV application with confidence. Get a personalized checklist,
              organize your documents, find providers, and review your readiness before
              submitting to the official Thai e-Visa system.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md bg-primary text-primary-foreground text-sm font-medium h-11 px-8 hover:bg-primary/90 transition-colors"
              >
                Start preparing
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border border-input bg-background text-sm font-medium h-11 px-8 hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                Continue where you left off
              </Link>
            </div>
          </div>
        </section>

        <section className="border-t py-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-semibold text-center mb-10">
              Choose your DTV path
            </h2>
            <div className="grid sm:grid-cols-3 gap-6">
              {paths.map((path) => (
                <Card key={path.title} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <span className="text-3xl">{path.icon}</span>
                    <CardTitle className="mt-2">{path.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm">
                      {path.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t py-16 bg-muted/30">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid sm:grid-cols-3 gap-8 text-center">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Personalized checklist</h3>
                <p className="text-sm text-muted-foreground">
                  Tailored to your nationality, chosen path, and embassy.
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Document vault</h3>
                <p className="text-sm text-muted-foreground">
                  Upload, organize, and track your documents in one place.
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Readiness review</h3>
                <p className="text-sm text-muted-foreground">
                  Know exactly what&apos;s missing before you submit.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8 pb-[max(2rem,env(safe-area-inset-bottom))] text-center text-sm text-muted-foreground">
        <div className="mx-auto max-w-5xl px-4">
          <p>
            DTV Workspace is a preparation tool. It is not affiliated with the Royal Thai
            Government or any embassy. Final applications are submitted via the{' '}
            <a
              href="https://www.thaievisa.go.th"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2"
            >
              official Thai e-Visa website
            </a>
            .
          </p>
        </div>
      </footer>
    </div>
  );
}

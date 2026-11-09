import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RedirectIfAuthed } from '@/components/redirect-if-authed';

const steps = [
  {
    n: '01',
    title: 'Tell us where you are',
    body: 'Nationality, the country you are in now, and whether you are applying for remote work or Soft Power.',
  },
  {
    n: '02',
    title: 'Collect the file',
    body: 'A checklist matched to your path, with each document uploaded from your phone or camera.',
  },
  {
    n: '03',
    title: 'Apply at the right post',
    body: 'We point you at the Thai embassy or consulate that covers where you currently live.',
  },
];

const tiles = [
  {
    href: '/register',
    kicker: 'Documents',
    title: 'Passport, funds, insurance',
    body: 'Keep scans in one place and see what is still missing before you pay a visa fee.',
  },
  {
    href: '/register',
    kicker: 'Embassy',
    title: 'The post that covers you',
    body: 'Your application follows where you live now, not only the country on your passport.',
  },
  {
    href: '/register',
    kicker: 'Programs',
    title: 'Muay Thai, cooking, courses',
    body: 'Browse schools that can support a Soft Power stay, from gyms to cooking programs.',
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <RedirectIfAuthed to="/dashboard" />
      <header className="border-b border-border/80 pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex min-h-16 max-w-5xl flex-wrap items-center justify-between gap-2 px-[max(1rem,env(safe-area-inset-left))] py-2 pr-[max(1rem,env(safe-area-inset-right))] sm:px-6 lg:px-8">
          <span className="text-lg font-bold tracking-tight text-primary sm:text-xl">DTV</span>
          <div className="flex gap-2">
            <Link
              href="/login"
              className="inline-flex h-11 items-center justify-center rounded-md px-3 text-sm font-medium hover:bg-accent"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main id="main" className="flex-1">
        <section className="relative overflow-hidden border-b">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,oklch(0.546_0.245_262.881/0.18),transparent_55%),radial-gradient(ellipse_at_bottom_right,oklch(0.527_0.154_171.75/0.16),transparent_50%)]"
          />
          <div className="relative mx-auto grid max-w-5xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-24">
            <div className="space-y-6">
              <p className="text-sm font-medium tracking-wide text-primary uppercase">Destination Thailand Visa</p>
              <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
                Your Thailand DTV visa, step by step
              </h1>
              <p className="max-w-xl text-lg text-muted-foreground">
                Prepare the file, match the embassy that covers where you are, and find a program
                before you open the official e-Visa site.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/register"
                  className="inline-flex h-12 items-center justify-center rounded-lg bg-primary px-6 text-base font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Start your application
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-12 items-center justify-center rounded-lg border border-input bg-background px-6 text-base font-medium hover:bg-accent"
                >
                  I already have an account
                </Link>
              </div>
            </div>
            <HeroMark />
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-3">
            {steps.map((step) => (
              <li key={step.n} className="rounded-2xl border bg-card p-5">
                <p className="font-mono text-sm text-primary">{step.n}</p>
                <h3 className="mt-3 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-t bg-muted/30">
          <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-semibold tracking-tight">What you can prepare</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {tiles.map((tile) => (
                <Link key={tile.kicker} href={tile.href} className="block">
                  <Card className="h-full transition-shadow hover:shadow-md">
                    <CardHeader>
                      <p className="text-xs font-semibold tracking-wide text-primary uppercase">{tile.kicker}</p>
                      <CardTitle className="text-lg">{tile.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm leading-relaxed">{tile.body}</CardDescription>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="rounded-2xl border bg-card p-6 sm:p-8">
            <h2 className="text-2xl font-semibold tracking-tight">Built as a preparation desk</h2>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
              <li>Your checklist and uploads stay on your account. This app does not submit the visa for you.</li>
              <li>Embassy suggestions follow the country and city where you are now, and you can override them.</li>
              <li>
                Schools and gyms can{' '}
                <Link href="/list-your-school" className="text-primary underline underline-offset-2">
                  list a program
                </Link>
                . A verified badge only appears after an admin reviews the listing.
              </li>
            </ul>
          </div>
        </section>
      </main>

      <footer className="border-t py-8 pb-[max(2rem,env(safe-area-inset-bottom))] text-center text-sm text-muted-foreground">
        <div className="mx-auto max-w-5xl px-4">
          <p>
            DTV is a preparation tool. It is not affiliated with the Royal Thai Government.
            Final applications go through the{' '}
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

function HeroMark() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      <svg viewBox="0 0 420 320" className="h-auto w-full" role="img" aria-label="A path of three steps toward Thailand">
        <defs>
          <linearGradient id="dtv-sky" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(0.75 0.12 230)" />
            <stop offset="100%" stopColor="oklch(0.55 0.18 262)" />
          </linearGradient>
        </defs>
        <rect width="420" height="320" rx="28" fill="url(#dtv-sky)" />
        <path d="M40 230 C120 180 160 250 230 190 C290 140 320 170 380 120" fill="none" stroke="white" strokeWidth="6" strokeLinecap="round" opacity="0.9" />
        <circle cx="70" cy="214" r="16" fill="white" />
        <circle cx="230" cy="190" r="16" fill="white" />
        <circle cx="370" cy="124" r="16" fill="white" />
        <text x="70" y="219" textAnchor="middle" fontSize="12" fontWeight="700" fill="oklch(0.45 0.2 262)">1</text>
        <text x="230" y="195" textAnchor="middle" fontSize="12" fontWeight="700" fill="oklch(0.45 0.2 262)">2</text>
        <text x="370" y="129" textAnchor="middle" fontSize="12" fontWeight="700" fill="oklch(0.45 0.2 262)">3</text>
        <text x="36" y="270" fill="white" fontSize="14" fontFamily="ui-sans-serif, system-ui">Profile</text>
        <text x="196" y="246" fill="white" fontSize="14" fontFamily="ui-sans-serif, system-ui">Documents</text>
        <text x="318" y="168" fill="white" fontSize="14" fontFamily="ui-sans-serif, system-ui">Embassy</text>
      </svg>
    </div>
  );
}

import type { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';

const TABS: Array<{ href: string; label: string }> = [
  { href: '/', label: 'Runs' },
  { href: '/tests', label: 'Tests' },
  { href: '/trends', label: 'Trends' },
];

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-10 border-b border-[color:var(--color-border)] bg-[color:var(--color-bg)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-baseline gap-2">
            <span
              className="text-lg font-semibold tracking-tight"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              PromptForge
            </span>
            <span className="text-[11px] font-mono text-[color:var(--color-text-muted)]">
              v0.1.0
            </span>
          </Link>
          <nav className="flex gap-1 text-sm">
            {TABS.map((tab) => {
              const isActive =
                tab.href === '/'
                  ? location === '/' || location.startsWith('/runs') || location.startsWith('/compare')
                  : location.startsWith(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={
                    'rounded px-3 py-1.5 transition ' +
                    (isActive
                      ? 'bg-[color:var(--color-surface-hi)] text-[color:var(--color-text)]'
                      : 'text-[color:var(--color-text-dim)] hover:bg-[color:var(--color-surface)] hover:text-[color:var(--color-text)]')
                  }
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}

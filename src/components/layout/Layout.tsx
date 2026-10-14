import { NavLink, Outlet, Link, useLocation } from 'react-router-dom';
import { Menu, Moon, Sun, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NAV_ITEMS, type NavItem } from './nav';
import { Logo } from './Logo';
import { cn } from '@/lib/cn';
import { usePrefs } from '@/context/PrefsContext';

function SideLink({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      className={({ isActive }) =>
        cn(
          'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
          isActive
            ? 'bg-brand-500/10 text-fg ring-1 ring-inset ring-brand-500/30 shadow-[inset_3px_0_0_rgb(var(--brand))]'
            : 'text-muted hover:bg-elevated hover:text-fg',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={cn('h-[18px] w-[18px] transition', isActive ? 'text-brand-400' : 'group-hover:text-brand-400')} aria-hidden />
          {item.label}
        </>
      )}
    </NavLink>
  );
}

function ThemeToggle({ className }: { className?: string }) {
  const { preferences, updatePreferences } = usePrefs();
  const dark = preferences.theme === 'dark';
  return (
    <button
      type="button"
      onClick={() => updatePreferences({ theme: dark ? 'light' : 'dark' })}
      className={cn('rounded-xl p-2 text-muted transition hover:bg-elevated hover:text-fg', className)}
      aria-label={dark ? 'Passer au thème clair' : 'Passer au thème sombre'}
      title={dark ? 'Thème clair' : 'Thème sombre'}
    >
      {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}

function MobileNav() {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const primary = NAV_ITEMS.filter((i) => i.primary);
  const secondary = NAV_ITEMS.filter((i) => !i.primary);
  const moreActive = secondary.some((i) => location.pathname.startsWith(i.to));

  useEffect(() => setMoreOpen(false), [location.pathname]);
  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMoreOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [moreOpen]);

  const itemCls = (active: boolean) =>
    cn(
      'relative flex w-full flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition',
      active ? 'text-brand-400 after:absolute after:top-0 after:h-0.5 after:w-8 after:rounded-full after:bg-brand-500' : 'text-muted hover:text-fg',
    );

  return (
    <>
      {moreOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setMoreOpen(false)} aria-hidden />
      )}
      {moreOpen && (
        <div id="more-menu" className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 animate-slide-up rounded-2xl border border-line bg-surface p-2 shadow-card lg:hidden">
          {secondary.map((item) => <SideLink key={item.to} item={item} />)}
        </div>
      )}
      <nav
        aria-label="Navigation principale"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
      >
        <ul className="mx-auto grid max-w-lg" style={{ gridTemplateColumns: `repeat(${primary.length + (secondary.length ? 1 : 0)}, minmax(0, 1fr))` }}>
          {primary.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <NavLink to={item.to} end={item.to === '/'} className={({ isActive }) => itemCls(isActive)}>
                  <Icon className="h-5 w-5" aria-hidden />
                  {item.short}
                </NavLink>
              </li>
            );
          })}
          {secondary.length > 0 && (
            <li>
              <button type="button" className={itemCls(moreOpen || moreActive)} aria-expanded={moreOpen} aria-controls="more-menu" onClick={() => setMoreOpen((o) => !o)}>
                {moreOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
                Plus
              </button>
            </li>
          )}
        </ul>
      </nav>
    </>
  );
}

export function Layout() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0 });
    // Déplace le focus sur le contenu principal à chaque navigation (lecteurs d'écran).
    document.getElementById('main')?.focus({ preventScroll: true });
  }, [location.pathname]);

  return (
    <div className="min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-brand-500 focus:px-4 focus:py-2 focus:text-on-brand">
        Aller au contenu
      </a>

      {/* Fond décoratif */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-brand-600/10 blur-3xl" />
        <div className="absolute -top-20 right-0 h-80 w-80 rounded-full bg-electric-600/10 blur-3xl" />
      </div>

      {/* Barre latérale (ordinateur) */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line bg-surface/70 px-4 py-5 backdrop-blur-xl lg:flex">
        <Link to="/" className="mb-8 rounded-xl px-2" aria-label="PronoFoot — accueil">
          <Logo />
        </Link>
        <nav aria-label="Navigation principale" className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => <SideLink key={item.to} item={item} />)}
        </nav>
        <div className="mt-4 flex items-center justify-between border-t border-line px-2 pt-4">
          <span className="text-xs text-muted">Jouer comporte des risques</span>
          <ThemeToggle />
        </div>
      </aside>

      {/* Barre supérieure (mobile/tablette) */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-bg/80 px-4 py-3 backdrop-blur-xl lg:hidden">
        <Link to="/" aria-label="PronoFoot — accueil"><Logo /></Link>
        <ThemeToggle />
      </header>

      <main id="main" tabIndex={-1} className="px-4 pb-28 pt-6 outline-none focus-visible:ring-0 focus-visible:ring-offset-0 sm:px-6 lg:ml-64 lg:px-10 lg:pb-12 lg:pt-10">
        <div className="mx-auto max-w-6xl animate-fade-in" key={location.pathname}>
          <Outlet />
        </div>
      </main>

      {/* Navigation basse (mobile/tablette) */}
      <MobileNav />
    </div>
  );
}

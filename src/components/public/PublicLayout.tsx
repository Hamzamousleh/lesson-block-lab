import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { ChevronDown, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const publicLinks = [
  { to: "/about", label: "Om Didaktiva" },
  { to: "/contact", label: "Kontakt" },
  { to: "/privacy", label: "Privatliv" },
  { to: "/cookies", label: "Cookies" },
  { to: "/terms", label: "Vilkår" },
] as const;

export const PUBLIC_PRODUCT_LINKS = [
  { to: "/about", label: "Om Didaktiva" },
  { to: "/contact", label: "Kontakt" },
] as const;

export const PUBLIC_LEGAL_LINKS = [
  { to: "/privacy", label: "Privatliv" },
  { to: "/cookies", label: "Cookies" },
  { to: "/terms", label: "Vilkår" },
] as const;

export function DidaktivaBrand({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      to="/"
      className="inline-flex items-center gap-2 font-display font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4"
      aria-label="Didaktiva – gå til forsiden"
    >
      <span
        className={`flex items-center justify-center rounded-lg bg-primary font-display font-bold text-primary-foreground shadow-sm ${compact ? "size-7 text-sm" : "size-9 text-lg"}`}
        aria-hidden="true"
      >
        D
      </span>
      <span className={compact ? "text-xl" : "text-2xl"}>
        Didakt<span className="text-primary">iva</span>
      </span>
    </Link>
  );
}

const navLinkClass =
  "flex min-h-11 items-center rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function PublicHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="border-b border-border/70 bg-background/95">
      <div className="mx-auto flex min-h-20 max-w-6xl items-center gap-3 px-5 sm:px-6">
        <DidaktivaBrand compact />
        <nav
          className="ml-auto hidden items-center gap-1 md:flex"
          aria-label="Offentlig navigation"
        >
          {PUBLIC_PRODUCT_LINKS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={navLinkClass}
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              {item.label}
            </Link>
          ))}
          <Link
            to="/privacy"
            className={navLinkClass}
            activeProps={{ className: "bg-secondary text-foreground" }}
          >
            Privatliv
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="min-h-11 gap-1 rounded-full px-4 text-sm">
                Mere <ChevronDown aria-hidden="true" className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44">
              <DropdownMenuItem asChild>
                <Link to="/cookies">Cookies</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/terms">Vilkår</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
        <div className="ml-auto flex items-center gap-2 md:ml-3">
          <Button asChild variant="ghost" className="hidden rounded-full sm:inline-flex">
            <Link to="/join">Deltag med kode</Link>
          </Button>
          <Button asChild className="rounded-full">
            <Link to="/auth">Log ind / Opret konto</Link>
          </Button>
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-11 rounded-full md:hidden"
                aria-label="Åbn menu"
                aria-expanded={menuOpen}
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[min(86vw,20rem)] p-5">
              <SheetHeader className="text-left">
                <SheetTitle>Menu</SheetTitle>
                <SheetDescription>Læs om Didaktiva, privatliv og vilkår.</SheetDescription>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-1" aria-label="Mobil offentlig navigation">
                {publicLinks.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMenuOpen(false)}
                    className="flex min-h-11 items-center rounded-xl px-4 py-2.5 font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {item.label}
                  </Link>
                ))}
                <Link
                  to="/join"
                  onClick={() => setMenuOpen(false)}
                  className="flex min-h-11 items-center rounded-xl px-4 py-2.5 font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Deltag med kode
                </Link>
                <Button asChild className="mt-4 rounded-full">
                  <Link to="/auth" onClick={() => setMenuOpen(false)}>
                    Log ind / Opret konto
                  </Link>
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-border/70 bg-surface/60">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 sm:px-6 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <DidaktivaBrand compact />
          <p className="mt-3 text-sm text-muted-foreground">
            Fra fagligt stof til aktiv undervisning
          </p>
        </div>
        <div className="grid gap-8 sm:grid-cols-2">
          <nav aria-label="Produkt">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Produkt
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {publicLinks.slice(0, 2).map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Juridisk">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Juridisk
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {publicLinks.slice(2).map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}

export function PublicPage({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}

export function LegalPage({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <PublicPage>
      <article className="mx-auto max-w-3xl px-5 py-12 sm:px-6 sm:py-18">
        <header className="border-b border-border/70 pb-8">
          <p className="text-sm font-semibold tracking-[0.14em] text-primary uppercase">
            Didaktiva
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold text-balance sm:text-5xl">
            {title}
          </h1>
          {description ? <p className="mt-4 text-lg text-muted-foreground">{description}</p> : null}
          <p className="mt-5 text-sm text-muted-foreground">Senest opdateret: 19. august 2026</p>
        </header>
        <div className="mt-10 space-y-10 text-[1rem] leading-7 text-foreground/90">{children}</div>
      </article>
    </PublicPage>
  );
}

export function LegalSection({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={`section-${number}`}>
      <h2 id={`section-${number}`} className="text-2xl font-semibold">
        {number}. {title}
      </h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

export function PublicLegalLinks({ className = "" }: { className?: string }) {
  return (
    <nav
      className={`flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground ${className}`}
      aria-label="Privatliv og vilkår"
    >
      <Link className="underline-offset-4 hover:underline" to="/privacy">
        Privatliv
      </Link>
      <Link className="underline-offset-4 hover:underline" to="/cookies">
        Cookies
      </Link>
      <Link className="underline-offset-4 hover:underline" to="/terms">
        Vilkår
      </Link>
    </nav>
  );
}

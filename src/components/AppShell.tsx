import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, LogOut, Menu, Settings, User } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/use-session";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ReactNode } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  isNavigationGroupActive,
  isNavigationItemActive,
  TEACHER_NAVIGATION,
} from "@/lib/teacher-navigation";
import { AccountPrivacyDialog } from "@/components/AccountPrivacyDialog";
import { clearPrivateLocalStorage } from "@/lib/participant";
import { useDesignMode } from "@/lib/design-mode";
import { DesignSwitch } from "@/components/design/DesignSwitch";

export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const mode = useDesignMode();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    clearPrivateLocalStorage();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-[72px] max-w-5xl items-center gap-4 px-4 sm:px-6 lg:h-20 lg:gap-8">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-11 rounded-full lg:hidden"
                aria-label="Åbn navigation"
                aria-expanded={menuOpen}
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[min(86vw,22rem)] p-5">
              <SheetHeader className="text-left">
                <SheetTitle>Navigation</SheetTitle>
                <SheetDescription>Gå til et område i Didaktiva.</SheetDescription>
              </SheetHeader>
              <nav aria-label="Mobilnavigation" className="mt-6 flex flex-col gap-5">
                {TEACHER_NAVIGATION.map((entry) =>
                  entry.kind === "link" ? (
                    <Link
                      key={entry.to}
                      to={entry.to}
                      onClick={() => setMenuOpen(false)}
                      aria-current={isNavigationItemActive(pathname, entry.to) ? "page" : undefined}
                      className="flex min-h-11 items-center rounded-xl px-4 py-2.5 font-medium text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[current=page]:bg-accent aria-[current=page]:text-accent-foreground"
                    >
                      {entry.label}
                    </Link>
                  ) : (
                    <div key={entry.label}>
                      <p className="px-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        {entry.label}
                      </p>
                      <div className="mt-1 flex flex-col gap-1">
                        {entry.items.map((item) => (
                          <Link
                            key={item.to}
                            to={item.to}
                            onClick={() => setMenuOpen(false)}
                            aria-current={
                              isNavigationItemActive(pathname, item.to) ? "page" : undefined
                            }
                            className="flex min-h-11 items-center rounded-xl px-4 py-2.5 font-medium text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[current=page]:bg-accent aria-[current=page]:text-accent-foreground"
                          >
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ),
                )}
              </nav>
            </SheetContent>
          </Sheet>
          <Link to="/home" className="font-display text-[26px] font-semibold tracking-tight sm:text-[28px] lg:text-[30px]">
            {mode === "v2" ? (
              <div className="flex items-center gap-2">
                <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                  <span className="font-display text-xl font-bold">D</span>
                </div>
                <span>
                  Didakt<span className="text-primary">iva</span>
                </span>
              </div>
            ) : (
              <>
                Case<span className="text-primary">Lab</span>
              </>
            )}
          </Link>
          <nav aria-label="Hovednavigation" className="hidden items-center gap-1.5 lg:flex">
            {TEACHER_NAVIGATION.map((entry) =>
              entry.kind === "link" ? (
                <Link
                  key={entry.to}
                  to={entry.to}
                  aria-current={isNavigationItemActive(pathname, entry.to) ? "page" : undefined}
                  className="flex min-h-11 items-center rounded-xl px-4 text-[17px] font-medium text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[current=page]:bg-accent aria-[current=page]:text-accent-foreground"
                >
                  {entry.label}
                </Link>
              ) : (
                <DropdownMenu key={entry.label}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className={`min-h-11 gap-1 rounded-xl px-4 text-[17px] font-medium hover:bg-accent/50 ${
                        isNavigationGroupActive(pathname, entry.items)
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {entry.label} <ChevronDown aria-hidden="true" className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-48 p-1.5">
                    {entry.items.map((item) => (
                      <DropdownMenuItem
                        key={item.to}
                        asChild
                        className="min-h-11 rounded-lg px-3 text-[15px] aria-[current=page]:bg-accent aria-[current=page]:text-accent-foreground"
                      >
                        <Link
                          to={item.to}
                          aria-current={
                            isNavigationItemActive(pathname, item.to) ? "page" : undefined
                          }
                        >
                          {item.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ),
            )}
          </nav>
          <div className="ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-11 rounded-full hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Brugermenu"
                >
                  <User className="size-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
                  {user?.email ?? "Lærer"}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setAccountOpen(true)}>
                  <Settings className="size-4" /> Konto og data
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DesignSwitch />
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => void signOut()}>
                  <LogOut className="size-4" /> Log ud
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      <main>{children}</main>
      <AccountPrivacyDialog
        open={accountOpen}
        onOpenChange={setAccountOpen}
        onDeleted={() => {
          queryClient.clear();
          setAccountOpen(false);
          void navigate({ to: "/", replace: true });
        }}
      />
    </div>
  );
}

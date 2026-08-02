import { useEffect, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Ticket,
  PlusCircle,
  Users,
  Settings as SettingsIcon,
  LogOut,
  Headset,
  BookOpen,
  Menu,
} from "lucide-react";
import { useAuth, isStaff, type AppRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navItems: { to: string; label: string; icon: typeof Ticket; roles?: AppRole[] }[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/tickets", label: "Daftar Tiket", icon: Ticket },
  { to: "/tickets/new", label: "Buat Tiket", icon: PlusCircle },
  { to: "/quran", label: "Baca Quran", icon: BookOpen },
  { to: "/users", label: "Manajemen User", icon: Users, roles: ["Administrator"] },
  { to: "/settings", label: "Pengaturan", icon: SettingsIcon, roles: ["Administrator"] },
];


export function AppShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { profile, role, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !profile) {
      void navigate({ to: "/" });
    }
  }, [loading, profile, navigate]);

  if (loading || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const visible = navItems.filter((item) => !item.roles || (role && item.roles.includes(role)));
  const tabs = navItems.slice(0, 4);

  return (
    <div className="min-h-screen bg-background lg:flex">
      <aside className="hidden w-64 shrink-0 flex-col bg-sidebar px-4 py-6 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-3 px-2">
          <span className="brand-gradient flex h-10 w-10 items-center justify-center rounded-xl">
            <Headset className="h-5 w-5 text-primary-foreground" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-extrabold tracking-tight">Kino IT Helpdesk</p>
            <p className="text-xs text-sidebar-foreground/60">Cikembar</p>
          </div>
        </div>

        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {visible.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-6 rounded-xl bg-sidebar-accent p-3">
          <p className="truncate text-sm font-semibold">{profile.nama}</p>
          <p className="truncate text-xs text-sidebar-foreground/60">{role}</p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar hover:text-sidebar-foreground"
            onClick={async () => {
              await signOut();
              void navigate({ to: "/" });
            }}
          >
            <LogOut className="mr-2 h-4 w-4" /> Keluar
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-border bg-card/85 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
            <div className="min-w-0">
              <h1 className="truncate text-xl font-extrabold sm:text-2xl">{title}</h1>
              {description ? (
                <p className="mt-0.5 truncate text-sm text-muted-foreground">{description}</p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">{actions}</div>
          </div>

        </header>

        <main className="flex-1 px-4 py-6 pb-24 sm:px-6 lg:pb-6">{children}</main>

        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
          <div className="flex items-stretch justify-around px-1 py-1.5">
            {tabs.map((item) => {
              const active = pathname === item.to;
              const isPrimary = item.to === "/tickets/new";
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-semibold transition-colors",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-xl transition-colors",
                      isPrimary
                        ? "brand-gradient -mt-5 h-12 w-12 text-primary-foreground shadow-[var(--shadow-elevated)]"
                        : active
                          ? "bg-primary/12"
                          : "",
                    )}
                  >
                    <item.icon className={isPrimary ? "h-6 w-6" : "h-5 w-5"} />
                  </span>
                  <span className="w-full truncate text-center">{item.label}</span>
                </Link>
              );
            })}

            <Sheet>
              <SheetTrigger className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-semibold text-muted-foreground">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl">
                  <Menu className="h-5 w-5" />
                </span>
                <span className="w-full truncate text-center">Lainnya</span>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-2xl">
                <SheetHeader className="text-left">
                  <SheetTitle>{profile.nama}</SheetTitle>
                  <p className="text-sm text-muted-foreground">{role}</p>
                </SheetHeader>
                <div className="mt-4 space-y-1 pb-4">
                  {visible.map((item) => (
                    <SheetClose asChild key={item.to}>
                      <Link
                        to={item.to}
                        className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium hover:bg-muted"
                      >
                        <item.icon className="h-4 w-4" /> {item.label}
                      </Link>
                    </SheetClose>
                  ))}
                  <button
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-destructive hover:bg-muted"
                    onClick={async () => {
                      await signOut();
                      void navigate({ to: "/" });
                    }}
                  >
                    <LogOut className="h-4 w-4" /> Keluar
                  </button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </nav>
      </div>

    </div>
  );
}

export { isStaff };

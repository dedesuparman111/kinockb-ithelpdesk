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
} from "lucide-react";
import { useAuth, isStaff, type AppRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
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

          <nav className="flex gap-1 overflow-x-auto border-t border-border px-2 py-2 lg:hidden">
            {visible.map((item) => {
              const active = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}
            <button
              className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted"
              onClick={async () => {
                await signOut();
                void navigate({ to: "/" });
              }}
            >
              <LogOut className="h-3.5 w-3.5" /> Keluar
            </button>
          </nav>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}

export { isStaff };

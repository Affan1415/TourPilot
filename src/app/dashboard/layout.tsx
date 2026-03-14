"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Zap,
  LayoutDashboard,
  Calendar,
  ClipboardList,
  Users,
  UserCog,
  FileText,
  BarChart3,
  Settings,
  Menu,
  X,
  Bell,
  Search,
  ChevronDown,
  LogOut,
  User,
  Anchor,
  Globe,
  Crown,
  Mail,
  Star,
  Code,
  FileSignature,
  Clock,
  DollarSign,
  Ship,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

interface NavGroup {
  heading: string;
  items: NavItem[];
}

const navigationGroups: NavGroup[] = [
  {
    heading: "Overview",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Super Admin", href: "/dashboard/super-admin", icon: Crown },
      { name: "Inbox", href: "/dashboard/inbox", icon: Mail, badge: 3 },
    ],
  },
  {
    heading: "Bookings",
    items: [
      { name: "Calendar", href: "/dashboard/calendar", icon: Calendar },
      { name: "Bookings", href: "/dashboard/bookings", icon: ClipboardList, badge: 12 },
      { name: "Customers", href: "/dashboard/customers", icon: Users },
      { name: "Reviews", href: "/dashboard/reviews", icon: Star },
      { name: "Manifest", href: "/dashboard/manifest", icon: FileText },
    ],
  },
  {
    heading: "Tours",
    items: [
      { name: "Tours", href: "/dashboard/tours", icon: Ship },
      { name: "Availability", href: "/dashboard/availability", icon: Clock },
      { name: "Pricing", href: "/dashboard/pricing", icon: DollarSign },
      { name: "Waivers", href: "/dashboard/waivers", icon: FileSignature },
    ],
  },
  {
    heading: "Operations",
    items: [
      { name: "Fleet", href: "/dashboard/fleet", icon: Anchor },
      { name: "Locations", href: "/dashboard/locations", icon: Globe },
      { name: "Staff", href: "/dashboard/staff", icon: UserCog },
    ],
  },
  {
    heading: "Marketing",
    items: [
      { name: "Widgets", href: "/dashboard/widgets", icon: Code },
      { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
    ],
  },
];

const bottomNav = [
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const supabase = createClient();

    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const userEmail = user?.email || "user@example.com";
  const userName = user?.user_metadata?.full_name || userEmail.split("@")[0];
  const userInitials = userName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* V6 Expandable Sidebar */}
      <aside
        className={cn(
          // Mobile: slides in from left
          "fixed inset-y-0 left-0 z-50 transform transition-all duration-200 ease-in-out lg:static lg:z-auto",
          // Desktop: hover expand
          "lg:w-[72px] lg:hover:w-60",
          // V6 Dark Sidebar
          "bg-sidebar text-sidebar-foreground",
          "flex flex-col overflow-hidden",
          // Desktop hover shadow
          "lg:hover:shadow-[4px_0_24px_rgba(0,0,0,0.15)]",
          // Sidebar expand transition
          "sidebar-expand",
          // Mobile states
          sidebarOpen ? "translate-x-0 w-60" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center px-3 border-b border-sidebar-border shrink-0">
          <Link href="/dashboard" className="flex items-center gap-3 w-full">
            <div className="flex h-11 w-11 min-w-[44px] items-center justify-center rounded-xl gradient-logo shadow-lg shadow-amber-500/30">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <span className="font-bold text-lg text-white sidebar-text whitespace-nowrap">
              TourPilot
            </span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-sidebar-foreground hover:bg-sidebar-accent ml-auto"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 overflow-hidden">
          <nav className="space-y-4 px-2 py-4">
            {navigationGroups.map((group, groupIndex) => (
              <div key={group.heading} className={cn(groupIndex > 0 && "pt-2")}>
                {/* Group Heading */}
                <div className="px-3 mb-2">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50 sidebar-text whitespace-nowrap">
                    {group.heading}
                  </h3>
                  {/* Collapsed state: show line instead of heading */}
                  <div className="hidden lg:block lg:group-hover:hidden h-px bg-sidebar-border/50 mt-1 sidebar-collapsed-only" />
                </div>

                {/* Group Items */}
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const isActive = mounted && (pathname === item.href || pathname.startsWith(item.href + "/"));
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative group",
                          isActive
                            ? "bg-sidebar-active text-white"
                            : "text-sidebar-foreground hover:bg-sidebar-hover hover:text-white"
                        )}
                      >
                        {/* Active indicator */}
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 w-[3px] h-6 bg-sidebar-primary rounded-r" />
                        )}
                        <item.icon className="h-[22px] w-[22px] min-w-[22px]" />
                        <span className="sidebar-text whitespace-nowrap">{item.name}</span>
                        {item.badge && (
                          <span className={cn(
                            "ml-auto bg-rose-dark text-white text-[11px] font-semibold rounded-full transition-all",
                            // When collapsed: small dot
                            "lg:group-hover:px-2 lg:group-hover:py-0.5",
                            "lg:w-2 lg:h-2 lg:p-0 lg:group-hover:w-auto lg:group-hover:h-auto",
                            // When hovered/expanded: show number
                            "sidebar-text",
                            // Mobile always show
                            "w-auto h-auto px-2 py-0.5 lg:px-0 lg:py-0"
                          )}>
                            <span className="lg:hidden lg:group-hover:inline">{item.badge}</span>
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </ScrollArea>

        {/* Bottom nav */}
        <div className="border-t border-sidebar-border px-2 py-3 space-y-1 shrink-0">
          {bottomNav.map((item) => {
            const isActive = mounted && (pathname === item.href || pathname.startsWith(item.href + "/"));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                  isActive
                    ? "bg-sidebar-active text-white"
                    : "text-sidebar-foreground hover:bg-sidebar-hover hover:text-white"
                )}
              >
                <item.icon className="h-[22px] w-[22px] min-w-[22px]" />
                <span className="sidebar-text whitespace-nowrap">{item.name}</span>
              </Link>
            );
          })}

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-sidebar-foreground hover:bg-sidebar-hover hover:text-white w-full"
          >
            <LogOut className="h-[22px] w-[22px] min-w-[22px]" />
            <span className="sidebar-text whitespace-nowrap">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden lg:ml-0">
        {/* Top navbar - V6 Style */}
        <header className="flex h-16 items-center justify-between border-b bg-card px-4 lg:px-6 shrink-0">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            {/* Page Title - shown on mobile */}
            <h1 className="font-semibold text-lg lg:hidden">
              {navigationGroups.flatMap(g => g.items).find(n => pathname === n.href || pathname.startsWith(n.href + "/"))?.name || "Dashboard"}
            </h1>

            {/* Search - V6 Style */}
            <div className="hidden md:flex items-center gap-2 px-4 py-2.5 bg-muted rounded-xl w-60 border border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-all">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search..."
                className="bg-transparent border-none outline-none text-sm flex-1"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick actions */}
            <Link href="/dashboard/bookings/new">
              <Button size="sm" className="hidden sm:flex gap-2 gradient-primary border-0 rounded-xl shadow-lg shadow-primary/30">
                <span className="text-lg leading-none">+</span>
                New Booking
              </Button>
            </Link>

            {/* Notifications - V6 Style */}
            <Button variant="outline" size="icon" className="relative rounded-xl border-border hover:border-primary hover:text-primary">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-[18px] min-w-[18px] px-1 rounded-full bg-rose-dark text-white text-[10px] font-semibold flex items-center justify-center">
                3
              </span>
            </Button>

            {/* User menu - V6 Style */}
            {mounted ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2 px-2 rounded-xl border-border hover:border-primary">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage src={user?.user_metadata?.avatar_url} />
                      <AvatarFallback className="rounded-lg bg-gradient-to-br from-sky to-lavender text-sky-dark font-semibold">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline text-sm font-medium">{userName}</span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-xl">
                  <DropdownMenuLabel>
                    <div>
                      <p className="font-medium">{userName}</p>
                      <p className="text-xs text-muted-foreground font-normal">{userEmail}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="rounded-lg">
                    <Link href="/dashboard/settings">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-lg">
                    <Link href="/dashboard/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive cursor-pointer rounded-lg"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="outline" className="gap-2 px-2 rounded-xl border-border">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarFallback className="rounded-lg bg-gradient-to-br from-sky to-lavender text-sky-dark font-semibold">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline text-sm font-medium">{userName}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}

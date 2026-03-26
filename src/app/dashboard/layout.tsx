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
  Shield,
  ChevronDown,
  ChevronRight,
  LogOut,
  User,
  Anchor,
  Globe,
  Mail,
  Star,
  Code,
  FileSignature,
  Clock,
  DollarSign,
  Ship,
  Tag,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { LocationProvider } from "@/lib/location/context";
import { LocationSelector } from "@/components/dashboard/location-selector";
import { UserRole, MANAGER_ROLES, ADMIN_ROLES } from "@/lib/auth/roles";
import { useTranslation } from "@/lib/i18n/context";
import { LanguageSwitcher } from "@/components/shared/language-switcher";

interface NavItem {
  key: string; // Translation key in sidebar namespace
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  roles?: UserRole[]; // If specified, only show to these roles
}

interface NavGroup {
  headingKey: string; // Translation key for heading
  items: NavItem[];
}

const navigationGroups: NavGroup[] = [
  {
    headingKey: "overview",
    items: [
      { key: "dashboard", href: "/dashboard", icon: LayoutDashboard },
      { key: "inbox", href: "/dashboard/inbox", icon: Mail, badge: 3, roles: ['admin', 'location_manager'] },
    ],
  },
  {
    headingKey: "bookings",
    items: [
      { key: "calendar", href: "/dashboard/calendar", icon: Calendar },
      { key: "bookings", href: "/dashboard/bookings", icon: ClipboardList, badge: 12 },
      { key: "customers", href: "/dashboard/customers", icon: Users, roles: ['admin', 'location_manager'] },
      { key: "reviews", href: "/dashboard/reviews", icon: Star, roles: ['admin', 'location_manager'] },
      { key: "manifest", href: "/dashboard/manifest", icon: FileText },
    ],
  },
  {
    headingKey: "tours",
    items: [
      { key: "tours", href: "/dashboard/tours", icon: Ship, roles: ['admin', 'location_manager'] },
      { key: "availability", href: "/dashboard/availability", icon: Clock, roles: ['admin', 'location_manager'] },
      { key: "promoCodes", href: "/dashboard/pricing", icon: Tag, roles: ['admin', 'location_manager'] },
      { key: "waivers", href: "/dashboard/waivers", icon: FileSignature, roles: ['admin', 'location_manager'] },
    ],
  },
  {
    headingKey: "operations",
    items: [
      { key: "fleet", href: "/dashboard/fleet", icon: Anchor, roles: ['admin', 'location_manager'] },
      { key: "locations", href: "/dashboard/locations", icon: Globe, roles: ['admin'] },
      { key: "staff", href: "/dashboard/staff", icon: UserCog, roles: ['admin', 'location_manager'] },
      { key: "checklists", href: "/dashboard/checklists", icon: ClipboardList, roles: ['admin', 'location_manager'] },
      { key: "compliance", href: "/dashboard/compliance", icon: Shield, roles: ['admin', 'location_manager'] },
      { key: "logBook", href: "/dashboard/logbook", icon: FileText, roles: ['admin', 'location_manager'] },
    ],
  },
  {
    headingKey: "marketing",
    items: [
      { key: "affiliates", href: "/dashboard/affiliates", icon: Users, roles: ['admin', 'location_manager'] },
      { key: "payouts", href: "/dashboard/payouts", icon: Wallet, roles: ['admin', 'location_manager'] },
      { key: "widgets", href: "/dashboard/widgets", icon: Code, roles: ['admin', 'location_manager'] },
      { key: "analyticsRevenue", href: "/dashboard/analytics", icon: BarChart3, roles: ['admin', 'location_manager'] },
    ],
  },
];

// Affiliate-specific navigation (shown only to affiliates)
const affiliateNavigationGroups: NavGroup[] = [
  {
    headingKey: "affiliate",
    items: [
      { key: "dashboard", href: "/dashboard/affiliate", icon: LayoutDashboard },
      { key: "myQrCode", href: "/dashboard/affiliate/qr-code", icon: Globe },
      { key: "referrals", href: "/dashboard/affiliate/referrals", icon: Users },
      { key: "earnings", href: "/dashboard/affiliate/earnings", icon: DollarSign },
    ],
  },
];

const bottomNav = [
  { key: "settings", href: "/dashboard/settings", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    // Initialize all groups as collapsed
    const allGroups = [...navigationGroups, ...affiliateNavigationGroups];
    const initial: Record<string, boolean> = {};
    allGroups.forEach(group => {
      initial[group.headingKey] = true; // true = collapsed
    });
    return initial;
  });
  const [initializedGroups, setInitializedGroups] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Open the group containing the active page
  useEffect(() => {
    if (!initializedGroups) {
      const activeGroup = [...navigationGroups, ...affiliateNavigationGroups].find(group =>
        group.items.some(item => pathname === item.href || pathname.startsWith(item.href + "/"))
      );
      if (activeGroup) {
        setCollapsedGroups(prev => ({
          ...prev,
          [activeGroup.headingKey]: false // false = expanded
        }));
      }
      setInitializedGroups(true);
    }
  }, [pathname, initializedGroups]);

  useEffect(() => {
    const supabase = createClient();

    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        // Fetch user role from staff table
        const { data: staffData } = await supabase
          .from('staff')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (staffData) {
          setUserRole(staffData.role as UserRole);
        }
      }

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

  // Filter navigation items based on user role
  // Affiliates get their own navigation
  const filteredNavigationGroups = userRole === 'affiliate'
    ? affiliateNavigationGroups
    : navigationGroups.map(group => ({
        ...group,
        items: group.items.filter(item => {
          if (!item.roles) return true; // No role restriction
          if (!userRole) return false; // User has no role, hide restricted items
          return item.roles.includes(userRole);
        })
      })).filter(group => group.items.length > 0); // Remove empty groups

  const toggleGroup = (heading: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [heading]: !prev[heading]
    }));
  };

  return (
    <LocationProvider>
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
            {filteredNavigationGroups.map((group, groupIndex) => {
              const isCollapsed = collapsedGroups[group.headingKey];
              const groupHeading = t(`sidebar.${group.headingKey}`);
              return (
                <div key={group.headingKey} className={cn(groupIndex > 0 && "pt-2")}>
                  {/* Group Heading - Clickable to collapse */}
                  <button
                    onClick={() => toggleGroup(group.headingKey)}
                    className="flex items-center justify-between w-full px-3 mb-2 group/heading hover:text-white"
                  >
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50 sidebar-text whitespace-nowrap group-hover/heading:text-sidebar-foreground">
                      {groupHeading}
                    </h3>
                    <ChevronRight
                      className={cn(
                        "h-3.5 w-3.5 text-sidebar-foreground/50 transition-transform duration-200 sidebar-text group-hover/heading:text-sidebar-foreground",
                        !isCollapsed && "rotate-90"
                      )}
                    />
                  </button>

                  {/* Collapsed preview - show icons only */}
                  {isCollapsed && (
                    <div className="flex flex-wrap gap-1 px-1">
                      {group.items.map((item) => {
                        const isActive = mounted && (pathname === item.href || pathname.startsWith(item.href + "/"));
                        const itemName = t(`sidebar.${item.key}`);
                        return (
                          <Link
                            key={item.key}
                            href={item.href}
                            title={itemName}
                            className={cn(
                              "flex items-center justify-center p-2 rounded-lg transition-all",
                              isActive
                                ? "bg-sidebar-active text-white"
                                : "text-sidebar-foreground/70 hover:bg-sidebar-hover hover:text-white"
                            )}
                          >
                            <item.icon className="h-5 w-5" />
                          </Link>
                        );
                      })}
                    </div>
                  )}

                  {/* Group Items - Collapsible */}
                  <div
                    className={cn(
                      "space-y-1 overflow-hidden transition-all duration-200",
                      isCollapsed ? "max-h-0 opacity-0" : "max-h-[500px] opacity-100"
                    )}
                  >
                    {group.items.map((item) => {
                      const isActive = mounted && (pathname === item.href || pathname.startsWith(item.href + "/"));
                      const itemName = t(`sidebar.${item.key}`);
                      return (
                        <Link
                          key={item.key}
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
                          <span className="sidebar-text whitespace-nowrap">{itemName}</span>
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
              );
            })}
          </nav>
        </ScrollArea>

        {/* Bottom nav */}
        <div className="border-t border-sidebar-border px-2 py-3 space-y-1 shrink-0">
          {bottomNav.map((item) => {
            const isActive = mounted && (pathname === item.href || pathname.startsWith(item.href + "/"));
            const itemName = t(`sidebar.${item.key}`);
            return (
              <Link
                key={item.key}
                href={item.href}
                className={cn(
                  "flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                  isActive
                    ? "bg-sidebar-active text-white"
                    : "text-sidebar-foreground hover:bg-sidebar-hover hover:text-white"
                )}
              >
                <item.icon className="h-[22px] w-[22px] min-w-[22px]" />
                <span className="sidebar-text whitespace-nowrap">{itemName}</span>
              </Link>
            );
          })}

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-sidebar-foreground hover:bg-sidebar-hover hover:text-white w-full"
          >
            <LogOut className="h-[22px] w-[22px] min-w-[22px]" />
            <span className="sidebar-text whitespace-nowrap">{t('sidebar.logout')}</span>
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
              {(() => {
                const activeItem = filteredNavigationGroups.flatMap(g => g.items).find(n => pathname === n.href || pathname.startsWith(n.href + "/"));
                return activeItem ? t(`sidebar.${activeItem.key}`) : t('sidebar.dashboard');
              })()}
            </h1>

            {/* Search - V6 Style */}
            <div className="hidden md:flex items-center gap-2 px-4 py-2.5 bg-muted rounded-xl w-60 border border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-all">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={t('sidebar.search')}
                className="bg-transparent border-none outline-none text-sm flex-1"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Location Selector */}
            <div className="hidden sm:block">
              <LocationSelector />
            </div>

            {/* Language Switcher */}
            <LanguageSwitcher variant="minimal" />

            {/* Quick actions */}
            <Link href="/dashboard/bookings/new">
              <Button size="sm" className="hidden sm:flex gap-2 gradient-primary border-0 rounded-xl shadow-lg shadow-primary/30">
                <span className="text-lg leading-none">+</span>
                {t('sidebar.newBooking')}
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
                      {t('sidebar.profile')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-lg">
                    <Link href="/dashboard/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      {t('sidebar.settings')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive cursor-pointer rounded-lg"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    {t('sidebar.logout')}
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
    </LocationProvider>
  );
}

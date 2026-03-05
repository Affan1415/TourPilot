"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import {
  Ship,
  Menu,
  Calendar,
  Users,
  Phone,
  LayoutDashboard,
  ClipboardList,
  Settings,
  LogOut,
  ChevronDown,
  LogIn,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface UserInfo {
  user: SupabaseUser | null;
  role: string | null;
  name: string;
  avatarUrl: string | null;
}

export function Navbar() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo>({
    user: null,
    role: null,
    name: "",
    avatarUrl: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    const fetchUserInfo = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setUserInfo({ user: null, role: null, name: "", avatarUrl: null });
        setLoading(false);
        return;
      }

      // Check if user is staff
      const { data: staffData } = await supabase
        .from('staff')
        .select('name, role, avatar_url')
        .eq('user_id', user.id)
        .single();

      if (staffData) {
        setUserInfo({
          user,
          role: staffData.role,
          name: staffData.name,
          avatarUrl: staffData.avatar_url,
        });
        setLoading(false);
        return;
      }

      // Check if user is customer
      const { data: customerData } = await supabase
        .from('customers')
        .select('first_name, last_name, avatar_url')
        .eq('user_id', user.id)
        .single();

      if (customerData) {
        setUserInfo({
          user,
          role: 'customer',
          name: `${customerData.first_name} ${customerData.last_name}`,
          avatarUrl: customerData.avatar_url,
        });
      } else {
        setUserInfo({
          user,
          role: null,
          name: user.email?.split('@')[0] || 'User',
          avatarUrl: null,
        });
      }

      setLoading(false);
    };

    fetchUserInfo();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session?.user) {
          setUserInfo({ user: null, role: null, name: "", avatarUrl: null });
        } else {
          fetchUserInfo();
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setIsOpen(false);
    router.push("/");
    router.refresh();
  };

  const navLinks = [
    { href: "/tours", label: "Tours", icon: Ship },
    { href: "/about", label: "About", icon: Users },
    { href: "/contact", label: "Contact", icon: Phone },
  ];

  const userInitials = userInfo.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "??";

  const getDashboardLink = () => {
    if (!userInfo.role) return "/dashboard";
    if (userInfo.role === 'customer') return "/account/dashboard";
    if (userInfo.role === 'captain') return "/captain";
    return "/dashboard";
  };

  const isCustomer = userInfo.role === 'customer';
  const isStaff = userInfo.role && userInfo.role !== 'customer';

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform group-hover:scale-105">
            <Ship className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">TourPilot</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground rounded-lg transition-colors hover:text-foreground hover:bg-accent"
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-3">
          {loading ? (
            <div className="h-8 w-24 bg-muted rounded animate-pulse" />
          ) : userInfo.user ? (
            <>
              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 px-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={userInfo.avatarUrl || undefined} />
                      <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm max-w-[120px] truncate">{userInfo.name}</span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div>
                      <p className="font-medium">{userInfo.name}</p>
                      <p className="text-xs text-muted-foreground font-normal">
                        {userInfo.user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  {isCustomer && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/account/dashboard">
                          <LayoutDashboard className="mr-2 h-4 w-4" />
                          Dashboard
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/account">
                          <ClipboardList className="mr-2 h-4 w-4" />
                          My Bookings
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/account/settings">
                          <Settings className="mr-2 h-4 w-4" />
                          Settings
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}

                  {isStaff && (
                    <DropdownMenuItem asChild>
                      <Link href={getDashboardLink()}>
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive cursor-pointer"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm" className="gap-2">
                  <LogIn className="h-4 w-4" />
                  Sign In
                </Button>
              </Link>
              <Link href="/tours">
                <Button size="sm" className="gap-2 gradient-primary border-0 shadow-lg shadow-primary/25">
                  <Calendar className="h-4 w-4" />
                  Book Now
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] sm:w-[400px]">
            <div className="flex flex-col gap-6 mt-6">
              <Link href="/" className="flex items-center gap-2" onClick={() => setIsOpen(false)}>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Ship className="h-5 w-5" />
                </div>
                <span className="text-xl font-bold">TourPilot</span>
              </Link>

              {/* User Info (Mobile) */}
              {userInfo.user && (
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={userInfo.avatarUrl || undefined} />
                    <AvatarFallback>{userInitials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{userInfo.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {userInfo.user.email}
                    </p>
                  </div>
                </div>
              )}

              <nav className="flex flex-col gap-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-base font-medium rounded-lg transition-colors hover:bg-accent"
                  >
                    <link.icon className="h-5 w-5 text-muted-foreground" />
                    {link.label}
                  </Link>
                ))}
              </nav>

              <div className="border-t pt-6 flex flex-col gap-2">
                {userInfo.user ? (
                  <>
                    {isCustomer && (
                      <>
                        <Link href="/account/dashboard" onClick={() => setIsOpen(false)}>
                          <Button variant="ghost" className="w-full justify-start gap-2">
                            <LayoutDashboard className="h-4 w-4" />
                            Dashboard
                          </Button>
                        </Link>
                        <Link href="/account" onClick={() => setIsOpen(false)}>
                          <Button variant="ghost" className="w-full justify-start gap-2">
                            <ClipboardList className="h-4 w-4" />
                            My Bookings
                          </Button>
                        </Link>
                        <Link href="/account/settings" onClick={() => setIsOpen(false)}>
                          <Button variant="ghost" className="w-full justify-start gap-2">
                            <Settings className="h-4 w-4" />
                            Settings
                          </Button>
                        </Link>
                      </>
                    )}
                    {isStaff && (
                      <Link href={getDashboardLink()} onClick={() => setIsOpen(false)}>
                        <Button variant="ghost" className="w-full justify-start gap-2">
                          <LayoutDashboard className="h-4 w-4" />
                          Dashboard
                        </Button>
                      </Link>
                    )}
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-2 text-destructive hover:text-destructive"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-4 w-4" />
                      Log out
                    </Button>
                  </>
                ) : (
                  <>
                    <Link href="/login" onClick={() => setIsOpen(false)}>
                      <Button variant="outline" className="w-full justify-start gap-2">
                        <LogIn className="h-4 w-4" />
                        Sign In
                      </Button>
                    </Link>
                    <Link href="/tours" onClick={() => setIsOpen(false)}>
                      <Button className="w-full justify-start gap-2 gradient-primary border-0">
                        <Calendar className="h-4 w-4" />
                        Book Now
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}

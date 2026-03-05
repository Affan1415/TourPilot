"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Ship, Mail, Lock, Eye, EyeOff, AlertCircle, Shield, Anchor, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type LoginType = "admin" | "captain" | "customer" | null;

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loginType, setLoginType] = useState<LoginType>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle error query params from OAuth callback
  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam === "auth") {
      setError("Authentication failed. Please try again.");
    } else if (errorParam === "no_admin_access") {
      setError("You don't have admin access. Please contact your administrator.");
    } else if (errorParam === "no_captain_access") {
      setError("You don't have captain access. Please contact your administrator.");
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      if (data.user) {
        // Redirect based on selected login type
        if (loginType === "admin") {
          // Verify user is staff
          const { data: staffData } = await supabase
            .from('staff')
            .select('role, is_active')
            .eq('user_id', data.user.id)
            .single();

          if (staffData && staffData.is_active && ['admin', 'manager', 'guide', 'front_desk'].includes(staffData.role)) {
            router.push("/dashboard");
          } else {
            setError("You don't have admin access. Please contact your administrator.");
            await supabase.auth.signOut();
            return;
          }
        } else if (loginType === "captain") {
          // Verify user is captain
          const { data: staffData } = await supabase
            .from('staff')
            .select('role, is_active')
            .eq('user_id', data.user.id)
            .single();

          if (staffData && staffData.is_active && staffData.role === 'captain') {
            router.push("/captain");
          } else {
            setError("You don't have captain access. Please contact your administrator.");
            await supabase.auth.signOut();
            return;
          }
        } else if (loginType === "customer") {
          // Link or create customer account via API (bypasses RLS)
          const linkResponse = await fetch('/api/customers/link', {
            method: 'POST',
          });

          if (!linkResponse.ok) {
            console.error('Failed to link customer account');
          }

          router.push("/account");
        }
      }

      router.refresh();
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!loginType) {
      setError("Please select an account type first");
      return;
    }

    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?type=${loginType}`,
      },
    });
  };

  // Account type selection screen
  if (!loginType) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
        <div className="w-full max-w-lg">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Ship className="h-6 w-6" />
              </div>
              <span className="text-2xl font-bold">TourPilot</span>
            </Link>
          </div>

          <Card className="p-8">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold">Welcome to TourPilot</h1>
              <p className="text-muted-foreground mt-1">
                Select how you'd like to sign in
              </p>
            </div>

            <div className="grid gap-4">
              {/* Admin/Staff Option */}
              <button
                onClick={() => setLoginType("admin")}
                className="flex items-center gap-4 p-4 rounded-xl border-2 border-transparent bg-muted/50 hover:border-primary hover:bg-primary/5 transition-all text-left"
              >
                <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold">Admin / Staff</p>
                  <p className="text-sm text-muted-foreground">
                    Manage tours, bookings, and customers
                  </p>
                </div>
              </button>

              {/* Captain Option */}
              <button
                onClick={() => setLoginType("captain")}
                className="flex items-center gap-4 p-4 rounded-xl border-2 border-transparent bg-muted/50 hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left"
              >
                <div className="h-12 w-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                  <Anchor className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <p className="font-semibold">Captain</p>
                  <p className="text-sm text-muted-foreground">
                    View assigned tours and check-in guests
                  </p>
                </div>
              </button>

              {/* Customer Option */}
              <button
                onClick={() => setLoginType("customer")}
                className="flex items-center gap-4 p-4 rounded-xl border-2 border-transparent bg-muted/50 hover:border-green-500 hover:bg-green-50 transition-all text-left"
              >
                <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center">
                  <User className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold">Customer</p>
                  <p className="text-sm text-muted-foreground">
                    View your bookings and sign waivers
                  </p>
                </div>
              </button>
            </div>
          </Card>

          <p className="text-center text-xs text-muted-foreground mt-6">
            By signing in, you agree to our{" "}
            <Link href="/terms" className="hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="hover:underline">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    );
  }

  // Login form
  const loginConfig = {
    admin: {
      title: "Admin / Staff Login",
      subtitle: "Sign in to manage your tours",
      color: "blue",
      icon: Shield,
    },
    captain: {
      title: "Captain Login",
      subtitle: "Sign in to view your assignments",
      color: "indigo",
      icon: Anchor,
    },
    customer: {
      title: "Customer Login",
      subtitle: "Sign in to view your bookings",
      color: "green",
      icon: User,
    },
  };

  const config = loginConfig[loginType];
  const IconComponent = config.icon;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Ship className="h-6 w-6" />
            </div>
            <span className="text-2xl font-bold">TourPilot</span>
          </Link>
        </div>

        <Card className="p-8">
          {/* Back button */}
          <button
            onClick={() => {
              setLoginType(null);
              setError(null);
            }}
            className="text-sm text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1"
          >
            ← Back to account selection
          </button>

          <div className="text-center mb-6">
            <div className={cn(
              "h-14 w-14 rounded-xl mx-auto mb-3 flex items-center justify-center",
              config.color === "blue" && "bg-blue-100",
              config.color === "indigo" && "bg-indigo-100",
              config.color === "green" && "bg-green-100"
            )}>
              <IconComponent className={cn(
                "h-7 w-7",
                config.color === "blue" && "text-blue-600",
                config.color === "indigo" && "text-indigo-600",
                config.color === "green" && "text-green-600"
              )} />
            </div>
            <h1 className="text-2xl font-bold">{config.title}</h1>
            <p className="text-muted-foreground mt-1">
              {config.subtitle}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-3 text-destructive">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className={cn(
                "w-full border-0",
                config.color === "blue" && "bg-blue-600 hover:bg-blue-700",
                config.color === "indigo" && "bg-indigo-600 hover:bg-indigo-700",
                config.color === "green" && "bg-green-600 hover:bg-green-700"
              )}
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <div className="relative my-6">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
              or continue with
            </span>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleLogin}
          >
            <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </Button>

          {loginType === "customer" && (
            <p className="text-center text-sm text-muted-foreground mt-6">
              Don't have an account?{" "}
              <Link href="/signup" className="text-primary hover:underline font-medium">
                Sign up
              </Link>
            </p>
          )}
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          By signing in, you agree to our{" "}
          <Link href="/terms" className="hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="hover:underline">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="animate-pulse">Loading...</div>
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  );
}

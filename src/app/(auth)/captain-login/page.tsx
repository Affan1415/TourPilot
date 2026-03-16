"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Anchor,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Ship
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type AuthMode = "select" | "password" | "magic-link" | "magic-link-sent";

function CaptainLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authMode, setAuthMode] = useState<AuthMode>("select");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle error/success query params
  useEffect(() => {
    const errorParam = searchParams.get("error");
    const message = searchParams.get("message");

    if (errorParam === "auth") {
      setError("Authentication failed. Please try again.");
    } else if (errorParam === "no_captain_access") {
      setError("You don't have captain access. Please contact your administrator.");
    } else if (errorParam === "invalid_link") {
      setError("This login link is invalid or has expired. Please request a new one.");
    }

    if (message === "check_email") {
      setAuthMode("magic-link-sent");
    }
  }, [searchParams]);

  const handlePasswordLogin = async (e: React.FormEvent) => {
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
        // Verify user is captain
        const { data: staffData } = await supabase
          .from('staff')
          .select('role, is_active')
          .eq('user_id', data.user.id)
          .single();

        if (staffData && staffData.is_active && staffData.role === 'captain') {
          router.push("/captain");
          router.refresh();
        } else {
          setError("You don't have captain access. Please contact your administrator.");
          await supabase.auth.signOut();
        }
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLinkLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // First check if this email belongs to a captain
      const { data: staffData } = await supabase
        .from('staff')
        .select('role, is_active')
        .eq('email', email.toLowerCase())
        .single();

      if (!staffData || !staffData.is_active || staffData.role !== 'captain') {
        setError("No captain account found with this email.");
        setLoading(false);
        return;
      }

      // Send magic link
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?type=captain`,
        },
      });

      if (error) {
        setError(error.message);
        return;
      }

      setAuthMode("magic-link-sent");
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?type=captain`,
      },
    });
  };

  // Magic link sent confirmation
  if (authMode === "magic-link-sent") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 p-4">
        <div className="w-full max-w-md">
          <Card className="p-8 bg-slate-900/80 border-slate-700/50 backdrop-blur-sm">
            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-green-500/20 mx-auto mb-4 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-400" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Check your email</h1>
              <p className="text-slate-400 mb-6">
                We've sent a login link to<br />
                <span className="text-white font-medium">{email}</span>
              </p>

              <div className="bg-slate-800/50 rounded-xl p-4 mb-6 text-left">
                <p className="text-sm text-slate-300">
                  Click the link in your email to sign in instantly. The link expires in 1 hour.
                </p>
              </div>

              <Button
                variant="ghost"
                className="text-slate-400 hover:text-white"
                onClick={() => {
                  setAuthMode("select");
                  setEmail("");
                }}
              >
                Use a different email
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Auth method selection screen
  if (authMode === "select") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 p-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-indigo-600 mb-4">
              <Anchor className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">Captain Login</h1>
            <p className="text-slate-400 mt-2">
              Sign in to view your tours and check-in guests
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <Card className="p-6 bg-slate-900/80 border-slate-700/50 backdrop-blur-sm">
            <div className="space-y-3">
              {/* Magic Link Option - Recommended */}
              <button
                onClick={() => setAuthMode("magic-link")}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-indigo-600/20 border-2 border-indigo-500/50 hover:border-indigo-400 hover:bg-indigo-600/30 transition-all text-left group"
              >
                <div className="h-12 w-12 rounded-xl bg-indigo-500 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-white">Email me a login link</p>
                    <span className="text-xs bg-indigo-500 text-white px-2 py-0.5 rounded-full">Recommended</span>
                  </div>
                  <p className="text-sm text-slate-400">
                    No password needed - quick and secure
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-white transition-colors flex-shrink-0" />
              </button>

              {/* Password Option */}
              <button
                onClick={() => setAuthMode("password")}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-slate-800/50 border-2 border-slate-700/50 hover:border-slate-600 hover:bg-slate-800 transition-all text-left group"
              >
                <div className="h-12 w-12 rounded-xl bg-slate-700 flex items-center justify-center flex-shrink-0">
                  <Lock className="h-6 w-6 text-slate-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white">Sign in with password</p>
                  <p className="text-sm text-slate-400">
                    Use your email and password
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-white transition-colors flex-shrink-0" />
              </button>
            </div>

            <div className="relative my-6">
              <Separator className="bg-slate-700" />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 px-3 text-xs text-slate-500">
                or
              </span>
            </div>

            {/* Google Login */}
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 bg-slate-800/50 border-slate-700 hover:bg-slate-800 hover:border-slate-600 text-white"
              onClick={handleGoogleLogin}
            >
              <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
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
          </Card>

          {/* Footer Links */}
          <div className="text-center mt-6 space-y-3">
            <Link
              href="/login"
              className="text-sm text-slate-400 hover:text-white transition-colors inline-flex items-center gap-1"
            >
              <Ship className="h-4 w-4" />
              Not a captain? Sign in here
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Magic link form
  if (authMode === "magic-link") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 p-4">
        <div className="w-full max-w-md">
          <Card className="p-8 bg-slate-900/80 border-slate-700/50 backdrop-blur-sm">
            <button
              onClick={() => {
                setAuthMode("select");
                setError(null);
              }}
              className="text-sm text-slate-400 hover:text-white mb-6 flex items-center gap-1 transition-colors"
            >
              ← Back
            </button>

            <div className="text-center mb-6">
              <div className="h-14 w-14 rounded-xl bg-indigo-500 mx-auto mb-3 flex items-center justify-center">
                <Sparkles className="h-7 w-7 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white">Get a login link</h1>
              <p className="text-slate-400 mt-1">
                We'll email you a magic link for instant sign-in
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleMagicLinkLogin} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-slate-300">Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="captain@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-12 h-14 text-lg bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-indigo-500"
                    required
                    autoFocus
                    autoComplete="email"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-14 text-lg bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Sending link...
                  </>
                ) : (
                  <>
                    <Mail className="h-5 w-5 mr-2" />
                    Send login link
                  </>
                )}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  // Password login form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 p-4">
      <div className="w-full max-w-md">
        <Card className="p-8 bg-slate-900/80 border-slate-700/50 backdrop-blur-sm">
          <button
            onClick={() => {
              setAuthMode("select");
              setError(null);
            }}
            className="text-sm text-slate-400 hover:text-white mb-6 flex items-center gap-1 transition-colors"
          >
            ← Back
          </button>

          <div className="text-center mb-6">
            <div className="h-14 w-14 rounded-xl bg-slate-700 mx-auto mb-3 flex items-center justify-center">
              <Lock className="h-7 w-7 text-slate-300" />
            </div>
            <h1 className="text-2xl font-bold text-white">Sign in with password</h1>
            <p className="text-slate-400 mt-1">
              Enter your captain credentials
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-slate-300">Email</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                <Input
                  id="email"
                  type="email"
                  placeholder="captain@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-12 h-14 text-lg bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-indigo-500"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-slate-300">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-12 pr-12 h-14 text-lg bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-indigo-500"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-14 text-lg bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}

export default function CaptainLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950">
        <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
      </div>
    }>
      <CaptainLoginContent />
    </Suspense>
  );
}

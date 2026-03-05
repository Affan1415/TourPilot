import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type UserRole = 'admin' | 'manager' | 'captain' | 'guide' | 'front_desk' | 'customer';

// Define which roles can access which routes
const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  // Admin-only routes
  '/dashboard/tours': ['admin', 'manager'],
  '/dashboard/staff': ['admin', 'manager'],
  '/dashboard/settings': ['admin', 'manager'],
  '/dashboard/reports': ['admin', 'manager'],
  '/dashboard/communications': ['admin', 'manager'],
  '/dashboard/customers': ['admin', 'manager', 'front_desk'],
  '/dashboard/bookings/new': ['admin', 'manager', 'front_desk'],

  // Staff routes (all staff can access)
  '/dashboard': ['admin', 'manager', 'captain', 'guide', 'front_desk'],
  '/dashboard/calendar': ['admin', 'manager', 'captain', 'guide', 'front_desk'],
  '/dashboard/bookings': ['admin', 'manager', 'captain', 'guide', 'front_desk'],
  '/dashboard/manifest': ['admin', 'manager', 'captain', 'guide'],

  // Captain-specific routes
  '/captain': ['captain'],

  // Customer routes
  '/account': ['customer'],
};

function getRoutePermissions(pathname: string): UserRole[] | null {
  // Find the most specific matching route
  const matchingRoutes = Object.keys(ROUTE_PERMISSIONS)
    .filter(route => pathname === route || pathname.startsWith(route + '/'))
    .sort((a, b) => b.length - a.length);

  if (matchingRoutes.length > 0) {
    return ROUTE_PERMISSIONS[matchingRoutes[0]];
  }
  return null;
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Protected routes check
  const isProtectedRoute = pathname.startsWith("/dashboard") ||
    pathname.startsWith("/captain") ||
    pathname.startsWith("/account");

  if (isProtectedRoute) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }

    // Get user role
    let userRole: UserRole | null = null;

    // Check if user is staff
    const { data: staffData } = await supabase
      .from('staff')
      .select('role, is_active')
      .eq('user_id', user.id)
      .single();

    if (staffData && staffData.is_active) {
      userRole = staffData.role as UserRole;
    } else {
      // Check if user is customer
      const { data: customerData } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (customerData) {
        userRole = 'customer';
      }
    }

    // Check route permissions
    const requiredRoles = getRoutePermissions(pathname);

    if (requiredRoles) {
      if (!userRole || !requiredRoles.includes(userRole)) {
        // Redirect to appropriate dashboard based on role
        const url = request.nextUrl.clone();
        if (userRole === 'captain') {
          url.pathname = '/captain';
        } else if (userRole === 'customer') {
          url.pathname = '/account';
        } else if (userRole) {
          url.pathname = '/dashboard';
        } else {
          url.pathname = '/login';
        }
        return NextResponse.redirect(url);
      }
    } else {
      // Generic protected route - allow any authenticated user with a role
      if (!userRole) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        return NextResponse.redirect(url);
      }
    }
  }

  // Auth routes (login, signup, etc.) - redirect based on role if already logged in
  if (
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/forgot-password"
  ) {
    if (user) {
      // Get user role for proper redirect
      const { data: staffData } = await supabase
        .from('staff')
        .select('role, is_active')
        .eq('user_id', user.id)
        .single();

      const url = request.nextUrl.clone();

      if (staffData && staffData.is_active) {
        if (staffData.role === 'captain') {
          url.pathname = '/captain';
        } else {
          url.pathname = '/dashboard';
        }
      } else {
        // Check if customer
        const { data: customerData } = await supabase
          .from('customers')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (customerData) {
          url.pathname = '/account';
        } else {
          // User without role - let them through to signup/login
          return supabaseResponse;
        }
      }

      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

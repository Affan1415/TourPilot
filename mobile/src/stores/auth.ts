import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { Session, User } from "@supabase/supabase-js";

interface StaffProfile {
  id: string;
  user_id: string;
  role: "super_admin" | "admin" | "location_admin" | "staff" | "captain";
  location_id: string | null;
  first_name: string;
  last_name: string;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: StaffProfile | null;
  loading: boolean;
  initialized: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
  fetchProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  loading: false,
  initialized: false,

  initialize: async () => {
    try {
      set({ loading: true });

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        set({ session, user: session.user });
        await get().fetchProfile();
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (_event, session) => {
        set({ session, user: session?.user ?? null });
        if (session) {
          await get().fetchProfile();
        } else {
          set({ profile: null });
        }
      });
    } catch (error) {
      console.error("Auth initialization error:", error);
    } finally {
      set({ loading: false, initialized: true });
    }
  },

  fetchProfile: async () => {
    const { user } = get();
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("staff")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      set({ profile: data });
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  },

  signIn: async (email: string, password: string) => {
    try {
      set({ loading: true });
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    } finally {
      set({ loading: false });
    }
  },

  signOut: async () => {
    try {
      set({ loading: true });
      await supabase.auth.signOut();
      set({ session: null, user: null, profile: null });
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      set({ loading: false });
    }
  },
}));

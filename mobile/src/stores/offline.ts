import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import NetInfo from "@react-native-community/netinfo";

interface ManifestData {
  id: string;
  date: string;
  tour_name: string;
  start_time: string;
  boat_name: string | null;
  capacity: number;
  booked_count: number;
  bookings: {
    id: string;
    booking_reference: string;
    guest_count: number;
    status: string;
    checked_in: boolean;
    notes: string | null;
    customer: {
      first_name: string;
      last_name: string;
      phone: string | null;
    };
    guests: {
      id: string;
      first_name: string;
      last_name: string;
      waiver_signed: boolean;
    }[];
  }[];
}

interface PendingCheckIn {
  booking_id: string;
  checked_in: boolean;
  timestamp: string;
  synced: boolean;
}

interface OfflineState {
  isOnline: boolean;
  lastSyncTime: string | null;
  manifests: ManifestData[];
  pendingCheckIns: PendingCheckIn[];
  isSyncing: boolean;

  // Actions
  setOnlineStatus: (status: boolean) => void;
  downloadTodayManifest: () => Promise<void>;
  checkInBooking: (bookingId: string, checkedIn: boolean) => Promise<void>;
  syncPendingChanges: () => Promise<void>;
  loadCachedData: () => Promise<void>;
  clearCache: () => Promise<void>;
}

const MANIFEST_CACHE_KEY = "@tourpilot_manifests";
const PENDING_CHECKINS_KEY = "@tourpilot_pending_checkins";
const LAST_SYNC_KEY = "@tourpilot_last_sync";

export const useOfflineStore = create<OfflineState>((set, get) => ({
  isOnline: true,
  lastSyncTime: null,
  manifests: [],
  pendingCheckIns: [],
  isSyncing: false,

  setOnlineStatus: (status: boolean) => {
    set({ isOnline: status });
    if (status) {
      get().syncPendingChanges();
    }
  },

  loadCachedData: async () => {
    try {
      const [manifestsJson, pendingJson, lastSync] = await Promise.all([
        AsyncStorage.getItem(MANIFEST_CACHE_KEY),
        AsyncStorage.getItem(PENDING_CHECKINS_KEY),
        AsyncStorage.getItem(LAST_SYNC_KEY),
      ]);

      set({
        manifests: manifestsJson ? JSON.parse(manifestsJson) : [],
        pendingCheckIns: pendingJson ? JSON.parse(pendingJson) : [],
        lastSyncTime: lastSync,
      });
    } catch (error) {
      console.error("Error loading cached data:", error);
    }
  },

  downloadTodayManifest: async () => {
    const { isOnline } = get();
    if (!isOnline) return;

    try {
      set({ isSyncing: true });
      const today = new Date().toISOString().split("T")[0];

      const { data: availabilities, error } = await supabase
        .from("availabilities")
        .select(`
          id,
          date,
          start_time,
          capacity_override,
          booked_count,
          tour:tours(
            name,
            max_capacity
          ),
          boat:boats(name),
          bookings(
            id,
            booking_reference,
            guest_count,
            status,
            checked_in,
            notes,
            customer:customers(
              first_name,
              last_name,
              phone
            ),
            guests:booking_guests(
              id,
              first_name,
              last_name
            ),
            waivers(status)
          )
        `)
        .eq("date", today)
        .in("status", ["available", "full"]);

      if (error) throw error;

      const manifests: ManifestData[] = (availabilities || []).map((a: any) => ({
        id: a.id,
        date: a.date,
        tour_name: a.tour?.name || "Unknown",
        start_time: a.start_time,
        boat_name: a.boat?.name || null,
        capacity: a.capacity_override || a.tour?.max_capacity || 10,
        booked_count: a.booked_count || 0,
        bookings: (a.bookings || []).map((b: any) => ({
          id: b.id,
          booking_reference: b.booking_reference,
          guest_count: b.guest_count,
          status: b.status,
          checked_in: b.checked_in || false,
          notes: b.notes,
          customer: {
            first_name: b.customer?.first_name || "",
            last_name: b.customer?.last_name || "",
            phone: b.customer?.phone || null,
          },
          guests: (b.guests || []).map((g: any) => ({
            id: g.id,
            first_name: g.first_name,
            last_name: g.last_name,
            waiver_signed: b.waivers?.some((w: any) => w.status === "signed") || false,
          })),
        })),
      }));

      // Save to cache
      await AsyncStorage.setItem(MANIFEST_CACHE_KEY, JSON.stringify(manifests));
      const now = new Date().toISOString();
      await AsyncStorage.setItem(LAST_SYNC_KEY, now);

      set({ manifests, lastSyncTime: now });
    } catch (error) {
      console.error("Error downloading manifest:", error);
    } finally {
      set({ isSyncing: false });
    }
  },

  checkInBooking: async (bookingId: string, checkedIn: boolean) => {
    const { manifests, pendingCheckIns, isOnline } = get();

    // Update local state
    const updatedManifests = manifests.map((m) => ({
      ...m,
      bookings: m.bookings.map((b) =>
        b.id === bookingId ? { ...b, checked_in: checkedIn } : b
      ),
    }));

    const newPending: PendingCheckIn = {
      booking_id: bookingId,
      checked_in: checkedIn,
      timestamp: new Date().toISOString(),
      synced: false,
    };

    const updatedPending = [
      ...pendingCheckIns.filter((p) => p.booking_id !== bookingId),
      newPending,
    ];

    set({ manifests: updatedManifests, pendingCheckIns: updatedPending });

    // Save to cache
    await AsyncStorage.setItem(MANIFEST_CACHE_KEY, JSON.stringify(updatedManifests));
    await AsyncStorage.setItem(PENDING_CHECKINS_KEY, JSON.stringify(updatedPending));

    // If online, sync immediately
    if (isOnline) {
      await get().syncPendingChanges();
    }
  },

  syncPendingChanges: async () => {
    const { pendingCheckIns, isOnline } = get();
    if (!isOnline || pendingCheckIns.length === 0) return;

    const unsynced = pendingCheckIns.filter((p) => !p.synced);
    if (unsynced.length === 0) return;

    try {
      set({ isSyncing: true });

      for (const checkIn of unsynced) {
        const { error } = await supabase
          .from("bookings")
          .update({ checked_in: checkIn.checked_in })
          .eq("id", checkIn.booking_id);

        if (!error) {
          checkIn.synced = true;
        }
      }

      // Remove synced items
      const remaining = pendingCheckIns.filter((p) => !p.synced);
      set({ pendingCheckIns: remaining });
      await AsyncStorage.setItem(PENDING_CHECKINS_KEY, JSON.stringify(remaining));
    } catch (error) {
      console.error("Error syncing pending changes:", error);
    } finally {
      set({ isSyncing: false });
    }
  },

  clearCache: async () => {
    await AsyncStorage.multiRemove([
      MANIFEST_CACHE_KEY,
      PENDING_CHECKINS_KEY,
      LAST_SYNC_KEY,
    ]);
    set({ manifests: [], pendingCheckIns: [], lastSyncTime: null });
  },
}));

// Initialize network listener
NetInfo.addEventListener((state) => {
  useOfflineStore.getState().setOnlineStatus(state.isConnected ?? false);
});

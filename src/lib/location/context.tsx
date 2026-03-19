'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Location } from '@/types';
import type { UserRole } from '@/lib/auth/roles';

interface LocationContextType {
  locations: Location[];
  selectedLocation: Location | null;
  setSelectedLocation: (location: Location | null) => void;
  selectLocationById: (id: string) => void;
  isLoading: boolean;
  error: string | null;
  refreshLocations: () => Promise<void>;
  userRole: UserRole | null;
  isLocationRestricted: boolean; // True if user can only see their assigned location
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

const LOCATION_STORAGE_KEY = 'tourpilot_selected_location_id';

interface LocationProviderProps {
  children: React.ReactNode;
}

export function LocationProvider({ children }: LocationProviderProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocationState] = useState<Location | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userLocationId, setUserLocationId] = useState<string | null>(null);

  // Front desk and location managers are restricted to their assigned location only
  // Only admin can see/switch between all locations
  const isLocationRestricted = userRole === 'front_desk' || userRole === 'location_manager';

  const fetchLocations = useCallback(async () => {
    const supabase = createClient();

    try {
      setIsLoading(true);
      setError(null);

      // First, get the current user and their role/location
      const { data: { user } } = await supabase.auth.getUser();

      let staffRole: UserRole | null = null;
      let staffLocationId: string | null = null;

      if (user) {
        const { data: staffData } = await supabase
          .from('staff')
          .select('role, location_id')
          .eq('user_id', user.id)
          .single();

        if (staffData) {
          staffRole = staffData.role as UserRole;
          staffLocationId = staffData.location_id;
          setUserRole(staffRole);
          setUserLocationId(staffLocationId);
        }
      }

      // Fetch locations - for front_desk, only fetch their assigned location
      let query = supabase
        .from('locations')
        .select('*')
        .eq('is_active', true);

      // Front desk and location managers only see their assigned location
      // Only admin can see all locations
      const isRestricted = (staffRole === 'front_desk' || staffRole === 'location_manager') && staffLocationId;

      if (isRestricted) {
        query = query.eq('id', staffLocationId);
      } else {
        query = query
          .order('is_primary', { ascending: false })
          .order('name', { ascending: true });
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const locationData = data as Location[];
      setLocations(locationData);

      // For restricted users (front_desk, location_manager), always use their assigned location
      if (isRestricted && locationData.length > 0) {
        setSelectedLocationState(locationData[0]);
        return;
      }

      // For other roles, restore selected location from localStorage or use primary
      if (mounted) {
        const savedLocationId = localStorage.getItem(LOCATION_STORAGE_KEY);
        const savedLocation = savedLocationId
          ? locationData.find(l => l.id === savedLocationId)
          : null;

        if (savedLocation) {
          setSelectedLocationState(savedLocation);
        } else {
          // Saved location not found (deleted or invalid) - clear stale localStorage
          if (savedLocationId) {
            localStorage.removeItem(LOCATION_STORAGE_KEY);
          }
          // Default to primary location or first location
          const primaryLocation = locationData.find(l => l.is_primary) || locationData[0];
          if (primaryLocation) {
            setSelectedLocationState(primaryLocation);
            localStorage.setItem(LOCATION_STORAGE_KEY, primaryLocation.id);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching locations:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch locations');
    } finally {
      setIsLoading(false);
    }
  }, [mounted]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      fetchLocations();
    }
  }, [mounted, fetchLocations]);

  const setSelectedLocation = useCallback((location: Location | null) => {
    setSelectedLocationState(location);
    if (location) {
      localStorage.setItem(LOCATION_STORAGE_KEY, location.id);
    } else {
      localStorage.removeItem(LOCATION_STORAGE_KEY);
    }
  }, []);

  const selectLocationById = useCallback((id: string) => {
    const location = locations.find(l => l.id === id);
    if (location) {
      setSelectedLocation(location);
    }
  }, [locations, setSelectedLocation]);

  const refreshLocations = useCallback(async () => {
    await fetchLocations();
  }, [fetchLocations]);

  const contextValue: LocationContextType = {
    locations,
    selectedLocation,
    setSelectedLocation,
    selectLocationById,
    isLoading,
    error,
    refreshLocations,
    userRole,
    isLocationRestricted,
  };

  return (
    <LocationContext.Provider value={contextValue}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation(): LocationContextType {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}

export function useSelectedLocationId(): string | null {
  const { selectedLocation } = useLocation();
  return selectedLocation?.id ?? null;
}

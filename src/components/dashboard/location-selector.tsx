'use client';

import { useState } from 'react';
import { Check, ChevronsUpDown, MapPin, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useLocation } from '@/lib/location/context';
import { Badge } from '@/components/ui/badge';

export function LocationSelector() {
  const [open, setOpen] = useState(false);
  const { locations, selectedLocation, setSelectedLocation, isLoading, isLocationRestricted } = useLocation();

  if (isLoading) {
    return (
      <Button
        variant="outline"
        className="w-[200px] justify-between rounded-xl border-border"
        disabled
      >
        <span className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          <span className="text-muted-foreground">Loading...</span>
        </span>
      </Button>
    );
  }

  if (locations.length === 0) {
    return null;
  }

  // For front_desk users, show location as read-only (no dropdown)
  if (isLocationRestricted) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm rounded-xl border border-border bg-muted/30">
        <MapPin className="h-4 w-4 text-primary shrink-0" />
        <span className="truncate font-medium">
          {selectedLocation?.name || 'No location assigned'}
        </span>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between rounded-xl border-border hover:border-primary hover:bg-muted/50 transition-all"
        >
          <span className="flex items-center gap-2 truncate">
            <MapPin className="h-4 w-4 text-primary shrink-0" />
            <span className="truncate">
              {selectedLocation?.name || 'Select location'}
            </span>
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0 rounded-xl" align="start">
        <Command>
          <CommandInput placeholder="Search locations..." className="h-10" />
          <CommandList>
            <CommandEmpty>No location found.</CommandEmpty>
            <CommandGroup heading="Locations">
              {locations.map((location) => (
                <CommandItem
                  key={location.id}
                  value={location.name}
                  onSelect={() => {
                    setSelectedLocation(location);
                    setOpen(false);
                  }}
                  className="flex items-center gap-2 py-2.5 cursor-pointer"
                >
                  <Check
                    className={cn(
                      'h-4 w-4',
                      selectedLocation?.id === location.id
                        ? 'opacity-100 text-primary'
                        : 'opacity-0'
                    )}
                  />
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{location.name}</span>
                      {location.is_primary && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                          Primary
                        </Badge>
                      )}
                    </div>
                    {(location.city || location.state) && (
                      <span className="text-xs text-muted-foreground truncate">
                        {[location.city, location.state].filter(Boolean).join(', ')}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

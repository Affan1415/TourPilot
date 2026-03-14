'use client';

import { useI18n } from '@/lib/i18n/context';
import { Locale, localeNames, localeFlags } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe } from 'lucide-react';

interface LanguageSwitcherProps {
  variant?: 'default' | 'minimal';
  showFlag?: boolean;
  showLabel?: boolean;
}

export function LanguageSwitcher({
  variant = 'default',
  showFlag = true,
  showLabel = true,
}: LanguageSwitcherProps) {
  const { locale, setLocale, locales } = useI18n();

  if (variant === 'minimal') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Globe className="h-4 w-4" />
            <span className="sr-only">Change language</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {locales.map((loc) => (
            <DropdownMenuItem
              key={loc}
              onClick={() => setLocale(loc)}
              className={locale === loc ? 'bg-accent' : ''}
            >
              {showFlag && <span className="mr-2">{localeFlags[loc]}</span>}
              {localeNames[loc]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          {showFlag && <span>{localeFlags[locale]}</span>}
          {showLabel && <span>{localeNames[locale]}</span>}
          <Globe className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => setLocale(loc)}
            className={locale === loc ? 'bg-accent' : ''}
          >
            {showFlag && <span className="mr-2">{localeFlags[loc]}</span>}
            {localeNames[loc]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Inline language toggle for settings pages
export function LanguageToggle() {
  const { locale, setLocale, locales } = useI18n();

  return (
    <div className="flex items-center gap-1 rounded-lg border bg-muted/50 p-1">
      {locales.map((loc) => (
        <button
          key={loc}
          onClick={() => setLocale(loc)}
          className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            locale === loc
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>{localeFlags[loc]}</span>
          <span>{localeNames[loc]}</span>
        </button>
      ))}
    </div>
  );
}

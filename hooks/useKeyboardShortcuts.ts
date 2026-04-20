import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';

/**
 * Global keyboard shortcuts (web only).
 * ? → help overlay (alert for now)
 * / → focus search
 * n → new application (in ledger context)
 * 1-4 → switch tabs
 */
export function useKeyboardShortcuts() {
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    function handleKeyDown(e: KeyboardEvent) {
      // Ignore if user is typing in an input
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      // Ignore if modifier keys are held (except shift for ?)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      switch (e.key) {
        case '?':
          e.preventDefault();
          alert(
            'Keyboard Shortcuts\n\n' +
            '?  — Show this help\n' +
            '/  — Focus search\n' +
            'n  — New application\n' +
            '1  — Discover tab\n' +
            '2  — Vault tab\n' +
            '3  — Intelligence tab\n' +
            '4  — Settings tab',
          );
          break;
        case '/':
          e.preventDefault();
          // Focus the first search input on the page
          const searchInput = document.querySelector<HTMLInputElement>(
            'input[placeholder*="Search"], input[placeholder*="search"]',
          );
          searchInput?.focus();
          break;
        case 'n':
          e.preventDefault();
          router.push('/(tabs)/intelligence/add' as any);
          break;
        case '1':
          e.preventDefault();
          router.push('/(tabs)/discover' as any);
          break;
        case '2':
          e.preventDefault();
          router.push('/(tabs)/portfolio' as any);
          break;
        case '3':
          e.preventDefault();
          router.push('/(tabs)/intelligence' as any);
          break;
        case '4':
          e.preventDefault();
          router.push('/(tabs)/settings' as any);
          break;
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [router]);
}

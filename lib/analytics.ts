import { Platform } from 'react-native';

// PostHog analytics — lightweight wrapper
// Install: expo install posthog-react-native
// Until installed, all calls are no-ops.

let _posthog: any = null;

async function getPostHog() {
  if (_posthog) return _posthog;
  try {
    const { PostHog } = await import('posthog-react-native');
    const key = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '';
    if (!key) return null;
    _posthog = new PostHog(key, {
      host: process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
      disabled: __DEV__,
    });
    return _posthog;
  } catch {
    return null;
  }
}

export async function capture(event: string, properties?: Record<string, unknown>) {
  const ph = await getPostHog();
  ph?.capture(event, { platform: Platform.OS, ...properties });
}

export async function identify(userId: string, traits?: Record<string, unknown>) {
  const ph = await getPostHog();
  ph?.identify(userId, traits);
}

export async function reset() {
  const ph = await getPostHog();
  ph?.reset();
}

// Named events
export const Events = {
  QUIZ_STARTED: 'quiz_started',
  QUIZ_COMPLETED: 'quiz_completed',
  SEARCH_PERFORMED: 'search_performed',
  APPLY_TAPPED: 'apply_tapped',
  CARD_ADDED: 'card_added',
  CARD_REMOVED: 'card_removed',
  BENEFIT_MARKED_USED: 'benefit_marked_used',
  BENEFIT_SNOOZED: 'benefit_snoozed',
  PAYWALL_SHOWN: 'paywall_shown',
  UPGRADE_TAPPED: 'upgrade_tapped',
} as const;

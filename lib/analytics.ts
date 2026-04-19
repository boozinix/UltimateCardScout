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

// Exactly 10 events — do not add others without updating AGENT_HANDOFF.md
export const Events = {
  APP_OPEN: 'app_open',
  QUIZ_START: 'quiz_start',
  QUIZ_COMPLETE: 'quiz_complete',
  CALCULATOR_USED: 'calculator_used',
  SIGNUP: 'signup',
  CARD_ADDED: 'card_added',
  PAYWALL_VIEWED: 'paywall_viewed',
  TRIAL_STARTED: 'trial_started',
  SUBSCRIPTION_CREATED: 'subscription_created',
  CHURN: 'churn',
} as const;

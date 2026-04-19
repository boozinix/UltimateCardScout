import { useState, useEffect } from 'react';
import { Dimensions } from 'react-native';
import { useBreakpointOverride, ForcedMode } from '@/contexts/BreakpointContext';

export function useBreakpoint() {
  const [width, setWidth] = useState(Dimensions.get('window').width);
  const { forcedMode } = useBreakpointOverride();

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => setWidth(window.width));
    return () => sub.remove();
  }, []);

  const effectiveIsDesktop =
    forcedMode === 'desktop' ? true
    : forcedMode === 'mobile' ? false
    : width >= 1024;

  return {
    isDesktop: effectiveIsDesktop,
    isTablet: forcedMode === 'auto' ? width >= 768 && width < 1024 : false,
    isMobile: !effectiveIsDesktop,
    width,
    forcedMode,
  };
}

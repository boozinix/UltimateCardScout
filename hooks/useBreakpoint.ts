import { useState, useEffect } from 'react';
import { Dimensions } from 'react-native';

export function useBreakpoint() {
  const [width, setWidth] = useState(Dimensions.get('window').width);

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => setWidth(window.width));
    return () => sub.remove();
  }, []);

  return {
    isDesktop: width >= 1024,
    isTablet: width >= 768 && width < 1024,
    isMobile: width < 768,
    width,
  };
}

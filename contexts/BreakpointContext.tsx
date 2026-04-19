import { createContext, useContext, useState, ReactNode } from 'react';

export type ForcedMode = 'auto' | 'mobile' | 'desktop';

interface BreakpointContextValue {
  forcedMode: ForcedMode;
  setForcedMode: (mode: ForcedMode) => void;
}

const BreakpointContext = createContext<BreakpointContextValue>({
  forcedMode: 'auto',
  setForcedMode: () => {},
});

export function BreakpointProvider({ children }: { children: ReactNode }) {
  const [forcedMode, setForcedMode] = useState<ForcedMode>('auto');
  return (
    <BreakpointContext.Provider value={{ forcedMode, setForcedMode }}>
      {children}
    </BreakpointContext.Provider>
  );
}

export function useBreakpointOverride() {
  return useContext(BreakpointContext);
}

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

// ---------------------------------------------------------------------------
// Types – mirrors the backend ValidationResult / ValidationCheck shapes
// ---------------------------------------------------------------------------

export interface ValidationCheck {
  check: string;
  passed: boolean;
  path?: string;
  error?: string;
}

export interface ValidationResult {
  valid: boolean;
  toolName: string;
  outputContentType: string;
  checks: ValidationCheck[];
  summary: { passed: number; failed: number };
  timestamp: string;
  /** Client-side metadata added when storing into context */
  capabilityName?: string;
  executionTimeMs?: number;
}

interface ValidationContextValue {
  /** All validation results accumulated during this session. */
  results: ValidationResult[];
  /** Push a new result into the session store. */
  addResult: (result: ValidationResult) => void;
  /** Remove all stored results. */
  clearResults: () => void;
}

// ---------------------------------------------------------------------------
// Context + Provider
// ---------------------------------------------------------------------------

const ValidationContext = createContext<ValidationContextValue | null>(null);

export function ValidationProvider({ children }: { children: ReactNode }) {
  const [results, setResults] = useState<ValidationResult[]>([]);

  const addResult = useCallback((result: ValidationResult) => {
    setResults((prev) => {
      const filtered = prev.filter((r) => r.toolName !== result.toolName);
      return [...filtered, result];
    });
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
  }, []);

  return (
    <ValidationContext.Provider value={{ results, addResult, clearResults }}>
      {children}
    </ValidationContext.Provider>
  );
}

/**
 * Hook to access the validation session store.
 * Must be used inside a `<ValidationProvider>`.
 */
export function useValidation(): ValidationContextValue {
  const ctx = useContext(ValidationContext);
  if (!ctx) {
    throw new Error('useValidation must be used within a <ValidationProvider>');
  }
  return ctx;
}

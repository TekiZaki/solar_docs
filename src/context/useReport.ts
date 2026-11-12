// ---
// Summary:
// - Purpose: Custom React hook to consume solar report context
// - Role: Consumer hook
// - Depends on: src/context/reportContextInstance.ts
// - Key Responsibilities: Provide typed access to ReportContext with boundary check
// - Notes: Satisfies react(only-export-components) linter standard
// ---

import { useContext } from 'react';
import { ReportContext, type ReportContextType } from './reportContextInstance';

export const useReport = (): ReportContextType => {
  const context = useContext(ReportContext);
  if (!context) {
    throw new Error('useReport must be used within a ReportProvider');
  }
  return context;
};

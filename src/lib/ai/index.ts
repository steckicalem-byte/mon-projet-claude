import { demoProvider } from './demoProvider';
import { createHttpProvider } from './httpProvider';
import type { AIProvider } from './types';

export * from './types';

const apiUrl = import.meta.env.VITE_AI_API_URL?.trim();

/** Fournisseur actif : HTTP si VITE_AI_API_URL est défini, sinon démonstration. */
export const aiProvider: AIProvider = apiUrl ? createHttpProvider(apiUrl) : demoProvider;

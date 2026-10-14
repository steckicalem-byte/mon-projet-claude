export type StudyTask = 'summary' | 'flashcards' | 'quiz';

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Contrat d'un fournisseur d'assistant d'étude.
 * Pour brancher une vraie IA, implémentez cette interface (voir httpProvider.ts).
 */
export interface AIProvider {
  readonly id: string;
  readonly label: string;
  /** true si aucune IA réelle n'est utilisée */
  readonly isDemo: boolean;
  chat(history: AIMessage[]): Promise<string>;
  generate(task: StudyTask, sourceText: string): Promise<string>;
}

export const TASK_LABEL: Record<StudyTask, string> = {
  summary: 'Résumé',
  flashcards: 'Fiche de révision',
  quiz: 'Quiz',
};

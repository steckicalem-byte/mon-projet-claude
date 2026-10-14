export type Priority = 'low' | 'medium' | 'high';
export type AssignmentStatus = 'todo' | 'done';

export interface Assignment {
  id: string;
  title: string;
  subject: string;
  description: string;
  priority: Priority;
  /** Date limite au format AAAA-MM-JJ */
  dueDate: string;
  status: AssignmentStatus;
  createdAt: string;
  completedAt: string | null;
}

export interface StudySession {
  id: string;
  subject: string;
  topic: string;
  /** Jour au format AAAA-MM-JJ */
  date: string;
  /** Heure de début HH:MM */
  startTime: string;
  durationMinutes: number;
  done: boolean;
  createdAt: string;
  completedAt: string | null;
}

export interface Note {
  id: string;
  title: string;
  subject: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export type Theme = 'dark' | 'light';

export interface Preferences {
  studentName: string;
  email: string;
  theme: Theme;
  notifications: {
    /** Rappels dans l'application (toasts) pour les échéances proches */
    inAppReminders: boolean;
    /** Notifications du navigateur (nécessite l'autorisation) */
    browserNotifications: boolean;
    /** Nombre de jours avant l'échéance pour déclencher un rappel */
    reminderDaysBefore: number;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

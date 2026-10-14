import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Assignment, ChatMessage, Note, Preferences, StudySession } from '@/types';
import { createRepository, type Repository } from '@/lib/storage';
import { uid } from '@/lib/id';

export const DEFAULT_PREFERENCES: Preferences = {
  studentName: '',
  email: '',
  theme: 'dark',
  notifications: { inAppReminders: true, browserNotifications: false, reminderDaysBefore: 1 },
};

const isArray = (v: unknown): v is never[] => Array.isArray(v);
const isObject = (v: unknown): v is Preferences => typeof v === 'object' && v !== null && !Array.isArray(v);

const repos = {
  assignments: createRepository<Assignment[]>('assignments', [], isArray),
  sessions: createRepository<StudySession[]>('sessions', [], isArray),
  notes: createRepository<Note[]>('notes', [], isArray),
  preferences: createRepository<Preferences>('preferences', DEFAULT_PREFERENCES, isObject),
  chat: createRepository<ChatMessage[]>('chat', [], isArray),
};

/** État React synchronisé avec un Repository. */
function usePersisted<T>(repo: Repository<T>): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => repo.load());
  useEffect(() => {
    repo.save(value);
  }, [repo, value]);
  return [value, setValue];
}

export type AssignmentInput = Pick<Assignment, 'title' | 'subject' | 'description' | 'priority' | 'dueDate'>;
export type SessionInput = Pick<StudySession, 'subject' | 'topic' | 'date' | 'startTime' | 'durationMinutes'>;
export type NoteInput = Pick<Note, 'title' | 'subject' | 'content'>;

interface Store {
  assignments: Assignment[];
  addAssignment: (input: AssignmentInput) => Assignment;
  updateAssignment: (id: string, input: Partial<AssignmentInput>) => void;
  toggleAssignment: (id: string) => void;
  deleteAssignment: (id: string) => Assignment | undefined;
  restoreAssignment: (a: Assignment) => void;

  sessions: StudySession[];
  addSession: (input: SessionInput) => StudySession;
  updateSession: (id: string, input: Partial<SessionInput>) => void;
  toggleSession: (id: string) => void;
  deleteSession: (id: string) => StudySession | undefined;
  restoreSession: (s: StudySession) => void;

  notes: Note[];
  addNote: (input: NoteInput) => Note;
  updateNote: (id: string, input: Partial<NoteInput>) => void;
  deleteNote: (id: string) => Note | undefined;
  restoreNote: (n: Note) => void;

  preferences: Preferences;
  updatePreferences: (patch: Partial<Preferences>) => void;

  chat: ChatMessage[];
  setChat: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [assignments, setAssignments] = usePersisted(repos.assignments);
  const [sessions, setSessions] = usePersisted(repos.sessions);
  const [notes, setNotes] = usePersisted(repos.notes);
  const [rawPrefs, setPreferences] = usePersisted(repos.preferences);
  const [chat, setChat] = usePersisted(repos.chat);

  // Fusion avec les valeurs par défaut (robustesse si le format évolue).
  const preferences = useMemo<Preferences>(
    () => ({
      ...DEFAULT_PREFERENCES,
      ...rawPrefs,
      notifications: { ...DEFAULT_PREFERENCES.notifications, ...(rawPrefs.notifications ?? {}) },
    }),
    [rawPrefs],
  );

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', preferences.theme === 'dark');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', preferences.theme === 'dark' ? '#07070c' : '#f6f6fb');
  }, [preferences.theme]);

  const now = () => new Date().toISOString();

  // --- Devoirs
  const addAssignment = useCallback((input: AssignmentInput) => {
    const a: Assignment = { ...input, id: uid(), status: 'todo', createdAt: now(), completedAt: null };
    setAssignments((list) => [a, ...list]);
    return a;
  }, [setAssignments]);
  const updateAssignment = useCallback((id: string, input: Partial<AssignmentInput>) => {
    setAssignments((list) => list.map((a) => (a.id === id ? { ...a, ...input } : a)));
  }, [setAssignments]);
  const toggleAssignment = useCallback((id: string) => {
    setAssignments((list) =>
      list.map((a) =>
        a.id === id
          ? a.status === 'done'
            ? { ...a, status: 'todo', completedAt: null }
            : { ...a, status: 'done', completedAt: now() }
          : a,
      ),
    );
  }, [setAssignments]);
  const deleteAssignment = useCallback((id: string) => {
    const found = assignments.find((a) => a.id === id);
    setAssignments((list) => list.filter((a) => a.id !== id));
    return found;
  }, [assignments, setAssignments]);
  const restoreAssignment = useCallback((a: Assignment) => setAssignments((list) => [a, ...list]), [setAssignments]);

  // --- Sessions
  const addSession = useCallback((input: SessionInput) => {
    const s: StudySession = { ...input, id: uid(), done: false, createdAt: now(), completedAt: null };
    setSessions((list) => [...list, s]);
    return s;
  }, [setSessions]);
  const updateSession = useCallback((id: string, input: Partial<SessionInput>) => {
    setSessions((list) => list.map((s) => (s.id === id ? { ...s, ...input } : s)));
  }, [setSessions]);
  const toggleSession = useCallback((id: string) => {
    setSessions((list) =>
      list.map((s) => (s.id === id ? { ...s, done: !s.done, completedAt: s.done ? null : now() } : s)),
    );
  }, [setSessions]);
  const deleteSession = useCallback((id: string) => {
    const found = sessions.find((s) => s.id === id);
    setSessions((list) => list.filter((s) => s.id !== id));
    return found;
  }, [sessions, setSessions]);
  const restoreSession = useCallback((s: StudySession) => setSessions((list) => [...list, s]), [setSessions]);

  // --- Notes
  const addNote = useCallback((input: NoteInput) => {
    const t = now();
    const n: Note = { ...input, id: uid(), createdAt: t, updatedAt: t };
    setNotes((list) => [n, ...list]);
    return n;
  }, [setNotes]);
  const updateNote = useCallback((id: string, input: Partial<NoteInput>) => {
    setNotes((list) => list.map((n) => (n.id === id ? { ...n, ...input, updatedAt: now() } : n)));
  }, [setNotes]);
  const deleteNote = useCallback((id: string) => {
    const found = notes.find((n) => n.id === id);
    setNotes((list) => list.filter((n) => n.id !== id));
    return found;
  }, [notes, setNotes]);
  const restoreNote = useCallback((n: Note) => setNotes((list) => [n, ...list]), [setNotes]);

  const updatePreferences = useCallback((patch: Partial<Preferences>) => {
    setPreferences((p) => ({ ...p, ...patch }));
  }, [setPreferences]);

  const value = useMemo<Store>(
    () => ({
      assignments, addAssignment, updateAssignment, toggleAssignment, deleteAssignment, restoreAssignment,
      sessions, addSession, updateSession, toggleSession, deleteSession, restoreSession,
      notes, addNote, updateNote, deleteNote, restoreNote,
      preferences, updatePreferences,
      chat, setChat,
    }),
    [
      assignments, addAssignment, updateAssignment, toggleAssignment, deleteAssignment, restoreAssignment,
      sessions, addSession, updateSession, toggleSession, deleteSession, restoreSession,
      notes, addNote, updateNote, deleteNote, restoreNote,
      preferences, updatePreferences, chat, setChat,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore doit être utilisé dans StoreProvider');
  return ctx;
}

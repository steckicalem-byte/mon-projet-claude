import { useEffect, useRef } from 'react';
import { useStore } from '@/context/StoreContext';
import { useToast } from '@/context/ToastContext';
import { daysUntil } from './dates';

/**
 * Au chargement de l'application, rappelle les devoirs en retard ou proches de
 * leur échéance (une seule fois par session de navigation).
 */
export function useDeadlineReminders() {
  const { assignments, preferences } = useStore();
  const { notify } = useToast();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    try {
      if (sessionStorage.getItem('studymate:reminded')) return;
      sessionStorage.setItem('studymate:reminded', '1');
    } catch {
      /* ignore */
    }

    const { inAppReminders, browserNotifications, reminderDaysBefore } = preferences.notifications;
    const pending = assignments.filter((a) => a.status === 'todo');
    const overdue = pending.filter((a) => daysUntil(a.dueDate) < 0).length;
    const soon = pending.filter((a) => {
      const d = daysUntil(a.dueDate);
      return d >= 0 && d <= reminderDaysBefore;
    }).length;
    if (!overdue && !soon) return;

    const parts: string[] = [];
    if (overdue) parts.push(`${overdue} devoir${overdue > 1 ? 's' : ''} en retard`);
    if (soon) parts.push(`${soon} échéance${soon > 1 ? 's' : ''} proche${soon > 1 ? 's' : ''}`);
    const message = parts.join(' · ');

    if (inAppReminders) notify(message, 'info');
    if (browserNotifications && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('StudyMate AI', { body: message, icon: '/favicon.svg' });
      } catch {
        /* certains navigateurs mobiles exigent un service worker */
      }
    }
  }, [assignments, preferences.notifications, notify]);
}

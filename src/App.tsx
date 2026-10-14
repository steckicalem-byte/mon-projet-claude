import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { StoreProvider } from '@/context/StoreContext';
import { ToastProvider } from '@/context/ToastContext';
import { Layout } from '@/components/layout/Layout';
import { DashboardPage } from '@/pages/DashboardPage';
import { AssignmentsPage } from '@/pages/AssignmentsPage';
import { PlanningPage } from '@/pages/PlanningPage';
import { NotesPage } from '@/pages/NotesPage';
import { AssistantPage } from '@/pages/AssistantPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <StoreProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<DashboardPage />} />
              <Route path="devoirs" element={<AssignmentsPage />} />
              <Route path="planning" element={<PlanningPage />} />
              <Route path="notes" element={<NotesPage />} />
              <Route path="assistant" element={<AssistantPage />} />
              <Route path="parametres" element={<SettingsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </StoreProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

import { BrowserRouter, HashRouter, Route, Routes } from 'react-router-dom';
import { PrefsProvider } from '@/context/PrefsContext';
import { DataProvider } from '@/context/DataContext';
import { ToastProvider } from '@/context/ToastContext';
import { Layout } from '@/components/layout/Layout';
import { DashboardPage } from '@/pages/DashboardPage';
import { MatchesPage } from '@/pages/MatchesPage';
import { MatchPage } from '@/pages/MatchPage';
import { TeamsPage } from '@/pages/TeamsPage';
import { PerformancePage } from '@/pages/PerformancePage';
import { SettingsPage } from '@/pages/SettingsPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

// En mode fichier unique (aperçu hébergé sans serveur), les routes passent par le # de l'URL.
const Router = import.meta.env.MODE === 'artifact' ? HashRouter : BrowserRouter;

export default function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <PrefsProvider>
          <DataProvider>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<DashboardPage />} />
                <Route path="matchs" element={<MatchesPage />} />
                <Route path="match/:id" element={<MatchPage />} />
                <Route path="equipes" element={<TeamsPage />} />
                <Route path="performance" element={<PerformancePage />} />
                <Route path="parametres" element={<SettingsPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </DataProvider>
        </PrefsProvider>
      </ToastProvider>
    </Router>
  );
}

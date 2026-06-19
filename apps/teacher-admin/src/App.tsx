/**
 * Root App: router + AppShell.
 * Sprint 1: 4 route — Today, Profile, NewYear, Backup.
 */

import { HashRouter, Routes, Route } from "react-router-dom";
import { AppShell } from "./shared/layout/AppShell";
import { TodayPage } from "./routes/TodayPage";
import { ProfilePage } from "./modules/profile/ProfilePage";
import { BackupPage } from "./modules/backup/BackupPage";
import { NewYearWizard } from "./modules/new-year/NewYearWizard";

export function App() {
  return (
    <HashRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<TodayPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/new-year" element={<NewYearWizard />} />
          <Route path="/backup" element={<BackupPage />} />
          <Route path="*" element={<TodayPage />} />
        </Routes>
      </AppShell>
    </HashRouter>
  );
}

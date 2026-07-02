import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './lib/auth'
import { TeamLayout } from './components/TeamLayout'
import { Login } from './routes/Login'
import { BoardPage } from './routes/BoardPage'
import { RequestDetailPage } from './routes/RequestDetailPage'
import { RequestBuilderPage } from './routes/RequestBuilderPage'
import { TeamPage } from './routes/TeamPage'
import { RemindersPage } from './routes/RemindersPage'
import { ActivityPage } from './routes/ActivityPage'
import { ResetPassword } from './routes/ResetPassword'
import { WizardPage } from './routes/WizardPage'
import { TemplatesPage } from './routes/TemplatesPage'
import { ClientsPage } from './routes/ClientsPage'
import { ClientPortal } from './routes/ClientPortal'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <FullScreenMessage text="Loading…" />
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}

export function FullScreenMessage({ text }: { text: string }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6f6a7a', fontSize: 18 }}>
      {text}
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      {/* Public client portal — no team auth, no chrome */}
      <Route path="/c/:token" element={<ClientPortal />} />
      <Route path="/login" element={<Login />} />
      <Route path="/reset" element={<ResetPassword />} />

      {/* Team app */}
      <Route
        element={
          <RequireAuth>
            <TeamLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<BoardPage />} />
        <Route path="/requests/new" element={<WizardPage />} />
        <Route path="/requests/:id" element={<RequestDetailPage />} />
        <Route path="/requests/:id/edit" element={<RequestBuilderPage />} />
        <Route path="/templates" element={<TemplatesPage />} />
        <Route path="/clients" element={<ClientsPage />} />
        <Route path="/team" element={<TeamPage />} />
        <Route path="/reminders" element={<RemindersPage />} />
        <Route path="/activity" element={<ActivityPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

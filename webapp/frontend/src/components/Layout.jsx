import { Outlet } from 'react-router-dom'
import AppShell from './layout/AppShell'
import OnboardingTour from './OnboardingTour'

export default function Layout() {
  return (
    <AppShell>
      <OnboardingTour />
      <Outlet />
    </AppShell>
  )
}

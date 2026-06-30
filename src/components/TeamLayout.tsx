import { Outlet } from 'react-router-dom'
import { TopChrome } from './TopChrome'
import { C } from '../theme'

export function TeamLayout() {
  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column' }}>
      <TopChrome />
      <Outlet />
    </div>
  )
}

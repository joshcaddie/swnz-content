import { Outlet } from 'react-router-dom'
import { TopChrome } from './TopChrome'
import { C } from '../theme'

export function TeamLayout() {
  return (
    // zoom 0.8 shrinks the whole team app ~20% so all board columns fit on a laptop
    // screen without horizontal scrolling. The client portal is untouched.
    <div style={{ minHeight: 'calc(100vh / 0.8)', background: C.bg, display: 'flex', flexDirection: 'column', zoom: 0.8 }}>
      <TopChrome />
      <Outlet />
    </div>
  )
}

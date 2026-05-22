import { useEffect, useState } from 'react'
import { MapPage } from './pages/MapPage'
import { AdminPage } from './pages/AdminPage'

function currentRoute(): 'admin' | 'map' {
  return window.location.pathname.startsWith('/admin') ? 'admin' : 'map'
}

export default function App() {
  const [route, setRoute] = useState(currentRoute)

  useEffect(() => {
    const onPop = () => setRoute(currentRoute())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  return route === 'admin' ? <AdminPage /> : <MapPage />
}

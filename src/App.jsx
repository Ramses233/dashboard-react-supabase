// src/App.jsx
import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabase'
import Layout from './componentes/layout'
import Login from './componentes/login'
import Registro from './componentes/registro'
import Camara from './componentes/camara'
import Recibidos from './componentes/recibidos'
import Perfil from './componentes/perfil'
import Dashboard from './componentes/dashboard'

function App() {
  const [usuario, setUsuario] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    // 1. ¿Ya había una sesión abierta?
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUsuario(session?.user ?? null)
      setCargando(false)
    })

    // 2. Escuchar cuando alguien entra o sale
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_evento, session) => setUsuario(session?.user ?? null)
    )
    return () => subscription.unsubscribe()
  }, [])

  if (cargando) {
    return (
      <div className="pantalla-carga">
        <div className="spinner-border" role="status" />
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={usuario ? <Navigate to="/camara" /> : <Login />} />
        <Route path="/registro" element={usuario ? <Navigate to="/camara" /> : <Registro />} />

        {/* Rutas privadas: comparten la barra inferior (Layout) */}
        <Route element={usuario ? <Layout usuario={usuario} /> : <Navigate to="/login" />}>
          <Route path="/camara" element={<Camara />} />
          <Route path="/recibidos" element={<Recibidos />} />
          <Route path="/perfil" element={<Perfil />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Route>

        <Route path="*" element={<Navigate to="/camara" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

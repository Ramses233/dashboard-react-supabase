// src/componentes/layout/index.jsx
import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { supabase } from '../../supabase'
import { IconoCamara, IconoBandeja, IconoPerfil, IconoPanel } from './iconos'

function Layout({ usuario }) {
  const [rol, setRol] = useState(null)
  const [nuevos, setNuevos] = useState(0)
  const { pathname } = useLocation()

  // Rol: decide si se muestra la pestaña del dashboard (la seguridad real la pone RLS)
  useEffect(() => {
    supabase
      .from('usuario')
      .select('rol')
      .eq('id', usuario.id)
      .single()
      .then(({ data }) => setRol(data?.rol ?? null))
  }, [usuario.id])

  // Snaps sin abrir: se recalcula al cambiar de pantalla y cada 20 segundos
  useEffect(() => {
    const contar = () =>
      supabase.rpc('mis_snaps').then(({ data }) =>
        setNuevos((data ?? []).filter((s) => !s.visto_en).length)
      )
    contar()
    const t = setInterval(contar, 20000)
    return () => clearInterval(t)
  }, [pathname])

  const clase = ({ isActive }) => 'nav-inf-item' + (isActive ? ' activo' : '')

  return (
    <>
      <Outlet context={{ usuario, rol }} />

      <nav className="nav-inferior">
        <NavLink to="/camara" className={clase}>
          <IconoCamara />
          <span>Cámara</span>
        </NavLink>
        <NavLink to="/recibidos" className={clase}>
          <span className="position-relative">
            <IconoBandeja />
            {nuevos > 0 && <span className="insignia-nuevos">{nuevos}</span>}
          </span>
          <span>Recibidos</span>
        </NavLink>
        <NavLink to="/perfil" className={clase}>
          <IconoPerfil />
          <span>Perfil</span>
        </NavLink>
        {rol === 'admin' && (
          <NavLink to="/dashboard" className={clase}>
            <IconoPanel />
            <span>Panel</span>
          </NavLink>
        )}
      </nav>
    </>
  )
}

export default Layout

// src/componentes/dashboard/index.jsx
// CRUD de admin: indicadores, gráficas, edición y borrado de usuarios, fotos y snaps.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, borrarFoto } from '../../supabase'

function Dashboard() {
  const [usuarios, setUsuarios] = useState([])
  const [snaps, setSnaps] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [cargando, setCargando] = useState(true)
  const [aviso, setAviso] = useState(null)
  const navigate = useNavigate()

  // 1. Solo entra el admin
  useEffect(() => {
    async function verificarYCargar() {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: yo } = await supabase
        .from('usuario').select('rol').eq('id', user.id).single()

      if (yo?.rol !== 'admin') {
        navigate('/perfil')
        return
      }
      await cargarDatos()
      setCargando(false)
    }
    verificarYCargar()
  }, [])

  // 2. Usuarios con sus fotos (join por llave foránea) y todos los snaps
  const cargarDatos = async () => {
    const [u, s] = await Promise.all([
      supabase
        .from('usuario')
        .select('id, nombre, correo, telefono, rol, creado_en, multimedia(id, url)')
        .order('creado_en', { ascending: false }),
      supabase
        .from('snap')
        .select('id, segundos, creado_en, visto_en, remitente:usuario!remitente_id(nombre), destinatario:usuario!destinatario_id(nombre)')
        .order('creado_en', { ascending: false })
        .limit(100),
    ])
    if (u.data) setUsuarios(u.data)
    if (s.data) setSnaps(s.data)
  }

  // 3. Indicadores calculados con los datos que ya tenemos
  const totalFotos = usuarios.reduce((suma, u) => suma + u.multimedia.length, 0)
  const admins = usuarios.filter((u) => u.rol === 'admin').length
  const vistos = snaps.filter((s) => s.visto_en).length
  const haceUnaSemana = Date.now() - 7 * 24 * 60 * 60 * 1000
  const nuevos = usuarios.filter((u) => new Date(u.creado_en) > haceUnaSemana).length
  const maxFotos = Math.max(1, ...usuarios.map((u) => u.multimedia.length))

  const enviadosPor = snaps.reduce((acc, s) => {
    const n = s.remitente?.nombre ?? '—'
    acc[n] = (acc[n] ?? 0) + 1
    return acc
  }, {})
  const maxEnviados = Math.max(1, ...Object.values(enviadosPor))

  const indicadores = [
    ['Usuarios', usuarios.length],
    ['Administradores', admins],
    ['Fotos', totalFotos],
    ['Snaps enviados', snaps.length],
    ['Snaps vistos', vistos],
    ['Nuevos (7 días)', nuevos],
  ]

  const filtrados = usuarios.filter((u) =>
    `${u.nombre} ${u.correo}`.toLowerCase().includes(busqueda.toLowerCase())
  )

  // 4. Editar y borrar (RLS lo permite porque somos admin)
  const cambiarCampo = (id, campo, valor) =>
    setUsuarios(usuarios.map((u) => (u.id === id ? { ...u, [campo]: valor } : u)))

  const guardar = async (u) => {
    const { error } = await supabase
      .from('usuario')
      .update({ nombre: u.nombre, telefono: u.telefono })
      .eq('id', u.id)
    setAviso(error
      ? { tipo: 'danger', texto: 'No se pudo guardar' }
      : { tipo: 'success', texto: `Guardado: ${u.nombre}` })
  }

  const borrarImagen = async (img) => {
    const { error } = await borrarFoto(img)
    if (!error) cargarDatos()
  }

  const borrarSnap = async (id) => {
    const { error } = await supabase.from('snap').delete().eq('id', id)
    if (!error) setSnaps(snaps.filter((s) => s.id !== id))
  }

  const eliminarUsuario = async (u) => {
    if (!window.confirm(`¿Eliminar a ${u.nombre} con todas sus fotos y snaps? No se puede deshacer.`)) return
    const { error } = await supabase.rpc('admin_eliminar_usuario', { p_id: u.id })
    if (error) setAviso({ tipo: 'danger', texto: error.message })
    else {
      setAviso({ tipo: 'success', texto: `Usuario eliminado: ${u.nombre}` })
      cargarDatos()
    }
  }

  if (cargando) return <p className="p-4">Cargando...</p>

  return (
    <div className="container contenido py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3 mb-0">Dashboard</h1>
        <button className="btn btn-outline-secondary" onClick={() => navigate('/perfil')}>
          Mi perfil
        </button>
      </div>

      {aviso && (
        <div className={`alert alert-${aviso.tipo} alert-dismissible`}>
          {aviso.texto}
          <button type="button" className="btn-close" onClick={() => setAviso(null)} />
        </div>
      )}

      <div className="row g-3 mb-4">
        {indicadores.map(([titulo, valor]) => (
          <div className="col-6 col-md-2" key={titulo}>
            <div className="card text-center h-100">
              <div className="card-body">
                <div className="text-muted small">{titulo}</div>
                <div className="fs-2 fw-bold">{valor}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-body">
              <h2 className="h5">Fotos por usuario</h2>
              {usuarios.map((u) => (
                <div className="d-flex align-items-center gap-2 mb-2" key={u.id}>
                  <span className="w-25 text-truncate">{u.nombre}</span>
                  <div className="progress flex-grow-1">
                    <div className="progress-bar"
                      style={{ width: `${(u.multimedia.length / maxFotos) * 100}%` }}>
                      {u.multimedia.length}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-body">
              <h2 className="h5">Snaps enviados por usuario</h2>
              {Object.entries(enviadosPor).length === 0 && (
                <p className="text-muted mb-0">Sin snaps todavía.</p>
              )}
              {Object.entries(enviadosPor).map(([nombre, n]) => (
                <div className="d-flex align-items-center gap-2 mb-2" key={nombre}>
                  <span className="w-25 text-truncate">{nombre}</span>
                  <div className="progress flex-grow-1">
                    <div className="progress-bar bg-warning text-dark"
                      style={{ width: `${(n / maxEnviados) * 100}%` }}>{n}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center gap-3">
            <h2 className="h5 mb-0">Usuarios</h2>
            <input className="form-control w-auto" placeholder="Buscar por nombre o correo"
              value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>
          <div className="table-responsive">
            <table className="table table-hover align-middle mt-3">
              <thead>
                <tr>
                  <th>Nombre</th><th>Correo</th><th>Teléfono</th>
                  <th>Rol</th><th>Fotos</th><th></th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <input className="form-control form-control-sm"
                        value={u.nombre}
                        onChange={(e) => cambiarCampo(u.id, 'nombre', e.target.value)} />
                    </td>
                    <td>{u.correo}</td>
                    <td>
                      <input className="form-control form-control-sm"
                        value={u.telefono ?? ''}
                        onChange={(e) => cambiarCampo(u.id, 'telefono', e.target.value)} />
                    </td>
                    <td>
                      <span className={`badge ${u.rol === 'admin' ? 'text-bg-warning' : 'text-bg-primary'}`}>
                        {u.rol}
                      </span>
                    </td>
                    <td>
                      {u.multimedia.map((img) => (
                        <img key={img.id} src={img.url} alt="" width="40" height="40"
                          title="Clic para borrar" role="button"
                          className="rounded object-fit-cover me-1"
                          onClick={() => borrarImagen(img)} />
                      ))}
                    </td>
                    <td className="text-nowrap">
                      <button className="btn btn-sm btn-snap me-1" onClick={() => guardar(u)}>
                        Guardar
                      </button>
                      <button className="btn btn-sm btn-outline-danger"
                        onClick={() => eliminarUsuario(u)}>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h2 className="h5">Snaps recientes</h2>
          <div className="table-responsive">
            <table className="table table-sm align-middle">
              <thead>
                <tr><th>De</th><th>Para</th><th>Tiempo</th><th>Estado</th><th>Fecha</th><th></th></tr>
              </thead>
              <tbody>
                {snaps.map((s) => (
                  <tr key={s.id}>
                    <td>{s.remitente?.nombre}</td>
                    <td>{s.destinatario?.nombre}</td>
                    <td>{s.segundos} s</td>
                    <td>
                      <span className={`badge ${s.visto_en ? 'text-bg-secondary' : 'text-bg-warning'}`}>
                        {s.visto_en ? 'Visto' : 'Pendiente'}
                      </span>
                    </td>
                    <td className="small">{new Date(s.creado_en).toLocaleString()}</td>
                    <td>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => borrarSnap(s.id)}>
                        Borrar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard

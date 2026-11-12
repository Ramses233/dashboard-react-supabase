// src/componentes/perfil/index.jsx
// CRUD de usuario: ver/editar mis datos, subir/borrar mis fotos y retirar mis envíos.
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { supabase, subirFoto, borrarFoto } from '../../supabase'

function Perfil() {
  const { usuario } = useOutletContext()
  const [perfil, setPerfil] = useState(null)
  const [imagenes, setImagenes] = useState([])
  const [envios, setEnvios] = useState([])
  const [aviso, setAviso] = useState(null)
  const [subiendo, setSubiendo] = useState(false)
  const inputRef = useRef(null)
  const navigate = useNavigate()

  const mostrar = (tipo, texto) => setAviso({ tipo, texto })

  const cargarImagenes = async () => {
    const { data } = await supabase
      .from('multimedia')
      .select('*')
      .eq('usuario_id', usuario.id)
      .order('creado_en', { ascending: false })
    setImagenes(data ?? [])
  }

  const cargarEnvios = async () => {
    const { data } = await supabase.rpc('mis_envios')
    setEnvios(data ?? [])
  }

  useEffect(() => {
    async function cargar() {
      const { data } = await supabase.from('usuario').select('*').eq('id', usuario.id).single()
      setPerfil(data)
      cargarImagenes()
      cargarEnvios()
    }
    cargar()
  }, [usuario.id])

  const handleChange = (e) => setPerfil({ ...perfil, [e.target.name]: e.target.value })

  // UPDATE (no se envía el rol: aunque se enviara, el trigger proteger_rol lo rechaza)
  const guardar = async () => {
    const { error } = await supabase
      .from('usuario')
      .update({
        nombre: perfil.nombre,
        fecha_nacimiento: perfil.fecha_nacimiento || null,
        telefono: perfil.telefono,
      })
      .eq('id', perfil.id)
    if (error) mostrar('danger', 'No se pudo guardar')
    else mostrar('success', 'Datos actualizados')
  }

  // CREATE: subir una foto de la galería a mi carpeta
  const agregarImagen = async (e) => {
    const archivo = e.target.files?.[0]
    e.target.value = ''
    if (!archivo) return
    setSubiendo(true)
    try {
      await subirFoto(archivo, usuario.id)
      await cargarImagenes()
    } catch (err) {
      mostrar('danger', err.message ?? 'No se pudo subir la foto')
    }
    setSubiendo(false)
  }

  // DELETE: borra el archivo y la fila (los snaps que la usaban caen por cascade)
  const borrarImagen = async (img) => {
    const { error } = await borrarFoto(img)
    if (error) mostrar('danger', 'No se pudo eliminar')
    else {
      setImagenes(imagenes.filter((i) => i.id !== img.id))
      cargarEnvios()
    }
  }

  const retirarEnvio = async (id) => {
    const { error } = await supabase.from('snap').delete().eq('id', id)
    if (!error) setEnvios(envios.filter((e) => e.id !== id))
  }

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  if (!perfil) return <p className="p-4">Cargando...</p>

  return (
    <div className="container contenido py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="h4 mb-0">Hola, {perfil.nombre}</h1>
        <div className="d-flex gap-2">
          {perfil.rol === 'admin' && (
            <button className="btn btn-snap btn-sm" onClick={() => navigate('/dashboard')}>
              Ir al dashboard
            </button>
          )}
          <button className="btn btn-outline-secondary btn-sm" onClick={cerrarSesion}>
            Cerrar sesión
          </button>
        </div>
      </div>

      {aviso && (
        <div className={`alert alert-${aviso.tipo} alert-dismissible`}>
          {aviso.texto}
          <button type="button" className="btn-close" onClick={() => setAviso(null)} />
        </div>
      )}

      <div className="card mb-4">
        <div className="card-body row g-3">
          <div className="col-md-6">
            <label className="form-label">Nombre</label>
            <input className="form-control" name="nombre"
              value={perfil.nombre} onChange={handleChange} />
          </div>
          <div className="col-md-6">
            <label className="form-label">Correo</label>
            <input className="form-control" value={perfil.correo} disabled />
          </div>
          <div className="col-md-6">
            <label className="form-label">Fecha de nacimiento</label>
            <input className="form-control" type="date" name="fecha_nacimiento"
              value={perfil.fecha_nacimiento ?? ''} onChange={handleChange} />
          </div>
          <div className="col-md-6">
            <label className="form-label">Teléfono</label>
            <input className="form-control" name="telefono"
              value={perfil.telefono ?? ''} onChange={handleChange} />
          </div>
          <div className="col-12">
            <button className="btn btn-snap" onClick={guardar}>Guardar cambios</button>
          </div>
        </div>
      </div>

      <div className="d-flex justify-content-between align-items-center mb-2">
        <h2 className="h5 mb-0">Mis fotos</h2>
        <button className="btn btn-outline-dark btn-sm" disabled={subiendo}
          onClick={() => inputRef.current?.click()}>
          {subiendo ? 'Subiendo...' : 'Subir foto'}
        </button>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp"
          hidden onChange={agregarImagen} />
      </div>
      {imagenes.length === 0 && (
        <p className="text-body-secondary">Todavía no tienes fotos. Toma una en la pestaña Cámara.</p>
      )}
      <div className="row row-cols-2 row-cols-md-3 g-3 mb-4">
        {imagenes.map((img) => (
          <div className="col" key={img.id}>
            <div className="card h-100">
              <img src={img.url} className="card-img-top miniatura" alt="" />
              <div className="card-body p-2">
                <button className="btn btn-sm btn-outline-danger w-100"
                  onClick={() => borrarImagen(img)}>Eliminar</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <h2 className="h5">Snaps enviados</h2>
      {envios.length === 0 && <p className="text-body-secondary">No has enviado snaps.</p>}
      <ul className="list-group">
        {envios.map((e) => (
          <li key={e.id} className="list-group-item d-flex align-items-center gap-2">
            <span className="flex-grow-1">
              Para <strong>{e.destinatario}</strong>
              <span className="small text-body-secondary"> · {e.segundos} s</span>
            </span>
            <span className={`badge ${e.visto_en ? 'text-bg-secondary' : 'text-bg-warning'}`}>
              {e.visto_en ? 'Visto' : 'Pendiente'}
            </span>
            <button className="btn btn-sm btn-outline-danger" onClick={() => retirarEnvio(e.id)}>
              Retirar
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default Perfil

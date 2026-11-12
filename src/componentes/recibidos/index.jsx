// src/componentes/recibidos/index.jsx
// Bandeja de entrada: los snaps se abren UNA vez y se cierran solos al acabar el tiempo.
import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'

const hace = (fecha) => {
  const min = Math.floor((Date.now() - new Date(fecha).getTime()) / 60000)
  if (min < 1) return 'ahora'
  if (min < 60) return `hace ${min} min`
  if (min < 1440) return `hace ${Math.floor(min / 60)} h`
  return `hace ${Math.floor(min / 1440)} d`
}

// Pantalla completa con cuenta regresiva
function Visor({ url, segundos, remitente, onCerrar }) {
  const [restante, setRestante] = useState(segundos)
  const [lista, setLista] = useState(false)     // el tiempo corre cuando la foto ya cargó
  const [fallo, setFallo] = useState(false)

  useEffect(() => {
    if (!lista) return
    const t = setInterval(() => setRestante((r) => r - 1), 1000)
    return () => clearInterval(t)
  }, [lista])

  useEffect(() => {
    if (lista && restante <= 0) onCerrar()
  }, [lista, restante, onCerrar])

  return (
    <div className="visor">
      {!fallo && (
        <img src={url} alt="Snap" onLoad={() => setLista(true)} onError={() => setFallo(true)} />
      )}
      {fallo && (
        <div className="text-white text-center p-4 m-auto">
          No se pudo cargar la foto.
        </div>
      )}

      <div className="progress visor-progreso">
        <div className="progress-bar bg-warning"
          style={{ width: `${Math.max(0, (restante / segundos) * 100)}%` }} />
      </div>
      <div className="visor-info">
        <span>{remitente}</span>
        <button className="btn btn-sm btn-light" onClick={onCerrar}>
          {fallo ? 'Cerrar' : `${Math.max(restante, 0)} s · Cerrar`}
        </button>
      </div>
    </div>
  )
}

function Recibidos() {
  const [snaps, setSnaps] = useState([])
  const [cargando, setCargando] = useState(true)
  const [abierto, setAbierto] = useState(null)
  const [error, setError] = useState(null)

  const cargar = async () => {
    const { data, error } = await supabase.rpc('mis_snaps')
    if (error) setError(error.message)
    else setSnaps(data ?? [])
    setCargando(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  const abrir = async (s) => {
    setError(null)
    const { data, error } = await supabase.rpc('abrir_snap', { p_snap: s.id })
    if (error) {
      setError('Ese snap ya se vio o ya no existe')
      cargar()
      return
    }
    const fila = Array.isArray(data) ? data[0] : data
    setAbierto({ url: fila.url, segundos: fila.segundos, remitente: s.remitente })
  }

  const cerrar = () => {
    setAbierto(null)
    cargar()
  }

  if (cargando) return <p className="p-4">Cargando...</p>

  return (
    <div className="container contenido py-3">
      <h1 className="h4 mb-3">Recibidos</h1>
      {error && <div className="alert alert-warning">{error}</div>}

      {snaps.length === 0 && (
        <p className="text-body-secondary">Aún no tienes snaps. Pide a un amigo que te envíe uno.</p>
      )}

      <div className="list-group">
        {snaps.map((s) => (
          <button key={s.id}
            className="list-group-item list-group-item-action d-flex align-items-center gap-3"
            disabled={!!s.visto_en} onClick={() => abrir(s)}>
            <span className={`cuadro-snap ${s.visto_en ? 'abierto' : 'nuevo'}`} />
            <span className="flex-grow-1 text-start">
              <span className="d-block fw-semibold">{s.remitente}</span>
              <span className="small text-body-secondary">
                {s.visto_en ? 'Abierto' : 'Toca para ver'} · {hace(s.creado_en)}
              </span>
            </span>
            <span className="badge text-bg-light">{s.segundos} s</span>
          </button>
        ))}
      </div>

      {abierto && <Visor {...abierto} onCerrar={cerrar} />}
    </div>
  )
}

export default Recibidos

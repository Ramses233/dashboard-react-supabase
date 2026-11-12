// src/componentes/camara/index.jsx
// Pantalla principal (como en Snapchat): abre la cámara, toma la foto y la envía con temporizador.
import { useEffect, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase, subirFoto } from '../../supabase'
import { IconoCambiar, IconoGaleria, IconoCerrar } from '../layout/iconos'

// Reduce la foto (los celulares dan 4-8 MB; el bucket acepta hasta 5 MB)
async function reducir(blob, max = 1280) {
  const img = await createImageBitmap(blob)
  const escala = Math.min(1, max / Math.max(img.width, img.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * escala)
  canvas.height = Math.round(img.height * escala)
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
  return new Promise((ok) => canvas.toBlob(ok, 'image/jpeg', 0.82))
}

function Camara() {
  const { usuario } = useOutletContext()
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const inputCamaraRef = useRef(null)
  const inputGaleriaRef = useRef(null)

  const [frente, setFrente] = useState(true)          // true = cámara frontal (selfie)
  const [sinCamara, setSinCamara] = useState(false)
  const [foto, setFoto] = useState(null)               // { blob, url }
  const [segundos, setSegundos] = useState(5)
  const [busqueda, setBusqueda] = useState('')
  const [contactos, setContactos] = useState([])
  const [seleccion, setSeleccion] = useState([])
  const [enviando, setEnviando] = useState(false)
  const [aviso, setAviso] = useState(null)             // { tipo, texto }

  const detener = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  // Encender la cámara mientras NO haya una foto en pantalla
  useEffect(() => {
    if (foto) return
    let cancelado = false
    async function iniciar() {
      detener()
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: frente ? 'user' : 'environment' },
          audio: false,
        })
        if (cancelado) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
        setSinCamara(false)
      } catch {
        setSinCamara(true) // sin permiso, sin cámara o sin https: queda el plan B (input file)
      }
    }
    iniciar()
    return () => {
      cancelado = true
      detener()
    }
  }, [frente, foto])

  // Buscar contactos cuando hay una foto lista para enviar
  useEffect(() => {
    if (!foto) return
    const t = setTimeout(async () => {
      const { data } = await supabase.rpc('buscar_usuarios', { p_texto: busqueda.trim() })
      setContactos(data ?? [])
    }, 250)
    return () => clearTimeout(t)
  }, [foto, busqueda])

  // Mensajes que desaparecen solos
  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(null), 3000)
    return () => clearTimeout(t)
  }, [aviso])

  const tomarFoto = async () => {
    const v = videoRef.current
    if (!v || !v.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = v.videoWidth
    canvas.height = v.videoHeight
    const ctx = canvas.getContext('2d')
    if (frente) {                       // la selfie se ve como espejo
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(v, 0, 0)
    const crudo = await new Promise((ok) => canvas.toBlob(ok, 'image/jpeg', 0.9))
    const blob = await reducir(crudo)
    setFoto({ blob, url: URL.createObjectURL(blob) })
  }

  const desdeArchivo = async (e) => {
    const archivo = e.target.files?.[0]
    e.target.value = ''
    if (!archivo) return
    try {
      const blob = await reducir(archivo)
      setFoto({ blob, url: URL.createObjectURL(blob) })
    } catch {
      setAviso({ tipo: 'danger', texto: 'No se pudo leer esa imagen' })
    }
  }

  const descartar = () => {
    if (foto) URL.revokeObjectURL(foto.url)
    setFoto(null)
    setSeleccion([])
    setBusqueda('')
  }

  const alternar = (id) =>
    setSeleccion((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  const enviar = async () => {
    if (seleccion.length === 0) {
      setAviso({ tipo: 'warning', texto: 'Elige al menos un destinatario' })
      return
    }
    setEnviando(true)
    try {
      const multimedia = await subirFoto(foto.blob, usuario.id)   // storage + tabla multimedia
      const { error } = await supabase.from('snap').insert(
        seleccion.map((destinatario_id) => ({
          remitente_id: usuario.id,
          destinatario_id,
          multimedia_id: multimedia.id,
          segundos,
        }))
      )
      if (error) throw error
      descartar()
      setAviso({ tipo: 'success', texto: '¡Snap enviado!' })
    } catch (err) {
      setAviso({ tipo: 'danger', texto: err.message ?? 'No se pudo enviar' })
    }
    setEnviando(false)
  }

  return (
    <div className="camara">
      {/* ---------- Vista previa de la cámara ---------- */}
      {!foto && (
        <>
          {!sinCamara ? (
            <video ref={videoRef} autoPlay playsInline muted
              className={frente ? 'espejo' : ''} />
          ) : (
            <div className="sin-camara text-center text-white p-4">
              <p className="mb-3">No pudimos abrir la cámara del navegador.<br />Usa la del teléfono o elige una foto.</p>
              <button className="btn btn-snap" onClick={() => inputCamaraRef.current?.click()}>
                Abrir cámara del teléfono
              </button>
            </div>
          )}

          <div className="camara-superior">
            <span className="marca">Picaboo</span>
            {!sinCamara && (
              <button className="btn-icono" onClick={() => setFrente(!frente)} aria-label="Cambiar cámara">
                <IconoCambiar />
              </button>
            )}
          </div>

          <div className="camara-inferior">
            <button className="btn-icono" onClick={() => inputGaleriaRef.current?.click()} aria-label="Galería">
              <IconoGaleria />
            </button>
            <button className="obturador" onClick={sinCamara ? () => inputCamaraRef.current?.click() : tomarFoto}
              aria-label="Tomar foto" />
            <span style={{ width: 44 }} />
          </div>
        </>
      )}

      {/* ---------- Foto tomada: elegir tiempo y destinatarios ---------- */}
      {foto && (
        <>
          <img src={foto.url} alt="Tu foto" className="vista-foto" />
          <div className="camara-superior">
            <button className="btn-icono" onClick={descartar} aria-label="Descartar">
              <IconoCerrar />
            </button>
          </div>

          <div className="panel-envio card shadow">
            <div className="card-body">
              <label className="form-label d-flex justify-content-between mb-1">
                <span>Se verá durante</span>
                <strong>{segundos} s</strong>
              </label>
              <input type="range" className="form-range" min="1" max="10" step="1"
                value={segundos} onChange={(e) => setSegundos(Number(e.target.value))} />

              <input className="form-control form-control-sm my-2" placeholder="Buscar amigos"
                value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />

              <div className="list-group lista-contactos mb-2">
                {contactos.length === 0 && (
                  <div className="list-group-item text-body-secondary small">Sin resultados</div>
                )}
                {contactos.map((c) => (
                  <label key={c.id} className="list-group-item d-flex gap-2 align-items-center">
                    <input type="checkbox" className="form-check-input mt-0"
                      checked={seleccion.includes(c.id)} onChange={() => alternar(c.id)} />
                    {c.nombre}
                  </label>
                ))}
              </div>

              <button className="btn btn-snap w-100" onClick={enviar} disabled={enviando}>
                {enviando ? 'Enviando...' : `Enviar${seleccion.length ? ` (${seleccion.length})` : ''}`}
              </button>
            </div>
          </div>
        </>
      )}

      {aviso && (
        <div className={`alert alert-${aviso.tipo} aviso-flotante`}>{aviso.texto}</div>
      )}

      {/* Plan B y galería: abren la cámara o las fotos del teléfono */}
      <input ref={inputCamaraRef} type="file" accept="image/*" capture="environment"
        hidden onChange={desdeArchivo} />
      <input ref={inputGaleriaRef} type="file" accept="image/*"
        hidden onChange={desdeArchivo} />
    </div>
  )
}

export default Camara

// src/componentes/registro/index.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../supabase'

function Registro() {
  const [form, setForm] = useState({
    nombre: '', correo: '', password: '', fecha_nacimiento: '', telefono: '',
  })
  const [mensaje, setMensaje] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const navigate = useNavigate()

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value })

  const handleRegistro = async (e) => {
    e.preventDefault()
    setEnviando(true)
    setMensaje(null)
    const { data, error } = await supabase.auth.signUp({
      email: form.correo,
      password: form.password,
      // Estos datos los lee el trigger y crea la fila en "usuario"
      options: {
        data: {
          nombre: form.nombre,
          fecha_nacimiento: form.fecha_nacimiento,
          telefono: form.telefono,
        },
      },
    })
    setEnviando(false)
    if (error) setMensaje({ tipo: 'danger', texto: error.message })
    else if (data.session) navigate('/camara') // si "Confirm email" está apagado, ya hay sesión
    else setMensaje({ tipo: 'info', texto: 'Cuenta creada. Confirma tu correo y luego inicia sesión.' })
  }

  return (
    <div className="portada">
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-md-5">
            <div className="card shadow-sm">
              <div className="card-body p-4">
                <h2 className="h4 mb-3">Crear cuenta</h2>
                <form onSubmit={handleRegistro} className="d-grid gap-2">
                  <input className="form-control" name="nombre"
                    placeholder="Nombre" value={form.nombre}
                    onChange={handleChange} required />
                  <input className="form-control" name="correo" type="email"
                    placeholder="Correo" value={form.correo}
                    onChange={handleChange} required />
                  <input className="form-control" name="password"
                    type="password" placeholder="Contraseña (mínimo 6)"
                    minLength={6} value={form.password} onChange={handleChange} required />
                  <input className="form-control" name="fecha_nacimiento"
                    type="date" value={form.fecha_nacimiento}
                    onChange={handleChange} />
                  <input className="form-control" name="telefono"
                    placeholder="Teléfono" value={form.telefono}
                    onChange={handleChange} />
                  <button className="btn btn-snap" disabled={enviando}>
                    {enviando ? 'Creando...' : 'Registrarme'}
                  </button>
                </form>
                {mensaje && <div className={`alert alert-${mensaje.tipo} mt-3 mb-0`}>{mensaje.texto}</div>}
                <button className="btn btn-link px-0 mt-2"
                  onClick={() => navigate('/login')}>
                  Ya tengo cuenta
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Registro

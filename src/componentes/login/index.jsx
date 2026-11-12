// src/componentes/login/index.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../supabase'

function Login() {
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setEnviando(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({
      email: correo,
      password,
    })
    setEnviando(false)
    if (error) setError('Correo o contraseña no válidos')
    else navigate('/camara')
  }

  return (
    <div className="portada">
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-md-5">
            <div className="text-center mb-4">
              <img src="/icono.svg" alt="" width="88" height="88" className="rounded-4 shadow-sm" />
              <h1 className="h3 fw-bold mt-3 mb-0">Picaboo</h1>
              <p className="text-body-secondary">Fotos que se desvanecen</p>
            </div>
            <div className="card shadow-sm">
              <div className="card-body p-4">
                <h2 className="h4 mb-3">Iniciar sesión</h2>
                <form onSubmit={handleLogin} className="d-grid gap-2">
                  <input className="form-control" type="email"
                    placeholder="Correo" value={correo}
                    onChange={(e) => setCorreo(e.target.value)} required />
                  <input className="form-control" type="password"
                    placeholder="Contraseña" value={password}
                    onChange={(e) => setPassword(e.target.value)} required />
                  <button className="btn btn-snap" disabled={enviando}>
                    {enviando ? 'Entrando...' : 'Entrar'}
                  </button>
                </form>
                {error && <div className="alert alert-danger mt-3 mb-0">{error}</div>}
                <button className="btn btn-link px-0 mt-2"
                  onClick={() => navigate('/registro')}>
                  ¿No tienes cuenta? Regístrate
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login

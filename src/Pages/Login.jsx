import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/Register.css'

export default function Login() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    correo: '',
    contraseña: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    })
    // Limpiar error cuando el usuario empiece a escribir
    if (error) setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validación básica
    if (!form.correo || !form.contraseña) {
      setError('Por favor completa todos los campos')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Hacer la petición al backend
      const response = await fetch('http://localhost:8000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          correo: form.correo,
          contraseña: form.contraseña
        })
      })

      const data = await response.json()

      if (response.ok) {
        // Login exitoso
        console.log('Login exitoso:', data)
        
        // Guardar datos del usuario en localStorage
        localStorage.setItem('user', JSON.stringify(data.user))
        localStorage.setItem('user_id', data.user.user_id) // Guardar user_id separado para fácil acceso
        
        // Redirigir a Hero
        navigate('/hero')
      } else {
        // Error en el login
        setError(data.detail || 'Error al iniciar sesión')
      }
    } catch (error) {
      console.error('Error:', error)
      setError('Error de conexión con el servidor. Verifica que el backend esté corriendo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="register-container">
      <div className="register-card">
        <h1 className="title">Login</h1>
        <p className="subtitle">Ingresa tus credenciales</p>

        {error && (
          <div style={{
            backgroundColor: '#fee',
            color: '#c33',
            padding: '10px',
            borderRadius: '5px',
            marginBottom: '15px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Correo</label>
            <input
              type="email"
              name="correo"
              value={form.correo}
              onChange={handleChange}
              placeholder="tu@email.com"
              disabled={loading}
              required
            />
          </div>

          <div className="input-group">
            <label>Contraseña</label>
            <input
              type="password"
              name="contraseña"
              value={form.contraseña}
              onChange={handleChange}
              placeholder="••••••••"
              disabled={loading}
              required
            />
          </div>

          <button 
            className="register-btn" 
            type="submit"
            disabled={loading}
          >
            {loading ? 'Iniciando...' : 'Iniciar Sesión'}
          </button>
        </form>

        <p className="login-text">
          ¿No tienes cuenta?{' '}
          <span
            className="login-link"
            onClick={() => navigate('/')}
          >
            Regístrate
          </span>
        </p>
      </div>
    </div>
  )
}
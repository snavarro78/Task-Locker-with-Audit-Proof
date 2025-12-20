import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/Register.css'

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: ''
  })

  const [error, setError] = useState('')

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    // 🔒 VALIDACIONES
    if (!form.name || !form.email || !form.password) {
      setError('⚠️ Todos los campos son obligatorios')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(form.email)) {
      setError('📧 Ingresa un correo electrónico válido')
      return
    }

    if (form.password.length < 6) {
      setError('🔐 La contraseña debe tener al menos 6 caracteres')
      return
    }

    setError('')
    console.log(form)

    // 👉 REDIRECCIÓN AL HERO
    navigate('/hero')
  }

  return (
    <div className="register-container">
      <div className="register-card">
        <h1 className="title">Create Account</h1>
        <p className="subtitle">Secure your identity in the digital future</p>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Name</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Your full name"
              required
            />
          </div>

          <div className="input-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="example@domain.com"
              required
            />
          </div>

          <div className="input-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Minimum 6 characters"
              required
            />
          </div>

          {error && <p className="error-text">{error}</p>}

          <button className="register-btn">Register</button>
        </form>

        <p className="login-text">
          ¿Ya tienes una cuenta?{' '}
          <span
            className="login-link"
            onClick={() => navigate('/login')}
          >
            Inicia sesión
          </span>
        </p>
      </div>
    </div>
  )
}



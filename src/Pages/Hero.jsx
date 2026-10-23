import { useNavigate } from 'react-router-dom'
import '../styles/Hero.css'

export default function Hero() {
  const navigate = useNavigate()

  return (
    <div className="hero">
      {/* NAVBAR */}
      <nav className="navbar">
        <div className="logo">
          <span className="dot" />
          <span>Hashlog</span>
        </div>

        <button className="btn-outline">Contact us</button>
      </nav>

      {/* HERO CONTENT */}
      <div className="hero-content">
        <img src="/Logo.png" className="hero-image" />


        <h1>
          La mejor herramienta para <span>evitar plagio.</span>
        </h1>

        <button
          className="btn-primary"
          onClick={() => navigate('/locker')}
        >
          Discover our solution
        </button>
      </div>
    </div>
  )
}


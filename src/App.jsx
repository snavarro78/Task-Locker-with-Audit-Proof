import { Routes, Route } from 'react-router-dom'
import Hero from './Pages/Hero'
import Locker from './Pages/Locker'
import Register from './Pages/Register'
import Login from './Pages/Login'


function App() {
  return (
    <Routes>
      <Route path="/" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/hero" element={<Hero />} />
      <Route path="/locker" element={<Locker />} />
      
      
    </Routes>
  )
}

export default App






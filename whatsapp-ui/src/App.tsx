
import './App.css'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Chat from './pages/Chat'
import ChatWhatsApp from './pages/ChatWhatsApp'

function App() {

  return (
    <BrowserRouter>
    <Routes>
      <Route path="/" element={<Login/>} />
      <Route path="/register" element={<Register/>} />
      <Route path="/chat" element={<ChatWhatsApp/>} />
      <Route path="/chat-old" element={<Chat/>} />

    </Routes>
      </BrowserRouter>
  )
}

export default App

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './components/Home'
import Balance from './components/Balance'
import Transaction from './components/Transaction'
import Block from './components/Block'
import './index.css'

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
        <Route path="/" element={<Home />}>
          <Route path="balance" element={<Balance />} />
          <Route path="tx" element={<Transaction />} />
          <Route path="bloque" element={<Block />} />
        </Route>
    </Routes>
  </BrowserRouter>
)

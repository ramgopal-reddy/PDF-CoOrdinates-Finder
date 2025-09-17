import './App.css'
import CoOrdinates from './pages/CoOrdinates'
// import Home from './pages/Home'
import { BrowserRouter, Routes, Route } from 'react-router-dom'


function App() {

  return (
    <>
      <BrowserRouter>
        <Routes>
          {/* <Route path='/' element={<Home />} /> */}
          <Route path='/' element={<CoOrdinates />} />
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App

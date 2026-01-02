import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import AppRouter from './app/AppRouter'
import { ThemeProvider } from './app/theme/ThemeContext'

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App

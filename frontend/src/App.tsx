import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import AppRouter from './app/AppRouter'
import { ToastProvider } from './components/global/ToastProvider'
 
const App: React.FC = () => {
  return (
      <ToastProvider>
        <BrowserRouter>
          <AppRouter />
        </BrowserRouter>
      </ToastProvider>
   )
 }
 
export default App

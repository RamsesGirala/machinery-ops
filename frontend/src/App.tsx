import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import AppRouter from './app/AppRouter'
import { ThemeProvider } from './app/theme/ThemeContext'
import { ToastProvider } from './components/global/ToastProvider'
 
const App: React.FC = () => {
  return (
     <ThemeProvider>
       <ToastProvider>
         <BrowserRouter>
           <AppRouter />
         </BrowserRouter>
       </ToastProvider>
     </ThemeProvider>
   )
 }
 
export default App

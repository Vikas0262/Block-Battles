import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { UserProvider } from './context/UserContext.tsx'

// Suppress harmless Chrome extension message port errors
window.addEventListener('error', (event) => {
  if (event.message?.includes('The message port closed before a response was received')) {
    event.preventDefault();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <UserProvider>
      <App />
    </UserProvider>
  </StrictMode>,
)

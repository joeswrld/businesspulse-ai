import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './styles/hcaptcha.css'

// Initialize error handler early to catch all console errors
import { errorHandler } from './utils/errorHandler'

// Log application startup
errorHandler.logNoteX('Application starting...')

createRoot(document.getElementById("root")!).render(<App />);

import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './features/auth/context/AuthContext.jsx';
import { InternProvider } from './features/intern/context/internContext';
import App from './app/App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AuthProvider>
      <InternProvider>
        <App />
      </InternProvider>
    </AuthProvider>
  </BrowserRouter>
);
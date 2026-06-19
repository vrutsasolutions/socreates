import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';

import App from './App';
import './index.css';
import './styles/design-tokens.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider
      clientId="143175221285-r60bduti3khrb7570b7a254i7vk45198.apps.googleusercontent.com"
    >
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>
);
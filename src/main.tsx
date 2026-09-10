import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { BoothAuthProvider } from './auth/Provider';
createRoot(document.getElementById('root')!).render(<React.StrictMode><BoothAuthProvider><App/></BoothAuthProvider></React.StrictMode>);

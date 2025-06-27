import React from 'react';
import ReactDOM from 'react-dom/client';
import './App.css';
import App from './App';

// Configuración global para desarrollo
if (process.env.NODE_ENV === 'development') {
  // Mostrar warnings de React en desarrollo
  console.log('🚀 Minimarket ML System - Modo Desarrollo');
  console.log('📡 Backend esperado en: http://localhost:8000');
  console.log('🌐 Frontend corriendo en: http://localhost:3000');
}

// Manejo global de errores no capturados
window.addEventListener('unhandledrejection', event => {
  console.error('Error no manejado:', event.reason);
  
  // Solo mostrar al usuario errores críticos en producción
  if (process.env.NODE_ENV === 'production') {
    // Aquí podrías enviar el error a un servicio de monitoreo
    console.error('Error crítico:', event.reason);
  }
});

// Crear root de React 18
const root = ReactDOM.createRoot(document.getElementById('root'));

// Renderizar aplicación
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Registrar service worker en producción (opcional)
if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}
// src/components/ErrorBoundary.js
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Actualiza el state para mostrar la UI de error
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Puedes registrar el error en un servicio de reporte de errores
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      // UI personalizada de error
      return (
        <div className="error-boundary">
          <div className="card" style={{ margin: '2rem', padding: '2rem', textAlign: 'center' }}>
            <h2>¡Oops! Algo salió mal</h2>
            <p>Ha ocurrido un error inesperado en la aplicación.</p>
            
            <div style={{ margin: '1rem 0' }}>
              <button 
                className="btn btn-primary"
                onClick={() => window.location.reload()}
              >
                Recargar Página
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => window.location.href = '/'}
                style={{ marginLeft: '1rem' }}
              >
                Ir al Dashboard
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details style={{ marginTop: '2rem', textAlign: 'left' }}>
                <summary>Detalles del error (solo en desarrollo)</summary>
                <pre style={{ 
                  background: '#f5f5f5', 
                  padding: '1rem', 
                  borderRadius: '4px',
                  fontSize: '12px',
                  overflow: 'auto',
                  maxHeight: '300px'
                }}>
                  {this.state.error && this.state.error.toString()}
                  <br />
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
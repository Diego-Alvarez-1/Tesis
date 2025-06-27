import React, { useState, useEffect, useCallback } from 'react';
import { 
  analyticsAPI, 
  salesAPI,
  dailySummaryAPI,
  formatCurrency,
  showAlert,
  handleApiError,
  safeValue,
  safeString
} from '../services/api';

// FUNCIÓN HELPER PARA toFixed SEGURO
const safeToFixed = (value, decimals = 2, defaultValue = '0.00') => {
  if (value === null || value === undefined || value === "" || isNaN(value)) {
    return defaultValue;
  }
  return Number(value).toFixed(decimals);
};

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({});
  const [salesTrends, setSalesTrends] = useState({});
  const [runningAnalysis, setRunningAnalysis] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(30);

  const loadAnalyticsData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Cargar datos de analytics en paralelo
      const results = await Promise.allSettled([
        analyticsAPI.getDashboardOverview(),
        dailySummaryAPI.getTrends({ days: selectedPeriod }),
        salesAPI.getDashboardStats(),
        salesAPI.getSalesByPeriod({ period: 'daily', days: selectedPeriod })
      ]);

      // Procesar overview del dashboard
      if (results[0].status === 'fulfilled') {
        setDashboardData(results[0].value.data || {});
      } else {
        console.error('Error cargando dashboard overview:', results[0].reason);
        setDashboardData({});
      }

      // Procesar tendencias de ventas con validación mejorada
      if (results[1].status === 'fulfilled') {
        const trendsData = results[1].value.data || {};
        // Validar estructura de datos antes de establecer
        const validatedTrends = {
          summary: {
            total_sales: safeValue(trendsData.summary?.total_sales, 0),
            total_profit: safeValue(trendsData.summary?.total_profit, 0),
            avg_daily_sales: safeValue(trendsData.summary?.avg_daily_sales, 0),
            avg_profit_margin: safeValue(trendsData.summary?.avg_profit_margin, 0)
          },
          daily_data: Array.isArray(trendsData.daily_data) ? trendsData.daily_data : [],
          best_day: trendsData.best_day || null,
          worst_day: trendsData.worst_day || null
        };
        setSalesTrends(validatedTrends);
      } else {
        console.error('Error cargando tendencias:', results[1].reason);
        setSalesTrends({
          summary: { total_sales: 0, total_profit: 0, avg_daily_sales: 0, avg_profit_margin: 0 },
          daily_data: [],
          best_day: null,
          worst_day: null
        });
      }

      // Procesar productos top (usamos stats de ventas)
      if (results[2].status === 'fulfilled') {
        console.log('Stats de ventas cargadas correctamente');
      } else {
        console.error('Error cargando stats de ventas:', results[2].reason);
      }

    } catch (error) {
      console.error('Error general cargando analytics:', error);
      handleApiError(error, 'Error cargando datos de analytics');
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod]);

  useEffect(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  const runAnalysis = async () => {
    try {
      setRunningAnalysis(true);
      const response = await analyticsAPI.runAnalysis();
      
      if (response.data.success) {
        showAlert('Análisis ejecutado exitosamente', 'success');
        loadAnalyticsData(); // Recargar datos
      } else {
        showAlert('Error ejecutando análisis', 'danger');
      }
    } catch (error) {
      console.error('Error ejecutando análisis:', error);
      handleApiError(error, 'Error ejecutando análisis');
    } finally {
      setRunningAnalysis(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Cargando analytics...</p>
      </div>
    );
  }

  return (
    <div className="analytics-page">
      <div className="page-header">
        <h1>Analytics y Reportes</h1>
        <div>
          <button 
            className="btn btn-primary"
            onClick={runAnalysis}
            disabled={runningAnalysis}
          >
            {runningAnalysis ? 'Ejecutando...' : 'Ejecutar Análisis'}
          </button>
        </div>
      </div>

      {/* Selector de período */}
      <div className="card">
        <h3>Período de Análisis</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Días a analizar</label>
            <select
              className="form-control"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(parseInt(e.target.value))}
            >
              <option value={7}>Últimos 7 días</option>
              <option value={15}>Últimos 15 días</option>
              <option value={30}>Últimos 30 días</option>
              <option value={60}>Últimos 60 días</option>
              <option value={90}>Últimos 90 días</option>
            </select>
          </div>
          <div className="form-group">
            <label>&nbsp;</label>
            <button 
              className="btn btn-success form-control"
              onClick={loadAnalyticsData}
            >
              Actualizar Datos
            </button>
          </div>
        </div>
      </div>

      {/* Resumen general */}
      {dashboardData && Object.keys(dashboardData).length > 0 && (
        <div className="card">
          <h2>Resumen General</h2>
          <div className="grid grid-4">
            <div className="stats-card">
              <h3>{safeValue(dashboardData.summary?.total_products, 0)}</h3>
              <p>Total Productos</p>
            </div>
            <div className="stats-card success">
              <h3>{safeValue(dashboardData.summary?.month_sales_count, 0)}</h3>
              <p>Ventas del Mes</p>
            </div>
            <div className="stats-card warning">
              <h3>{formatCurrency(safeValue(dashboardData.summary?.month_sales_total, 0))}</h3>
              <p>Ingresos del Mes</p>
            </div>
            <div className="stats-card danger">
              <h3>{safeValue(dashboardData.summary?.low_stock_products, 0)}</h3>
              <p>Productos Stock Bajo</p>
            </div>
          </div>
          
          {dashboardData.period && (
            <div style={{ marginTop: '1rem' }}>
              <p><strong>Período:</strong> {dashboardData.period}</p>
            </div>
          )}
        </div>
      )}

      {/* Tendencias de ventas - CORREGIDO */}
      {salesTrends && Object.keys(salesTrends).length > 0 && (
        <div className="card">
          <h2>Tendencias de Ventas - Últimos {selectedPeriod} días</h2>
          
          {salesTrends.summary && (
            <div className="grid grid-4">
              <div className="stats-card">
                <h3>{formatCurrency(safeValue(salesTrends.summary.total_sales, 0))}</h3>
                <p>Ventas Totales</p>
              </div>
              <div className="stats-card success">
                <h3>{formatCurrency(safeValue(salesTrends.summary.total_profit, 0))}</h3>
                <p>Ganancia Total</p>
              </div>
              <div className="stats-card warning">
                <h3>{formatCurrency(safeValue(salesTrends.summary.avg_daily_sales, 0))}</h3>
                <p>Promedio Diario</p>
              </div>
              <div className="stats-card info">
                {/* CORRECCIÓN APLICADA AQUÍ */}
                <h3>{safeToFixed(salesTrends.summary.avg_profit_margin, 1)}%</h3>
                <p>Margen Promedio</p>
              </div>
            </div>
          )}

          {salesTrends.best_day && salesTrends.worst_day && (
            <div className="grid grid-2">
              <div>
                <h4>Mejor Día de Ventas</h4>
                <p><strong>Fecha:</strong> {new Date(salesTrends.best_day.date).toLocaleDateString()}</p>
                <p><strong>Ventas:</strong> {formatCurrency(safeValue(salesTrends.best_day.sales, 0))}</p>
              </div>
              <div>
                <h4>Día con Menores Ventas</h4>
                <p><strong>Fecha:</strong> {new Date(salesTrends.worst_day.date).toLocaleDateString()}</p>
                <p><strong>Ventas:</strong> {formatCurrency(safeValue(salesTrends.worst_day.sales, 0))}</p>
              </div>
            </div>
          )}

          {salesTrends.daily_data && salesTrends.daily_data.length > 0 && (
            <div>
              <h4>Ventas Diarias (Últimos 10 días)</h4>
              <table className="table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Ventas Totales</th>
                    <th>Cantidad</th>
                    <th>Productos Vendidos</th>
                    <th>Margen %</th>
                  </tr>
                </thead>
                <tbody>
                  {salesTrends.daily_data.slice(-10).map((day, index) => (
                    <tr key={index}>
                      <td>{new Date(day.date).toLocaleDateString()}</td>
                      <td>{formatCurrency(safeValue(day.total_sales, 0))}</td>
                      <td>{safeValue(day.sale_count, 0)}</td>
                      <td>{safeValue(day.products_sold, 0)}</td>
                      {/* CORRECCIÓN APLICADA AQUÍ TAMBIÉN */}
                      <td>{safeToFixed(day.profit_margin, 1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Top productos */}
      {dashboardData.top_products && dashboardData.top_products.length > 0 && (
        <div className="card">
          <h2>Productos Más Vendidos</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cantidad Vendida</th>
                <th>Ingresos</th>
                <th>Ventas</th>
              </tr>
            </thead>
            <tbody>
              {dashboardData.top_products.map((product, index) => (
                <tr key={index}>
                  <td>{safeString(product.product__name)}</td>
                  <td>{safeValue(product.quantity_sold, 0)}</td>
                  <td>{formatCurrency(safeValue(product.revenue, 0))}</td>
                  <td>{safeValue(product.sales_count, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Métricas de rendimiento */}
      <div className="grid grid-2">
        <div className="card">
          <h3>Análisis de Rentabilidad</h3>
          {salesTrends.summary ? (
            <div>
              <p><strong>Ingresos Totales:</strong> {formatCurrency(safeValue(salesTrends.summary.total_sales, 0))}</p>
              <p><strong>Ganancias:</strong> {formatCurrency(safeValue(salesTrends.summary.total_profit, 0))}</p>
              {/* CORRECCIÓN APLICADA AQUÍ */}
              <p><strong>Margen Promedio:</strong> {safeToFixed(salesTrends.summary.avg_profit_margin, 2)}%</p>
              <p><strong>Ventas por Día:</strong> {formatCurrency(safeValue(salesTrends.summary.avg_daily_sales, 0))}</p>
            </div>
          ) : (
            <p>No hay datos de rentabilidad disponibles</p>
          )}
        </div>

        <div className="card">
          <h3>Información del Sistema</h3>
          <div>
            <p><strong>Período de Análisis:</strong> {selectedPeriod} días</p>
            <p><strong>Última Actualización:</strong> {new Date().toLocaleString()}</p>
            <p><strong>Total Productos Activos:</strong> {safeValue(dashboardData.summary?.total_products, 0)}</p>
            <p><strong>Estado:</strong> Sistema operativo</p>
          </div>
        </div>
      </div>

      {/* Resto del componente permanece igual... */}
      {/* Recomendaciones */}
      <div className="card">
        <h2>Recomendaciones de Negocio</h2>
        <div className="grid grid-2">
          <div>
            <h4>📈 Oportunidades de Crecimiento</h4>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {salesTrends.summary?.avg_profit_margin > 25 ? (
                <li>✅ Excelente margen de ganancia promedio</li>
              ) : (
                <li>⚠️ Revisar estrategia de precios para mejorar márgenes</li>
              )}
              
              {dashboardData.summary?.low_stock_products > 0 ? (
                <li>🔄 {dashboardData.summary.low_stock_products} productos necesitan reabastecimiento</li>
              ) : (
                <li>✅ Niveles de inventario saludables</li>
              )}
              
              {salesTrends.daily_data?.length > 7 && (
                <li>📊 Analizar patrones de venta para optimizar horarios</li>
              )}
            </ul>
          </div>
          
          <div>
            <h4>🎯 Acciones Recomendadas</h4>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              <li>📋 Revisar productos con baja rotación</li>
              <li>🔍 Implementar promociones en días de baja venta</li>
              <li>📈 Usar predicciones ML para optimizar inventario</li>
              <li>💰 Evaluar descuentos por volumen para clientes frecuentes</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Acciones rápidas */}
      <div className="card">
        <h2>Acciones Rápidas</h2>
        <div className="grid grid-4">
          <button 
            className="btn btn-primary"
            onClick={() => window.location.href = '/reports'}
          >
            Ver Reportes Detallados
          </button>
          <button 
            className="btn btn-success"
            onClick={() => window.location.href = '/predictions'}
          >
            Predicciones ML
          </button>
          <button 
            className="btn btn-warning"
            onClick={() => window.location.href = '/inventory'}
          >
            Gestionar Inventario
          </button>
          <button 
            className="btn btn-info"
            onClick={() => window.location.href = '/dashboard'}
            style={{ backgroundColor: '#17a2b8', color: 'white' }}
          >
            Volver al Dashboard
          </button>
        </div>
      </div>

      {/* Información adicional */}
      <div className="card">
        <h3>Información del Análisis</h3>
        <div className="grid grid-3">
          <div>
            <h4>Fuentes de Datos</h4>
            <p>• Ventas completadas</p>
            <p>• Movimientos de inventario</p>
            <p>• Datos de clientes</p>
          </div>
          <div>
            <h4>Métricas Calculadas</h4>
            <p>• Tendencias de ventas</p>
            <p>• Análisis de rentabilidad</p>
            <p>• Rotación de productos</p>
          </div>
          <div>
            <h4>Próximas Actualizaciones</h4>
            <p>• Análisis de clientes</p>
            <p>• Predicciones avanzadas</p>
            <p>• Reportes automatizados</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
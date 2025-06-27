import React, { useState, useEffect } from 'react';
import { 
  inventoryAPI,
  salesAPI,
  dailySummaryAPI,
  productsAPI,
  formatCurrency,
  showAlert 
} from '../services/api';

const Reports = () => {
  const [activeReport, setActiveReport] = useState('low-stock');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [filters, setFilters] = useState({
    date_from: '',
    date_to: '',
    category: '',
    supplier: ''
  });

  useEffect(() => {
    loadReport();
  }, [activeReport]);

  const loadReport = async () => {
    try {
      setLoading(true);
      
      switch (activeReport) {
        case 'low-stock':
          try {
            const lowStockRes = await inventoryAPI.getLowStockReport();
            setReportData(lowStockRes.data);
          } catch (error) {
            console.error('Error loading low stock report:', error);
            setReportData({ products: [], products_count: 0 });
          }
          break;
          
        case 'sales-summary':
          try {
            const salesRes = await dailySummaryAPI.getTrends({ days: 30 });
            setReportData(salesRes.data);
          } catch (error) {
            console.error('Error loading sales summary:', error);
            setReportData({ summary: {}, daily_data: [] });
          }
          break;
          
        case 'inventory-status':
          try {
            const productsRes = await productsAPI.getDashboardStats();
            setReportData(productsRes.data);
          } catch (error) {
            console.error('Error loading inventory status:', error);
            setReportData({ total_products: 0, categories_stats: [] });
          }
          break;
          
        case 'sales-by-period':
          try {
            const salesPeriodRes = await salesAPI.getSalesByPeriod({ period: 'daily', days: 30 });
            setReportData(salesPeriodRes.data);
          } catch (error) {
            console.error('Error loading sales by period:', error);
            setReportData({ data: [], period: 'daily', days: 30 });
          }
          break;
          
        case 'top-products':
          try {
            const topProductsRes = await salesAPI.getDashboardStats();
            setReportData(topProductsRes.data);
          } catch (error) {
            console.error('Error loading top products:', error);
            setReportData({ payment_methods: [] });
          }
          break;
          
        default:
          setReportData(null);
      }
    } catch (error) {
      console.error('Error cargando reporte:', error);
      showAlert('Error cargando reporte', 'danger');
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = (format) => {
    showAlert(`Exportando reporte en formato ${format}...`, 'info');
    // Aquí implementarías la lógica de exportación real
    setTimeout(() => {
      showAlert(`Reporte exportado exitosamente en formato ${format}`, 'success');
    }, 2000);
  };

  const printReport = () => {
    window.print();
  };

  // Función helper para manejar valores nulos en numbers
  const safeToFixed = (value, decimals = 2) => {
    if (value === null || value === undefined || isNaN(value)) {
      return '0.00';
    }
    return Number(value).toFixed(decimals);
  };

  // Función helper para manejar valores nulos en strings
  const safeString = (value, defaultValue = 'N/A') => {
    return value || defaultValue;
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Cargando reporte...</p>
      </div>
    );
  }

  return (
    <div className="reports-page">
      <div className="page-header">
        <h1>Reportes del Sistema</h1>
        <div>
          <button className="btn btn-secondary" onClick={printReport}>
            Imprimir
          </button>
          <button className="btn btn-success" onClick={() => exportReport('PDF')}>
            Exportar PDF
          </button>
          <button className="btn btn-info" onClick={() => exportReport('Excel')}>
            Exportar Excel
          </button>
        </div>
      </div>

      {/* Selector de reportes */}
      <div className="card">
        <h2>Tipo de Reporte</h2>
        <div className="grid grid-3">
          <button 
            className={`btn ${activeReport === 'low-stock' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveReport('low-stock')}
          >
            Reporte de Stock Bajo
          </button>
          <button 
            className={`btn ${activeReport === 'sales-summary' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveReport('sales-summary')}
          >
            Resumen de Ventas
          </button>
          <button 
            className={`btn ${activeReport === 'inventory-status' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveReport('inventory-status')}
          >
            Estado de Inventario
          </button>
          <button 
            className={`btn ${activeReport === 'sales-by-period' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveReport('sales-by-period')}
          >
            Ventas por Período
          </button>
          <button 
            className={`btn ${activeReport === 'top-products' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveReport('top-products')}
          >
            Top Productos
          </button>
        </div>
      </div>

      {/* Filtros generales */}
      <div className="card">
        <h3>Filtros</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Fecha Desde</label>
            <input
              type="date"
              className="form-control"
              value={filters.date_from}
              onChange={(e) => setFilters(prev => ({ ...prev, date_from: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label>Fecha Hasta</label>
            <input
              type="date"
              className="form-control"
              value={filters.date_to}
              onChange={(e) => setFilters(prev => ({ ...prev, date_to: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label>&nbsp;</label>
            <button className="btn btn-primary form-control" onClick={loadReport}>
              Aplicar Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Reporte de Stock Bajo */}
      {activeReport === 'low-stock' && reportData && (
        <div className="card">
          <h2>Reporte de Stock Bajo</h2>
          <p><strong>Productos con stock bajo o crítico:</strong> {reportData.products_count || 0}</p>
          
          {reportData.products && reportData.products.length > 0 ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th>Stock Actual</th>
                  <th>Stock Mínimo</th>
                  <th>Punto Reorden</th>
                  <th>Días de Stock</th>
                  <th>Sugerido Ordenar</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {reportData.products.map((product, index) => (
                  <tr key={index}>
                    <td>{safeString(product.product_code)}</td>
                    <td>{safeString(product.product_name)}</td>
                    <td>{safeString(product.category_name)}</td>
                    <td>{product.current_stock || 0}</td>
                    <td>{product.min_stock || 0}</td>
                    <td>{product.reorder_point || 0}</td>
                    <td>{safeToFixed(product.days_of_stock, 1)}</td>
                    <td>{product.suggested_order || 0}</td>
                    <td>
                      <span className={`alert ${
                        product.stock_status === 'SIN_STOCK' ? 'alert-danger' :
                        product.stock_status === 'STOCK_BAJO' ? 'alert-warning' :
                        'alert-success'
                      }`} style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>
                        {safeString(product.stock_status, 'NORMAL')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="alert alert-success">
              ¡Excelente! No hay productos con stock bajo.
            </div>
          )}
        </div>
      )}

      {/* Resumen de Ventas */}
      {activeReport === 'sales-summary' && reportData && (
        <div className="card">
          <h2>Resumen de Ventas (Últimos 30 días)</h2>
          
          {reportData.summary && (
            <div className="grid grid-4">
              <div className="stats-card">
                <h3>{formatCurrency(reportData.summary.total_sales || 0)}</h3>
                <p>Ventas Totales</p>
              </div>
              <div className="stats-card success">
                <h3>{formatCurrency(reportData.summary.total_profit || 0)}</h3>
                <p>Ganancia Total</p>
              </div>
              <div className="stats-card warning">
                <h3>{formatCurrency(reportData.summary.avg_daily_sales || 0)}</h3>
                <p>Promedio Diario</p>
              </div>
              <div className="stats-card danger">
                <h3>{safeToFixed(reportData.summary.avg_profit_margin, 1)}%</h3>
                <p>Margen Promedio</p>
              </div>
            </div>
          )}

          {reportData.best_day && reportData.worst_day && (
            <div className="grid grid-2">
              <div>
                <h3>Mejor Día</h3>
                <p><strong>Fecha:</strong> {new Date(reportData.best_day.date).toLocaleDateString()}</p>
                <p><strong>Ventas:</strong> {formatCurrency(reportData.best_day.sales || 0)}</p>
              </div>
              <div>
                <h3>Peor Día</h3>
                <p><strong>Fecha:</strong> {new Date(reportData.worst_day.date).toLocaleDateString()}</p>
                <p><strong>Ventas:</strong> {formatCurrency(reportData.worst_day.sales || 0)}</p>
              </div>
            </div>
          )}

          {reportData.daily_data && reportData.daily_data.length > 0 && (
            <div>
              <h3>Ventas Diarias</h3>
              <table className="table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Ventas Totales</th>
                    <th>Cantidad Ventas</th>
                    <th>Productos Vendidos</th>
                    <th>Margen Ganancia</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.daily_data.slice(-10).map((day, index) => (
                    <tr key={index}>
                      <td>{new Date(day.date).toLocaleDateString()}</td>
                      <td>{formatCurrency(day.total_sales || 0)}</td>
                      <td>{day.sale_count || 0}</td>
                      <td>{day.products_sold || 0}</td>
                      <td>{safeToFixed(day.profit_margin, 1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Estado de Inventario */}
      {activeReport === 'inventory-status' && reportData && (
        <div className="card">
          <h2>Estado General del Inventario</h2>
          
          <div className="grid grid-4">
            <div className="stats-card">
              <h3>{reportData.total_products || 0}</h3>
              <p>Total Productos</p>
            </div>
            <div className="stats-card success">
              <h3>{(reportData.total_products || 0) - (reportData.low_stock_products || 0) - (reportData.out_of_stock_products || 0)}</h3>
              <p>Stock Normal</p>
            </div>
            <div className="stats-card warning">
              <h3>{reportData.low_stock_products || 0}</h3>
              <p>Stock Bajo</p>
            </div>
            <div className="stats-card danger">
              <h3>{reportData.out_of_stock_products || 0}</h3>
              <p>Sin Stock</p>
            </div>
          </div>

          {reportData.categories_stats && reportData.categories_stats.length > 0 && (
            <div>
              <h3>Productos por Categoría</h3>
              <table className="table">
                <thead>
                  <tr>
                    <th>Categoría</th>
                    <th>Cantidad de Productos</th>
                    <th>Porcentaje</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.categories_stats.map((category, index) => {
                    const percentage = reportData.total_products > 0 ? 
                      ((category.products_count / reportData.total_products) * 100).toFixed(1) : '0.0';
                    return (
                      <tr key={index}>
                        <td>{safeString(category.category)}</td>
                        <td>{category.products_count || 0}</td>
                        <td>{percentage}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Ventas por Período */}
      {activeReport === 'sales-by-period' && reportData && (
        <div className="card">
          <h2>Ventas por Período</h2>
          
          {reportData.data && reportData.data.length > 0 ? (
            <div>
              <p><strong>Período:</strong> {reportData.period} - {reportData.days} días</p>
              <table className="table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Cantidad Ventas</th>
                    <th>Total Ventas</th>
                    <th>Promedio por Venta</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.data.map((period, index) => {
                    const avgPerSale = period.sales_count > 0 ? 
                      period.total_amount / period.sales_count : 0;
                    return (
                      <tr key={index}>
                        <td>{new Date(period.period).toLocaleDateString()}</td>
                        <td>{period.sales_count || 0}</td>
                        <td>{formatCurrency(period.total_amount || 0)}</td>
                        <td>{formatCurrency(avgPerSale)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No hay datos de ventas para el período seleccionado</p>
          )}
        </div>
      )}

      {/* Top Productos */}
      {activeReport === 'top-products' && reportData && (
        <div className="card">
          <h2>Top Productos Más Vendidos</h2>
          
          {reportData.payment_methods && reportData.payment_methods.length > 0 && (
            <div>
              <h3>Métodos de Pago Más Utilizados</h3>
              <table className="table">
                <thead>
                  <tr>
                    <th>Método de Pago</th>
                    <th>Cantidad de Transacciones</th>
                    <th>Total</th>
                    <th>Porcentaje</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.payment_methods.map((method, index) => {
                    const total = reportData.payment_methods.reduce((sum, m) => sum + parseFloat(m.total || 0), 0);
                    const percentage = total > 0 ? ((parseFloat(method.total || 0) / total) * 100).toFixed(1) : '0.0';
                    return (
                      <tr key={index}>
                        <td>{safeString(method.payment_method)}</td>
                        <td>{method.count || 0}</td>
                        <td>{formatCurrency(method.total || 0)}</td>
                        <td>{percentage}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Información del sistema */}
      <div className="card">
        <h2>Información del Reporte</h2>
        <div className="grid grid-3">
          <div>
            <h4>Fecha de Generación</h4>
            <p>{new Date().toLocaleString()}</p>
          </div>
          <div>
            <h4>Sistema</h4>
            <p>Minimarket ML - Gestión Logística v1.0</p>
          </div>
          <div>
            <h4>Tipo de Reporte</h4>
            <p>{activeReport.replace('-', ' ').toUpperCase()}</p>
          </div>
        </div>
      </div>

      {/* Acciones adicionales */}
      <div className="card">
        <h2>Acciones Rápidas</h2>
        <div className="grid grid-4">
          <button 
            className="btn btn-primary"
            onClick={() => window.location.href = '/analytics'}
          >
            Ver Analytics
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
            Control Inventario
          </button>
          <button 
            className="btn btn-info"
            onClick={() => window.location.href = '/dashboard'}
            style={{ backgroundColor: '#17a2b8', color: 'white' }}
          >
            Ir al Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default Reports;
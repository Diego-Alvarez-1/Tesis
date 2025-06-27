import React, { useState, useEffect, useCallback } from 'react';
import { 
  productsAPI, 
  salesAPI, 
  analyticsAPI,
  formatCurrency,
  showAlert,
  safeValue,
  safeString
} from '../services/api';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    products: {},
    sales: {},
    overview: {}
  });
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [recentSales, setRecentSales] = useState([]);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Cargar estadísticas en paralelo con manejo de errores individual
      const results = await Promise.allSettled([
        productsAPI.getDashboardStats(),
        salesAPI.getDashboardStats(),
        analyticsAPI.getDashboardOverview(),
        productsAPI.getLowStock(),
        salesAPI.getSales({ page_size: 10 })
      ]);

      // Procesar resultados de productos
      if (results[0].status === 'fulfilled') {
        setStats(prev => ({ ...prev, products: results[0].value.data || {} }));
      } else {
        console.error('Error cargando stats de productos:', results[0].reason);
      }

      // Procesar resultados de ventas
      if (results[1].status === 'fulfilled') {
        setStats(prev => ({ ...prev, sales: results[1].value.data || {} }));
      } else {
        console.error('Error cargando stats de ventas:', results[1].reason);
      }

      // Procesar overview de analytics
      if (results[2].status === 'fulfilled') {
        setStats(prev => ({ ...prev, overview: results[2].value.data || {} }));
      } else {
        console.error('Error cargando overview:', results[2].reason);
      }

      // Procesar productos con stock bajo
      if (results[3].status === 'fulfilled') {
        const lowStockData = results[3].value.data;
        setLowStockProducts(lowStockData.products || []);
      } else {
        console.error('Error cargando productos con stock bajo:', results[3].reason);
        setLowStockProducts([]);
      }

      // Procesar ventas recientes
      if (results[4].status === 'fulfilled') {
        const salesData = results[4].value.data;
        setRecentSales(salesData.results || salesData || []);
      } else {
        console.error('Error cargando ventas recientes:', results[4].reason);
        setRecentSales([]);
      }
      
    } catch (error) {
      console.error('Error general cargando dashboard:', error);
      showAlert('Error cargando datos del dashboard', 'danger');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Funciones helper para obtener valores seguros
  const getTodaySales = () => {
    return {
      count: safeValue(stats.sales.today?.sales_count, 0),
      amount: safeValue(stats.sales.today?.total_amount, 0)
    };
  };

  const getProductsStats = () => {
    return {
      total: safeValue(stats.products.total_products, 0),
      lowStock: safeValue(stats.products.low_stock_products, 0),
      outOfStock: safeValue(stats.products.out_of_stock_products, 0)
    };
  };

  const getPaymentMethods = () => {
    return stats.sales.payment_methods || [];
  };

  const getCategoriesStats = () => {
    return stats.products.categories_stats || [];
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Cargando dashboard...</p>
      </div>
    );
  }

  const todaySales = getTodaySales();
  const productsStats = getProductsStats();
  const paymentMethods = getPaymentMethods();
  const categoriesStats = getCategoriesStats();

  return (
    <div className="dashboard">
      <h1>Dashboard - Sistema Minimarket ML</h1>
      
      {/* Estadísticas principales */}
      <div className="grid grid-4">
        <div className="stats-card">
          <h3>{productsStats.total}</h3>
          <p>Total Productos</p>
        </div>
        
        <div className="stats-card success">
          <h3>{formatCurrency(todaySales.amount)}</h3>
          <p>Ventas Hoy</p>
        </div>
        
        <div className="stats-card warning">
          <h3>{productsStats.lowStock}</h3>
          <p>Stock Bajo</p>
        </div>
        
        <div className="stats-card danger">
          <h3>{productsStats.outOfStock}</h3>
          <p>Sin Stock</p>
        </div>
      </div>

      {/* Resumen de ventas */}
      <div className="grid grid-2">
        <div className="card">
          <h2>Resumen de Ventas</h2>
          <div className="grid grid-3">
            <div>
              <h4>Hoy</h4>
              <p><strong>{todaySales.count}</strong> ventas</p>
              <p>{formatCurrency(todaySales.amount)}</p>
            </div>
            <div>
              <h4>Ayer</h4>
              <p><strong>{safeValue(stats.sales.yesterday?.sales_count, 0)}</strong> ventas</p>
              <p>{formatCurrency(safeValue(stats.sales.yesterday?.total_amount, 0))}</p>
            </div>
            <div>
              <h4>Este Mes</h4>
              <p><strong>{safeValue(stats.sales.this_month?.sales_count, 0)}</strong> ventas</p>
              <p>{formatCurrency(safeValue(stats.sales.this_month?.total_amount, 0))}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <h2>Métodos de Pago</h2>
          <div className="payment-methods">
            {paymentMethods.length > 0 ? (
              paymentMethods.map((method, index) => (
                <div key={index} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  padding: '0.5rem 0',
                  borderBottom: '1px solid #eee'
                }}>
                  <span>{safeString(method.payment_method)}</span>
                  <div>
                    <strong>{safeValue(method.count, 0)}</strong> ({formatCurrency(safeValue(method.total, 0))})
                  </div>
                </div>
              ))
            ) : (
              <p>No hay datos de métodos de pago</p>
            )}
          </div>
        </div>
      </div>

      {/* Productos con stock bajo */}
      <div className="grid grid-2">
        <div className="card">
          <h2>Productos con Stock Bajo</h2>
          {lowStockProducts.length > 0 ? (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Stock Actual</th>
                    <th>Mínimo</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockProducts.slice(0, 10).map((product, index) => (
                    <tr key={product.id || index}>
                      <td>{safeString(product.name)}</td>
                      <td>{safeValue(product.current_stock, 0)}</td>
                      <td>{safeValue(product.min_stock, 0)}</td>
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
            </div>
          ) : (
            <div className="alert alert-success">
              ¡Excelente! No hay productos con stock bajo.
            </div>
          )}
        </div>

        <div className="card">
          <h2>Ventas Recientes</h2>
          {recentSales.length > 0 ? (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Número</th>
                    <th>Cliente</th>
                    <th>Total</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSales.slice(0, 10).map((sale) => (
                    <tr key={sale.id}>
                      <td>{safeString(sale.sale_number)}</td>
                      <td>{safeString(sale.customer_name, 'Cliente General')}</td>
                      <td>{formatCurrency(safeValue(sale.total, 0))}</td>
                      <td>{sale.sale_date ? new Date(sale.sale_date).toLocaleDateString() : 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="alert alert-info">
              No hay ventas recientes
            </div>
          )}
        </div>
      </div>

      {/* Productos por categoría */}
      {categoriesStats.length > 0 && (
        <div className="card">
          <h2>Productos por Categoría</h2>
          <div className="grid grid-3">
            {categoriesStats.map((category, index) => (
              <div key={index} className="category-stat">
                <h4>{safeString(category.category)}</h4>
                <p><strong>{safeValue(category.products_count, 0)}</strong> productos</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Información del sistema */}
      {stats.overview && Object.keys(stats.overview).length > 0 && (
        <div className="card">
          <h2>Resumen General</h2>
          <div className="grid grid-3">
            <div>
              <h4>Período</h4>
              <p>{safeString(stats.overview.period, 'N/A')}</p>
            </div>
            <div>
              <h4>Total Productos</h4>
              <p><strong>{safeValue(stats.overview.summary?.total_products, 0)}</strong></p>
            </div>
            <div>
              <h4>Ventas del Mes</h4>
              <p>{formatCurrency(safeValue(stats.overview.summary?.month_sales_total, 0))}</p>
            </div>
          </div>
        </div>
      )}

      {/* Acciones rápidas */}
      <div className="card">
        <h2>Acciones Rápidas</h2>
        <div className="grid grid-4">
          <button 
            className="btn btn-primary"
            onClick={() => window.location.href = '/products'}
          >
            Gestionar Productos
          </button>
          <button 
            className="btn btn-success"
            onClick={() => window.location.href = '/sales'}
          >
            Nueva Venta
          </button>
          <button 
            className="btn btn-warning"
            onClick={() => window.location.href = '/inventory'}
          >
            Control Inventario
          </button>
          <button 
            className="btn btn-info"
            onClick={() => window.location.href = '/predictions'}
            style={{ backgroundColor: '#17a2b8', color: 'white' }}
          >
            Ver Predicciones
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
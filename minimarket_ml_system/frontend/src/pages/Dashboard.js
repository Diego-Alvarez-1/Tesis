import React, { useState, useEffect } from 'react';
import { 
  productsAPI, 
  salesAPI, 
  inventoryAPI, 
  analyticsAPI,
  formatCurrency,
  showAlert 
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

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Cargar estadísticas en paralelo
      const [
        productsStatsRes,
        salesStatsRes,
        overviewRes,
        lowStockRes,
        salesRes
      ] = await Promise.all([
        productsAPI.getDashboardStats(),
        salesAPI.getDashboardStats(),
        analyticsAPI.getDashboardOverview(),
        productsAPI.getLowStock(),
        salesAPI.getSales({ page_size: 10 })
      ]);

      setStats({
        products: productsStatsRes.data,
        sales: salesStatsRes.data,
        overview: overviewRes.data
      });
      
      setLowStockProducts(lowStockRes.data.products || []);
      setRecentSales(salesRes.data.results || []);
      
    } catch (error) {
      console.error('Error cargando dashboard:', error);
      showAlert('Error cargando datos del dashboard', 'danger');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Cargando dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <h1>Dashboard - Sistema Minimarket ML</h1>
      
      {/* Estadísticas principales */}
      <div className="grid grid-4">
        <div className="stats-card">
          <h3>{stats.products.total_products || 0}</h3>
          <p>Total Productos</p>
        </div>
        
        <div className="stats-card success">
          <h3>{formatCurrency(stats.sales.today?.total_amount || 0)}</h3>
          <p>Ventas Hoy</p>
        </div>
        
        <div className="stats-card warning">
          <h3>{stats.products.low_stock_products || 0}</h3>
          <p>Stock Bajo</p>
        </div>
        
        <div className="stats-card danger">
          <h3>{stats.products.out_of_stock_products || 0}</h3>
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
              <p><strong>{stats.sales.today?.sales_count || 0}</strong> ventas</p>
              <p>{formatCurrency(stats.sales.today?.total_amount || 0)}</p>
            </div>
            <div>
              <h4>Ayer</h4>
              <p><strong>{stats.sales.yesterday?.sales_count || 0}</strong> ventas</p>
              <p>{formatCurrency(stats.sales.yesterday?.total_amount || 0)}</p>
            </div>
            <div>
              <h4>Este Mes</h4>
              <p><strong>{stats.sales.this_month?.sales_count || 0}</strong> ventas</p>
              <p>{formatCurrency(stats.sales.this_month?.total_amount || 0)}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <h2>Métodos de Pago</h2>
          <div className="payment-methods">
            {stats.sales.payment_methods?.map((method, index) => (
              <div key={index} style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                padding: '0.5rem 0',
                borderBottom: '1px solid #eee'
              }}>
                <span>{method.payment_method}</span>
                <div>
                  <strong>{method.count}</strong> ({formatCurrency(method.total)})
                </div>
              </div>
            ))}
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
                  {lowStockProducts.slice(0, 10).map((product) => (
                    <tr key={product.id}>
                      <td>{product.name}</td>
                      <td>{product.current_stock}</td>
                      <td>{product.min_stock}</td>
                      <td>
                        <span className={`alert ${
                          product.stock_status === 'SIN_STOCK' ? 'alert-danger' :
                          product.stock_status === 'STOCK_BAJO' ? 'alert-warning' :
                          'alert-success'
                        }`} style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>
                          {product.stock_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No hay productos con stock bajo</p>
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
                      <td>{sale.sale_number}</td>
                      <td>{sale.customer_name || 'Cliente General'}</td>
                      <td>{formatCurrency(sale.total)}</td>
                      <td>{new Date(sale.sale_date).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No hay ventas recientes</p>
          )}
        </div>
      </div>

      {/* Productos por categoría */}
      <div className="card">
        <h2>Productos por Categoría</h2>
        <div className="grid grid-3">
          {stats.products.categories_stats?.map((category, index) => (
            <div key={index} className="category-stat">
              <h4>{category.category}</h4>
              <p><strong>{category.products_count}</strong> productos</p>
            </div>
          ))}
        </div>
      </div>

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
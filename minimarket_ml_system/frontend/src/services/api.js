import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

export const productAPI = {
  getAll: () => api.get('/products/products/'),
  getDashboardStats: () => api.get('/products/products/dashboard_stats/'),
  getLowStock: () => api.get('/products/products/low_stock/'),
};

export const salesAPI = {
  getAll: () => api.get('/sales/sales/'),
  getDashboardStats: () => api.get('/sales/sales/dashboard_stats/'),
  getSalesByPeriod: (days = 30) => api.get(`/sales/sales/sales_by_period/?days=${days}`),
};

export const inventoryAPI = {
  getMovements: () => api.get('/inventory/stock-movements/'),
  getLowStockReport: () => api.get('/inventory/reports/low_stock/'),
};

export const mlAPI = {
  getPredictions: () => api.get('/ml/demand-predictions/'),
  getRecommendations: () => api.get('/ml/reorder-recommendations/'),
  predictDemand: (productId, days = 30) => 
    api.post('/ml/predictions/predict_demand/', { product_id: productId, days_ahead: days }),
};

export const analyticsAPI = {
  getDashboardOverview: () => api.get('/analytics/dashboard_overview/'),
};

export default api;
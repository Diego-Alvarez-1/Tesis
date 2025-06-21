import axios from 'axios';

// Configuración base de axios
const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Interceptor para requests
api.interceptors.request.use(
  (config) => {
    // Agregar token si existe
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para responses
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Logout user
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Servicios de API

// Productos
export const productsAPI = {
  getProducts: (params = {}) => api.get('/products/products/', { params }),
  getProduct: (id) => api.get(`/products/products/${id}/`),
  createProduct: (data) => api.post('/products/products/', data),
  updateProduct: (id, data) => api.put(`/products/products/${id}/`, data),
  deleteProduct: (id) => api.delete(`/products/products/${id}/`),
  getLowStock: () => api.get('/products/products/low_stock/'),
  getDashboardStats: () => api.get('/products/products/dashboard_stats/'),
  updateStock: (id, data) => api.post(`/products/products/${id}/update_stock/`, data),
  getSalesHistory: (id, params = {}) => api.get(`/products/products/${id}/sales_history/`, { params }),
};

// Categorías
export const categoriesAPI = {
  getCategories: (params = {}) => api.get('/products/categories/', { params }),
  getCategory: (id) => api.get(`/products/categories/${id}/`),
  createCategory: (data) => api.post('/products/categories/', data),
  updateCategory: (id, data) => api.put(`/products/categories/${id}/`, data),
  deleteCategory: (id) => api.delete(`/products/categories/${id}/`),
  getCategoryProducts: (id) => api.get(`/products/categories/${id}/products/`),
};

// Proveedores
export const suppliersAPI = {
  getSuppliers: (params = {}) => api.get('/products/suppliers/', { params }),
  getSupplier: (id) => api.get(`/products/suppliers/${id}/`),
  createSupplier: (data) => api.post('/products/suppliers/', data),
  updateSupplier: (id, data) => api.put(`/products/suppliers/${id}/`, data),
  deleteSupplier: (id) => api.delete(`/products/suppliers/${id}/`),
  getSupplierProducts: (id) => api.get(`/products/suppliers/${id}/products/`),
};

// Inventario
export const inventoryAPI = {
  getStockMovements: (params = {}) => api.get('/inventory/stock-movements/', { params }),
  getStockMovement: (id) => api.get(`/inventory/stock-movements/${id}/`),
  getMovementsSummary: (params = {}) => api.get('/inventory/stock-movements/summary/', { params }),
  
  getPurchaseOrders: (params = {}) => api.get('/inventory/purchase-orders/', { params }),
  createPurchaseOrder: (data) => api.post('/inventory/purchase-orders/', data),
  getPurchaseOrder: (id) => api.get(`/inventory/purchase-orders/${id}/`),
  approvePurchaseOrder: (id) => api.post(`/inventory/purchase-orders/${id}/approve/`),
  receivePurchaseOrder: (id, data) => api.post(`/inventory/purchase-orders/${id}/receive/`, data),
  
  getInventoryCounts: (params = {}) => api.get('/inventory/inventory-counts/', { params }),
  createInventoryCount: (data) => api.post('/inventory/inventory-counts/', data),
  startInventoryCount: (id) => api.post(`/inventory/inventory-counts/${id}/start_count/`),
  completeInventoryCount: (id) => api.post(`/inventory/inventory-counts/${id}/complete_count/`),
  
  getLowStockReport: () => api.get('/inventory/reports/low_stock/'),
  bulkAdjustStock: (data) => api.post('/inventory/reports/bulk_adjust_stock/', data),
};

// Ventas
export const salesAPI = {
  getSales: (params = {}) => api.get('/sales/sales/', { params }),
  getSale: (id) => api.get(`/sales/sales/${id}/`),
  createSale: (data) => api.post('/sales/sales/', data),
  cancelSale: (id) => api.post(`/sales/sales/${id}/cancel/`),
  getDashboardStats: () => api.get('/sales/sales/dashboard_stats/'),
  getSalesByPeriod: (params = {}) => api.get('/sales/sales/sales_by_period/', { params }),
};

// Clientes
export const customersAPI = {
  getCustomers: (params = {}) => api.get('/sales/customers/', { params }),
  getCustomer: (id) => api.get(`/sales/customers/${id}/`),
  createCustomer: (data) => api.post('/sales/customers/', data),
  updateCustomer: (id, data) => api.put(`/sales/customers/${id}/`, data),
  deleteCustomer: (id) => api.delete(`/sales/customers/${id}/`),
  getCustomerSalesHistory: (id, params = {}) => api.get(`/sales/customers/${id}/sales_history/`, { params }),
  getTopCustomers: (params = {}) => api.get('/sales/customers/top_customers/', { params }),
};

// Resúmenes diarios
export const dailySummaryAPI = {
  getDailySummaries: (params = {}) => api.get('/sales/daily-summaries/', { params }),
  getTrends: (params = {}) => api.get('/sales/daily-summaries/trends/', { params }),
};

// Machine Learning
export const mlAPI = {
  getModels: () => api.get('/ml/models/'),
  trainNewModel: (data) => api.post('/ml/models/train_new_model/', data),
  setDefaultModel: (id) => api.post(`/ml/models/${id}/set_as_default/`),
  
  getPredictionRequests: (params = {}) => api.get('/ml/predictions/', { params }),
  predictDemand: (data) => api.post('/ml/predictions/predict_demand/', data),
  batchPredict: (data) => api.post('/ml/predictions/batch_predict/', data),
  
  getDemandPredictions: (params = {}) => api.get('/ml/demand-predictions/', { params }),
  getPredictionsByProduct: (params = {}) => api.get('/ml/demand-predictions/by_product/', { params }),
  
  getReorderRecommendations: (params = {}) => api.get('/ml/reorder-recommendations/', { params }),
  getProductRecommendation: (id, params = {}) => api.get(`/ml/reorder-recommendations/${id}/`, { params }),
};

// Analytics
export const analyticsAPI = {
  runAnalysis: () => api.post('/analytics/run_analysis/'),
  getDashboardOverview: () => api.get('/analytics/dashboard_overview/'),
};

// Utilidades
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
  }).format(amount);
};

export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('es-PE');
};

export const formatDateTime = (datetime) => {
  return new Date(datetime).toLocaleString('es-PE');
};

export const showAlert = (message, type = 'info') => {
  // Función simple para mostrar alertas
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type}`;
  alertDiv.textContent = message;
  alertDiv.style.position = 'fixed';
  alertDiv.style.top = '20px';
  alertDiv.style.right = '20px';
  alertDiv.style.zIndex = '9999';
  alertDiv.style.minWidth = '300px';
  
  document.body.appendChild(alertDiv);
  
  setTimeout(() => {
    if (alertDiv.parentNode) {
      alertDiv.parentNode.removeChild(alertDiv);
    }
  }, 5000);
};

export default api;
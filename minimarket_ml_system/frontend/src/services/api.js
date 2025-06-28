import axios from 'axios';

// Configuración base de axios
const api = axios.create({
  baseURL: 'http://localhost:8000/api', // URL del backend Django
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Interceptor para requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // NUEVO: Log mejorado para debug
    console.log('🚀 API Request:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      params: config.params,
      paramCount: config.params ? Object.keys(config.params).length : 0,
      hasData: !!config.data
    });
    
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Interceptor para responses
api.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', {
      url: response.config.url,
      status: response.status,
      dataType: Array.isArray(response.data?.results) ? 'paginated' :
                Array.isArray(response.data) ? 'array' : 'object',
      count: Array.isArray(response.data?.results) ? response.data.results.length :
             Array.isArray(response.data) ? response.data.length : 'N/A'
    });
    return response;
  },
  (error) => {
    console.error('❌ API Error:', {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      console.log('🔐 Unauthorized - token removed');
    }
    
    return Promise.reject(error);
  }
);

// ===== SERVICIOS DE API (BASADOS EN EL BACKEND REAL) =====

// PRODUCTOS - Basado en apps/products/urls.py y views.py
export const productsAPI = {
  // GET /api/products/products/
getProducts: (params = {}) => {
  const cleanedParams = cleanParams(params);
  console.log('📦 Productos - Parámetros originales:', params);
  console.log('📦 Productos - Parámetros limpios:', cleanedParams);
  return api.get('/products/products/', { params: cleanedParams });
},  
  // GET /api/products/products/{id}/
  getProduct: (id) => api.get(`/products/products/${id}/`),
  
  // POST /api/products/products/
  createProduct: (data) => api.post('/products/products/', data),
  
  // PUT /api/products/products/{id}/
  updateProduct: (id, data) => api.put(`/products/products/${id}/`, data),
  
  // DELETE /api/products/products/{id}/
  deleteProduct: (id) => api.delete(`/products/products/${id}/`),
  
  // GET /api/products/products/low_stock/
  getLowStock: () => api.get('/products/products/low_stock/'),
  
  // GET /api/products/products/dashboard_stats/
  getDashboardStats: () => api.get('/products/products/dashboard_stats/'),
  
  // POST /api/products/products/{id}/update_stock/
  updateStock: (id, data) => api.post(`/products/products/${id}/update_stock/`, data),
  
  // GET /api/products/products/{id}/sales_history/
  getSalesHistory: (id, params = {}) => api.get(`/products/products/${id}/sales_history/`, { params }),
  
  // GET /api/products/products/by_category/
  getByCategory: () => api.get('/products/products/by_category/'),
};

// CATEGORÍAS - Basado en apps/products/urls.py
export const categoriesAPI = {
  // GET /api/products/categories/
getCategories: (params = {}) => {
    const cleanedParams = cleanParams(params);
    return api.get('/products/categories/', { params: cleanedParams });
  },  
  // GET /api/products/categories/{id}/
  getCategory: (id) => api.get(`/products/categories/${id}/`),
  
  // POST /api/products/categories/
  createCategory: (data) => api.post('/products/categories/', data),
  
  // PUT /api/products/categories/{id}/
  updateCategory: (id, data) => api.put(`/products/categories/${id}/`, data),
  
  // DELETE /api/products/categories/{id}/
  deleteCategory: (id) => api.delete(`/products/categories/${id}/`),
  
  // GET /api/products/categories/{id}/products/
  getCategoryProducts: (id) => api.get(`/products/categories/${id}/products/`),
};

// PROVEEDORES - Basado en apps/products/urls.py
export const suppliersAPI = {
  // GET /api/products/suppliers/
 getSuppliers: (params = {}) => {
    const cleanedParams = cleanParams(params);
    return api.get('/products/suppliers/', { params: cleanedParams });
  },  
  // GET /api/products/suppliers/{id}/
  getSupplier: (id) => api.get(`/products/suppliers/${id}/`),
  
  // POST /api/products/suppliers/
  createSupplier: (data) => api.post('/products/suppliers/', data),
  
  // PUT /api/products/suppliers/{id}/
  updateSupplier: (id, data) => api.put(`/products/suppliers/${id}/`, data),
  
  // DELETE /api/products/suppliers/{id}/
  deleteSupplier: (id) => api.delete(`/products/suppliers/${id}/`),
  
  // GET /api/products/suppliers/{id}/products/
  getSupplierProducts: (id) => api.get(`/products/suppliers/${id}/products/`),
};

// INVENTARIO - Basado en apps/inventory/urls.py y views.py
export const inventoryAPI = {
  // GET /api/inventory/stock-movements/
getStockMovements: (params = {}) => {
    const cleanedParams = cleanParams(params);
    console.log('📋 Movimientos - Parámetros limpios:', cleanedParams);
    return api.get('/inventory/stock-movements/', { params: cleanedParams });
  },  
  // GET /api/inventory/stock-movements/{id}/
  getStockMovement: (id) => api.get(`/inventory/stock-movements/${id}/`),
  
  // GET /api/inventory/stock-movements/summary/
  getMovementsSummary: (params = {}) => api.get('/inventory/stock-movements/summary/', { params }),
  
  // GET /api/inventory/purchase-orders/
  getPurchaseOrders: (params = {}) => api.get('/inventory/purchase-orders/', { params }),
  
  // POST /api/inventory/purchase-orders/
  createPurchaseOrder: (data) => api.post('/inventory/purchase-orders/', data),
  
  // GET /api/inventory/purchase-orders/{id}/
  getPurchaseOrder: (id) => api.get(`/inventory/purchase-orders/${id}/`),
  
  // POST /api/inventory/purchase-orders/{id}/approve/
  approvePurchaseOrder: (id) => api.post(`/inventory/purchase-orders/${id}/approve/`),
  
  // POST /api/inventory/purchase-orders/{id}/receive/
  receivePurchaseOrder: (id, data) => api.post(`/inventory/purchase-orders/${id}/receive/`, data),
  
  // GET /api/inventory/inventory-counts/
  getInventoryCounts: (params = {}) => api.get('/inventory/inventory-counts/', { params }),
  
  // POST /api/inventory/inventory-counts/
  createInventoryCount: (data) => api.post('/inventory/inventory-counts/', data),
  
  // POST /api/inventory/inventory-counts/{id}/start_count/
  startInventoryCount: (id) => api.post(`/inventory/inventory-counts/${id}/start_count/`),
  
  // POST /api/inventory/inventory-counts/{id}/complete_count/
  completeInventoryCount: (id) => api.post(`/inventory/inventory-counts/${id}/complete_count/`),
  
  // GET /api/inventory/reports/low_stock/
  getLowStockReport: () => api.get('/inventory/reports/low_stock/'),
  
  // POST /api/inventory/reports/bulk_adjust_stock/
  bulkAdjustStock: (data) => api.post('/inventory/reports/bulk_adjust_stock/', data),
};

// VENTAS - Basado en apps/sales/urls.py y views.py
export const salesAPI = {
  getSales: (params = {}) => api.get('/sales/sales/', { params: cleanParams(params) }),
  getSale: (id) => api.get(`/sales/sales/${id}/`),
  createSale: (data) => api.post('/sales/sales/', data),
  cancelSale: (id) => api.post(`/sales/sales/${id}/cancel/`),
  getDashboardStats: () => api.get('/sales/sales/dashboard_stats/'),
  getSalesByPeriod: (params = {}) => api.get('/sales/sales/sales_by_period/', { params: cleanParams(params) }),
};

// CLIENTES - Basado en apps/sales/urls.py y views.py
export const customersAPI = {
  getCustomers: (params = {}) => api.get('/sales/customers/', { params: cleanParams(params) }),
  getCustomer: (id) => api.get(`/sales/customers/${id}/`),
  createCustomer: (data) => api.post('/sales/customers/', data),
  updateCustomer: (id, data) => api.put(`/sales/customers/${id}/`, data),
  deleteCustomer: (id) => api.delete(`/sales/customers/${id}/`),
  getCustomerSalesHistory: (id, params = {}) => api.get(`/sales/customers/${id}/sales_history/`, { params: cleanParams(params) }),
  getTopCustomers: (params = {}) => api.get('/sales/customers/top_customers/', { params: cleanParams(params) }),
};

// RESÚMENES DIARIOS - Basado en apps/sales/urls.py y views.py
export const dailySummaryAPI = {
  getDailySummaries: (params = {}) => api.get('/sales/daily-summaries/', { params: cleanParams(params) }),
  getTrends: (params = {}) => api.get('/sales/daily-summaries/trends/', { params: cleanParams(params) }),
};

// MACHINE LEARNING - Basado en apps/ml_models/urls.py y views.py
export const mlAPI = {
  getModels: () => api.get('/ml/models/'),
  trainNewModel: (data) => api.post('/ml/models/train_new_model/', data),
  setDefaultModel: (id) => api.post(`/ml/models/${id}/set_as_default/`),
  getPredictionRequests: (params = {}) => api.get('/ml/predictions/', { params: cleanParams(params) }),
  predictDemand: (data) => api.post('/ml/predictions/predict_demand/', data),
  batchPredict: (data) => api.post('/ml/predictions/batch_predict/', data),
  getDemandPredictions: (params = {}) => api.get('/ml/demand-predictions/', { params: cleanParams(params) }),
  getPredictionsByProduct: (params = {}) => api.get('/ml/demand-predictions/by_product/', { params: cleanParams(params) }),
  getReorderRecommendations: (params = {}) => api.get('/ml/reorder-recommendations/', { params: cleanParams(params) }),
  getProductRecommendation: (id, params = {}) => api.get(`/ml/reorder-recommendations/${id}/`, { params: cleanParams(params) }),
};

// ANALYTICS - Basado en apps/analytics/urls.py y views.py
export const analyticsAPI = {
  // POST /api/analytics/run_analysis/
  runAnalysis: () => api.post('/analytics/run_analysis/'),
  
  // GET /api/analytics/dashboard_overview/
  getDashboardOverview: () => api.get('/analytics/dashboard_overview/'),
  
  // GET /api/analytics/test/
  testAnalytics: () => api.get('/analytics/test/'),
};

// ===== FUNCIONES UTILITARIAS CORREGIDAS =====

// Formatear moneda en soles peruanos
export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 'S/. 0.00';
  }
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
  }).format(Number(amount));
};

// Formatear fecha
export const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('es-PE');
};

// Formatear fecha y hora
export const formatDateTime = (datetime) => {
  if (!datetime) return 'N/A';
  return new Date(datetime).toLocaleString('es-PE');
};

// Función para mostrar alertas
export const showAlert = (message, type = 'info') => {
  // Remover alertas existentes
  const existingAlerts = document.querySelectorAll('.fixed-alert');
  existingAlerts.forEach(alert => alert.remove());
  
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type} fixed-alert`;
  alertDiv.textContent = message;
  alertDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9999;
    min-width: 300px;
    max-width: 500px;
    padding: 12px 16px;
    border-radius: 4px;
    color: white;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    background-color: ${
      type === 'success' ? '#10b981' :
      type === 'danger' ? '#ef4444' :
      type === 'warning' ? '#f59e0b' :
      '#3b82f6'
    };
    cursor: pointer;
  `;
  
  // Agregar evento de click para cerrar
  alertDiv.addEventListener('click', () => {
    if (alertDiv.parentNode) {
      alertDiv.parentNode.removeChild(alertDiv);
    }
  });
  
  document.body.appendChild(alertDiv);
  
  setTimeout(() => {
    if (alertDiv.parentNode) {
      alertDiv.parentNode.removeChild(alertDiv);
    }
  }, 5000);
};

// Función helper para manejar errores de API - MEJORADA
export const handleApiError = (error, defaultMessage = 'Error en la operación') => {
  console.error('API Error:', error);
  
  let errorMessage = defaultMessage;
  
  if (error.response?.data) {
    const errorData = error.response.data;
    
    // Manejar diferentes tipos de errores del backend Django
    if (errorData.detail) {
      errorMessage = errorData.detail;
    } else if (errorData.error) {
      errorMessage = errorData.error;
    } else if (errorData.message) {
      errorMessage = errorData.message;
    } else if (typeof errorData === 'string') {
      errorMessage = errorData;
    } else if (errorData.non_field_errors) {
      errorMessage = Array.isArray(errorData.non_field_errors) 
        ? errorData.non_field_errors.join(', ')
        : errorData.non_field_errors;
    } else {
      // Manejar errores de validación de campos
      const fieldErrors = [];
      Object.keys(errorData).forEach(field => {
        if (Array.isArray(errorData[field])) {
          fieldErrors.push(`${field}: ${errorData[field].join(', ')}`);
        } else if (typeof errorData[field] === 'string') {
          fieldErrors.push(`${field}: ${errorData[field]}`);
        }
      });
      
      if (fieldErrors.length > 0) {
        errorMessage = fieldErrors.join('; ');
      }
    }
  } else if (error.message) {
    if (error.message.includes('Network Error')) {
      errorMessage = 'Error de conexión. Verifique su conexión a internet y que el servidor esté funcionando.';
    } else if (error.message.includes('timeout')) {
      errorMessage = 'Tiempo de espera agotado. El servidor tardó demasiado en responder.';
    } else {
      errorMessage = error.message;
    }
  }
  
  showAlert(errorMessage, 'danger');
  return errorMessage;
};

// Función helper para manejar valores seguros - CORREGIDA
export const safeValue = (value, defaultValue = 0) => {
  if (value === null || value === undefined || value === "" || isNaN(value)) {
    return defaultValue;
  }
  return Number(value);
};

// Nueva función específica para toFixed seguro
export const safeToFixed = (value, decimals = 2, defaultValue = '0.00') => {
  const num = safeValue(value, 0);
  if (num === 0 && (value === null || value === undefined)) {
    return defaultValue;
  }
  return num.toFixed(decimals);
};

// Función helper para manejar strings seguros
export const safeString = (value, defaultValue = 'N/A') => {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }
  return String(value).trim();
};

// Función helper para manejar arrays seguros
export const safeArray = (value, defaultValue = []) => {
  if (!Array.isArray(value)) {
    return defaultValue;
  }
  return value;
};

// Función helper para manejar objetos seguros
export const safeObject = (value, defaultValue = {}) => {
  if (value === null || value === undefined || typeof value !== 'object') {
    return defaultValue;
  }
  return value;
};

// Función para validar datos antes de enviar al backend
export const validateFormData = (data, requiredFields = []) => {
  const errors = [];
  
  requiredFields.forEach(field => {
    if (!data[field] || (typeof data[field] === 'string' && !data[field].trim())) {
      errors.push(`${field} es requerido`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Función para normalizar datos de respuesta paginada
export const normalizePaginatedResponse = (response) => {
  const data = response?.data || {};
  
  return {
    results: safeArray(data.results || data),
    count: safeValue(data.count, 0),
    next: data.next || null,
    previous: data.previous || null,
    page_size: safeValue(data.page_size, 20)
  };
};

// Función para retry automático en caso de errores de red
export const retryApiCall = async (apiCall, maxRetries = 3, delay = 1000) => {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error;
      
      // Solo reintentar en errores de red o timeouts
      if (error.code === 'NETWORK_ERROR' || error.code === 'ECONNABORTED') {
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
          continue;
        }
      }
      
      // Si no es un error de red, no reintentar
      throw error;
    }
  }
  
  throw lastError;
};

// Función para logging de debug
export const debugLog = (message, data = null) => {
  if (process.env.NODE_ENV === 'development') {
    console.group(`🐛 ${message}`);
    if (data) {
      console.log('Data:', data);
    }
    console.trace();
    console.groupEnd();
  }
};

// Hook para manejar estados de carga
export const createLoadingState = () => {
  return {
    loading: false,
    error: null,
    data: null
  };
};

// Función para formatear errores de validación del backend Django
export const formatValidationErrors = (errors) => {
  if (!errors || typeof errors !== 'object') {
    return 'Error de validación desconocido';
  }
  
  const formattedErrors = [];
  
  Object.keys(errors).forEach(field => {
    const fieldErrors = errors[field];
    if (Array.isArray(fieldErrors)) {
      fieldErrors.forEach(error => {
        formattedErrors.push(`${field}: ${error}`);
      });
    } else if (typeof fieldErrors === 'string') {
      formattedErrors.push(`${field}: ${fieldErrors}`);
    }
  });
  
  return formattedErrors.join('\n');
};

// Función para verificar conectividad con el backend
export const checkBackendConnection = async () => {
  try {
    const response = await api.get('/products/test/');
    return { connected: true, message: 'Conexión exitosa' };
  } catch (error) {
    console.error('Backend connection failed:', error);
    return { 
      connected: false, 
      message: error.message || 'Error de conexión con el servidor' 
    };
  }
};

// Función para crear timestamps de audit
export const createAuditInfo = () => {
  return {
    timestamp: new Date().toISOString(),
    user_agent: navigator.userAgent,
    url: window.location.href
  };
};

export const cleanParams = (params = {}) => {
  const cleaned = {};
  
  Object.keys(params).forEach(key => {
    const value = params[key];
    
    // CORRECCIÓN CRÍTICA: Solo incluir parámetros con valores reales
    // Excluir: null, undefined, strings vacíos, "todos", "all"
    if (
      value !== null && 
      value !== undefined && 
      value !== '' &&
      value !== 'todos' &&
      value !== 'all' &&
      !(typeof value === 'string' && value.trim() === '')
    ) {
      cleaned[key] = value;
    }
  });
  
  console.log('🧹 cleanParams - Original:', params);
  console.log('🧹 cleanParams - Limpio:', cleaned);
  
  return cleaned;
};

export default api;
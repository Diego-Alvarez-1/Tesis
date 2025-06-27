// src/utils/dataValidation.js

/**
 * Utilidades para validación y normalización de datos del API
 */

// Validar si un valor es numérico y seguro para operaciones matemáticas
export const safeNumber = (value, defaultValue = 0) => {
  if (value === null || value === undefined || isNaN(value)) {
    return defaultValue;
  }
  return parseFloat(value);
};

// Formatear números con decimales de forma segura
export const safeToFixed = (value, decimals = 2, defaultValue = '0.00') => {
  const num = safeNumber(value);
  if (num === 0 && (value === null || value === undefined)) {
    return defaultValue;
  }
  return num.toFixed(decimals);
};

// Validar strings de forma segura
export const safeString = (value, defaultValue = '') => {
  if (value === null || value === undefined) {
    return defaultValue;
  }
  return String(value);
};

// Validar arrays de forma segura
export const safeArray = (value, defaultValue = []) => {
  if (!Array.isArray(value)) {
    return defaultValue;
  }
  return value;
};

// Validar objetos de forma segura
export const safeObject = (value, defaultValue = {}) => {
  if (value === null || value === undefined || typeof value !== 'object') {
    return defaultValue;
  }
  return value;
};

// Acceso seguro a propiedades anidadas (como lodash.get)
export const safeGet = (object, path, defaultValue = undefined) => {
  if (!object || typeof object !== 'object') {
    return defaultValue;
  }
  
  const keys = path.split('.');
  let result = object;
  
  for (const key of keys) {
    if (result === null || result === undefined || !(key in result)) {
      return defaultValue;
    }
    result = result[key];
  }
  
  return result;
};

// Normalizar datos de producto
export const normalizeProduct = (product) => {
  if (!product) return null;
  
  return {
    id: safeNumber(product.id),
    code: safeString(product.code),
    name: safeString(product.name),
    category_name: safeString(product.category_name),
    supplier_name: safeString(product.supplier_name),
    sale_price: safeNumber(product.sale_price),
    cost_price: safeNumber(product.cost_price),
    current_stock: safeNumber(product.current_stock),
    min_stock: safeNumber(product.min_stock),
    max_stock: safeNumber(product.max_stock),
    reorder_point: safeNumber(product.reorder_point),
    stock_status: safeString(product.stock_status, 'NORMAL'),
    needs_reorder: Boolean(product.needs_reorder),
    is_active: Boolean(product.is_active),
    profit_margin: safeNumber(product.profit_margin),
    is_perishable: Boolean(product.is_perishable),
    expiration_days: safeNumber(product.expiration_days),
    brand: safeString(product.brand),
    unit: safeString(product.unit, 'UNIDAD'),
    barcode: safeString(product.barcode),
    description: safeString(product.description),
    category: safeNumber(product.category),
    supplier: safeNumber(product.supplier),
    created_at: product.created_at,
    updated_at: product.updated_at
  };
};

// Normalizar datos de venta
export const normalizeSale = (sale) => {
  if (!sale) return null;
  
  return {
    id: safeNumber(sale.id),
    sale_number: safeString(sale.sale_number),
    customer_name: safeString(sale.customer_name, 'Cliente General'),
    seller_name: safeString(sale.seller_name),
    payment_method: safeString(sale.payment_method),
    status: safeString(sale.status),
    subtotal: safeNumber(sale.subtotal),
    discount_percentage: safeNumber(sale.discount_percentage),
    discount_amount: safeNumber(sale.discount_amount),
    tax: safeNumber(sale.tax),
    total: safeNumber(sale.total),
    sale_date: sale.sale_date,
    items: safeArray(sale.items).map(item => ({
      id: safeNumber(item.id),
      product_name: safeString(item.product_name),
      product_code: safeString(item.product_code),
      quantity: safeNumber(item.quantity),
      unit_price: safeNumber(item.unit_price),
      discount_percentage: safeNumber(item.discount_percentage),
      total_price: safeNumber(item.total_price),
      unit_cost: safeNumber(item.unit_cost),
      total_cost: safeNumber(item.total_cost),
      profit: safeNumber(item.profit)
    })),
    items_count: safeNumber(sale.items_count),
    notes: safeString(sale.notes),
    customer: safeNumber(sale.customer),
    created_at: sale.created_at,
    updated_at: sale.updated_at
  };
};

// Normalizar datos de cliente
export const normalizeCustomer = (customer) => {
  if (!customer) return null;
  
  return {
    id: safeNumber(customer.id),
    first_name: safeString(customer.first_name),
    last_name: safeString(customer.last_name),
    full_name: safeString(customer.full_name),
    document_type: safeString(customer.document_type, 'DNI'),
    document_number: safeString(customer.document_number),
    phone: safeString(customer.phone),
    email: safeString(customer.email),
    address: safeString(customer.address),
    customer_type: safeString(customer.customer_type, 'REGULAR'),
    credit_limit: safeNumber(customer.credit_limit),
    current_debt: safeNumber(customer.current_debt),
    available_credit: safeNumber(customer.available_credit),
    total_purchases: safeNumber(customer.total_purchases),
    purchase_count: safeNumber(customer.purchase_count),
    average_purchase: safeNumber(customer.average_purchase),
    last_purchase_date: customer.last_purchase_date,
    is_active: Boolean(customer.is_active),
    birth_date: customer.birth_date,
    created_at: customer.created_at,
    updated_at: customer.updated_at
  };
};

// Normalizar datos de inventario
export const normalizeInventoryItem = (item) => {
  if (!item) return null;
  
  return {
    id: safeNumber(item.id),
    product_id: safeNumber(item.product_id),
    product_code: safeString(item.product_code),
    product_name: safeString(item.product_name),
    category_name: safeString(item.category_name),
    current_stock: safeNumber(item.current_stock),
    min_stock: safeNumber(item.min_stock),
    reorder_point: safeNumber(item.reorder_point),
    stock_status: safeString(item.stock_status, 'NORMAL'),
    days_of_stock: safeNumber(item.days_of_stock, 0),
    suggested_order: safeNumber(item.suggested_order),
    priority: safeString(item.priority, 'LOW')
  };
};

// Normalizar datos de predicción ML
export const normalizePrediction = (prediction) => {
  if (!prediction) return null;
  
  return {
    date: prediction.date,
    predicted_quantity: safeNumber(prediction.predicted_quantity),
    lower_bound: safeNumber(prediction.lower_bound),
    upper_bound: safeNumber(prediction.upper_bound),
    is_weekend: Boolean(prediction.is_weekend),
    is_holiday: Boolean(prediction.is_holiday)
  };
};

// Validar respuesta de API
export const validateApiResponse = (response, expectedFields = []) => {
  if (!response || !response.data) {
    return { isValid: false, error: 'Respuesta de API inválida' };
  }
  
  const data = response.data;
  const missingFields = expectedFields.filter(field => !(field in data));
  
  if (missingFields.length > 0) {
    return { 
      isValid: false, 
      error: `Campos faltantes: ${missingFields.join(', ')}` 
    };
  }
  
  return { isValid: true, data };
};

// Normalizar respuesta paginada
export const normalizePaginatedResponse = (response, normalizeItem = (item) => item) => {
  const data = safeGet(response, 'data', {});
  
  return {
    results: safeArray(data.results || data).map(normalizeItem),
    count: safeNumber(data.count),
    next: data.next,
    previous: data.previous,
    page_size: safeNumber(data.page_size, 20)
  };
};

export default {
  safeNumber,
  safeToFixed,
  safeString,
  safeArray,
  safeObject,
  safeGet,
  normalizeProduct,
  normalizeSale,
  normalizeCustomer,
  normalizeInventoryItem,
  normalizePrediction,
  validateApiResponse,
  normalizePaginatedResponse
};
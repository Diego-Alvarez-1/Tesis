import React, { useState, useEffect } from 'react';
import { 
  productsAPI, 
  categoriesAPI, 
  suppliersAPI,
  formatCurrency,
  showAlert,
  handleApiError,
  safeValue,
  safeString
} from '../services/api';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  
  // CORRECCIÓN: Filtros iniciales con valores que garantizan mostrar todos los productos
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    stock_status: '',
    needs_reorder: '',
    is_active: '' 
  });

  const [productForm, setProductForm] = useState({
    code: '',
    barcode: '',
    name: '',
    description: '',
    category: '',
    supplier: '',
    cost_price: '',
    sale_price: '',
    current_stock: '',
    min_stock: '',
    max_stock: '',
    reorder_point: '',
    unit: 'UNIDAD',
    brand: '',
    is_perishable: false,
    expiration_days: '',
    is_active: true
  });

// CORRECCIÓN PRINCIPAL: useEffect separados para carga inicial y filtros
useEffect(() => {
  console.log('🚀 Componente montado - Carga inicial');
  loadInitialData();
}, []); // Solo se ejecuta una vez al montar

useEffect(() => {
  console.log('🔍 Filtros cambiaron, recargando productos:', filters);
  // Solo recargar productos cuando cambian los filtros, no en la carga inicial
  if (categories.length > 0 && suppliers.length > 0) {
    loadProducts();
  }
}, [filters]); // Se ejecuta cuando cambian los filtros

const loadInitialData = async () => {
  try {
    setLoading(true);
    
    console.log('📦 Cargando categorías y proveedores...');
    // Primero cargar categorías y proveedores
    const [categoriesRes, suppliersRes] = await Promise.allSettled([
      categoriesAPI.getCategories({ is_active: true }),
      suppliersAPI.getSuppliers({ is_active: true })
    ]);
    
    // Procesar categorías
    if (categoriesRes.status === 'fulfilled') {
      const categoriesData = categoriesRes.value.data;
      setCategories(categoriesData.results || categoriesData || []);
      console.log('✅ Categorías cargadas:', categoriesData.results?.length || 0);
    } else {
      console.error('❌ Error cargando categorías:', categoriesRes.reason);
      setCategories([]);
    }

    // Procesar proveedores
    if (suppliersRes.status === 'fulfilled') {
      const suppliersData = suppliersRes.value.data;
      setSuppliers(suppliersData.results || suppliersData || []);
      console.log('✅ Proveedores cargados:', suppliersData.results?.length || 0);
    } else {
      console.error('❌ Error cargando proveedores:', suppliersRes.reason);
      setSuppliers([]);
    }
    
    // CORRECCIÓN CRÍTICA: Cargar productos sin filtros restrictivos
    console.log('🛍️ Cargando todos los productos...');
    const productsResponse = await productsAPI.getProducts({});
    const productsData = productsResponse.data;
    const productsList = productsData.results || productsData || [];
    setProducts(productsList);
    console.log('✅ Productos cargados:', productsList.length);
    
  } catch (error) {
    console.error('❌ Error en carga inicial:', error);
    handleApiError(error, 'Error cargando datos iniciales');
  } finally {
    setLoading(false);
  }
};

// FUNCIÓN MEJORADA: Solo carga productos con filtros limpios
const loadProducts = async () => {
  try {
    console.log('🔄 Cargando productos con filtros:', filters);
    
    // CORRECCIÓN CRÍTICA: Limpiar filtros vacíos y manejar casos especiales
    const cleanFilters = {};
    
    // Solo incluir filtros que tienen valores válidos
    if (filters.search && filters.search.trim()) {
      cleanFilters.search = filters.search.trim();
    }
    
    if (filters.category && filters.category !== '') {
      cleanFilters.category = filters.category;
    }
    
    if (filters.stock_status && filters.stock_status !== '') {
      cleanFilters.stock_status = filters.stock_status;
    }
    
    if (filters.needs_reorder && filters.needs_reorder !== '') {
      cleanFilters.needs_reorder = filters.needs_reorder;
    }
    
    // IMPORTANTE: Solo incluir is_active si no es 'todos'
    if (filters.is_active && filters.is_active !== '' && filters.is_active !== 'all') {
      cleanFilters.is_active = filters.is_active;
    }
    
    console.log('🧹 Filtros limpios enviados:', cleanFilters);
    
    const response = await productsAPI.getProducts(cleanFilters);
    const productsData = response.data;
    const productsList = productsData.results || productsData || [];
    
    console.log('✅ Productos recibidos:', productsList.length);
    setProducts(productsList);
    
  } catch (error) {
    console.error('❌ Error cargando productos:', error);
    handleApiError(error, 'Error cargando productos');
    setProducts([]);
  }
};

  // FUNCIÓN MEJORADA: Manejo de cambios de filtros
  const handleFilterChange = (field, value) => {
    console.log(`🔄 Cambiando filtro ${field} a:`, value);
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // FUNCIÓN MEJORADA: Limpiar filtros
  const clearFilters = () => {
    console.log('🧹 Limpiando todos los filtros');
    setFilters({
      search: '',
      category: '',
      stock_status: '',
      needs_reorder: '',
      is_active: '' 
    });
  };

  const resetForm = () => {
    setProductForm({
      code: '',
      barcode: '',
      name: '',
      description: '',
      category: '',
      supplier: '',
      cost_price: '',
      sale_price: '',
      current_stock: '',
      min_stock: '',
      max_stock: '',
      reorder_point: '',
      unit: 'UNIDAD',
      brand: '',
      is_perishable: false,
      expiration_days: '',
      is_active: true
    });
    setEditingProduct(null);
  };

  const openModal = (product = null) => {
    if (product) {
      setProductForm({
        code: product.code || '',
        barcode: product.barcode || '',
        name: product.name || '',
        description: product.description || '',
        category: product.category || '',
        supplier: product.supplier || '',
        cost_price: product.cost_price || '',
        sale_price: product.sale_price || '',
        current_stock: product.current_stock || '',
        min_stock: product.min_stock || '',
        max_stock: product.max_stock || '',
        reorder_point: product.reorder_point || '',
        unit: product.unit || 'UNIDAD',
        brand: product.brand || '',
        is_perishable: product.is_perishable || false,
        expiration_days: product.expiration_days || '',
        is_active: product.is_active !== undefined ? product.is_active : true
      });
      setEditingProduct(product);
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    // Validaciones básicas
    if (!productForm.name.trim()) {
      showAlert('El nombre del producto es obligatorio', 'warning');
      return;
    }
    if (!productForm.category) {
      showAlert('Seleccione una categoría', 'warning');
      return;
    }
    if (parseFloat(productForm.cost_price) <= 0) {
      showAlert('El precio de costo debe ser mayor a 0', 'warning');
      return;
    }
    if (parseFloat(productForm.sale_price) <= parseFloat(productForm.cost_price)) {
      showAlert('El precio de venta debe ser mayor al precio de costo', 'warning');
      return;
    }

    // Preparar datos para envío
    const formData = {
      ...productForm,
      cost_price: parseFloat(productForm.cost_price) || 0,
      sale_price: parseFloat(productForm.sale_price) || 0,
      current_stock: parseInt(productForm.current_stock) || 0,
      min_stock: parseInt(productForm.min_stock) || 0,
      max_stock: parseInt(productForm.max_stock) || 100,
      reorder_point: parseInt(productForm.reorder_point) || 0,
      expiration_days: productForm.expiration_days ? parseInt(productForm.expiration_days) : null,
      supplier: productForm.supplier || null
    };

    let response;
    if (editingProduct) {
      response = await productsAPI.updateProduct(editingProduct.id, formData);
      showAlert('Producto actualizado exitosamente', 'success');
    } else {
      response = await productsAPI.createProduct(formData);
      showAlert('Producto creado exitosamente', 'success');
      
      // Crear movimiento de stock inicial si hay stock inicial
      if (formData.current_stock > 0) {
        try {
          await productsAPI.updateStock(response.data.id, {
            quantity: formData.current_stock,
            reason: 'Stock inicial del producto'
          });
          console.log('✅ Movimiento de stock inicial creado');
        } catch (stockError) {
          console.error('❌ Error creando movimiento de stock inicial:', stockError);
        }
      }
    }
    
    closeModal();
    // CORRECCIÓN: Recargar solo productos, no todo
    await loadProducts();
  } catch (error) {
    console.error('❌ Error guardando producto:', error);
    handleApiError(error, 'Error guardando producto');
  }
};

  const handleDelete = async (product) => {
    if (window.confirm(`¿Está seguro de eliminar el producto "${product.name}"?`)) {
      try {
        await productsAPI.deleteProduct(product.id);
        showAlert('Producto eliminado exitosamente', 'success');
        await loadProducts(); // Recargar productos
      } catch (error) {
        console.error('Error eliminando producto:', error);
        handleApiError(error, 'Error eliminando producto');
      }
    }
  };

  const handleStockUpdate = async (product, quantity) => {
    try {
      const reason = prompt('Razón del ajuste de stock:');
      if (reason !== null && reason.trim()) {
        await productsAPI.updateStock(product.id, { quantity, reason });
        showAlert('Stock actualizado exitosamente', 'success');
        await loadProducts(); // Recargar productos
      }
    } catch (error) {
      console.error('Error actualizando stock:', error);
      handleApiError(error, 'Error actualizando stock');
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Cargando productos...</p>
      </div>
    );
  }

  return (
    <div className="products-page">
      <div className="page-header">
        <h1>Gestión de Productos</h1>
        <button className="btn btn-primary" onClick={() => openModal()}>
          Nuevo Producto
        </button>
      </div>

      {/* Filtros CORREGIDOS */}
      <div className="card">
        <h3>Filtros</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Buscar</label>
            <input
              type="text"
              className="form-control"
              placeholder="Buscar por nombre, código..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Categoría</label>
            <select
              className="form-control"
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
            >
              <option value="">Todas las categorías</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Estado de Stock</label>
            <select
              className="form-control"
              value={filters.stock_status}
              onChange={(e) => handleFilterChange('stock_status', e.target.value)}
            >
              <option value="">Todos los estados</option>
              <option value="SIN_STOCK">Sin Stock</option>
              <option value="STOCK_BAJO">Stock Bajo</option>
              <option value="NORMAL">Normal</option>
              <option value="SOBRESTOCK">Sobrestock</option>
            </select>
          </div>
          <div className="form-group">
            <label>Necesita Reorden</label>
            <select
              className="form-control"
              value={filters.needs_reorder}
              onChange={(e) => handleFilterChange('needs_reorder', e.target.value)}
            >
              <option value="">Todos</option>
              <option value="true">Sí necesita</option>
              <option value="false">No necesita</option>
            </select>
          </div>
          <div className="form-group">
            <label>Estado del Producto</label>
            <select
              className="form-control"
              value={filters.is_active}
              onChange={(e) => handleFilterChange('is_active', e.target.value)}
            >
              <option value="">Todos los productos</option>
              <option value="true">Solo Activos</option>
              <option value="false">Solo Inactivos</option>
            </select>
          </div>
          <div className="form-group">
            <label>&nbsp;</label>
            <button 
              className="btn btn-secondary form-control"
              onClick={clearFilters}
            >
              Limpiar Filtros
            </button>
          </div>
        </div>
        
        {/* NUEVO: Información de filtros activos */}
        <div style={{ marginTop: '10px', fontSize: '0.9rem', color: '#666' }}>
          <strong>Mostrando:</strong> {products.length} productos
          {filters.search && ` | Búsqueda: "${filters.search}"`}
          {filters.category && ` | Categoría filtrada`}
          {filters.stock_status && ` | Estado: ${filters.stock_status}`}
          {filters.needs_reorder && ` | Reorden: ${filters.needs_reorder === 'true' ? 'Sí' : 'No'}`}
          {filters.is_active === 'true' && ` | Solo activos`}
          {filters.is_active === 'false' && ` | Solo inactivos`}
        </div>
      </div>

      {/* Tabla de productos */}
      <div className="card">
        <h3>Productos ({products.length})</h3>
        {products.length > 0 ? (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Categoría</th>
                  <th>Precio Venta</th>
                  <th>Stock</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {products.map(product => (
                  <tr key={product.id}>
                    <td>{safeString(product.code)}</td>
                    <td>{safeString(product.name)}</td>
                    <td>{safeString(product.category_name)}</td>
                    <td>{formatCurrency(safeValue(product.sale_price, 0))}</td>
                    <td>
                      {safeValue(product.current_stock, 0)}
                      {product.needs_reorder && (
                        <span className="alert alert-warning" style={{ 
                          marginLeft: '0.5rem', 
                          padding: '0.25rem', 
                          fontSize: '0.8rem' 
                        }}>
                          ¡Reorden!
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`alert ${
                        product.stock_status === 'SIN_STOCK' ? 'alert-danger' :
                        product.stock_status === 'STOCK_BAJO' ? 'alert-warning' :
                        product.stock_status === 'SOBRESTOCK' ? 'alert-info' :
                        'alert-success'
                      }`} style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>
                        {safeString(product.stock_status, 'NORMAL')}
                      </span>
                    </td>
                    <td>
                      <button 
                        className="btn btn-small btn-primary"
                        onClick={() => openModal(product)}
                      >
                        Editar
                      </button>
                      <button 
                        className="btn btn-small btn-warning"
                        onClick={() => {
                          const quantity = prompt('Cantidad a agregar (negativo para quitar):');
                          if (quantity !== null && !isNaN(quantity)) {
                            handleStockUpdate(product, parseInt(quantity));
                          }
                        }}
                      >
                        Stock
                      </button>
                      <button 
                        className="btn btn-small btn-danger"
                        onClick={() => handleDelete(product)}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="alert alert-info">
            <h4>No se encontraron productos</h4>
            <p>
              {Object.values(filters).some(f => f && f !== '') 
                ? 'No hay productos que coincidan con los filtros aplicados. Intenta limpiar los filtros.' 
                : 'No hay productos creados aún. Crea tu primer producto usando el botón "Nuevo Producto".'
              }
            </p>
            {Object.values(filters).some(f => f && f !== '') && (
              <button className="btn btn-primary" onClick={clearFilters}>
                Limpiar Filtros y Ver Todos
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal de producto - MANTENIDO IGUAL */}
      {showModal && (
        <div className="modal show">
          <div className="modal-content" style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h2>{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</h2>
              <span className="close" onClick={closeModal}>&times;</span>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Código *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={productForm.code}
                    onChange={(e) => setProductForm(prev => ({
                      ...prev,
                      code: e.target.value
                    }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Código de Barras</label>
                  <input
                    type="text"
                    className="form-control"
                    value={productForm.barcode}
                    onChange={(e) => setProductForm(prev => ({
                      ...prev,
                      barcode: e.target.value
                    }))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Nombre *</label>
                <input
                  type="text"
                  className="form-control"
                  value={productForm.name}
                  onChange={(e) => setProductForm(prev => ({
                    ...prev,
                    name: e.target.value
                  }))}
                  required
                />
              </div>

              <div className="form-group">
                <label>Descripción</label>
                <textarea
                  className="form-control"
                  value={productForm.description}
                  onChange={(e) => setProductForm(prev => ({
                    ...prev,
                    description: e.target.value
                  }))}
                  rows="3"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Categoría *</label>
                  <select
                    className="form-control"
                    value={productForm.category}
                    onChange={(e) => setProductForm(prev => ({
                      ...prev,
                      category: e.target.value
                    }))}
                    required
                  >
                    <option value="">Seleccionar categoría</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Proveedor</label>
                  <select
                    className="form-control"
                    value={productForm.supplier}
                    onChange={(e) => setProductForm(prev => ({
                      ...prev,
                      supplier: e.target.value
                    }))}
                  >
                    <option value="">Seleccionar proveedor</option>
                    {suppliers.map(sup => (
                      <option key={sup.id} value={sup.id}>{sup.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Precio Costo *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-control"
                    value={productForm.cost_price}
                    onChange={(e) => setProductForm(prev => ({
                      ...prev,
                      cost_price: e.target.value
                    }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Precio Venta *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-control"
                    value={productForm.sale_price}
                    onChange={(e) => setProductForm(prev => ({
                      ...prev,
                      sale_price: e.target.value
                    }))}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Stock Actual</label>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    value={productForm.current_stock}
                    onChange={(e) => setProductForm(prev => ({
                      ...prev,
                      current_stock: e.target.value
                    }))}
                  />
                </div>
                <div className="form-group">
                  <label>Stock Mínimo</label>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    value={productForm.min_stock}
                    onChange={(e) => setProductForm(prev => ({
                      ...prev,
                      min_stock: e.target.value
                    }))}
                  />
                </div>
                <div className="form-group">
                  <label>Stock Máximo</label>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    value={productForm.max_stock}
                    onChange={(e) => setProductForm(prev => ({
                      ...prev,
                      max_stock: e.target.value
                    }))}
                  />
                </div>
                <div className="form-group">
                  <label>Punto Reorden</label>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    value={productForm.reorder_point}
                    onChange={(e) => setProductForm(prev => ({
                      ...prev,
                      reorder_point: e.target.value
                    }))}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Unidad</label>
                  <select
                    className="form-control"
                    value={productForm.unit}
                    onChange={(e) => setProductForm(prev => ({
                      ...prev,
                      unit: e.target.value
                    }))}
                  >
                    <option value="UNIDAD">Unidad</option>
                    <option value="KG">Kilogramo</option>
                    <option value="LITRO">Litro</option>
                    <option value="PAQUETE">Paquete</option>
                    <option value="CAJA">Caja</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Marca</label>
                  <input
                    type="text"
                    className="form-control"
                    value={productForm.brand}
                    onChange={(e) => setProductForm(prev => ({
                      ...prev,
                      brand: e.target.value
                    }))}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={productForm.is_perishable}
                      onChange={(e) => setProductForm(prev => ({
                        ...prev,
                        is_perishable: e.target.checked
                      }))}
                    />
                    {' '}Es Perecedero
                  </label>
                </div>
                {productForm.is_perishable && (
                  <div className="form-group">
                    <label>Días hasta Vencimiento</label>
                    <input
                      type="number"
                      min="1"
                      className="form-control"
                      value={productForm.expiration_days}
                      onChange={(e) => setProductForm(prev => ({
                        ...prev,
                        expiration_days: e.target.value
                      }))}
                    />
                  </div>
                )}
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={productForm.is_active}
                      onChange={(e) => setProductForm(prev => ({
                        ...prev,
                        is_active: e.target.checked
                      }))}
                    />
                    {' '}Activo
                  </label>
                </div>
              </div>

              <div className="form-group" style={{ textAlign: 'right' }}>
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingProduct ? 'Actualizar' : 'Crear'} Producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
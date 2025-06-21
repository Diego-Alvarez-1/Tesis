import React, { useState, useEffect } from 'react';
import { 
  productsAPI, 
  categoriesAPI, 
  suppliersAPI,
  formatCurrency,
  showAlert 
} from '../services/api';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    stock_status: '',
    needs_reorder: ''
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
    expiration_days: ''
  });

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [productsRes, categoriesRes, suppliersRes] = await Promise.all([
        productsAPI.getProducts(filters),
        categoriesAPI.getCategories(),
        suppliersAPI.getSuppliers()
      ]);
      
      setProducts(productsRes.data.results || productsRes.data);
      setCategories(categoriesRes.data.results || categoriesRes.data);
      setSuppliers(suppliersRes.data.results || suppliersRes.data);
    } catch (error) {
      console.error('Error cargando datos:', error);
      showAlert('Error cargando productos', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
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
      expiration_days: ''
    });
    setEditingProduct(null);
  };

  const openModal = (product = null) => {
    if (product) {
      setProductForm({
        code: product.code,
        barcode: product.barcode || '',
        name: product.name,
        description: product.description || '',
        category: product.category,
        supplier: product.supplier || '',
        cost_price: product.cost_price,
        sale_price: product.sale_price,
        current_stock: product.current_stock,
        min_stock: product.min_stock,
        max_stock: product.max_stock,
        reorder_point: product.reorder_point,
        unit: product.unit,
        brand: product.brand || '',
        is_perishable: product.is_perishable,
        expiration_days: product.expiration_days || ''
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
      if (editingProduct) {
        await productsAPI.updateProduct(editingProduct.id, productForm);
        showAlert('Producto actualizado exitosamente', 'success');
      } else {
        await productsAPI.createProduct(productForm);
        showAlert('Producto creado exitosamente', 'success');
      }
      closeModal();
      loadData();
    } catch (error) {
      console.error('Error guardando producto:', error);
      showAlert('Error guardando producto', 'danger');
    }
  };

  const handleDelete = async (product) => {
    if (window.confirm(`¿Está seguro de eliminar el producto "${product.name}"?`)) {
      try {
        await productsAPI.deleteProduct(product.id);
        showAlert('Producto eliminado exitosamente', 'success');
        loadData();
      } catch (error) {
        console.error('Error eliminando producto:', error);
        showAlert('Error eliminando producto', 'danger');
      }
    }
  };

  const handleStockUpdate = async (product, quantity) => {
    try {
      const reason = prompt('Razón del ajuste de stock:');
      if (reason !== null) {
        await productsAPI.updateStock(product.id, { quantity, reason });
        showAlert('Stock actualizado exitosamente', 'success');
        loadData();
      }
    } catch (error) {
      console.error('Error actualizando stock:', error);
      showAlert('Error actualizando stock', 'danger');
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

      {/* Filtros */}
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
              <option value="">Todos</option>
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
              <option value="true">Sí</option>
              <option value="false">No</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de productos */}
      <div className="card">
        <h3>Productos ({products.length})</h3>
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
                  <td>{product.code}</td>
                  <td>{product.name}</td>
                  <td>{product.category_name}</td>
                  <td>{formatCurrency(product.sale_price)}</td>
                  <td>
                    {product.current_stock}
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
                      {product.stock_status}
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
                        if (quantity !== null) {
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
      </div>

      {/* Modal de producto */}
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
                      className="form-control"
                      value={productForm.expiration_days}
                      onChange={(e) => setProductForm(prev => ({
                        ...prev,
                        expiration_days: e.target.value
                      }))}
                    />
                  </div>
                )}
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
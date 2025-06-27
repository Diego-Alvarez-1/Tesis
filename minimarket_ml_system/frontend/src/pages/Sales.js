import React, { useState, useEffect } from 'react';
import { 
  salesAPI, 
  customersAPI,
  productsAPI,
  formatCurrency,
  showAlert,
  handleApiError,
  safeValue,
  safeString
} from '../services/api';

const Sales = () => {
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showNewSaleModal, setShowNewSaleModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);

  // Estado para nueva venta
  const [newSale, setNewSale] = useState({
    customer: '',
    payment_method: 'CASH',
    discount_percentage: 0,
    notes: '',
    items: []
  });

  const [searchProduct, setSearchProduct] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [itemQuantity, setItemQuantity] = useState(1);

  const [filters, setFilters] = useState({
    search: '',
    payment_method: '',
    status: '',
    date_from: '',
    date_to: ''
  });

  useEffect(() => {
    loadData();
  }, [filters]);

  useEffect(() => {
    loadProducts();
    loadCustomers();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await salesAPI.getSales(filters);
      const salesData = response.data;
      setSales(salesData.results || salesData || []);
    } catch (error) {
      console.error('Error cargando ventas:', error);
      handleApiError(error, 'Error cargando ventas');
      setSales([]);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await productsAPI.getProducts({ is_active: true, page_size: 1000 });
      const productsData = response.data;
      setProducts(productsData.results || productsData || []);
    } catch (error) {
      console.error('Error cargando productos:', error);
      setProducts([]);
    }
  };

  const loadCustomers = async () => {
    try {
      const response = await customersAPI.getCustomers({ is_active: true, page_size: 1000 });
      const customersData = response.data;
      setCustomers(customersData.results || customersData || []);
    } catch (error) {
      console.error('Error cargando clientes:', error);
      setCustomers([]);
    }
  };

  const openSaleModal = async (sale) => {
    try {
      // Obtener detalles completos de la venta
      const response = await salesAPI.getSale(sale.id);
      setSelectedSale(response.data);
      setShowModal(true);
    } catch (error) {
      console.error('Error cargando detalles de venta:', error);
      handleApiError(error, 'Error cargando detalles de venta');
    }
  };

  const openNewSaleModal = () => {
    setNewSale({
      customer: '',
      payment_method: 'CASH',
      discount_percentage: 0,
      notes: '',
      items: []
    });
    setSelectedProduct(null);
    setSearchProduct('');
    setItemQuantity(1);
    setShowNewSaleModal(true);
  };

  const addItemToSale = () => {
    if (!selectedProduct || itemQuantity <= 0) {
      showAlert('Seleccione un producto y cantidad válida', 'warning');
      return;
    }

    // Verificar stock disponible
    if (itemQuantity > selectedProduct.current_stock) {
      showAlert(`Stock insuficiente. Disponible: ${selectedProduct.current_stock}`, 'warning');
      return;
    }

    // Verificar si el producto ya está en la venta
    const existingItemIndex = newSale.items.findIndex(
      item => item.product === selectedProduct.id
    );

    if (existingItemIndex >= 0) {
      // Actualizar cantidad del item existente
      const updatedItems = [...newSale.items];
      const newQuantity = updatedItems[existingItemIndex].quantity + itemQuantity;
      
      if (newQuantity > selectedProduct.current_stock) {
        showAlert(`Stock insuficiente. Disponible: ${selectedProduct.current_stock}`, 'warning');
        return;
      }
      
      updatedItems[existingItemIndex].quantity = newQuantity;
      setNewSale(prev => ({ ...prev, items: updatedItems }));
    } else {
      // Agregar nuevo item
      const newItem = {
        product: selectedProduct.id,
        product_name: selectedProduct.name,
        quantity: itemQuantity,
        unit_price: selectedProduct.sale_price,
        discount_percentage: 0
      };
      setNewSale(prev => ({
        ...prev,
        items: [...prev.items, newItem]
      }));
    }

    setSelectedProduct(null);
    setSearchProduct('');
    setItemQuantity(1);
  };

  const removeItemFromSale = (index) => {
    const updatedItems = newSale.items.filter((_, i) => i !== index);
    setNewSale(prev => ({ ...prev, items: updatedItems }));
  };

  const updateItemQuantity = (index, quantity) => {
    if (quantity <= 0) return;
    
    const item = newSale.items[index];
    const product = products.find(p => p.id === item.product);
    
    if (product && quantity > product.current_stock) {
      showAlert(`Stock insuficiente. Disponible: ${product.current_stock}`, 'warning');
      return;
    }
    
    const updatedItems = [...newSale.items];
    updatedItems[index].quantity = quantity;
    setNewSale(prev => ({ ...prev, items: updatedItems }));
  };

  const updateItemDiscount = (index, discount) => {
    if (discount < 0 || discount > 100) return;
    
    const updatedItems = [...newSale.items];
    updatedItems[index].discount_percentage = discount;
    setNewSale(prev => ({ ...prev, items: updatedItems }));
  };

  const calculateSaleTotal = () => {
    const subtotal = newSale.items.reduce((total, item) => {
      const itemTotal = item.quantity * item.unit_price;
      const itemDiscount = itemTotal * (item.discount_percentage / 100);
      return total + (itemTotal - itemDiscount);
    }, 0);
    
    const generalDiscount = subtotal * (newSale.discount_percentage / 100);
    return subtotal - generalDiscount;
  };

  const submitNewSale = async (e) => {
    e.preventDefault();
    
    if (newSale.items.length === 0) {
      showAlert('Agregue al menos un producto a la venta', 'warning');
      return;
    }

    try {
      // Validar stock antes de crear la venta
      for (const item of newSale.items) {
        const product = products.find(p => p.id === item.product);
        if (product && item.quantity > product.current_stock) {
          showAlert(`Stock insuficiente para ${product.name}. Disponible: ${product.current_stock}`, 'warning');
          return;
        }
      }

      // Preparar datos de la venta
      const saleData = {
        ...newSale,
        customer: newSale.customer || null, // null si no hay cliente seleccionado
        items: newSale.items.map(item => ({
          product: item.product,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_percentage: item.discount_percentage || 0
        }))
      };

      console.log('Enviando venta:', saleData);
      
      await salesAPI.createSale(saleData);
      showAlert('Venta creada exitosamente', 'success');
      setShowNewSaleModal(false);
      
      // Recargar datos
      loadData();
      loadProducts(); // Recargar productos para actualizar stock
      
    } catch (error) {
      console.error('Error creando venta:', error);
      if (error.response?.data) {
        console.error('Detalles del error:', error.response.data);
      }
      handleApiError(error, 'Error creando venta');
    }
  };

  const cancelSale = async (sale) => {
    if (window.confirm(`¿Está seguro de cancelar la venta ${sale.sale_number}?`)) {
      try {
        await salesAPI.cancelSale(sale.id);
        showAlert('Venta cancelada exitosamente', 'success');
        loadData();
      } catch (error) {
        console.error('Error cancelando venta:', error);
        handleApiError(error, 'Error cancelando venta');
      }
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchProduct.toLowerCase()) ||
    product.code.toLowerCase().includes(searchProduct.toLowerCase())
  );

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Cargando ventas...</p>
      </div>
    );
  }

  return (
    <div className="sales-page">
      <div className="page-header">
        <h1>Gestión de Ventas</h1>
        <button className="btn btn-primary" onClick={openNewSaleModal}>
          Nueva Venta
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
              placeholder="Número de venta, cliente..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label>Método de Pago</label>
            <select
              className="form-control"
              value={filters.payment_method}
              onChange={(e) => setFilters(prev => ({ ...prev, payment_method: e.target.value }))}
            >
              <option value="">Todos</option>
              <option value="CASH">Efectivo</option>
              <option value="CARD">Tarjeta</option>
              <option value="TRANSFER">Transferencia</option>
              <option value="CREDIT">Crédito</option>
              <option value="YAPE">Yape</option>
              <option value="PLIN">Plin</option>
            </select>
          </div>
          <div className="form-group">
            <label>Estado</label>
            <select
              className="form-control"
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            >
              <option value="">Todos</option>
              <option value="COMPLETED">Completada</option>
              <option value="PENDING">Pendiente</option>
              <option value="CANCELLED">Cancelada</option>
            </select>
          </div>
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
        </div>
      </div>

      {/* Tabla de ventas */}
      <div className="card">
        <h3>Ventas ({sales.length})</h3>
        {sales.length > 0 ? (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Cliente</th>
                  <th>Total</th>
                  <th>Método Pago</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sales.map(sale => (
                  <tr key={sale.id}>
                    <td>{safeString(sale.sale_number)}</td>
                    <td>{safeString(sale.customer_name, 'Cliente General')}</td>
                    <td>{formatCurrency(safeValue(sale.total, 0))}</td>
                    <td>{safeString(sale.payment_method)}</td>
                    <td>
                      <span className={`alert ${
                        sale.status === 'COMPLETED' ? 'alert-success' :
                        sale.status === 'PENDING' ? 'alert-warning' :
                        'alert-danger'
                      }`} style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>
                        {safeString(sale.status)}
                      </span>
                    </td>
                    <td>{sale.sale_date ? new Date(sale.sale_date).toLocaleDateString() : 'N/A'}</td>
                    <td>
                      <button 
                        className="btn btn-small btn-primary"
                        onClick={() => openSaleModal(sale)}
                      >
                        Ver
                      </button>
                      {sale.status === 'COMPLETED' && (
                        <button 
                          className="btn btn-small btn-danger"
                          onClick={() => cancelSale(sale)}
                        >
                          Cancelar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="alert alert-info">
            No se encontraron ventas con los filtros aplicados
          </div>
        )}
      </div>

      {/* Modal Nueva Venta */}
      {showNewSaleModal && (
        <div className="modal show">
          <div className="modal-content" style={{ maxWidth: '900px' }}>
            <div className="modal-header">
              <h2>Nueva Venta</h2>
              <span className="close" onClick={() => setShowNewSaleModal(false)}>&times;</span>
            </div>
            
            <form onSubmit={submitNewSale}>
              <div className="form-row">
                <div className="form-group">
                  <label>Cliente</label>
                  <select
                    className="form-control"
                    value={newSale.customer}
                    onChange={(e) => setNewSale(prev => ({ ...prev, customer: e.target.value }))}
                  >
                    <option value="">Cliente General</option>
                    {customers.map(customer => (
                      <option key={customer.id} value={customer.id}>
                        {customer.full_name} - {customer.document_number}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Método de Pago</label>
                  <select
                    className="form-control"
                    value={newSale.payment_method}
                    onChange={(e) => setNewSale(prev => ({ ...prev, payment_method: e.target.value }))}
                  >
                    <option value="CASH">Efectivo</option>
                    <option value="CARD">Tarjeta</option>
                    <option value="TRANSFER">Transferencia</option>
                    <option value="CREDIT">Crédito</option>
                    <option value="YAPE">Yape</option>
                    <option value="PLIN">Plin</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Descuento %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    className="form-control"
                    value={newSale.discount_percentage}
                    onChange={(e) => setNewSale(prev => ({ 
                      ...prev, 
                      discount_percentage: parseFloat(e.target.value) || 0 
                    }))}
                  />
                </div>
              </div>

              {/* Agregar productos */}
              <div className="card">
                <h4>Agregar Productos</h4>
                <div className="form-row">
                  <div className="form-group" style={{ flex: 2, position: 'relative' }}>
                    <label>Buscar Producto</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Buscar por nombre o código..."
                      value={searchProduct}
                      onChange={(e) => setSearchProduct(e.target.value)}
                    />
                    {searchProduct && filteredProducts.length > 0 && (
                      <div style={{ 
                        border: '1px solid #ddd', 
                        maxHeight: '200px', 
                        overflowY: 'auto',
                        backgroundColor: 'white',
                        position: 'absolute',
                        zIndex: 1000,
                        width: '100%',
                        borderRadius: '4px',
                        marginTop: '2px'
                      }}>
                        {filteredProducts.slice(0, 10).map(product => (
                          <div
                            key={product.id}
                            style={{ 
                              padding: '0.75rem', 
                              cursor: 'pointer',
                              borderBottom: '1px solid #eee'
                            }}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setSelectedProduct(product);
                              setSearchProduct(product.name);
                            }}
                          >
                            <strong>{product.name}</strong> - {product.code}<br/>
                            <small>Stock: {product.current_stock} | Precio: {formatCurrency(product.sale_price)}</small>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="form-group">
                    <label>Cantidad</label>
                    <input
                      type="number"
                      min="1"
                      className="form-control"
                      value={itemQuantity}
                      onChange={(e) => setItemQuantity(parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div className="form-group">
                    <label>&nbsp;</label>
                    <button 
                      type="button" 
                      className="btn btn-success form-control"
                      onClick={addItemToSale}
                      disabled={!selectedProduct}
                    >
                      Agregar
                    </button>
                  </div>
                </div>
              </div>

              {/* Items de la venta */}
              <div className="card">
                <h4>Items de la Venta</h4>
                {newSale.items.length > 0 ? (
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>Cantidad</th>
                        <th>Precio Unit.</th>
                        <th>Desc. %</th>
                        <th>Subtotal</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {newSale.items.map((item, index) => {
                        const itemSubtotal = item.quantity * item.unit_price;
                        const itemDiscount = itemSubtotal * (item.discount_percentage / 100);
                        const itemTotal = itemSubtotal - itemDiscount;
                        
                        return (
                          <tr key={index}>
                            <td>{item.product_name}</td>
                            <td>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || 1)}
                                style={{ width: '80px' }}
                              />
                            </td>
                            <td>{formatCurrency(item.unit_price)}</td>
                            <td>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                value={item.discount_percentage}
                                onChange={(e) => updateItemDiscount(index, parseFloat(e.target.value) || 0)}
                                style={{ width: '60px' }}
                              />
                            </td>
                            <td>{formatCurrency(itemTotal)}</td>
                            <td>
                              <button 
                                type="button"
                                className="btn btn-small btn-danger"
                                onClick={() => removeItemFromSale(index)}
                              >
                                Eliminar
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <p>No hay productos agregados</p>
                )}
              </div>

              {/* Total */}
              <div className="card">
                <div style={{ textAlign: 'right', fontSize: '1.2rem' }}>
                  <strong>Total: {formatCurrency(calculateSaleTotal())}</strong>
                </div>
              </div>

              <div className="form-group">
                <label>Notas</label>
                <textarea
                  className="form-control"
                  value={newSale.notes}
                  onChange={(e) => setNewSale(prev => ({ ...prev, notes: e.target.value }))}
                  rows="3"
                />
              </div>

              <div className="form-group" style={{ textAlign: 'right' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowNewSaleModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={newSale.items.length === 0}>
                  Crear Venta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ver Venta */}
      {showModal && selectedSale && (
        <div className="modal show">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Venta {selectedSale.sale_number}</h2>
              <span className="close" onClick={() => setShowModal(false)}>&times;</span>
            </div>
            
            <div className="grid grid-2">
              <div>
                <p><strong>Cliente:</strong> {safeString(selectedSale.customer_name, 'Cliente General')}</p>
                <p><strong>Vendedor:</strong> {safeString(selectedSale.seller_name)}</p>
                <p><strong>Método de Pago:</strong> {safeString(selectedSale.payment_method)}</p>
                <p><strong>Estado:</strong> {safeString(selectedSale.status)}</p>
              </div>
              <div>
                <p><strong>Fecha:</strong> {selectedSale.sale_date ? new Date(selectedSale.sale_date).toLocaleDateString() : 'N/A'}</p>
                <p><strong>Subtotal:</strong> {formatCurrency(safeValue(selectedSale.subtotal, 0))}</p>
                <p><strong>Descuento:</strong> {safeValue(selectedSale.discount_percentage, 0)}% ({formatCurrency(safeValue(selectedSale.discount_amount, 0))})</p>
                <p><strong>Total:</strong> {formatCurrency(safeValue(selectedSale.total, 0))}</p>
              </div>
            </div>

            {selectedSale.items && selectedSale.items.length > 0 && (
              <div>
                <h4>Items de la Venta</h4>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Cantidad</th>
                      <th>Precio Unit.</th>
                      <th>Descuento</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSale.items.map((item, index) => (
                      <tr key={index}>
                        <td>{safeString(item.product_name)}</td>
                        <td>{safeValue(item.quantity, 0)}</td>
                        <td>{formatCurrency(safeValue(item.unit_price, 0))}</td>
                        <td>{safeValue(item.discount_percentage, 0)}%</td>
                        <td>{formatCurrency(safeValue(item.total_price, 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {selectedSale.notes && (
              <div>
                <h4>Notas</h4>
                <p>{selectedSale.notes}</p>
              </div>
            )}

            <div style={{ textAlign: 'right', marginTop: '1rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                Cerrar
              </button>
              {selectedSale.status === 'COMPLETED' && (
                <button 
                  className="btn btn-danger" 
                  onClick={() => {
                    setShowModal(false);
                    cancelSale(selectedSale);
                  }}
                >
                  Cancelar Venta
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;
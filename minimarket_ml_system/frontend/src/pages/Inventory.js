import React, { useState, useEffect } from 'react';
import { 
  inventoryAPI, 
  productsAPI,
  suppliersAPI,
  formatCurrency,
  showAlert 
} from '../services/api';

const Inventory = () => {
  const [activeTab, setActiveTab] = useState('movements');
  const [loading, setLoading] = useState(true);
  
  // Stock Movements
  const [stockMovements, setStockMovements] = useState([]);
  const [movementFilters, setMovementFilters] = useState({
    product: '',
    movement_type: '',
    date_from: '',
    date_to: ''
  });

  // Purchase Orders
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [showPOModal, setShowPOModal] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [newPO, setNewPO] = useState({
    supplier: '',
    expected_date: '',
    notes: '',
    items: []
  });

  // Inventory Counts
  const [inventoryCounts, setInventoryCounts] = useState([]);
  const [showCountModal, setShowCountModal] = useState(false);
  const [newCount, setNewCount] = useState({
    description: '',
    scheduled_date: '',
    notes: ''
  });

  // Low Stock Report
  const [lowStockReport, setLowStockReport] = useState([]);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'movements') {
      loadStockMovements();
    }
  }, [movementFilters]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [productsRes, suppliersRes] = await Promise.all([
        productsAPI.getProducts({ is_active: true }),
        suppliersAPI.getSuppliers({ is_active: true })
      ]);
      
      setProducts(productsRes.data.results || productsRes.data);
      setSuppliers(suppliersRes.data.results || suppliersRes.data);

      if (activeTab === 'movements') {
        await loadStockMovements();
      } else if (activeTab === 'purchase-orders') {
        await loadPurchaseOrders();
      } else if (activeTab === 'inventory-counts') {
        await loadInventoryCounts();
      } else if (activeTab === 'reports') {
        await loadLowStockReport();
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      showAlert('Error cargando datos de inventario', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const loadStockMovements = async () => {
    try {
      const response = await inventoryAPI.getStockMovements(movementFilters);
      setStockMovements(response.data.results || response.data);
    } catch (error) {
      console.error('Error cargando movimientos:', error);
    }
  };

  const loadPurchaseOrders = async () => {
    try {
      const response = await inventoryAPI.getPurchaseOrders();
      setPurchaseOrders(response.data.results || response.data);
    } catch (error) {
      console.error('Error cargando órdenes de compra:', error);
    }
  };

  const loadInventoryCounts = async () => {
    try {
      const response = await inventoryAPI.getInventoryCounts();
      setInventoryCounts(response.data.results || response.data);
    } catch (error) {
      console.error('Error cargando conteos:', error);
    }
  };

  const loadLowStockReport = async () => {
    try {
      const response = await inventoryAPI.getLowStockReport();
      setLowStockReport(response.data.products || []);
    } catch (error) {
      console.error('Error cargando reporte de stock bajo:', error);
    }
  };

  const createPurchaseOrder = async (e) => {
    e.preventDefault();
    if (newPO.items.length === 0) {
      showAlert('Agregue al menos un producto a la orden', 'warning');
      return;
    }

    try {
      await inventoryAPI.createPurchaseOrder(newPO);
      showAlert('Orden de compra creada exitosamente', 'success');
      setShowPOModal(false);
      setNewPO({ supplier: '', expected_date: '', notes: '', items: [] });
      loadPurchaseOrders();
    } catch (error) {
      console.error('Error creando orden:', error);
      showAlert('Error creando orden de compra', 'danger');
    }
  };

  const approvePurchaseOrder = async (po) => {
    if (window.confirm(`¿Aprobar la orden de compra ${po.order_number}?`)) {
      try {
        await inventoryAPI.approvePurchaseOrder(po.id);
        showAlert('Orden de compra aprobada', 'success');
        loadPurchaseOrders();
      } catch (error) {
        console.error('Error aprobando orden:', error);
        showAlert('Error aprobando orden', 'danger');
      }
    }
  };

  const addItemToPO = (productId) => {
    const product = products.find(p => p.id === parseInt(productId));
    if (!product) return;

    const quantity = prompt('Cantidad a ordenar:');
    if (!quantity || quantity <= 0) return;

    const existingIndex = newPO.items.findIndex(item => item.product === parseInt(productId));
    
    if (existingIndex >= 0) {
      const updatedItems = [...newPO.items];
      updatedItems[existingIndex].quantity_ordered += parseInt(quantity);
      setNewPO(prev => ({ ...prev, items: updatedItems }));
    } else {
      const newItem = {
        product: parseInt(productId),
        product_name: product.name,
        quantity_ordered: parseInt(quantity),
        unit_price: product.cost_price
      };
      setNewPO(prev => ({ ...prev, items: [...prev.items, newItem] }));
    }
  };

  const createInventoryCount = async (e) => {
    e.preventDefault();
    try {
      await inventoryAPI.createInventoryCount(newCount);
      showAlert('Conteo de inventario creado exitosamente', 'success');
      setShowCountModal(false);
      setNewCount({ description: '', scheduled_date: '', notes: '' });
      loadInventoryCounts();
    } catch (error) {
      console.error('Error creando conteo:', error);
      showAlert('Error creando conteo de inventario', 'danger');
    }
  };

  const startInventoryCount = async (count) => {
    if (window.confirm(`¿Iniciar el conteo de inventario "${count.description}"?`)) {
      try {
        await inventoryAPI.startInventoryCount(count.id);
        showAlert('Conteo de inventario iniciado', 'success');
        loadInventoryCounts();
      } catch (error) {
        console.error('Error iniciando conteo:', error);
        showAlert('Error iniciando conteo', 'danger');
      }
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Cargando inventario...</p>
      </div>
    );
  }

  return (
    <div className="inventory-page">
      <h1>Control de Inventario</h1>

      {/* Tabs */}
      <div className="tabs">
        <button 
          className={`btn ${activeTab === 'movements' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('movements')}
        >
          Movimientos de Stock
        </button>
        <button 
          className={`btn ${activeTab === 'purchase-orders' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('purchase-orders')}
        >
          Órdenes de Compra
        </button>
        <button 
          className={`btn ${activeTab === 'inventory-counts' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('inventory-counts')}
        >
          Conteos de Inventario
        </button>
        <button 
          className={`btn ${activeTab === 'reports' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('reports')}
        >
          Reportes
        </button>
      </div>

      {/* Stock Movements Tab */}
      {activeTab === 'movements' && (
        <div>
          <div className="card">
            <h2>Filtros de Movimientos</h2>
            <div className="form-row">
              <div className="form-group">
                <label>Producto</label>
                <select
                  className="form-control"
                  value={movementFilters.product}
                  onChange={(e) => setMovementFilters(prev => ({ ...prev, product: e.target.value }))}
                >
                  <option value="">Todos los productos</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>{product.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Tipo de Movimiento</label>
                <select
                  className="form-control"
                  value={movementFilters.movement_type}
                  onChange={(e) => setMovementFilters(prev => ({ ...prev, movement_type: e.target.value }))}
                >
                  <option value="">Todos</option>
                  <option value="IN">Entrada</option>
                  <option value="OUT">Salida</option>
                  <option value="ADJUST">Ajuste</option>
                  <option value="RETURN">Devolución</option>
                </select>
              </div>
              <div className="form-group">
                <label>Fecha Desde</label>
                <input
                  type="date"
                  className="form-control"
                  value={movementFilters.date_from}
                  onChange={(e) => setMovementFilters(prev => ({ ...prev, date_from: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Fecha Hasta</label>
                <input
                  type="date"
                  className="form-control"
                  value={movementFilters.date_to}
                  onChange={(e) => setMovementFilters(prev => ({ ...prev, date_to: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="card">
            <h2>Movimientos de Stock ({stockMovements.length})</h2>
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Producto</th>
                  <th>Tipo</th>
                  <th>Cantidad</th>
                  <th>Stock Antes</th>
                  <th>Stock Después</th>
                  <th>Usuario</th>
                </tr>
              </thead>
              <tbody>
                {stockMovements.map(movement => (
                  <tr key={movement.id}>
                    <td>{new Date(movement.movement_date).toLocaleDateString()}</td>
                    <td>{movement.product_name}</td>
                    <td>
                      <span className={`alert ${
                        movement.movement_type === 'IN' ? 'alert-success' :
                        movement.movement_type === 'OUT' ? 'alert-danger' :
                        'alert-warning'
                      }`} style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>
                        {movement.movement_type_display}
                      </span>
                    </td>
                    <td>{movement.quantity}</td>
                    <td>{movement.stock_before}</td>
                    <td>{movement.stock_after}</td>
                    <td>{movement.user_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Purchase Orders Tab */}
      {activeTab === 'purchase-orders' && (
        <div>
          <div className="page-header">
            <h2>Órdenes de Compra</h2>
            <button className="btn btn-primary" onClick={() => setShowPOModal(true)}>
              Nueva Orden de Compra
            </button>
          </div>

          <div className="card">
            <table className="table">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Proveedor</th>
                  <th>Estado</th>
                  <th>Fecha Orden</th>
                  <th>Total</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.map(po => (
                  <tr key={po.id}>
                    <td>{po.order_number}</td>
                    <td>{po.supplier_name}</td>
                    <td>
                      <span className={`alert ${
                        po.status === 'RECEIVED' ? 'alert-success' :
                        po.status === 'APPROVED' ? 'alert-info' :
                        po.status === 'PENDING' ? 'alert-warning' :
                        'alert-secondary'
                      }`} style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>
                        {po.status_display}
                      </span>
                    </td>
                    <td>{new Date(po.order_date).toLocaleDateString()}</td>
                    <td>{formatCurrency(po.total)}</td>
                    <td>
                      {po.status === 'PENDING' && (
                        <button 
                          className="btn btn-small btn-success"
                          onClick={() => approvePurchaseOrder(po)}
                        >
                          Aprobar
                        </button>
                      )}
                      <button 
                        className="btn btn-small btn-primary"
                        onClick={() => setSelectedPO(po)}
                      >
                        Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Inventory Counts Tab */}
      {activeTab === 'inventory-counts' && (
        <div>
          <div className="page-header">
            <h2>Conteos de Inventario</h2>
            <button className="btn btn-primary" onClick={() => setShowCountModal(true)}>
              Nuevo Conteo
            </button>
          </div>

          <div className="card">
            <table className="table">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Descripción</th>
                  <th>Estado</th>
                  <th>Fecha Programada</th>
                  <th>Responsable</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {inventoryCounts.map(count => (
                  <tr key={count.id}>
                    <td>{count.count_number}</td>
                    <td>{count.description}</td>
                    <td>
                      <span className={`alert ${
                        count.status === 'COMPLETED' ? 'alert-success' :
                        count.status === 'IN_PROGRESS' ? 'alert-warning' :
                        'alert-info'
                      }`} style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>
                        {count.status_display}
                      </span>
                    </td>
                    <td>{new Date(count.scheduled_date).toLocaleDateString()}</td>
                    <td>{count.responsible_name}</td>
                    <td>
                      {count.status === 'PLANNED' && (
                        <button 
                          className="btn btn-small btn-success"
                          onClick={() => startInventoryCount(count)}
                        >
                          Iniciar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div>
          <div className="card">
            <h2>Reporte de Stock Bajo</h2>
            {lowStockReport.length > 0 ? (
              <table className="table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Categoría</th>
                    <th>Stock Actual</th>
                    <th>Stock Mínimo</th>
                    <th>Días de Stock</th>
                    <th>Sugerido Ordenar</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockReport.map((item, index) => (
                    <tr key={index}>
                      <td>{item.product_name}</td>
                      <td>{item.category_name}</td>
                      <td>{item.current_stock}</td>
                      <td>{item.min_stock}</td>
                      <td>{item.days_of_stock?.toFixed(1) || 'N/A'}</td>
                      <td>{item.suggested_order}</td>
                      <td>
                        <span className={`alert ${
                          item.stock_status === 'SIN_STOCK' ? 'alert-danger' :
                          item.stock_status === 'STOCK_BAJO' ? 'alert-warning' :
                          'alert-success'
                        }`} style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>
                          {item.stock_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No hay productos con stock bajo</p>
            )}
          </div>
        </div>
      )}

      {/* Modal Nueva Orden de Compra */}
      {showPOModal && (
        <div className="modal show">
          <div className="modal-content" style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h2>Nueva Orden de Compra</h2>
              <span className="close" onClick={() => setShowPOModal(false)}>&times;</span>
            </div>
            
            <form onSubmit={createPurchaseOrder}>
              <div className="form-row">
                <div className="form-group">
                  <label>Proveedor *</label>
                  <select
                    className="form-control"
                    value={newPO.supplier}
                    onChange={(e) => setNewPO(prev => ({ ...prev, supplier: e.target.value }))}
                    required
                  >
                    <option value="">Seleccionar proveedor</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Fecha Esperada</label>
                  <input
                    type="date"
                    className="form-control"
                    value={newPO.expected_date}
                    onChange={(e) => setNewPO(prev => ({ ...prev, expected_date: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Agregar Producto</label>
                <select
                  className="form-control"
                  onChange={(e) => addItemToPO(e.target.value)}
                  value=""
                >
                  <option value="">Seleccionar producto para agregar</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} - Stock: {product.current_stock}
                    </option>
                  ))}
                </select>
              </div>

              {newPO.items.length > 0 && (
                <div>
                  <h4>Items de la Orden</h4>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>Cantidad</th>
                        <th>Precio Unit.</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {newPO.items.map((item, index) => (
                        <tr key={index}>
                          <td>{item.product_name}</td>
                          <td>{item.quantity_ordered}</td>
                          <td>{formatCurrency(item.unit_price)}</td>
                          <td>{formatCurrency(item.quantity_ordered * item.unit_price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="form-group">
                <label>Notas</label>
                <textarea
                  className="form-control"
                  value={newPO.notes}
                  onChange={(e) => setNewPO(prev => ({ ...prev, notes: e.target.value }))}
                  rows="3"
                />
              </div>

              <div className="form-group" style={{ textAlign: 'right' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowPOModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Crear Orden
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nuevo Conteo */}
      {showCountModal && (
        <div className="modal show">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Nuevo Conteo de Inventario</h2>
              <span className="close" onClick={() => setShowCountModal(false)}>&times;</span>
            </div>
            
            <form onSubmit={createInventoryCount}>
              <div className="form-group">
                <label>Descripción *</label>
                <input
                  type="text"
                  className="form-control"
                  value={newCount.description}
                  onChange={(e) => setNewCount(prev => ({ ...prev, description: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label>Fecha Programada *</label>
                <input
                  type="date"
                  className="form-control"
                  value={newCount.scheduled_date}
                  onChange={(e) => setNewCount(prev => ({ ...prev, scheduled_date: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label>Notas</label>
                <textarea
                  className="form-control"
                  value={newCount.notes}
                  onChange={(e) => setNewCount(prev => ({ ...prev, notes: e.target.value }))}
                  rows="3"
                />
              </div>

              <div className="form-group" style={{ textAlign: 'right' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCountModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Crear Conteo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
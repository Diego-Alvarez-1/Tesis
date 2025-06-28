import React, { useState, useEffect } from 'react';
import { 
  inventoryAPI, 
  productsAPI,
  suppliersAPI,
  formatCurrency,
  showAlert,
  handleApiError
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

  // CORRECCIÓN: useEffect separados para carga inicial y filtros
  useEffect(() => {
    console.log('📦 Inventario: Carga inicial de datos');
    loadInitialData();
  }, []);

  useEffect(() => {
    console.log('🔄 Inventario: Cambio de tab activa:', activeTab);
    if (products.length > 0 && suppliers.length > 0) {
      loadTabData();
    }
  }, [activeTab]);

  useEffect(() => {
    console.log('🔍 Inventario: Filtros de movimientos cambiaron:', movementFilters);
    if (activeTab === 'movements' && products.length > 0) {
      loadStockMovements();
    }
  }, [movementFilters]);

  // NUEVA FUNCIÓN: Carga inicial separada
  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      console.log('📦 Cargando productos y proveedores para inventario...');
      
      // CORRECCIÓN CRÍTICA: Cargar todos los productos activos sin filtros restrictivos
      const [productsRes, suppliersRes] = await Promise.allSettled([
        productsAPI.getProducts({ is_active: true, page_size: 1000 }), // Aumentar límite
        suppliersAPI.getSuppliers({ is_active: true, page_size: 1000 })
      ]);
      
      // Procesar productos
      if (productsRes.status === 'fulfilled') {
        const productsData = productsRes.value.data;
        const productsList = productsData.results || productsData || [];
        setProducts(productsList);
        console.log('✅ Productos cargados para inventario:', productsList.length);
      } else {
        console.error('❌ Error cargando productos:', productsRes.reason);
        setProducts([]);
      }

      // Procesar proveedores
      if (suppliersRes.status === 'fulfilled') {
        const suppliersData = suppliersRes.value.data;
        const suppliersList = suppliersData.results || suppliersData || [];
        setSuppliers(suppliersList);
        console.log('✅ Proveedores cargados para inventario:', suppliersList.length);
      } else {
        console.error('❌ Error cargando proveedores:', suppliersRes.reason);
        setSuppliers([]);
      }

      // Cargar datos de la tab inicial
      await loadTabData();
      
    } catch (error) {
      console.error('❌ Error en carga inicial de inventario:', error);
      handleApiError(error, 'Error cargando datos de inventario');
    } finally {
      setLoading(false);
    }
  };

  // NUEVA FUNCIÓN: Cargar datos según la tab activa
  const loadTabData = async () => {
    try {
      console.log(`🔄 Cargando datos para tab: ${activeTab}`);
      
      switch (activeTab) {
        case 'movements':
          await loadStockMovements();
          break;
        case 'purchase-orders':
          await loadPurchaseOrders();
          break;
        case 'inventory-counts':
          await loadInventoryCounts();
          break;
        case 'reports':
          await loadLowStockReport();
          break;
        default:
          break;
      }
    } catch (error) {
      console.error(`❌ Error cargando datos para tab ${activeTab}:`, error);
    }
  };

  const loadStockMovements = async () => {
    try {
      console.log('🔄 Cargando movimientos de stock con filtros:', movementFilters);
      
      // Limpiar filtros vacíos
      const cleanFilters = {};
      Object.keys(movementFilters).forEach(key => {
        if (movementFilters[key] !== '' && movementFilters[key] !== null && movementFilters[key] !== undefined) {
          cleanFilters[key] = movementFilters[key];
        }
      });
      
      const response = await inventoryAPI.getStockMovements(cleanFilters);
      const movementsData = response.data;
      setStockMovements(movementsData.results || movementsData || []);
      console.log('✅ Movimientos de stock cargados:', (movementsData.results || movementsData || []).length);
    } catch (error) {
      console.error('❌ Error cargando movimientos:', error);
      setStockMovements([]);
    }
  };

  const loadPurchaseOrders = async () => {
    try {
      console.log('🔄 Cargando órdenes de compra...');
      const response = await inventoryAPI.getPurchaseOrders();
      const ordersData = response.data;
      setPurchaseOrders(ordersData.results || ordersData || []);
      console.log('✅ Órdenes de compra cargadas:', (ordersData.results || ordersData || []).length);
    } catch (error) {
      console.error('❌ Error cargando órdenes de compra:', error);
      setPurchaseOrders([]);
    }
  };

  const loadInventoryCounts = async () => {
    try {
      console.log('🔄 Cargando conteos de inventario...');
      const response = await inventoryAPI.getInventoryCounts();
      const countsData = response.data;
      setInventoryCounts(countsData.results || countsData || []);
      console.log('✅ Conteos de inventario cargados:', (countsData.results || countsData || []).length);
    } catch (error) {
      console.error('❌ Error cargando conteos:', error);
      setInventoryCounts([]);
    }
  };

  const loadLowStockReport = async () => {
    try {
      console.log('🔄 Cargando reporte de stock bajo...');
      const response = await inventoryAPI.getLowStockReport();
      const reportData = response.data;
      setLowStockReport(reportData.products || []);
      console.log('✅ Reporte de stock bajo cargado:', (reportData.products || []).length);
    } catch (error) {
      console.error('❌ Error cargando reporte de stock bajo:', error);
      setLowStockReport([]);
    }
  };

  const createPurchaseOrder = async (e) => {
    e.preventDefault();
    
    if (newPO.items.length === 0) {
      showAlert('Agregue al menos un producto a la orden', 'warning');
      return;
    }

    if (!newPO.supplier) {
      showAlert('Seleccione un proveedor', 'warning');
      return;
    }

    try {
      // Preparar datos de la orden
      const orderData = {
        supplier: Number(newPO.supplier),
        expected_date: newPO.expected_date || null,
        notes: newPO.notes || '',
        items: newPO.items.map(item => ({
          product: Number(item.product),
          quantity_ordered: Number(item.quantity_ordered),
          unit_price: Number(item.unit_price)
        }))
      };

      console.log('📤 Enviando orden de compra:', orderData);
      
      const response = await inventoryAPI.createPurchaseOrder(orderData);
      console.log('✅ Respuesta de orden:', response);
      
      showAlert('Orden de compra creada exitosamente', 'success');
      setShowPOModal(false);
      setNewPO({ supplier: '', expected_date: '', notes: '', items: [] });
      await loadPurchaseOrders();
      
    } catch (error) {
      console.error('❌ Error creando orden:', error);
      handleApiError(error, 'Error creando orden de compra');
    }
  };

  const approvePurchaseOrder = async (po) => {
    if (window.confirm(`¿Aprobar la orden de compra ${po.order_number}?`)) {
      try {
        await inventoryAPI.approvePurchaseOrder(po.id);
        showAlert('Orden de compra aprobada', 'success');
        await loadPurchaseOrders();
      } catch (error) {
        console.error('❌ Error aprobando orden:', error);
        showAlert('Error aprobando orden', 'danger');
      }
    }
  };

  const addItemToPO = (productId) => {
    const product = products.find(p => p.id === parseInt(productId));
    if (!product) {
      showAlert('Producto no encontrado', 'warning');
      return;
    }

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
      await loadInventoryCounts();
    } catch (error) {
      console.error('❌ Error creando conteo:', error);
      showAlert('Error creando conteo de inventario', 'danger');
    }
  };

  const startInventoryCount = async (count) => {
    if (window.confirm(`¿Iniciar el conteo de inventario "${count.description}"?`)) {
      try {
        await inventoryAPI.startInventoryCount(count.id);
        showAlert('Conteo de inventario iniciado', 'success');
        await loadInventoryCounts();
      } catch (error) {
        console.error('❌ Error iniciando conteo:', error);
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

      {/* INFORMACIÓN DE DEBUG */}
      <div className="card" style={{ backgroundColor: '#f8f9fa', border: '1px solid #dee2e6' }}>
        <h4>Estado del Sistema</h4>
        <div className="grid grid-4">
          <div>
            <strong>Productos Cargados:</strong> {products.length}
          </div>
          <div>
            <strong>Proveedores Cargados:</strong> {suppliers.length}
          </div>
          <div>
            <strong>Tab Activa:</strong> {activeTab}
          </div>
          <div>
            <strong>Estado:</strong> {loading ? 'Cargando...' : 'Listo'}
          </div>
        </div>
      </div>

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
                  <option value="">Todos los productos ({products.length})</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} - {product.code}
                    </option>
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
            {stockMovements.length > 0 ? (
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
            ) : (
              <div className="alert alert-info">
                No hay movimientos de stock para mostrar
              </div>
            )}
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
            <h3>Órdenes de Compra ({purchaseOrders.length})</h3>
            {purchaseOrders.length > 0 ? (
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
            ) : (
              <div className="alert alert-info">
                No hay órdenes de compra creadas
              </div>
            )}
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
            <h3>Conteos de Inventario ({inventoryCounts.length})</h3>
            {inventoryCounts.length > 0 ? (
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
            ) : (
              <div className="alert alert-info">
                No hay conteos de inventario programados
              </div>
            )}
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
                      <td>
                        {item.days_of_stock !== null && item.days_of_stock !== undefined && !isNaN(item.days_of_stock) 
                          ? Number(item.days_of_stock).toFixed(1) 
                          : 'N/A'
                        }
                      </td>
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
              <div className="alert alert-success">
                ¡Excelente! No hay productos con stock bajo
              </div>
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
                  <option value="">Seleccionar producto ({products.length} disponibles)</option>
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
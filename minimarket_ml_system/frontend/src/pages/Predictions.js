import React, { useState, useEffect } from 'react';
import { 
  mlAPI, 
  productsAPI,
  showAlert,
  handleApiError,
  safeValue,
  safeString
} from '../services/api';

const Predictions = () => {
  const [models, setModels] = useState([]);
  const [products, setProducts] = useState([]);
  const [reorderRecommendations, setReorderRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [predictionLoading, setPredictionLoading] = useState(false);
  
  const [selectedProduct, setSelectedProduct] = useState('');
  const [daysAhead, setDaysAhead] = useState(30);
  const [startDate, setStartDate] = useState('');
  const [predictionResult, setPredictionResult] = useState(null);

  const [batchProducts, setBatchProducts] = useState([]);
  const [batchResults, setBatchResults] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Cargar datos en paralelo
      const results = await Promise.allSettled([
        mlAPI.getModels(),
        productsAPI.getProducts({ is_active: true, page_size: 1000 }),
        mlAPI.getReorderRecommendations({ limit: 20 })
      ]);
      
      // Procesar modelos
      if (results[0].status === 'fulfilled') {
        const modelsData = results[0].value.data;
        setModels(modelsData.results || modelsData || []);
      } else {
        console.error('Error cargando modelos:', results[0].reason);
        setModels([]);
      }

      // Procesar productos
      if (results[1].status === 'fulfilled') {
        const productsData = results[1].value.data;
        setProducts(productsData.results || productsData || []);
      } else {
        console.error('Error cargando productos:', results[1].reason);
        setProducts([]);
      }

      // Procesar recomendaciones
      if (results[2].status === 'fulfilled') {
        const reorderData = results[2].value.data;
        setReorderRecommendations(reorderData.recommendations || reorderData || []);
      } else {
        console.error('Error cargando recomendaciones:', results[2].reason);
        setReorderRecommendations([]);
      }
      
    } catch (error) {
      console.error('Error cargando datos:', error);
      handleApiError(error, 'Error cargando datos de predicciones');
    } finally {
      setLoading(false);
    }
  };

  const handleSinglePrediction = async (e) => {
    e.preventDefault();
    if (!selectedProduct) {
      showAlert('Seleccione un producto', 'warning');
      return;
    }

    try {
      setPredictionLoading(true);
      const data = {
        product_id: parseInt(selectedProduct),
        days_ahead: daysAhead,
        start_date: startDate || undefined
      };
      
      const response = await mlAPI.predictDemand(data);
      setPredictionResult(response.data);
      showAlert('Predicción generada exitosamente', 'success');
    } catch (error) {
      console.error('Error generando predicción:', error);
      handleApiError(error, 'Error generando predicción');
      setPredictionResult(null);
    } finally {
      setPredictionLoading(false);
    }
  };

  const handleBatchPrediction = async () => {
    if (batchProducts.length === 0) {
      showAlert('Seleccione al menos un producto para predicción en lote', 'warning');
      return;
    }

    try {
      setPredictionLoading(true);
      const data = {
        product_ids: batchProducts.map(p => parseInt(p)),
        days_ahead: daysAhead,
        start_date: startDate || undefined
      };
      
      const response = await mlAPI.batchPredict(data);
      setBatchResults(response.data.results || []);
      showAlert('Predicciones en lote generadas exitosamente', 'success');
    } catch (error) {
      console.error('Error generando predicciones en lote:', error);
      handleApiError(error, 'Error generando predicciones en lote');
      setBatchResults([]);
    } finally {
      setPredictionLoading(false);
    }
  };

  const trainNewModel = async () => {
    if (!window.confirm('¿Está seguro de entrenar un nuevo modelo? Este proceso puede tomar varios minutos.')) {
      return;
    }

    try {
      setPredictionLoading(true);
      const data = {
        days_back: 730,
        test_size: 0.2,
        save_model: true
      };
      
      const response = await mlAPI.trainNewModel(data);
      if (response.data.success) {
        showAlert('Modelo entrenado exitosamente', 'success');
        loadData(); // Recargar modelos
      } else {
        showAlert('Error entrenando modelo', 'danger');
      }
    } catch (error) {
      console.error('Error entrenando modelo:', error);
      handleApiError(error, 'Error entrenando modelo');
    } finally {
      setPredictionLoading(false);
    }
  };

  const SimpleChart = ({ data }) => {
    if (!data || !data.predictions || data.predictions.length === 0) {
      return <p>No hay datos para mostrar el gráfico</p>;
    }

    const maxValue = Math.max(...data.predictions.map(p => p.predicted_quantity));
    const chartHeight = 200;

    return (
      <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h4>Gráfico de Predicción - {data.product?.name}</h4>
        <div style={{ display: 'flex', alignItems: 'end', height: chartHeight, gap: '2px' }}>
          {data.predictions.slice(0, 30).map((prediction, index) => {
            const height = (prediction.predicted_quantity / maxValue) * (chartHeight - 40);
            return (
              <div
                key={index}
                style={{
                  height: `${height}px`,
                  backgroundColor: '#3498db',
                  flex: 1,
                  minWidth: '8px',
                  borderRadius: '2px 2px 0 0'
                }}
                title={`${new Date(prediction.date).toLocaleDateString()}: ${prediction.predicted_quantity.toFixed(2)}`}
              />
            );
          })}
        </div>
        <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
          Últimos 30 días de predicción
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Cargando predicciones...</p>
      </div>
    );
  }

  const defaultModel = models.find(m => m.is_default);

  return (
    <div className="predictions-page">
      <h1>Predicciones de Machine Learning</h1>

      {/* Estado del modelo */}
      <div className="card">
        <h2>Estado del Modelo</h2>
        <div className="grid grid-2">
          <div>
            {models.length > 0 ? (
              <div>
                <p><strong>Modelos Disponibles:</strong> {models.length}</p>
                {defaultModel ? (
                  <>
                    <p><strong>Modelo Activo:</strong> {defaultModel.name}</p>
                    <p><strong>Tipo:</strong> {defaultModel.model_type_display}</p>
                    <p><strong>Entrenado:</strong> {new Date(defaultModel.training_date).toLocaleDateString()}</p>
                    {defaultModel.metrics && (
                      <p><strong>Precisión:</strong> Disponible</p>
                    )}
                  </>
                ) : (
                  <p><strong>Modelo por Defecto:</strong> No configurado</p>
                )}
              </div>
            ) : (
              <div className="alert alert-warning">
                No hay modelos entrenados. Entrene un modelo primero.
              </div>
            )}
          </div>
          <div>
            <button 
              className="btn btn-primary"
              onClick={trainNewModel}
              disabled={predictionLoading}
            >
              {predictionLoading ? 'Entrenando...' : 'Entrenar Nuevo Modelo'}
            </button>
            {models.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <small>El entrenamiento puede tomar varios minutos</small>
              </div>
            )}
          </div>
        </div>
      </div>

      {models.length > 0 && defaultModel && (
        <>
          {/* Predicción individual */}
          <div className="card">
            <h2>Predicción Individual</h2>
            <form onSubmit={handleSinglePrediction}>
              <div className="form-row">
                <div className="form-group">
                  <label>Producto *</label>
                  <select
                    className="form-control"
                    value={selectedProduct}
                    onChange={(e) => setSelectedProduct(e.target.value)}
                    required
                  >
                    <option value="">Seleccionar producto</option>
                    {products.map(product => (
                      <option key={product.id} value={product.id}>
                        {product.name} - Stock: {product.current_stock}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Días a Predecir</label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    className="form-control"
                    value={daysAhead}
                    onChange={(e) => setDaysAhead(parseInt(e.target.value) || 30)}
                  />
                </div>
                <div className="form-group">
                  <label>Fecha Inicio (Opcional)</label>
                  <input
                    type="date"
                    className="form-control"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>&nbsp;</label>
                  <button 
                    type="submit" 
                    className="btn btn-success form-control"
                    disabled={predictionLoading}
                  >
                    {predictionLoading ? 'Prediciendo...' : 'Predecir'}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Resultado de predicción */}
          {predictionResult && (
            <div className="card">
              <h2>Resultado de Predicción</h2>
              <div className="grid grid-3">
                <div className="stats-card">
                  <h3>{safeValue(predictionResult.summary?.total_predicted, 0).toFixed(2)}</h3>
                  <p>Total Predicho</p>
                </div>
                <div className="stats-card success">
                  <h3>{safeValue(predictionResult.summary?.avg_daily, 0).toFixed(2)}</h3>
                  <p>Promedio Diario</p>
                </div>
                <div className="stats-card warning">
                  <h3>{safeValue(predictionResult.summary?.max_daily, 0).toFixed(2)}</h3>
                  <p>Máximo Diario</p>
                </div>
              </div>
              
              {predictionResult.product && (
                <div style={{ marginTop: '1rem' }}>
                  <p><strong>Producto:</strong> {predictionResult.product.name}</p>
                  <p><strong>Stock Actual:</strong> {predictionResult.product.current_stock}</p>
                </div>
              )}
              
              <div style={{ marginTop: '2rem' }}>
                <SimpleChart data={predictionResult} />
              </div>
            </div>
          )}

          {/* Predicción en lote */}
          <div className="card">
            <h2>Predicción en Lote</h2>
            <div className="form-group">
              <label>Seleccionar Productos</label>
              <select
                multiple
                className="form-control"
                style={{ height: '150px' }}
                value={batchProducts}
                onChange={(e) => setBatchProducts(Array.from(e.target.selectedOptions, option => option.value))}
              >
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name} - Stock: {product.current_stock}
                  </option>
                ))}
              </select>
              <small>Mantenga presionado Ctrl/Cmd para seleccionar múltiples productos</small>
            </div>
            <button 
              className="btn btn-primary"
              onClick={handleBatchPrediction}
              disabled={predictionLoading || batchProducts.length === 0}
            >
              {predictionLoading ? 'Prediciendo...' : 'Generar Predicciones en Lote'}
            </button>
          </div>

          {/* Resultados de predicción en lote */}
          {batchResults.length > 0 && (
            <div className="card">
              <h2>Resultados Predicción en Lote</h2>
              <table className="table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Total Predicho</th>
                    <th>Promedio Diario</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {batchResults.map((result, index) => (
                    <tr key={index}>
                      <td>{safeString(result.product_name)}</td>
                      <td>{result.success ? safeValue(result.total_predicted, 0).toFixed(2) : 'Error'}</td>
                      <td>{result.success ? safeValue(result.avg_daily, 0).toFixed(2) : 'Error'}</td>
                      <td>
                        <span className={`alert ${result.success ? 'alert-success' : 'alert-danger'}`}
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>
                          {result.success ? 'Exitoso' : 'Error'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Recomendaciones de reorden */}
      <div className="card">
        <h2>Recomendaciones de Reorden</h2>
        {reorderRecommendations.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Stock Actual</th>
                <th>Demanda Predicha</th>
                <th>Días de Stock</th>
                <th>Sugerido Ordenar</th>
                <th>Prioridad</th>
              </tr>
            </thead>
            <tbody>
              {reorderRecommendations.map((rec, index) => (
                <tr key={index}>
                  <td>{safeString(rec.product_name)}</td>
                  <td>{safeValue(rec.current_stock, 0)}</td>
                  <td>{safeValue(rec.predicted_demand_total, 0).toFixed(2)}</td>
                  <td>{safeValue(rec.days_of_stock_available, 0).toFixed(1)}</td>
                  <td>{safeValue(rec.suggested_order_quantity, 0).toFixed(0)}</td>
                  <td>
                    <span className={`alert ${
                      rec.priority === 'CRITICAL' ? 'alert-danger' :
                      rec.priority === 'HIGH' ? 'alert-warning' :
                      rec.priority === 'MEDIUM' ? 'alert-info' :
                      'alert-success'
                    }`} style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>
                      {safeString(rec.priority)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="alert alert-info">
            No hay recomendaciones de reorden disponibles
          </div>
        )}
      </div>

      {/* Información del sistema ML */}
      <div className="card">
        <h2>Información del Sistema ML</h2>
        <div className="grid grid-3">
          <div>
            <h4>Modelos Disponibles</h4>
            <p><strong>{models.length}</strong> modelos entrenados</p>
            {defaultModel && (
              <p>Activo: {defaultModel.name}</p>
            )}
          </div>
          <div>
            <h4>Productos Analizables</h4>
            <p><strong>{products.length}</strong> productos activos</p>
            <p>Disponibles para predicción</p>
          </div>
          <div>
            <h4>Recomendaciones</h4>
            <p><strong>{reorderRecommendations.length}</strong> productos</p>
            <p>Requieren atención</p>
          </div>
        </div>
      </div>

      {/* Acciones rápidas */}
      <div className="card">
        <h2>Acciones Rápidas</h2>
        <div className="grid grid-3">
          <button 
            className="btn btn-primary"
            onClick={() => window.location.href = '/analytics'}
          >
            Ver Analytics
          </button>
          <button 
            className="btn btn-warning"
            onClick={() => window.location.href = '/inventory'}
          >
            Gestionar Inventario
          </button>
          <button 
            className="btn btn-info"
            onClick={() => window.location.href = '/products'}
            style={{ backgroundColor: '#17a2b8', color: 'white' }}
          >
            Ver Productos
          </button>
        </div>
      </div>
    </div>
  );
};

export default Predictions;
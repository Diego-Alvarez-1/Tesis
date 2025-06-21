import React, { useState, useEffect } from 'react';
import { 
  mlAPI, 
  productsAPI,
  formatCurrency,
  showAlert 
} from '../services/api';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const Predictions = () => {
  const [models, setModels] = useState([]);
  const [products, setProducts] = useState([]);
  const [predictions, setPredictions] = useState([]);
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
      const [modelsRes, productsRes, reorderRes] = await Promise.all([
        mlAPI.getModels(),
        productsAPI.getProducts({ is_active: true }),
        mlAPI.getReorderRecommendations({ limit: 20 })
      ]);
      
      setModels(modelsRes.data.results || modelsRes.data);
      setProducts(productsRes.data.results || productsRes.data);
      setReorderRecommendations(reorderRes.data.recommendations || []);
    } catch (error) {
      console.error('Error cargando datos:', error);
      showAlert('Error cargando datos de predicciones', 'danger');
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
      showAlert('Error generando predicción', 'danger');
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
      showAlert('Error generando predicciones en lote', 'danger');
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
      showAlert('Modelo entrenado exitosamente', 'success');
      loadData(); // Recargar modelos
    } catch (error) {
      console.error('Error entrenando modelo:', error);
      showAlert('Error entrenando modelo', 'danger');
    } finally {
      setPredictionLoading(false);
    }
  };

  const getPredictionChart = () => {
    if (!predictionResult || !predictionResult.predictions) return null;

    const data = {
      labels: predictionResult.predictions.map(p => new Date(p.date).toLocaleDateString()),
      datasets: [
        {
          label: 'Demanda Predicha',
          data: predictionResult.predictions.map(p => p.predicted_quantity),
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.1
        },
        {
          label: 'Límite Superior',
          data: predictionResult.predictions.map(p => p.upper_bound),
          borderColor: 'rgba(255, 99, 132, 0.5)',
          backgroundColor: 'rgba(255, 99, 132, 0.1)',
          borderDash: [5, 5]
        },
        {
          label: 'Límite Inferior',
          data: predictionResult.predictions.map(p => p.lower_bound),
          borderColor: 'rgba(255, 99, 132, 0.5)',
          backgroundColor: 'rgba(255, 99, 132, 0.1)',
          borderDash: [5, 5]
        }
      ]
    };

    const options = {
      responsive: true,
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: `Predicción de Demanda - ${predictionResult.product?.name}`,
        },
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    };

    return <Line data={data} options={options} />;
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Cargando predicciones...</p>
      </div>
    );
  }

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
                <p><strong>Modelo Activo:</strong> {models.find(m => m.is_default)?.name || 'No hay modelo por defecto'}</p>
                <p><strong>Tipo:</strong> {models.find(m => m.is_default)?.model_type_display}</p>
                <p><strong>Entrenado:</strong> {models.find(m => m.is_default) ? 
                  new Date(models.find(m => m.is_default).training_date).toLocaleDateString() : 'N/A'}</p>
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
          </div>
        </div>
      </div>

      {models.length > 0 && (
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
                  <h3>{predictionResult.summary?.total_predicted?.toFixed(2) || 0}</h3>
                  <p>Total Predicho</p>
                </div>
                <div className="stats-card success">
                  <h3>{predictionResult.summary?.avg_daily?.toFixed(2) || 0}</h3>
                  <p>Promedio Diario</p>
                </div>
                <div className="stats-card warning">
                  <h3>{predictionResult.summary?.max_daily?.toFixed(2) || 0}</h3>
                  <p>Máximo Diario</p>
                </div>
              </div>
              
              <div style={{ marginTop: '2rem', height: '400px' }}>
                {getPredictionChart()}
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
              disabled={predictionLoading}
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
                      <td>{result.product_name}</td>
                      <td>{result.success ? result.total_predicted?.toFixed(2) : 'Error'}</td>
                      <td>{result.success ? result.avg_daily?.toFixed(2) : 'Error'}</td>
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
                  <td>{rec.product_name}</td>
                  <td>{rec.current_stock}</td>
                  <td>{rec.predicted_demand_total?.toFixed(2)}</td>
                  <td>{rec.days_of_stock_available?.toFixed(1)}</td>
                  <td>{rec.suggested_order_quantity?.toFixed(0)}</td>
                  <td>
                    <span className={`alert ${
                      rec.priority === 'CRITICAL' ? 'alert-danger' :
                      rec.priority === 'HIGH' ? 'alert-warning' :
                      rec.priority === 'MEDIUM' ? 'alert-info' :
                      'alert-success'
                    }`} style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>
                      {rec.priority}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No hay recomendaciones de reorden disponibles</p>
        )}
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
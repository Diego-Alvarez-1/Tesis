import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';

// Importar páginas
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Categories from './pages/Categories';
import Suppliers from './pages/Suppliers';
import Inventory from './pages/Inventory';
import Sales from './pages/Sales';
import Customers from './pages/Customers';
import Predictions from './pages/Predictions';
import Analytics from './pages/Analytics';
import Reports from './pages/Reports';

function App() {
  return (
    <Router>
      <div className="App">
        <nav className="navbar">
          <div className="nav-brand">
            <Link to="/">Sistema Minimarket ML</Link>
          </div>
          <ul className="nav-menu">
            <li><Link to="/">Dashboard</Link></li>
            <li className="dropdown">
              <span>Productos</span>
              <div className="dropdown-content">
                <Link to="/products">Productos</Link>
                <Link to="/categories">Categorías</Link>
                <Link to="/suppliers">Proveedores</Link>
              </div>
            </li>
            <li><Link to="/inventory">Inventario</Link></li>
            <li className="dropdown">
              <span>Ventas</span>
              <div className="dropdown-content">
                <Link to="/sales">Ventas</Link>
                <Link to="/customers">Clientes</Link>
              </div>
            </li>
            <li><Link to="/predictions">Predicciones ML</Link></li>
            <li className="dropdown">
              <span>Reportes</span>
              <div className="dropdown-content">
                <Link to="/analytics">Analytics</Link>
                <Link to="/reports">Reportes</Link>
              </div>
            </li>
          </ul>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/predictions" element={<Predictions />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/reports" element={<Reports />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
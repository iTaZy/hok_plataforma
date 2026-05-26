import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { auth } from './services/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

import Guias from './pages/Guias';
import Coaching from './pages/Coaching';
import Login from './pages/Login';
import TierList from './pages/TierList';
import Inhouse from './pages/Inhouse';
import HubRanking from './pages/HubRanking';
import Perfil from './pages/Perfil';

// Componente do Menu Superior (Navbar)
function Navbar({ isAuthenticated }) {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Fecha o menu sempre que a rota mudar
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  if (location.pathname === '/login') return null;

  // ESTILO EXTERNO: Fundo escuro ocupa 100% da tela
  const navStyle = {
    background: '#0b0f19', 
    borderBottom: '1px solid rgba(255,255,255,0.05)', 
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
    position: 'sticky', 
    top: 0, 
    zIndex: 1000,
    width: '100%'
  };

  // ESTILO INTERNO: Mantém a logo e os links centralizados e limitados a 1200px
  const innerContainerStyle = {
    maxWidth: '1200px',
    margin: '0 auto', // Centraliza a caixa na tela
    padding: '15px 20px',
    display: 'flex', 
    justifyContent: 'space-between', // Empurra logo para esquerda e links para direita DENTRO dos 1200px
    alignItems: 'center',
    width: '100%',
    boxSizing: 'border-box'
  };

  const linkStyle = (path) => ({
    color: location.pathname === path ? '#f39c12' : '#94a3b8', 
    textDecoration: 'none', 
    fontWeight: 'bold',
    fontSize: '15px', 
    padding: '10px 15px', 
    borderRadius: '8px', 
    transition: 'all 0.3s ease',
    background: location.pathname === path ? 'rgba(243, 156, 18, 0.1)' : 'transparent',
    border: location.pathname === path ? '1px solid rgba(243, 156, 18, 0.3)' : '1px solid transparent',
    display: 'block', 
    textAlign: 'center'
  });

  const handleLogout = async () => {
    try {
      await signOut(auth); 
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  return (
    <nav style={navStyle}>
      {/* Container limitador */}
      <div style={innerContainerStyle}>
        
        {/* LOGO */}
        <div style={{ color: '#fff', fontSize: '24px', fontWeight: 'bold', letterSpacing: '-1px', zIndex: 1001 }}>
          HoK <span style={{ color: '#f39c12' }}>HuB</span>
        </div>

        {/* BOTÃO HAMBÚRGUER */}
        <button 
          className="mobile-menu-btn"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          style={{ background: 'none', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer', zIndex: 1001 }}
        >
          {isMenuOpen ? '✕' : '☰'}
        </button>

        {/* CAIXA DE LINKS */}
        <div className={`nav-links-container ${isMenuOpen ? 'open' : ''}`}>
          <Link to="/" style={linkStyle('/')}>Arsenal</Link>
          <Link to="/tierlist" style={linkStyle('/tierlist')}>Tier List</Link>
          <Link to="/coaching" style={linkStyle('/coaching')}>Coaching</Link>
          <Link to="/hub" style={linkStyle('/hub')}>Hub Competitivo</Link>
          <Link to="/ranking" style={linkStyle('/ranking')}>Ranking</Link>
          
          {isAuthenticated && <Link to="/perfil" style={linkStyle('/perfil')}>Meu Perfil</Link>}
          
          <div className="divider" style={{ height: '24px', width: '1px', background: 'rgba(255,255,255,0.1)', margin: '0 10px' }}></div>

          {isAuthenticated ? (
            <button 
              onClick={handleLogout}
              style={{ background: 'transparent', color: '#e74c3c', border: '1px solid rgba(231, 76, 60, 0.3)', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.3s', width: '100%', maxWidth: '120px', margin: '0 auto' }}
            >
              Sair
            </button>
          ) : (
            <Link to="/login" style={{ background: '#f39c12', color: '#111827', textDecoration: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', transition: 'all 0.3s', display: 'block', textAlign: 'center', width: '100%', maxWidth: '120px', margin: '0 auto' }}>
              Entrar
            </Link>
          )}
        </div>
      </div>

      <style>{`
        .mobile-menu-btn { display: none; }
        .nav-links-container { display: flex; gap: 5px; align-items: center; }
        
        @media (max-width: 900px) {
          .mobile-menu-btn { display: block; }
          .divider { display: none; }
          .nav-links-container {
            position: absolute; top: 100%; left: 0; width: 100%;
            background: #0b0f19; flex-direction: column; padding: 20px 0;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            box-shadow: 0 10px 20px rgba(0,0,0,0.5); gap: 15px;
            max-height: 0; overflow: hidden; opacity: 0; transition: all 0.3s ease-in-out;
          }
          .nav-links-container.open {
            max-height: 500px; opacity: 1; padding: 20px;
          }
        }
      `}</style>
    </nav>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div style={{ background: '#0b0f19', height: '100vh' }}></div>;

  return (
    <Router>
      <div style={{ background: '#0b0f19', minHeight: '100vh', fontFamily: '"Segoe UI", Roboto, sans-serif', overflowX: 'hidden' }}>
        <Navbar isAuthenticated={isAuthenticated} />

        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Guias />} />
          <Route path="/tierlist" element={<TierList />} />
          <Route path="/ranking" element={<HubRanking />} />
          
          {/* Rotas Protegidas */}
          <Route path="/coaching" element={isAuthenticated ? <Coaching /> : <Navigate to="/login" />} />
          <Route path="/hub" element={isAuthenticated ? <Inhouse /> : <Navigate to="/login" />} />
          <Route path="/perfil" element={isAuthenticated ? <Perfil /> : <Navigate to="/login" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
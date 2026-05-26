import React from 'react';
import { Link } from 'react-router-dom';

function Navbar() {
  return (
    <nav style={{ 
      display: 'flex', 
      gap: '20px', 
      background: '#1a1a1a', 
      padding: '15px 30px', 
      alignItems: 'center',
      color: 'white'
    }}>
      <h2 style={{ margin: 0, color: '#f39c12' }}>HOK Pro</h2>
      
      {/* Links de navegação */}
      <div style={{ display: 'flex', gap: '15px' }}>
        <Link to="/" style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold' }}>
          Início
        </Link>
        <Link to="/login" style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold' }}>
          Entrar
        </Link>
      </div>
    </nav>
  );
}

export default Navbar;
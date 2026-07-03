import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { auth, db } from '../services/firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot, writeBatch, doc, limit } from 'firebase/firestore'; // IMPORT DO LIMIT ADICIONADO

function Navbar({ isAuthenticated }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  
  const location = useLocation();
  const navigate = useNavigate();
  const currentUser = auth.currentUser;

  // 1. Busca as notificações no banco (COM LIMIT 30)
  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;

    const q = query(
      collection(db, 'notifications'),
      where('toUid', '==', currentUser.uid),
      where('read', '==', false),
      limit(30) // Proteção de leitura inserida aqui
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => unsubscribe();
  }, [isAuthenticated, currentUser]);

  // 2. FUNÇÃO BLINDADA: Deleta em vez de atualizar
  const closeAndClearNotifications = async () => {
    setIsNotifOpen(false); 
    
    if (notifications.length === 0) return;

    try {
      const batch = writeBatch(db);
      notifications.forEach(notif => {
        const notifRef = doc(db, 'notifications', notif.id);
        batch.delete(notifRef); // Deleta o documento do banco
      });
      await batch.commit(); 
    } catch (error) {
      console.error("Erro ao limpar notificações:", error);
    }
  };

  const toggleNotifications = () => {
    if (isNotifOpen) {
      closeAndClearNotifications();
    } else {
      setIsNotifOpen(true);
      setIsOpen(false); 
    }
  };

  useEffect(() => {
    setIsOpen(false);
    if (isNotifOpen) {
      closeAndClearNotifications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  const isActive = (path) => location.pathname === path;

  const linkStyle = (path) => ({
    color: isActive(path) ? '#f39c12' : '#e2e8f0',
    textDecoration: 'none',
    fontWeight: 'bold',
    fontSize: '16px',
    padding: '12px 16px',
    borderRadius: '8px',
    background: isActive(path) ? 'rgba(243, 156, 18, 0.1)' : 'transparent',
    transition: 'all 0.2s ease',
    display: 'block',
  });

  return (
    <div style={{ position: 'relative', zIndex: 9999 }}>
      <nav style={{ 
        background: '#0b0f19', 
        padding: '15px 30px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        
        {/* LOGO */}
        <Link to="/" style={{ textDecoration: 'none' }}>
          <h1 style={{ color: '#fff', fontSize: '24px', margin: 0, fontFamily: '"Urbanist", sans-serif', fontWeight: 'bold' }}>
            HoK <span style={{ color: '#f39c12' }}>HuB</span>
          </h1>
        </Link>

        {/* ÁREA DOS BOTÕES */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          
          {/* BOTÃO DE NOTIFICAÇÕES (Sino) */}
          {isAuthenticated && (
            <div style={{ position: 'relative' }}>
              <button 
                onClick={toggleNotifications}
                style={{
                  background: isNotifOpen ? 'rgba(243, 156, 18, 0.1)' : 'transparent',
                  border: 'none',
                  color: isNotifOpen ? '#f39c12' : '#fff',
                  fontSize: '22px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '45px',
                  height: '45px',
                  borderRadius: '10px',
                  transition: 'all 0.2s',
                  position: 'relative'
                }}
              >
                🔔
                {notifications.length > 0 && (
                  <span style={{
                    position: 'absolute', top: '5px', right: '5px',
                    background: '#e74c3c', color: '#fff', fontSize: '10px',
                    fontWeight: 'bold', width: '18px', height: '18px',
                    borderRadius: '50%', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', border: '2px solid #0b0f19'
                  }}>
                    {notifications.length > 9 ? '9+' : notifications.length}
                  </span>
                )}
              </button>

              {/* DROPDOWN DE NOTIFICAÇÕES */}
              {isNotifOpen && (
                <div style={{
                  position: 'absolute', top: '60px', right: '0px', width: '300px',
                  background: '#111827', border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '16px', padding: '15px', display: 'flex',
                  flexDirection: 'column', gap: '10px', boxShadow: '0 15px 40px rgba(0,0,0,0.8)',
                  maxHeight: '400px', overflowY: 'auto'
                }}>
                  <h3 style={{ margin: '0 0 10px 0', color: '#fff', fontSize: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
                    Notificações
                  </h3>
                  
                  {notifications.length === 0 ? (
                    <p style={{ margin: 0, color: '#64748b', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>
                      Nenhuma novidade por aqui.
                    </p>
                  ) : (
                    notifications.map(notif => (
                      <div key={notif.id} style={{
                        background: 'rgba(243, 156, 18, 0.05)', borderLeft: '3px solid #f39c12',
                        padding: '10px', borderRadius: '4px'
                      }}>
                        <p style={{ margin: 0, color: '#e2e8f0', fontSize: '14px', lineHeight: '1.4' }}>
                          {notif.message}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* BOTÃO HAMBÚRGUER */}
          <button 
            onClick={() => {
              setIsOpen(!isOpen);
              if (isNotifOpen) closeAndClearNotifications();
            }}
            style={{
              background: isOpen ? 'rgba(255,255,255,0.05)' : 'transparent',
              border: 'none',
              color: isOpen ? '#f39c12' : '#fff',
              fontSize: '28px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '45px',
              height: '45px',
              borderRadius: '10px',
              transition: 'all 0.2s'
            }}
          >
            {isOpen ? '✕' : '≡'}
          </button>
        </div>
      </nav>

      {/* MENU DROPDOWN PRINCIPAL (Hambúrguer) */}
      {isOpen && (
        <div style={{
          position: 'absolute', top: '75px', right: '20px', width: '260px',
          background: '#111827', border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: '16px', padding: '15px', display: 'flex',
          flexDirection: 'column', gap: '5px', boxShadow: '0 15px 40px rgba(0,0,0,0.8)',
        }}>
          <Link to="/" style={linkStyle('/')}>Arsenal</Link>
          <Link to="/tierlist" style={linkStyle('/tierlist')}>Tier List</Link>
          <Link to="/coaching" style={linkStyle('/coaching')}>Coaching</Link>
          <Link to="/hub" style={linkStyle('/hub')}>Hub Competitivo</Link>
          <Link to="/ranking" style={linkStyle('/ranking')}>Ranking</Link>
          <Link to="/feed" style={linkStyle('/feed')}>Comunidade</Link>
          
          <hr style={{ borderColor: 'rgba(255,255,255,0.05)', margin: '10px 0' }} />

          {isAuthenticated ? (
            <>
              <Link to="/perfil" style={linkStyle('/perfil')}>Meu Perfil</Link>
              <button 
                onClick={handleLogout}
                style={{ background: 'rgba(231, 76, 60, 0.1)', color: '#e74c3c', border: '1px solid #e74c3c', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', width: '100%', marginTop: '5px' }}
              >
                Sair
              </button>
            </>
          ) : (
            <Link to="/login" style={{ background: '#f39c12', color: '#111827', textDecoration: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', textAlign: 'center', marginTop: '5px' }}>
              Entrar
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export default Navbar;
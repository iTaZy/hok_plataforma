import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { auth, db } from './services/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, collection, query, where, onSnapshot, writeBatch, limit } from 'firebase/firestore'; // IMPORT DO LIMIT ADICIONADO

// Páginas — carregadas sob demanda (code splitting) para reduzir o bundle inicial
const DiscordCallback = lazy(() => import('./pages/DiscordCallback'));
const Guias = lazy(() => import('./pages/Guias'));
const Coaching = lazy(() => import('./pages/Coaching'));
const Login = lazy(() => import('./pages/Login'));
const TierList = lazy(() => import('./pages/TierList'));
const Inhouse = lazy(() => import('./pages/Inhouse'));
const HubRanking = lazy(() => import('./pages/HubRanking'));
const Perfil = lazy(() => import('./pages/Perfil'));
const Feed = lazy(() => import('./pages/Feed'));
const PerfilPublico = lazy(() => import('./pages/PerfilPublico'));
const Termos = lazy(() => import('./components/Termos'));

// Componentes sempre visíveis — permanecem estáticos (não fazem sentido em lazy)
import FloatingChat from './components/FloatingChat';
import ChatHub from './components/ChatHub';

// ─── Loading fallback ─────────────────────────────────────────────────────────
function PageLoading() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '60vh', color: '#94a3b8', fontFamily: '"Urbanist", sans-serif',
    }}>
      Carregando...
    </div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar({ isAuthenticated, notifications }) {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const hasNotifs = notifications.length > 0;

  // FUNÇÃO BLINDADA: Deleta as notificações do banco em vez de apenas marcar como lidas
  const closeAndClearNotifications = async () => {
    setShowNotifs(false); 
    
    if (notifications.length === 0) return;

    try {
      const batch = writeBatch(db);
      notifications.forEach(n => {
        // Agora nós deletamos o documento para economizar espaço
        batch.delete(doc(db, 'notifications', n.id));
      });
      await batch.commit(); 
    } catch (error) {
      console.error("Erro ao deletar notificações:", error);
    }
  };

  const toggleNotifications = () => {
    if (showNotifs) {
      closeAndClearNotifications();
    } else {
      setShowNotifs(true);
      setIsMenuOpen(false); 
    }
  };

  useEffect(() => {
    setIsMenuOpen(false);
    if (showNotifs) {
      closeAndClearNotifications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  if (location.pathname === '/login') return null;

  const handleLogout = async () => {
    try { await signOut(auth); } catch (e) { console.error(e); }
  };

  const navStyle = {
    background: '#0b0f19',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
    position: 'sticky', top: 0, zIndex: 1000, width: '100%',
  };

  const innerStyle = {
    maxWidth: '1200px', margin: '0 auto', padding: '15px 20px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    width: '100%', boxSizing: 'border-box', position: 'relative',
  };

  const baseLinkStyle = {
    textDecoration: 'none', fontWeight: 'bold', fontSize: '15px',
    padding: '10px 15px', borderRadius: '8px', transition: 'all 0.3s ease',
    textAlign: 'center', boxSizing: 'border-box',
  };

  const getLinkStyle = (path) => ({
    ...baseLinkStyle,
    color: location.pathname === path ? '#f39c12' : '#94a3b8',
    background: location.pathname === path ? 'rgba(243,156,18,0.1)' : 'transparent',
    border: location.pathname === path ? '1px solid rgba(243,156,18,0.3)' : '1px solid transparent',
  });

  const notifIcon = (type) => ({ like: '❤️', comment: '💬', message: '✉️' }[type] || '🔔');

  const NavLinks = ({ isMobile = false }) => (
    <div style={isMobile
      ? { display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }
      : { display: 'flex', flexDirection: 'row', gap: '5px', alignItems: 'center' }
    }>
      <Link to="/" style={getLinkStyle('/')}>Arsenal</Link>
      <Link to="/tierlist" style={getLinkStyle('/tierlist')}>Tier List</Link>
      <Link to="/coaching" style={getLinkStyle('/coaching')}>Coaching</Link>
      <Link to="/hub" style={getLinkStyle('/hub')}>Hub Competitivo</Link>
      <Link to="/ranking" style={getLinkStyle('/ranking')}>Ranking</Link>
      <Link to="/feed" style={getLinkStyle('/feed')}>Comunidade</Link>
      {isAuthenticated && <Link to="/perfil" style={getLinkStyle('/perfil')}>Meu Perfil</Link>}

      {!isMobile && <div style={{ height: '24px', width: '1px', background: 'rgba(255,255,255,0.1)', margin: '0 5px' }} />}

      {isAuthenticated && !isMobile && (
        <div style={{ position: 'relative' }}>
          <button
            onClick={toggleNotifications}
            style={{
              background: showNotifs ? 'rgba(255,255,255,0.08)' : 'transparent',
              border: 'none', cursor: 'pointer',
              width: '40px', height: '40px', borderRadius: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '20px', position: 'relative', transition: 'background 0.2s',
            }}
          >
            🔔
            {hasNotifs && (
              <span style={{
                position: 'absolute', top: '4px', right: '4px',
                background: '#f39c12', color: '#111827',
                fontSize: '10px', fontWeight: 'bold',
                width: '16px', height: '16px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid #0b0f19',
              }}>
                {notifications.length > 9 ? '9+' : notifications.length}
              </span>
            )}
          </button>

          {showNotifs && (
            <div style={{
              position: 'absolute', top: '48px', right: 0, width: '320px',
              background: '#111827', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px', boxShadow: '0 15px 40px rgba(0,0,0,0.8)',
              overflow: 'hidden', zIndex: 9999,
            }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '14px' }}>Notificações</span>
              </div>
              <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '30px 16px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                    Nenhuma notificação nova
                  </div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} style={{
                      padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.03)',
                      display: 'flex', gap: '12px', alignItems: 'flex-start',
                      background: 'rgba(243,156,18,0.03)',
                    }}>
                      <span style={{ fontSize: '20px', flexShrink: 0 }}>{notifIcon(n.type)}</span>
                      <div>
                        <p style={{ margin: '0 0 3px', color: '#e2e8f0', fontSize: '13px', lineHeight: '1.4' }}>{n.message}</p>
                        {n.createdAt && (
                          <span style={{ fontSize: '11px', color: '#64748b' }}>
                            {new Date(n.createdAt.seconds * 1000).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {isAuthenticated ? (
        <button
          onClick={handleLogout}
          style={{
            ...baseLinkStyle,
            ...(isMobile ? { width: '100%', marginTop: '10px' } : { marginLeft: '8px' }),
            background: 'transparent', color: '#e74c3c',
            border: '1px solid rgba(231,76,60,0.3)', padding: '8px 16px', cursor: 'pointer',
          }}
        >
          Sair
        </button>
      ) : (
        <Link to="/login" style={{
          ...baseLinkStyle,
          ...(isMobile ? { width: '100%', marginTop: '10px' } : { marginLeft: '8px' }),
          background: '#f39c12', color: '#111827', padding: '10px 20px', display: 'block',
        }}>
          Entrar
        </Link>
      )}
    </div>
  );

  return (
    <nav style={navStyle}>
      <div style={innerStyle}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <div style={{ color: '#fff', fontSize: '24px', fontWeight: 'bold', letterSpacing: '-1px' }}>
            HoK <span style={{ color: '#f39c12' }}>HuB</span>
          </div>
        </Link>

        <div className="desktop-nav"><NavLinks isMobile={false} /></div>

        <button
          className="mobile-menu-btn"
          onClick={() => {
            setIsMenuOpen(!isMenuOpen);
            if (showNotifs) closeAndClearNotifications();
          }}
          style={{ background: 'none', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer', position: 'relative' }}
        >
          {isMenuOpen ? '✕' : '☰'}
          {hasNotifs && !isMenuOpen && (
            <span style={{
              position: 'absolute', top: '-4px', right: '-4px',
              background: '#f39c12', color: '#111827',
              fontSize: '10px', fontWeight: 'bold',
              width: '16px', height: '16px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid #0b0f19',
            }}>
              {notifications.length > 9 ? '9+' : notifications.length}
            </span>
          )}
        </button>

        <div className={`mobile-nav-dropdown ${isMenuOpen ? 'open' : ''}`}>
          <NavLinks isMobile={true} />
          {isAuthenticated && notifications.length > 0 && (
            <div style={{ marginTop: '10px', background: 'rgba(243,156,18,0.05)', borderRadius: '12px', padding: '12px', border: '1px solid rgba(243,156,18,0.1)' }}>
              <span style={{ color: '#f39c12', fontWeight: 'bold', fontSize: '13px' }}>🔔 Notificações ({notifications.length})</span>
              {notifications.slice(0, 3).map(n => (
                <div key={n.id} style={{ fontSize: '12px', color: '#94a3b8', padding: '4px 0' }}>
                  {notifIcon(n.type)} {n.message}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .desktop-nav { display: none; }
        .mobile-menu-btn { display: block; }
        .mobile-nav-dropdown {
          position: absolute; top: 100%; left: 0; width: 100%;
          background: #0b0f19; flex-direction: column;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          box-shadow: 0 10px 20px rgba(0,0,0,0.5);
          max-height: 0; overflow: hidden; opacity: 0;
          transition: all 0.3s ease-in-out;
          z-index: 1000; padding: 0 20px; box-sizing: border-box;
        }
        .mobile-nav-dropdown.open { max-height: 600px; opacity: 1; padding: 20px; }
        @media (min-width: 1024px) {
          .desktop-nav { display: block; }
          .mobile-menu-btn { display: none; }
          .mobile-nav-dropdown { display: none !important; }
        }
      `}</style>
    </nav>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeChatId, setActiveChatId] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsAuthenticated(true);
        try {
          const snap = await getDoc(doc(db, 'users', user.uid));
          if (snap.exists()) setCurrentUser({ uid: user.uid, ...snap.data() });
        } catch (e) { console.error(e); }
      } else {
        setIsAuthenticated(false);
        setCurrentUser(null);
        setUnreadCount(0);
        setNotifications([]);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!currentUser?.uid) return;
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', currentUser.uid),
      where('status', '==', 'aceito')
    );
    const unsub = onSnapshot(q, (snap) => {
      let total = 0;
      snap.docs.forEach(d => {
        const unreadBy = d.data().unreadBy || [];
        if (unreadBy.includes(currentUser.uid)) total++;
      });
      setUnreadCount(total);
    });
    return () => unsub();
  }, [currentUser]);

  // Listener de notificações com LIMIT(30) para proteger sua cota de leituras
  useEffect(() => {
    if (!currentUser?.uid) return;
    const q = query(
      collection(db, 'notifications'),
      where('toUid', '==', currentUser.uid),
      where('read', '==', false),
      limit(30) // Proteção adicionada aqui
    );
    const unsub = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [currentUser]);

  if (loading) return <div style={{ background: '#0b0f19', height: '100vh' }}></div>;

  return (
    <Router>
      <div style={{ background: '#0b0f19', minHeight: '100vh', fontFamily: '"Urbanist", sans-serif', overflowX: 'hidden' }}>
        <Navbar
          isAuthenticated={isAuthenticated}
          notifications={notifications}
        />

        <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Guias />} />
            <Route path="/termos" element={<Termos />} />
            <Route path="/tierlist" element={<TierList />} />
            <Route path="/ranking" element={<HubRanking />} />
            <Route path="/feed" element={isAuthenticated ? <Feed onOpenChat={setActiveChatId} /> : <Navigate to="/login" />} />
            <Route path="/discord-callback" element={<DiscordCallback />} />
            <Route path="/coaching" element={isAuthenticated ? <Coaching /> : <Navigate to="/login" />} />
            <Route path="/hub" element={isAuthenticated ? <Inhouse /> : <Navigate to="/login" />} />
            <Route path="/perfil" element={isAuthenticated ? <Perfil /> : <Navigate to="/login" />} />
            <Route path="/perfil/:id" element={isAuthenticated ? <PerfilPublico onOpenChat={setActiveChatId} /> : <Navigate to="/login" />} />
          </Routes>
        </Suspense>

        {isAuthenticated && activeChatId && (
          <FloatingChat
            targetId={activeChatId}
            currentUser={currentUser}
            onClose={() => setActiveChatId(null)}
          />
        )}

        {isAuthenticated && (
          <ChatHub
            activeChatId={activeChatId}
            onCloseChat={() => setActiveChatId(null)}
            onOpenChat={setActiveChatId}
            unreadCount={unreadCount}
          />
        )}
      </div>
    </Router>
  );
}

export default App;

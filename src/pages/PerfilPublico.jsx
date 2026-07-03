import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import MatchHistory from '../components/MatchHistory.jsx';

const generateAvatarSVG = (name) => {
  const initials = (name || '?').substring(0, 2).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 150" width="150" height="150">
    <rect width="150" height="150" fill="#f39c12" />
    <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-size="64px" font-weight="bold">${initials}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

function PerfilPublico({ onOpenChat }) {
  const { id } = useParams(); // Pega o ID da URL
  const navigate = useNavigate();
  const [publicUser, setPublicUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isStartingChat, setIsStartingChat] = useState(false); // Proteção contra múltiplos cliques

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userRef = doc(db, 'users', id);
        const docSnap = await getDoc(userRef);

        if (docSnap.exists()) {
          setPublicUser(docSnap.data());
        } else {
          setError(true);
        }
      } catch (err) {
        console.error("Erro ao buscar usuário:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchUser();
    }
  }, [id]);

  // Função que cria a solicitação de mensagem no banco de dados
  const handleRequestMessage = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser || !publicUser || isStartingChat) return;

    setIsStartingChat(true); // Ativa o estado de carregamento

    const chatId = currentUser.uid > id 
      ? `${currentUser.uid}_${id}` 
      : `${id}_${currentUser.uid}`;

    try {
      const chatRef = doc(db, 'chats', chatId);
      const chatSnap = await getDoc(chatRef);

      // Se o chat não existe, cria como "pendente" (Solicitação)
      if (!chatSnap.exists()) {
        const myUserRef = doc(db, 'users', currentUser.uid);
        const myUserSnap = await getDoc(myUserRef);
        const myData = myUserSnap.exists() ? myUserSnap.data() : {};

        await setDoc(chatRef, {
          participants: [currentUser.uid, id],
          participantsNames: {
            [currentUser.uid]: myData.name || 'Jogador',
            [id]: publicUser.name || 'Jogador'
          },
          participantsAvatars: {
            [currentUser.uid]: myData.avatar || '',
            [id]: publicUser.avatar || ''
          },
          status: 'pendente',
          requesterId: currentUser.uid,
          receiverId: id,
          updatedAt: serverTimestamp()
        });
      }

      // Abre a caixinha de chat na tela
      onOpenChat(id);
    } catch (error) {
      console.error("Erro ao iniciar chat:", error);
    } finally {
      setIsStartingChat(false); // Libera o botão
    }
  };

  if (loading) return <div style={{ minHeight: '100vh', background: '#0b0f19', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><h2 style={{ color: '#f39c12' }}>Buscando jogador...</h2></div>;
  
  if (error || !publicUser) return (
    <div style={{ minHeight: '100vh', background: '#0b0f19', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
      <h2>Jogador não encontrado.</h2>
      <button onClick={() => navigate(-1)} style={{ background: '#f39c12', color: '#111827', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', marginTop: '15px' }}>Voltar</button>
    </div>
  );

  const totalPartidas = (publicUser.wins || 0) + (publicUser.losses || 0);
  const winrate = totalPartidas > 0 ? Math.round(((publicUser.wins || 0) / totalPartidas) * 100) : 0;

  // Configurações do círculo SVG dinâmico
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (winrate / 100) * circumference;

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#0b0f19', 
      color: '#e2e8f0', 
      // Sugestão 5: Adicionado tratamento de Safe Area na base para mobile
      padding: '60px 20px calc(60px + env(safe-area-inset-bottom, 0px))', 
      fontFamily: '"Urbanist", sans-serif' 
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        <button 
          onClick={() => navigate(-1)}
          style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '16px', cursor: 'pointer', marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}
          onMouseOver={(e) => e.currentTarget.style.color = '#fff'}
          onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}
        >
          ← Voltar
        </button>

        {/* CARD PRINCIPAL */}
        <div style={{ background: 'linear-gradient(145deg, #111827, #0b0f19)', borderRadius: '24px', padding: '40px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', display: 'flex', flexWrap: 'wrap', gap: '30px', alignItems: 'center', justifyContent: 'center', textAlign: 'center', marginBottom: '30px', position: 'relative', overflow: 'hidden' }}>
          
          <div style={{ position: 'absolute', top: 0, right: 0, width: '150px', height: '150px', background: '#3498db', filter: 'blur(100px)', opacity: '0.1', pointerEvents: 'none' }}></div>

          {/* FOTO DE PERFIL */}
          <div style={{ position: 'relative' }}>
            <img 
              src={publicUser.avatar || generateAvatarSVG(publicUser.name)} 
              alt={publicUser.name} 
              style={{ width: '120px', height: '120px', borderRadius: '24px', border: '3px solid #3498db', boxShadow: '0 0 20px rgba(52, 152, 219, 0.2)', objectFit: 'cover' }} 
            />
          </div>

          {/* DADOS DO USUÁRIO */}
          <div style={{ flex: '1 1 250px', minWidth: '250px' }}>
            <span style={{ background: 'rgba(52, 152, 219, 0.1)', color: '#3498db', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Perfil Público
            </span>
            <h2 style={{ fontSize: '36px', color: '#fff', margin: '10px 0 5px 0', letterSpacing: '-1px' }}>{publicUser.name || 'Sem Nome'}</h2>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '16px' }}>
               Rota Principal: <span style={{ color: publicUser.role === 'Não definido' ? '#e74c3c' : '#fff', fontWeight: 'bold' }}>{publicUser.role || 'Não definido'}</span>
            </p>
            
            {/* Só mostra o botão se o perfil NÃO for do próprio usuário logado */}
            {auth.currentUser?.uid !== id && (
              <div style={{ marginTop: '20px' }}>
                <button 
                  onClick={handleRequestMessage} 
                  disabled={isStartingChat}
                  style={{ 
                    background: isStartingChat ? '#2980b9' : '#3498db', 
                    color: '#fff', border: 'none', padding: '10px 24px', 
                    borderRadius: '8px', fontWeight: 'bold', 
                    cursor: isStartingChat ? 'not-allowed' : 'pointer', 
                    transition: 'background 0.2s' 
                  }} 
                  onMouseOver={(e) => { if (!isStartingChat) e.currentTarget.style.background = '#2980b9'; }} 
                  onMouseOut={(e) => { if (!isStartingChat) e.currentTarget.style.background = '#3498db'; }}
                >
                  {isStartingChat ? '⏳ Abrindo Chat...' : '💬 Enviar Mensagem'}
                </button>
              </div>
            )}
          </div>

          {/* PONTUAÇÃO */}
          <div style={{ textAlign: 'center', flex: '1 1 200px' }}>
            <div style={{ fontSize: '14px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '1px' }}>Pontuação Hub</div>
            <div style={{ fontSize: '40px', fontWeight: 'bold', color: '#f1c40f', letterSpacing: '-px' }}>{publicUser.points || 0} <span style={{ fontSize: '18px', color: '#64748b' }}>MMR</span></div>
          </div>
        </div>

        {/* ESTATÍSTICAS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px', marginBottom: '20px' }}>
          <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '25px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.03)', textAlign: 'center' }}>
            <div style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '5px' }}>Partidas</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#fff' }}>{totalPartidas}</div>
          </div>
          <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '25px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.03)', textAlign: 'center' }}>
            <div style={{ fontSize: '14px', color: '#2ed573', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '5px' }}>Vitórias</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2ed573' }}>{publicUser.wins || 0}</div>
          </div>
          <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '25px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.03)', textAlign: 'center' }}>
            <div style={{ fontSize: '14px', color: '#e74c3c', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '5px' }}>Derrotas</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#e74c3c' }}>{publicUser.losses || 0}</div>
          </div>

          {/* Gráfico Circular de Winrate consertado e adicionado aqui */}
          <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '20px 25px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.03)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <div style={{ fontSize: '14px', color: '#f39c12', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '10px' }}>Taxa de Vitória</div>
            <div style={{ position: 'relative', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
                <circle cx="40" cy="40" r={radius} stroke="rgba(255,255,255,0.05)" strokeWidth="6" fill="transparent" />
                <circle cx="40" cy="40" r={radius} stroke="#f39c12" strokeWidth="6" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s ease-in-out' }} />
              </svg>
              <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff' }}>{winrate}%</span>
            </div>
          </div>
        </div>

        {/* HISTÓRICO DE PARTIDAS */}
        <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '30px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.03)', marginBottom: '20px' }}>
          <h4 style={{ margin: '0 0 20px 0', color: '#fff', fontSize: '18px' }}>Histórico de Partidas</h4>
          <MatchHistory userId={id} />
        </div>

      </div>
    </div>
  );
}

export default PerfilPublico;
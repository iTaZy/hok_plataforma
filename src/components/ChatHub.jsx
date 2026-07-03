import React, { useState, useEffect } from 'react';
import { auth, db } from '../services/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore';

const generateAvatarSVG = (name) => {
  const initials = (name || '?').substring(0, 2).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 150" width="150" height="150">
    <rect width="150" height="150" fill="#f39c12" />
    <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-size="64px" font-weight="bold">${initials}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

function ChatHub({ activeChatId, onCloseChat, onOpenChat }) {
  const [isHubOpen, setIsHubOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('chats'); 
  const [activeChats, setActiveChats] = useState([]);
  const [requests, setRequests] = useState([]);
  
  const currentUser = auth.currentUser;

  useEffect(() => {
    // TRAVA DE SEGURANÇA 1: Só continua se o UID existir de fato
    if (!currentUser?.uid) return;

    const q = query(
      collection(db, 'chats'), 
      where('participants', 'array-contains', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const allChats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Para chats sem participantsNames, busca os dados do usuário no Firestore antes de renderizar
      const enriched = await Promise.all(
        allChats.map(async (chat) => {
          if (chat.participantsNames) return chat;
          const otherUid = chat.participants?.find(id => id !== currentUser.uid);
          if (!otherUid) return chat;
          try {
            const snap = await getDoc(doc(db, 'users', otherUid));
            if (snap.exists()) {
              const data = snap.data();
              return {
                ...chat,
                participantsNames: { [currentUser.uid]: '', [otherUid]: data.name || 'Usuário' },
                participantsAvatars: { [currentUser.uid]: '', [otherUid]: data.avatar || '' },
              };
            }
          } catch (_) {}
          return chat;
        })
      );

      const accepted = enriched.filter(c => c.status === 'aceito');
      
      // TRAVA DE SEGURANÇA 2: Protege a leitura do currentUser
      const pendings = enriched.filter(c => c.status === 'pendente' && c.receiverId === currentUser?.uid);

      setActiveChats(accepted);
      setRequests(pendings);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleAcceptRequest = async (chatId, otherUserId) => {
    try {
      await updateDoc(doc(db, 'chats', chatId), {
        status: 'aceito'
      });
      onOpenChat(otherUserId);
      setActiveTab('chats');
    } catch (error) {
      console.error("Erro ao aceitar solicitação:", error);
    }
  };

  if (activeChatId) {
    return null; 
  }

  return (
    <>
      <style>{`
        .chat-hub-container {
          position: fixed;
          bottom: 30px;
          right: 30px;
          z-index: 9999;
          font-family: "Urbanist", sans-serif;
        }
        .chat-hub-window {
          width: 340px;
          height: 500px;
          background: #0b0f19;
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow: 0 15px 40px rgba(0,0,0,0.8);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        @media (max-width: 768px) {
          .chat-hub-container {
            bottom: calc(15px + env(safe-area-inset-bottom, 0px));
            right: 15px;
          }
          .chat-hub-window {
            width: calc(100vw - 30px);
            max-height: 80vh;
          }
        }
      `}</style>

      <div className="chat-hub-container">
        
        {!isHubOpen && (
          <button 
            onClick={() => setIsHubOpen(true)}
            style={{ 
              width: '60px', height: '60px', borderRadius: '50%', 
              background: 'linear-gradient(135deg, #f39c12, #d35400)', 
              color: '#fff', fontSize: '28px', border: 'none', cursor: 'pointer', 
              boxShadow: '0 10px 20px rgba(243, 156, 18, 0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'transform 0.2s',
              position: 'relative'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            💬
            {requests.length > 0 && (
              <span style={{ position: 'absolute', top: 0, right: 0, background: '#e74c3c', fontSize: '12px', fontWeight: 'bold', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #0b0f19' }}>
                {requests.length}
              </span>
            )}
          </button>
        )}

        {isHubOpen && (
          <div className="chat-hub-window">
            
            <div style={{ background: '#111827', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <h3 style={{ margin: 0, color: '#fff', fontSize: '18px' }}>Mensagens</h3>
              <button onClick={() => setIsHubOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <button 
                onClick={() => setActiveTab('chats')}
                style={{ flex: 1, padding: '15px', background: 'none', border: 'none', color: activeTab === 'chats' ? '#f39c12' : '#64748b', fontWeight: 'bold', borderBottom: activeTab === 'chats' ? '2px solid #f39c12' : '2px solid transparent', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                Conversas
              </button>
              <button 
                onClick={() => setActiveTab('requests')}
                style={{ flex: 1, padding: '15px', background: 'none', border: 'none', color: activeTab === 'requests' ? '#f39c12' : '#64748b', fontWeight: 'bold', borderBottom: activeTab === 'requests' ? '2px solid #f39c12' : '2px solid transparent', cursor: 'pointer', transition: 'all 0.2s', position: 'relative' }}
              >
                Solicitações
                {requests.length > 0 && (
                  <span style={{ position: 'absolute', top: '12px', right: '10px', width: '8px', height: '8px', background: '#e74c3c', borderRadius: '50%' }}></span>
                )}
              </button>
            </div>

            {/* LISTA DE ITENS */}
            <div style={{ flex: 1, padding: '10px', overflowY: 'auto' }}>
              
              {activeTab === 'chats' && (
                activeChats.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#64748b', marginTop: '40px' }}>Nenhuma conversa ativa.</div>
                ) : (
                  activeChats.map(chat => {
                    const otherUserId = chat.participants?.find(id => id !== currentUser?.uid);
                    const otherUserName = chat.participantsNames?.[otherUserId] || 'Usuário Desconhecido';
                    const otherUserAvatar = chat.participantsAvatars?.[otherUserId]; // Puxa a foto
                    
                    return (
                      <div 
                        key={chat.id} 
                        onClick={() => onOpenChat(otherUserId)}
                        style={{ padding: '15px', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', borderRadius: '12px', transition: 'background 0.2s' }}
                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <img src={otherUserAvatar || generateAvatarSVG(otherUserName)} alt={otherUserName} style={{ width: '45px', height: '45px', borderRadius: '50%', objectFit: 'cover' }} />
                        <div style={{ flex: 1 }}>
                          <h4 style={{ margin: 0, color: '#fff', fontSize: '15px' }}>{otherUserName}</h4>
                          <span style={{ fontSize: '13px', color: '#64748b' }}>Toque para abrir a conversa</span>
                        </div>
                      </div>
                    )
                  })
                )
              )}

              {activeTab === 'requests' && (
                requests.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#64748b', marginTop: '40px' }}>Sem solicitações pendentes.</div>
                ) : (
                  requests.map(chat => {
                    const otherUserId = chat.requesterId;
                    const otherUserName = chat.participantsNames?.[otherUserId] || 'Novo Jogador';
                    const otherUserAvatar = chat.participantsAvatars?.[otherUserId]; // Puxa a foto

                    return (
                      <div key={chat.id} style={{ padding: '15px', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
                          <img src={otherUserAvatar || generateAvatarSVG(otherUserName)} alt={otherUserName} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                          <div>
                            <h4 style={{ margin: 0, color: '#fff', fontSize: '15px' }}>{otherUserName}</h4>
                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Quer conversar com você</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleAcceptRequest(chat.id, otherUserId)}
                          style={{ width: '100%', background: '#2ed573', color: '#111827', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                          Aceitar Solicitação
                        </button>
                      </div>
                    )
                  })
                )
              )}

            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default ChatHub;
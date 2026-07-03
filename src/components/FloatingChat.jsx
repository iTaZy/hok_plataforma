import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom'; // 1. Adicionado hook de navegação
import { auth, db } from '../services/firebase';
import { 
  collection, addDoc, query, orderBy, limit, onSnapshot, 
  serverTimestamp, doc, getDoc, setDoc, updateDoc, arrayRemove 
} from 'firebase/firestore';

const generateAvatarSVG = (name) => {
  const initials = (name || '?').substring(0, 2).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 150" width="150" height="150">
    <rect width="150" height="150" fill="#f39c12" />
    <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-size="64px" font-weight="bold">${initials}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

function FloatingChat({ targetId, currentUser: currentUserProp, onClose }) {
  const navigate = useNavigate(); // Inicializando o navigate
  const currentUser = currentUserProp || auth.currentUser;
  const [targetUser, setTargetUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const messagesEndRef = useRef(null);

  const chatId = currentUser && targetId
    ? (currentUser.uid > targetId
        ? `${currentUser.uid}_${targetId}`
        : `${targetId}_${currentUser.uid}`)
    : null;

  // Busca dados do usuário alvo EM TEMPO REAL
  useEffect(() => {
    if (!targetId) return;
    const unsub = onSnapshot(doc(db, 'users', targetId), 
      (snap) => {
        if (snap.exists()) setTargetUser(snap.data());
      }, 
      (e) => {
        console.error('Erro ao buscar usuário:', e);
        setError('Falha ao carregar dados do usuário.');
      }
    );
    return () => unsub();
  }, [targetId]);

  // Garante que o chat existe com TODOS os campos necessários
  useEffect(() => {
    if (!chatId || !currentUser || !targetUser) return;

    const ensureChat = async () => {
      try {
        const chatRef = doc(db, 'chats', chatId);
        const snap = await getDoc(chatRef);

        if (!snap.exists()) {
          const mySnap = await getDoc(doc(db, 'users', currentUser.uid));
          const myData = mySnap.exists() ? mySnap.data() : {};

          await setDoc(chatRef, {
            participants: [currentUser.uid, targetId],
            participantsNames: {
              [currentUser.uid]: myData.name || currentUser.name || 'Jogador',
              [targetId]: targetUser.name || 'Jogador',
            },
            participantsAvatars: {
              [currentUser.uid]: myData.avatar || currentUser.avatar || '',
              [targetId]: targetUser.avatar || '',
            },
            status: 'pendente',
            requesterId: currentUser.uid,
            receiverId: targetId,
            createdAt: serverTimestamp(),
            unreadBy: [],
          });
        } else {
          const data = snap.data();
          if (!data.participantsNames) {
            const mySnap = await getDoc(doc(db, 'users', currentUser.uid));
            const myData = mySnap.exists() ? mySnap.data() : {};
            await updateDoc(chatRef, {
              participantsNames: {
                [currentUser.uid]: myData.name || currentUser.name || 'Jogador',
                [targetId]: targetUser.name || 'Jogador',
              },
              participantsAvatars: {
                [currentUser.uid]: myData.avatar || currentUser.avatar || '',
                [targetId]: targetUser.avatar || '',
              },
            });
          }
        }
      } catch (e) { 
        console.error('Erro ao criar/atualizar chat:', e);
        setError('Não foi possível iniciar a conversa. Verifique sua conexão.');
      }
    };

    ensureChat();
  }, [chatId, currentUser, targetId, targetUser]);

  // Listener de mensagens com PAGINAÇÃO
  useEffect(() => {
    if (!chatId || !currentUser) return;

    const q = query(
      collection(db, 'chats', chatId, 'messages'), 
      orderBy('createdAt', 'desc'), 
      limit(50)
    );

    const unsub = onSnapshot(q, async (snap) => {
      const fetchedMessages = snap.docs.map(d => ({ id: d.id, ...d.data() })).reverse();
      setMessages(fetchedMessages);
      setLoading(false);
      try {
        await updateDoc(doc(db, 'chats', chatId), { unreadBy: arrayRemove(currentUser.uid) });
      } catch (_) {}
    }, (err) => {
      console.error('Erro nas mensagens:', err);
      setError('Erro ao sincronizar mensagens.');
    });

    return () => unsub();
  }, [chatId, currentUser]);

  // Scroll automático
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser || !chatId) return;

    const text = newMessage.trim();
    setNewMessage('');

    try {
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        text,
        senderId: currentUser.uid,
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: text,
        lastMessageAt: serverTimestamp(),
        unreadBy: [targetId],
      });

      await addDoc(collection(db, 'notifications'), {
        toUid: targetId,
        fromUid: currentUser.uid,
        fromName: currentUser.name || 'Jogador',
        type: 'message',
        message: `${currentUser.name || 'Jogador'} te enviou uma mensagem`,
        read: false,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      setError('Falha ao enviar a mensagem.');
    }
  };

  if (loading || !targetUser) return null;

  return (
    <>
      <style>{`
        .floating-chat-container {
          position: fixed;
          bottom: 0;
          right: 60px;
          width: 360px;
          height: 500px;
          background: #0b0f19;
          border: 1px solid rgba(255,255,255,0.1);
          border-bottom: none;
          border-top-left-radius: 16px;
          border-top-right-radius: 16px;
          box-shadow: 0 -5px 25px rgba(0,0,0,0.5);
          display: flex;
          flex-direction: column;
          z-index: 9998;
          overflow: hidden;
          font-family: "Urbanist", sans-serif;
        }
        .floating-chat-input-area {
          background: #111827;
          padding: 15px;
          border-top: 1px solid rgba(255,255,255,0.05);
        }
        @media (max-width: 768px) {
          .floating-chat-container {
            right: 0;
            width: 100%;
            height: 100dvh;
            border: none;
            border-radius: 0;
          }
          .floating-chat-input-area {
            padding-bottom: calc(15px + env(safe-area-inset-bottom, 0px));
          }
        }
      `}</style>

      <div className="floating-chat-container">

        {/* Cabeçalho */}
        <div style={{ background: '#111827', padding: '15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingTop: 'max(15px, env(safe-area-inset-top))' }}>
          
          {/* DIV CLICÁVEL COM NAVEGAÇÃO PARA O PERFIL */}
          <div 
            onClick={() => {
              navigate(`/perfil/${targetId}`); // Redireciona
              // onClose(); // Remova as barras "//" no início desta linha se quiser que o chat feche ao ir para o perfil
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', transition: 'opacity 0.2s' }}
            onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
            title="Ver perfil do jogador"
          >
            <img
              src={targetUser.avatar || generateAvatarSVG(targetUser.name)}
              alt={targetUser.name}
              style={{ width: '35px', height: '35px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #f39c12' }}
            />
            <h3 style={{ margin: 0, color: '#fff', fontSize: '14px' }}>{targetUser.name}</h3>
          </div>

          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '18px', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Alerta de Erro */}
        {error && (
          <div style={{ background: '#e74c3c', color: '#fff', padding: '8px', fontSize: '12px', textAlign: 'center', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{error}</span>
            <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
          </div>
        )}

        {/* Mensagens */}
        <div style={{ flex: 1, padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(11,15,25,0.95)' }}>
          <div style={{ background: 'rgba(243,156,18,0.05)', border: '1px solid rgba(243,156,18,0.2)', borderRadius: '8px', padding: '12px', textAlign: 'center', marginBottom: '5px' }}>
            <p style={{ margin: '0 0 8px 0', fontSize: '11px', color: '#94a3b8', lineHeight: '1.4' }}>
              🔒 As mensagens da plataforma são protegidas e armazenadas com segurança. Administradores autorizados podem acessar mensagens quando necessário para garantir o funcionamento e a segurança do serviço.
            </p>
            <p style={{ margin: 0, fontSize: '11px', color: '#f39c12', fontWeight: 'bold' }}>
              Evite compartilhar informações confidenciais, como senhas, dados bancários ou documentos pessoais.
            </p>
          </div>

          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#64748b', fontSize: '12px', marginTop: '10px' }}>Inicie a conversa!</div>
          ) : (
            messages.map(msg => {
              const isMe = msg.senderId === currentUser?.uid;
              return (
                <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    background: isMe ? '#f39c12' : '#1e293b',
                    color: isMe ? '#111827' : '#fff',
                    padding: '8px 12px', borderRadius: '12px',
                    borderBottomRightRadius: isMe ? '4px' : '12px',
                    borderBottomLeftRadius: isMe ? '12px' : '4px',
                    maxWidth: '85%', fontSize: '14px',
                    wordBreak: 'break-word'
                  }}>
                    {msg.text}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="floating-chat-input-area">
          <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Mensagem..."
              style={{ flex: 1, background: '#0b0f19', border: '1px solid rgba(255,255,255,0.1)', padding: '10px 12px', borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none' }}
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              style={{ background: '#f39c12', color: '#111827', border: 'none', padding: '0 15px', borderRadius: '8px', fontWeight: 'bold', cursor: newMessage.trim() ? 'pointer' : 'not-allowed' }}
            >
              ➤
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

export default FloatingChat;
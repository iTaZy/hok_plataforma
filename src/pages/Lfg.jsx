import React, { useState, useEffect } from 'react';
import { auth, db } from '../services/firebase'; // Importando o auth também
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, deleteDoc, doc } from 'firebase/firestore'; // Adicionado deleteDoc e doc

function Lfg() {
  const [nickname, setNickname] = useState('');
  const [elo, setElo] = useState('Diamante');
  const [role, setRole] = useState('Qualquer Rota');
  const [message, setMessage] = useState('');
  const [posts, setPosts] = useState([]);
  
  // Estado para guardar quem é o usuário logado no momento
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    // Fica monitorando quem está logado
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });

    const q = query(collection(db, 'lfg_posts'), orderBy('createdAt', 'desc'));
    
    const unsubscribePosts = onSnapshot(q, (querySnapshot) => {
      const postsArray = [];
      querySnapshot.forEach((doc) => {
        postsArray.push({ id: doc.id, ...doc.data() });
      });
      setPosts(postsArray);
    });

    // Limpa os observadores quando sai da página
    return () => {
      unsubscribeAuth();
      unsubscribePosts();
    };
  }, []);

  const handlePost = async (e) => {
    e.preventDefault();
    if (!nickname || !message) return;
    
    if (!currentUser) {
      alert("Você precisa estar logado para publicar.");
      return;
    }

    try {
      await addDoc(collection(db, 'lfg_posts'), {
        nickname: nickname,
        elo: elo,
        role: role,
        message: message,
        createdAt: serverTimestamp(),
        userId: currentUser.uid // Salvando a "identidade" de quem postou
      });

      setNickname('');
      setMessage('');
    } catch (error) {
      console.error("Erro ao publicar:", error);
      alert("Erro ao publicar. Verifique o console.");
    }
  };

  // Nova função para deletar o post
  const handleDelete = async (postId) => {
    if (window.confirm("Tem certeza que encontrou seu duo e deseja excluir este anúncio?")) {
      try {
        await deleteDoc(doc(db, 'lfg_posts', postId));
      } catch (error) {
        console.error("Erro ao excluir:", error);
        alert("Erro ao excluir o anúncio.");
      }
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '40px' }}>
      
      {/* SEÇÃO 1: FORMULÁRIO DE PUBLICAÇÃO */}
      <div style={{ background: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
        <h2 style={{ marginTop: 0, color: '#333' }}>Procurando Duo?</h2>
        <p style={{ color: '#666', marginBottom: '20px' }}>Crie um anúncio para encontrar jogadores do mesmo nível que você.</p>
        
        {currentUser ? (
          <form onSubmit={handlePost} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
              <input 
                type="text" 
                placeholder="Seu Nickname no jogo" 
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ccc' }}
                required 
              />
              
              <select value={elo} onChange={(e) => setElo(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc', background: 'white' }}>
                <option value="Platina">Platina ou menor</option>
                <option value="Diamante">Diamante</option>
                <option value="Mestre">Mestre</option>
                <option value="Grão-Mestre">Grão-Mestre</option>
                <option value="Mítico">Mítico</option>
                <option value="Lenda/Soberano">Lenda / Soberano</option>
              </select>

              <select value={role} onChange={(e) => setRole(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc', background: 'white' }}>
                <option value="Qualquer Rota">Qualquer Rota</option>
                <option value="Rota Superior">Rota Superior</option>
                <option value="Rota do Meio">Rota do Meio</option>
                <option value="Atirador">Atirador</option>
                <option value="Suporte">Suporte</option>
                <option value="Selva">Selva</option>
              </select>
            </div>

            <textarea 
              placeholder="Escreva uma mensagem curta (ex: Sou main Suporte, procuro Atirador agressivo com call no Discord...)" 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc', minHeight: '80px', resize: 'vertical' }}
              required
            />

            <button type="submit" style={{ padding: '12px', background: '#f39c12', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>
              Publicar Anúncio
            </button>
          </form>
        ) : (
          <div style={{ padding: '20px', background: '#f8f9fa', borderRadius: '8px', textAlign: 'center', border: '1px solid #ddd' }}>
            <p style={{ margin: '0 0 10px 0', color: '#e74c3c', fontWeight: 'bold' }}>Você precisa estar logado para publicar um anúncio.</p>
          </div>
        )}
      </div>

      {/* SEÇÃO 2: MURAL DE JOGADORES */}
      <div>
        <h3 style={{ borderBottom: '2px solid #f39c12', paddingBottom: '10px', display: 'inline-block', marginBottom: '20px' }}>
          Jogadores Disponíveis
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {posts.length === 0 ? (
            <p style={{ color: '#999', textAlign: 'center', padding: '20px' }}>Nenhum jogador procurando duo no momento. Seja o primeiro!</p>
          ) : (
            posts.map((post) => (
              <div key={post.id} style={{ background: 'white', padding: '20px', borderRadius: '8px', borderLeft: '5px solid #2980b9', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', position: 'relative' }}>
                
                {/* Botão de excluir aparece apenas se o usuário logado for o dono do post */}
                {currentUser && currentUser.uid === post.userId && (
                  <button 
                    onClick={() => handleDelete(post.id)}
                    style={{ position: 'absolute', top: '15px', right: '15px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '5px', padding: '5px 10px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                    title="Excluir meu anúncio"
                  >
                    Excluir
                  </button>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '10px', paddingRight: '60px' }}>
                  <h4 style={{ margin: 0, fontSize: '18px', color: '#2c3e50' }}>🎮 {post.nickname}</h4>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <span style={{ background: '#f1c40f', color: '#fff', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>{post.elo}</span>
                    <span style={{ background: '#34495e', color: '#fff', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>{post.role}</span>
                  </div>
                </div>
                <p style={{ margin: 0, color: '#555', lineHeight: '1.5' }}>"{post.message}"</p>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}

export default Lfg;
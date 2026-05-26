import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';

function Perfil() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Novos Estados para a Edição de Nome
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');

  const fileInputRef = useRef(null);

  const rolesDisponiveis = ['Rota Superior', 'Selva', 'Rota do Meio', 'Atirador', 'Suporte'];

  useEffect(() => {
    let unsubscribeUser = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        unsubscribeUser = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setCurrentUser(data);
            // Só atualiza o input de nome se o utilizador não estiver a editar naquele momento
            if (!isEditingName) {
              setNameInput(data.name || '');
            }
          }
          setLoading(false);
        });
      } else {
        setCurrentUser(null);
        setLoading(false);
        if (unsubscribeUser) unsubscribeUser();
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUser) unsubscribeUser();
    };
  }, [isEditingName]);

  const updateUserData = async (dataToUpdate) => {
    if (!currentUser || isUpdating) return;
    setIsUpdating(true);

    const userRef = doc(db, 'users', currentUser.id);
    try {
      await updateDoc(userRef, dataToUpdate);
      console.log("Dados atualizados no Firestore!");
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateRole = (novaRole) => {
    updateUserData({ role: novaRole });
  };

  // Função para salvar o novo nome/nick
  const handleSaveName = async () => {
    if (!nameInput.trim()) {
      alert("O nome não pode ficar vazio!");
      return;
    }
    await updateUserData({ name: nameInput.trim() });
    setIsEditingName(false); // Fecha o modo de edição
  };

  // Upload para o Cloudinary
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploadingPhoto(true);

    // Substitua com as suas configurações do Cloudinary
    const cloudName = 'dfd7b1yul'; 
    const uploadPreset = 'hok_avatar_preset'; 

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.secure_url) {
        await updateUserData({ avatar: data.secure_url });
        console.log("Foto atualizada via Cloudinary!");
      } else {
        throw new Error('Falha no upload');
      }
    } catch (error) {
      console.error("Erro no upload:", error);
      alert("Erro ao enviar a foto. Verifique as configurações do Cloudinary.");
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const triggerFileSelect = () => {
    if (fileInputRef.current && !isUploadingPhoto) {
      fileInputRef.current.click();
    }
  };

  const totalPartidas = currentUser ? currentUser.wins + currentUser.losses : 0;
  const winrate = totalPartidas > 0 ? Math.round((currentUser.wins / totalPartidas) * 100) : 0;

  if (loading) return <div style={{ minHeight: '100vh', background: '#0b0f19', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><h2 style={{ color: '#f39c12' }}>Carregando...</h2></div>;
  if (!currentUser) return <div style={{ minHeight: '100vh', background: '#0b0f19', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><h2>Faça login.</h2></div>;

  return (
    <div style={{ minHeight: '100vh', background: '#0b0f19', color: '#e2e8f0', padding: '60px 20px', fontFamily: '"Urbanist", sans-serif' }}>
      
      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        style={{ display: 'none' }} 
      />

      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        {/* CARD PRINCIPAL */}
        <div style={{ background: 'linear-gradient(145deg, #111827, #0b0f19)', borderRadius: '24px', padding: '40px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', display: 'flex', flexWrap: 'wrap', gap: '30px', alignItems: 'center', justifyContent: 'center', textAlign: 'center', marginBottom: '30px', position: 'relative', overflow: 'hidden' }}>
          
          <div style={{ position: 'absolute', top: 0, right: 0, width: '150px', height: '150px', background: '#f39c12', filter: 'blur(100px)', opacity: '0.1', pointerEvents: 'none' }}></div>

          {/* FOTO DE PERFIL */}
          <div 
            style={{ position: 'relative', cursor: isUploadingPhoto ? 'wait' : 'pointer', opacity: isUploadingPhoto ? 0.5 : 1, transition: 'opacity 0.3s' }} 
            onClick={triggerFileSelect} 
            title="Clique para alterar a foto"
          >
            <img 
              src={currentUser.avatar || "https://via.placeholder.com/120?text=HoK"} 
              alt={currentUser.name} 
              style={{ width: '120px', height: '120px', borderRadius: '24px', border: '3px solid #f39c12', boxShadow: '0 0 20px rgba(243, 156, 18, 0.2)', objectFit: 'cover' }} 
            />
            {isUploadingPhoto ? (
               <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontWeight: 'bold', color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.8)', fontSize: '12px' }}>Enviando...</div>
            ) : (
              <div style={{ position: 'absolute', bottom: '-8px', right: '-8px', background: '#f39c12', color: '#111827', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', boxShadow: '0 4px 10px rgba(0,0,0,0.3)', border: '2px solid #111827' }}>
                  📸
              </div>
            )}
          </div>

          {/* DADOS DO USUÁRIO (NOME E ROTA) */}
          <div style={{ flex: '1 1 250px', minWidth: '250px' }}>
            <span style={{ background: 'rgba(243, 156, 18, 0.1)', color: '#f39c12', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Jogador da Liga
            </span>

            {/* BLOCO DE NOME DINÂMICO (TEXTO OU INPUT) */}
            {isEditingName ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginTop: '10px', marginBottom: '5px', flexWrap: 'wrap' }}>
                <input 
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid #f39c12', borderRadius: '8px', color: '#fff', padding: '8px 12px', fontSize: '20px', fontWeight: 'bold', outline: 'none', width: '100%', maxWidth: '200px' }}
                />
                <button onClick={handleSaveName} style={{ background: '#2ed573', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
                  ✓
                </button>
                <button onClick={() => setIsEditingName(false)} style={{ background: '#e74c3c', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
                  ✕
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginTop: '10px', marginBottom: '5px' }}>
                <h2 style={{ fontSize: '36px', color: '#fff', margin: 0, letterSpacing: '-1px' }}>{currentUser.name}</h2>
                <button 
                  onClick={() => setIsEditingName(true)} 
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '18px', padding: 0 }}
                  title="Editar Nome"
                >
                  ✏️
                </button>
              </div>
            )}

            <p style={{ margin: 0, color: '#94a3b8', fontSize: '16px' }}>
               Rota Principal: <span style={{ color: currentUser.role === 'Não definido' ? '#e74c3c' : '#fff', fontWeight: 'bold' }}>{currentUser.role}</span>
            </p>
          </div>

          <div style={{ textAlign: 'center', flex: '1 1 200px' }}>
            <div style={{ fontSize: '14px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '1px' }}>Pontuação Hub</div>
            <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#f1c40f', letterSpacing: '-1px' }}>{currentUser.points} <span style={{ fontSize: '18px', color: '#64748b' }}>MMR</span></div>
          </div>
        </div>

        {/* COMPONENTE DE ESTATÍSTICAS EM GRADE (Usando auto-fit para responsividade) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px', marginBottom: '40px' }}>
          <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '25px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.03)', textAlign: 'center' }}>
            <div style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '5px' }}>Partidas</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#fff' }}>{totalPartidas}</div>
          </div>
          <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '25px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.03)', textAlign: 'center' }}>
            <div style={{ fontSize: '14px', color: '#2ed573', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '5px' }}>Vitórias</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2ed573' }}>{currentUser.wins}</div>
          </div>
          <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '25px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.03)', textAlign: 'center' }}>
            <div style={{ fontSize: '14px', color: '#e74c3c', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '5px' }}>Derrotas</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#e74c3c' }}>{currentUser.losses}</div>
          </div>
        </div>

        {/* WINRATE E SELEÇÃO DE ROTA (Adicionado flexWrap e tamanhos flexíveis) */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
          
          <div style={{ flex: '1 1 250px', background: 'rgba(15, 23, 42, 0.6)', padding: '30px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.03)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: '16px', color: '#94a3b8', fontWeight: 'bold', marginBottom: '15px' }}>Taxa de Vitória</div>
            <div style={{ width: '100px', height: '100px', borderRadius: '50%', border: '6px solid rgba(255,255,255,0.05)', borderTopColor: '#2ed573', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold', color: '#fff' }}>
              {winrate}%
            </div>
          </div>

          <div style={{ flex: '1 1 300px', background: 'rgba(15, 23, 42, 0.6)', padding: '30px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.03)' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#fff', fontSize: '18px', textAlign: 'center' }}>Alterar Rota Favorita</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px', marginTop: '20px' }}>
              {rolesDisponiveis.map((role) => (
                <button
                  key={role}
                  onClick={() => handleUpdateRole(role)}
                  disabled={isUpdating}
                  style={{
                    background: currentUser.role === role ? '#f39c12' : 'rgba(0,0,0,0.3)',
                    color: currentUser.role === role ? '#111827' : '#94a3b8',
                    border: currentUser.role === role ? '1px solid #f39c12' : '1px solid rgba(255,255,255,0.1)',
                    padding: '10px 16px', borderRadius: '10px', fontWeight: 'bold', fontSize: '14px',
                    cursor: isUpdating ? 'not-allowed' : 'pointer', transition: 'all 0.2s', flex: '1 1 auto'
                  }}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Perfil;
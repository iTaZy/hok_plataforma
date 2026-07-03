import React, { useState, useEffect, useRef } from 'react';
import { auth, db, storage } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useSearchParams } from 'react-router-dom';
import MatchHistory from '../components/MatchHistory.jsx';

// Gera avatar SVG inline com iniciais
const generateAvatarSVG = (name) => {
  const initials = (name || '?').substring(0, 2).toUpperCase();
  const bg = '#f39c12';
  const color = '#ffffff';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 150" width="150" height="150">
    <rect width="150" height="150" fill="${bg}" />
    <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" fill="${color}" font-family="sans-serif" font-size="64px" font-weight="bold">${initials}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

function Perfil() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [discordMessage, setDiscordMessage] = useState('');

  const fileInputRef = useRef(null);
  const [searchParams] = useSearchParams();

  const rolesDisponiveis = ['Rota Superior', 'Selva', 'Rota do Meio', 'Atirador', 'Suporte'];

  const DISCORD_CLIENT_ID = "1509569358395998370";
  const REDIRECT_URI = encodeURIComponent(window.location.origin + '/discord-callback');
  const DISCORD_OAUTH_URL = `https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=identify%20guilds.join`;

  useEffect(() => {
    const discordStatus = searchParams.get('discord');
    if (discordStatus === 'success') {
      setDiscordMessage('success');
      setTimeout(() => setDiscordMessage(''), 4000);
    } else if (discordStatus === 'error') {
      setDiscordMessage('error');
      setTimeout(() => setDiscordMessage(''), 4000);
    }
  }, [searchParams]);

  useEffect(() => {
    let unsubscribeUser = null;
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        unsubscribeUser = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            // CORREÇÃO 1: Injetando o uid explicitamente no currentUser
            setCurrentUser({ uid: user.uid, ...data });
            if (!isEditingName) setNameInput(data.name || '');
          }
          setLoading(false);
        });
      } else {
        setCurrentUser(null);
        setLoading(false);
        if (unsubscribeUser) unsubscribeUser();
      }
    });
    return () => { unsubscribeAuth(); if (unsubscribeUser) unsubscribeUser(); };
  }, [isEditingName]);

  const updateUserData = async (dataToUpdate) => {
    if (!currentUser || isUpdating) return;
    setIsUpdating(true);
    // CORREÇÃO 2: Utilizando o .uid ao invés de .id
    const userRef = doc(db, 'users', currentUser.uid);
    try {
      await updateDoc(userRef, dataToUpdate);
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateRole = (novaRole) => updateUserData({ role: novaRole });

  const handleSaveName = async () => {
    if (!nameInput.trim()) { alert("O nome não pode ficar vazio!"); return; }
    await updateUserData({ name: nameInput.trim() });
    setIsEditingName(false);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploadingPhoto(true);
    try {
      // CORREÇÃO 3: Utilizando o .uid no caminho da foto
      const caminhoFoto = `avatars/${currentUser.uid}/profile_pic`;
      const fileRef = ref(storage, caminhoFoto);
      await uploadBytes(fileRef, file);
      const downloadURL = await getDownloadURL(fileRef);
      
      // Adiciona timestamp (?t=) para quebrar o cache de imagem do navegador e atualizar na hora
      await updateUserData({ avatar: `${downloadURL}?t=${Date.now()}` });
    } catch (error) {
      console.error("Erro no upload:", error);
      alert("Erro ao enviar a foto. Verifique sua conexão ou permissões.");
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const triggerFileSelect = () => {
    if (fileInputRef.current && !isUploadingPhoto) fileInputRef.current.click();
  };

  const totalPartidas = currentUser ? (currentUser.wins || 0) + (currentUser.losses || 0) : 0;
  const winrate = totalPartidas > 0 ? Math.round(((currentUser.wins || 0) / totalPartidas) * 100) : 0;

  // Parâmetros do gráfico de Rosca SVG
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (winrate / 100) * circumference;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0b0f19', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <h2 style={{ color: '#f39c12' }}>Carregando...</h2>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div style={{ minHeight: '100vh', background: '#0b0f19', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
        <h2>Faça login.</h2>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#0b0f19', 
      color: '#e2e8f0', 
      padding: '60px 20px calc(60px + env(safe-area-inset-bottom, 0px))', 
      fontFamily: '"Urbanist", sans-serif' 
    }}>

      <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />

      <div style={{ maxWidth: '800px', margin: '0 auto' }}>

        {/* CARD PRINCIPAL */}
        <div style={{ background: 'linear-gradient(145deg, #111827, #0b0f19)', borderRadius: '24px', padding: '40px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', display: 'flex', flexWrap: 'wrap', gap: '30px', alignItems: 'center', justifyContent: 'center', textAlign: 'center', marginBottom: '30px', position: 'relative', overflow: 'hidden' }}>

          <div style={{ position: 'absolute', top: 0, right: 0, width: '150px', height: '150px', background: '#f39c12', filter: 'blur(100px)', opacity: '0.1', pointerEvents: 'none' }}></div>

          {/* FOTO */}
          <div
            style={{ position: 'relative', cursor: isUploadingPhoto ? 'wait' : 'pointer', opacity: isUploadingPhoto ? 0.5 : 1, transition: 'opacity 0.3s' }}
            onClick={triggerFileSelect}
            title="Clique para alterar a foto"
          >
            <img
              src={currentUser.avatar || generateAvatarSVG(currentUser.name)}
              alt={currentUser.name}
              style={{ width: '120px', height: '120px', borderRadius: '24px', border: '3px solid #f39c12', boxShadow: '0 0 20px rgba(243, 156, 18, 0.2)', objectFit: 'cover', background: '#111827' }}
            />
            {isUploadingPhoto ? (
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontWeight: 'bold', color: '#fff', fontSize: '12px', background: 'rgba(0,0,0,0.5)', padding: '4px 8px', borderRadius: '8px' }}>
                Enviando...
              </div>
            ) : (
              <div style={{ position: 'absolute', bottom: '-8px', right: '-8px', background: '#f39c12', color: '#111827', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', boxShadow: '0 4px 10px rgba(0,0,0,0.3)', border: '2px solid #111827' }}>
                📸
              </div>
            )}
          </div>

          {/* DADOS */}
          <div style={{ flex: '1 1 250px', minWidth: '250px' }}>
            <span style={{ background: 'rgba(243, 156, 18, 0.1)', color: '#f39c12', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Nome do Jogador
            </span>

            {isEditingName ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginTop: '10px', marginBottom: '5px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  maxLength={20}
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid #f39c12', borderRadius: '8px', color: '#fff', padding: '8px 12px', fontSize: '20px', fontWeight: 'bold', outline: 'none', width: '100%', maxWidth: '200px' }}
                />
                <button onClick={handleSaveName} style={{ background: '#2ed573', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>✓</button>
                <button onClick={() => setIsEditingName(false)} style={{ background: '#e74c3c', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginTop: '10px', marginBottom: '5px' }}>
                <h2 style={{ fontSize: '36px', color: '#fff', margin: 0, letterSpacing: '-1px' }}>{currentUser.name}</h2>
                <button onClick={() => setIsEditingName(true)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '18px', padding: 0 }} title="Editar Nome">✏️</button>
              </div>
            )}

            <p style={{ margin: 0, color: '#94a3b8', fontSize: '16px' }}>
              Rota Principal: <span style={{ color: currentUser.role === 'Não definido' ? '#e74c3c' : '#fff', fontWeight: 'bold' }}>{currentUser.role}</span>
            </p>
          </div>

          <div style={{ textAlign: 'center', flex: '1 1 200px' }}>
            <div style={{ fontSize: '14px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '1px' }}>Pontuação Hub</div>
            <div style={{ fontSize: '40px', fontWeight: 'bold', color: '#f1c40f', letterSpacing: '-1px' }}>
              {currentUser.points} <span style={{ fontSize: '18px', color: '#64748b' }}>MMR</span>
            </div>
          </div>
        </div>

        {/* ESTATÍSTICAS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px', marginBottom: '30px' }}>
          <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '25px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.03)', textAlign: 'center' }}>
            <div style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '5px' }}>Partidas</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#fff' }}>{totalPartidas}</div>
          </div>
          <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '25px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.03)', textAlign: 'center' }}>
            <div style={{ fontSize: '14px', color: '#2ed573', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '5px' }}>Vitórias</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2ed573' }}>{currentUser.wins || 0}</div>
          </div>
          <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '25px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.03)', textAlign: 'center' }}>
            <div style={{ fontSize: '14px', color: '#e74c3c', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '5px' }}>Derrotas</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#e74c3c' }}>{currentUser.losses || 0}</div>
          </div>
        </div>

        {/* WINRATE E ROTA */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '30px' }}>
          
          <div style={{ flex: '1 1 250px', background: 'rgba(15, 23, 42, 0.6)', padding: '30px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.03)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: '16px', color: '#94a3b8', fontWeight: 'bold', marginBottom: '15px' }}>Taxa de Vitória</div>
            <div style={{ position: 'relative', width: '100px', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="100" height="100" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
                <circle cx="50" cy="50" r={radius} stroke="rgba(255,255,255,0.05)" strokeWidth="6" fill="transparent" />
                <circle cx="50" cy="50" r={radius} stroke="#d5922e" strokeWidth="6" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s ease-in-out' }} />
              </svg>
              <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff' }}>{winrate}%</span>
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
                  style={{ background: currentUser.role === role ? '#f39c12' : 'rgba(0,0,0,0.3)', color: currentUser.role === role ? '#111827' : '#94a3b8', border: currentUser.role === role ? '1px solid #f39c12' : '1px solid rgba(255,255,255,0.1)', padding: '10px 16px', borderRadius: '10px', fontWeight: 'bold', fontSize: '14px', cursor: isUpdating ? 'not-allowed' : 'pointer', transition: 'all 0.2s', flex: '1 1 auto' }}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* HISTÓRICO DE PARTIDAS */}
        <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '30px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.03)', marginBottom: '30px' }}>
          <h4 style={{ margin: '0 0 20px 0', color: '#fff', fontSize: '18px' }}>Histórico de Partidas</h4>
          <MatchHistory />
        </div>

        {/* SEÇÃO DISCORD */}
        <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '30px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.03)' }}>
          <h4 style={{ margin: '0 0 20px 0', color: '#fff', fontSize: '18px' }}>Conta Discord</h4>

          {discordMessage === 'success' && (
            <div style={{ background: 'rgba(46,213,115,0.1)', border: '1px solid #2ed573', color: '#2ed573', padding: '10px 16px', borderRadius: '10px', marginBottom: '16px', fontWeight: 'bold', fontSize: '14px' }}>
              ✅ Discord conectado com sucesso!
            </div>
          )}

          {discordMessage === 'error' && (
            <div style={{ background: 'rgba(231,76,60,0.1)', border: '1px solid #e74c3c', color: '#e74c3c', padding: '10px 16px', borderRadius: '10px', marginBottom: '16px', fontWeight: 'bold', fontSize: '14px' }}>
              ❌ Erro ao conectar o Discord. Tente novamente.
            </div>
          )}

          {currentUser?.discordId ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: 'rgba(114,137,218,0.1)', border: '1px solid rgba(114,137,218,0.3)', padding: '16px 20px', borderRadius: '12px' }}>
              {currentUser.discordAvatar ? (
                <img src={currentUser.discordAvatar} alt="Discord" style={{ width: '44px', height: '44px', borderRadius: '50%', border: '2px solid #7289da' }} />
              ) : (
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#7289da', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🎮</div>
              )}
              <div>
                <div style={{ color: '#7289da', fontWeight: 'bold', fontSize: '15px' }}>Discord Conectado</div>
                <div style={{ color: '#94a3b8', fontSize: '13px' }}>@{currentUser.discordUsername}</div>
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <div style={{ background: 'rgba(46,213,115,0.15)', color: '#2ed573', padding: '4px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: 'bold' }}>● ATIVO</div>
              </div>
            </div>
          ) : (
            <div>
              <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '16px', lineHeight: '1.6' }}>
                Conecte sua conta do Discord para ser movido automaticamente para o canal de voz do seu time quando uma partida começar.
              </p>
              <a
                href={DISCORD_OAUTH_URL}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: '#7289da', color: '#fff', padding: '12px 24px', borderRadius: '10px', fontWeight: 'bold', fontSize: '15px', textDecoration: 'none', transition: 'all 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.background = '#5f73bc'}
                onMouseOut={(e) => e.currentTarget.style.background = '#7289da'}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.032.053a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                </svg>
                Conectar Discord
              </a>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default Perfil;
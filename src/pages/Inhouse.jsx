import React, { useState, useEffect } from 'react';
import { auth, db } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc, increment, arrayUnion, runTransaction, query, where } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { database } from '../services/firebase';
import { ref, onValue, onDisconnect, set, serverTimestamp } from 'firebase/database';

// ==========================================
// CONFIGURAÇÃO DE TIERS — espelho do backend
// ==========================================
const TIERS = [
  { name: 'bronze',   min: 0,    max: 599  },
  { name: 'prata',    min: 600,  max: 1199 },
  { name: 'ouro',     min: 1200, max: 1799 },
  { name: 'diamante', min: 1800, max: 2399 },
  { name: 'mestre',   min: 2400, max: Infinity }
];

const TIER_LABELS = {
  bronze:   '🥉 Bronze',
  prata:    '🥈 Prata',
  ouro:     '🥇 Ouro',
  diamante: '💎 Diamante',
  mestre:   '👑 Mestre'
};

// MMR dinâmico por tier — espelho do backend
const MMR_BY_TIER = {
  bronze:   { win: 35, loss: -15 },
  prata:    { win: 30, loss: -18 },
  ouro:     { win: 25, loss: -22 },
  diamante: { win: 25, loss: -25 },
  mestre:   { win: 25, loss: -30 },
};

// Horário permitido para fila (horário de Brasília)
const QUEUE_START_HOUR = 22; // 22h
const QUEUE_END_HOUR   = 23; // até 23:59

function getTier(points) {
  const p = points || 0;
  return (TIERS.find(t => p >= t.min && p <= t.max) || TIERS[0]).name;
}

/** Retorna true se o horário atual (Brasília, UTC-3) estiver dentro da janela permitida */
function isQueueOpen() {
  const now = new Date();
  const brasiliaOffset = -3 * 60;
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const brasiliaMinutes = ((utcMinutes + brasiliaOffset) % (24 * 60) + 24 * 60) % (24 * 60);
  const brasiliaHour = Math.floor(brasiliaMinutes / 60);
  return brasiliaHour >= QUEUE_START_HOUR && brasiliaHour <= QUEUE_END_HOUR;
}

/** Retorna uma string "HH:MM" para o próximo horário de abertura da fila */
function nextQueueOpenTime() {
  return `${String(QUEUE_START_HOUR).padStart(2, '0')}:00`;
}

function Inhouse() {
  const [currentUser, setCurrentUser]       = useState(null);
  const [isInQueue, setIsInQueue]           = useState(false);
  const [selectedRoles, setSelectedRoles]   = useState([]);
  const [activeMatch, setActiveMatch]       = useState(null);
  const [localRoomCode, setLocalRoomCode]   = useState('');
  const [matchLoading, setMatchLoading]     = useState(true);
  const [queueCount, setQueueCount]         = useState(0);

  // Modal de confirmação de cancelamento
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Relógio reativo para verificar horário da fila
  const [queueOpen, setQueueOpen] = useState(isQueueOpen());

  const rolesDisponiveis = ['Rota Superior', 'Selva', 'Rota do Meio', 'Atirador', 'Suporte'];

  const phase            = activeMatch ? activeMatch.phase : 'queue';
  const blueTeam         = activeMatch?.blueTeam || [];
  const redTeam          = activeMatch?.redTeam || [];
  const availablePlayers = activeMatch?.availablePlayers || [];
  const draftPickIndex   = activeMatch?.draftPickIndex || 0;
  const roomCode         = activeMatch?.roomCode || '';
  const roomReady        = roomCode.length >= 3;
  const blueVotes        = activeMatch?.blueVotes || 0;
  const redVotes         = activeMatch?.redVotes || 0;
  const votedUsers       = activeMatch?.votedUsers || [];
  const userVoted        = currentUser ? votedUsers.includes(currentUser.id) : false;
  const winnerTeam       = activeMatch?.winner || null;

  // Cancelamento
  const cancelVotes      = activeMatch?.cancelVotes || 0;
  const cancelVotedUsers = activeMatch?.cancelVotedUsers || [];
  const userVotedCancel  = currentUser ? cancelVotedUsers.includes(currentUser.id) : false;
  const CANCEL_THRESHOLD = 6;
  const isCancellablePhase = ['draft', 'match_ready', 'match_report'].includes(phase);

  const discordChannels    = activeMatch?.discordChannels || null;
  const myTeam             = blueTeam.some(p => p.id === currentUser?.id) ? 'blue' : 'red';
  const myDiscordChannel   = discordChannels ? discordChannels[myTeam] : null;
  const discordChannelLink = myDiscordChannel
    ? `https://discord.com/channels/1509548445395062867/${myDiscordChannel}`
    : null;

  const draftSequence = ['blue', 'red', 'red', 'blue', 'blue', 'red', 'red', 'blue'];
  const currentTurn   = draftSequence[draftPickIndex] || 'none';

  const isBlueCaptain = currentUser?.id === blueTeam[0]?.id;
  const isRedCaptain  = currentUser?.id === redTeam[0]?.id;
  const isMyTurn      = (currentTurn === 'blue' && isBlueCaptain) || (currentTurn === 'red' && isRedCaptain);
  const canSendCode   = isBlueCaptain; // Só o capitão do time azul envia o código

  // Atualiza queueOpen a cada minuto para o relógio funcionar corretamente
  useEffect(() => {
    const interval = setInterval(() => setQueueOpen(isQueueOpen()), 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // 1. AUTENTICAÇÃO
  useEffect(() => {
    let unsubscribeUser = null;
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        unsubscribeUser = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) setCurrentUser(docSnap.data());
        });
      } else {
        setCurrentUser(null);
      }
    });
    return () => { unsubscribeAuth(); if (unsubscribeUser) unsubscribeUser(); };
  }, []);

  // 2. ESCUTAS DE FILA E PARTIDA
  useEffect(() => {
    if (!currentUser) return;
    const userQueueRef = doc(db, 'queue', currentUser.id);
    const unsubQueue = onSnapshot(userQueueRef, (docSnap) => {
      setIsInQueue(docSnap.exists());
    });
    const matchesRef = collection(db, 'matches');
    const qMatches = query(matchesRef, where('participants', 'array-contains', currentUser.id));
    const unsubMatches = onSnapshot(qMatches, (snapshot) => {
      let myMatch = null;
      snapshot.forEach((docSnap) => {
        const matchData = { id: docSnap.id, ...docSnap.data() };
        if (!matchData.archivedFor?.includes(currentUser.id)) myMatch = matchData;
      });
      setActiveMatch(myMatch);
      setMatchLoading(false);
    });
    return () => { unsubQueue(); unsubMatches(); };
  }, [currentUser]);

  // 2.1 CONTADOR DE JOGADORES NA FILA (tempo real)
useEffect(() => {
  if (!currentUser) return;
  const queueColRef = collection(db, 'queue');
  const unsubQueueCount = onSnapshot(queueColRef, (snapshot) => {
    setQueueCount(snapshot.size);
  });
  return () => unsubQueueCount();
}, [currentUser]);

  // 3. HEARTBEAT ANTI-FANTASMA
  useEffect(() => {
    if (!currentUser || !isInQueue) return;

    const userStatusDatabaseRef = ref(database, `/status/${currentUser.id}`);
    const connectedRef = ref(database, '.info/connected');

    const unsubscribe = onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        onDisconnect(userStatusDatabaseRef).set({
          state: 'offline',
          last_changed: serverTimestamp(),
        }).then(() => {
          set(userStatusDatabaseRef, {
            state: 'online',
            last_changed: serverTimestamp(),
          });
        });
      }
    });

    return () => {
      set(userStatusDatabaseRef, {
        state: 'offline',
        last_changed: serverTimestamp(),
      });
      unsubscribe();
    };
  }, [currentUser, isInQueue]);

  const toggleRole = (role) => {
    if (selectedRoles.includes(role)) setSelectedRoles(selectedRoles.filter(r => r !== role));
    else if (selectedRoles.length < 2) setSelectedRoles([...selectedRoles, role]);
  };

  const handlePickPlayer = async (player) => {
    if (!activeMatch) return;
    const matchRef = doc(db, 'matches', activeMatch.id);
    try {
      await runTransaction(db, async (transaction) => {
        const matchSnap = await transaction.get(matchRef);
        if (!matchSnap.exists()) throw new Error("Partida não encontrada!");
        const currentData = matchSnap.data();
        const serverTurn = draftSequence[currentData.draftPickIndex];
        const activeCaptainId = serverTurn === 'blue' ? currentData.blueTeam[0]?.id : currentData.redTeam[0]?.id;
        const isMyTurnNow = currentUser.id === activeCaptainId;
        if (!isMyTurnNow && !isBotTurn) throw new Error("Não é o seu turno de escolha!");
        const isStillAvailable = currentData.availablePlayers.some(p => p.id === player.id);
        if (!isStillAvailable) throw new Error("Jogador já foi escolhido!");
        const newAvailable = currentData.availablePlayers.filter(p => p.id !== player.id);
        const newBlue = serverTurn === 'blue' ? [...currentData.blueTeam, player] : currentData.blueTeam;
        const newRed  = serverTurn === 'red'  ? [...currentData.redTeam, player]  : currentData.redTeam;
        const nextIndex = currentData.draftPickIndex + 1;
        const nextPhase = nextIndex >= draftSequence.length ? 'match_ready' : 'draft';
        transaction.update(matchRef, {
          availablePlayers: newAvailable,
          blueTeam: newBlue,
          redTeam: newRed,
          draftPickIndex: nextIndex,
          phase: nextPhase
        });
      });
    } catch (error) {
      console.error("Erro no Draft:", error.message);
      alert(error.message);
    }
  };

  const sendRoomCode = async () => {
    if (!localRoomCode || !activeMatch || !isBlueCaptain) return;
    await updateDoc(doc(db, 'matches', activeMatch.id), { roomCode: localRoomCode });
  };

  const handleStartVoting = async () => {
    if (!activeMatch) return;
    if (!isBlueCaptain && !isRedCaptain) {
      alert("Apenas os capitães podem iniciar a votação do resultado.");
      return;
    }
    await updateDoc(doc(db, 'matches', activeMatch.id), { phase: 'match_report' });
  };

  const handleCastVote = async (team) => {
    if (!activeMatch) return;
    const matchRef = doc(db, 'matches', activeMatch.id);
    try {
      await runTransaction(db, async (transaction) => {
        const matchSnap = await transaction.get(matchRef);
        if (!matchSnap.exists()) return;
        const data = matchSnap.data();
        if (data.votedUsers?.includes(currentUser.id)) throw new Error("Você já votou!");
        const updates = { votedUsers: arrayUnion(currentUser.id) };
        if (team === 'blue') updates.blueVotes = increment(1);
        else updates.redVotes = increment(1);
        transaction.update(matchRef, updates);
      });
    } catch (error) {
      console.error("Erro ao votar:", error.message);
      alert(error.message);
    }
  };

  // Confirma e executa o voto de cancelamento
  const handleConfirmCancel = async () => {
    setShowCancelModal(false);
    if (!activeMatch || !currentUser) return;
    const matchRef = doc(db, 'matches', activeMatch.id);
    try {
      await runTransaction(db, async (transaction) => {
        const matchSnap = await transaction.get(matchRef);
        if (!matchSnap.exists()) return;
        const data = matchSnap.data();
        if (data.cancelVotedUsers?.includes(currentUser.id)) {
          throw new Error("Você já votou pelo cancelamento!");
        }
        const newCancelVotes = (data.cancelVotes || 0) + 1;
        const updates = {
          cancelVotes: increment(1),
          cancelVotedUsers: arrayUnion(currentUser.id)
        };
        if (newCancelVotes >= CANCEL_THRESHOLD) {
          updates.phase = 'match_cancelled';
        }
        transaction.update(matchRef, updates);
      });
    } catch (error) {
      console.error("Erro ao votar cancelamento:", error.message);
      alert(error.message);
    }
  };

  const handleResetLobby = async () => {
    if (activeMatch) {
      await updateDoc(doc(db, 'matches', activeMatch.id), { archivedFor: arrayUnion(currentUser.id) });
      setLocalRoomCode('');
      setSelectedRoles([]);
    }
  };

  const handleToggleQueue = async () => {
    if (!currentUser) return;

    // Verifica horário antes de entrar na fila
    if (!isInQueue && !isQueueOpen()) {
      alert(`A fila competitiva abre às ${nextQueueOpenTime()} (horário de Brasília).`);
      return;
    }

    const queueRef = doc(db, 'queue', currentUser.id);
    try {
      if (isInQueue) {
        await deleteDoc(queueRef);
      } else {
        if (selectedRoles.length !== 2) {
          alert("Você precisa selecionar exatamente 2 rotas.");
          return;
        }
        await setDoc(queueRef, {
          name: currentUser.name || 'Jogador',
          avatar: currentUser.avatar || '',
          points: currentUser.points || 0,
          selectedRoles: selectedRoles,
          queueStartedAt: Date.now(),
          discordId: currentUser.discordId || null,
        });
      }
    } catch (error) {
      console.error("Erro ao alterar status da fila:", error);
      alert("Houve um erro de conexão ao tentar entrar/sair da fila.");
    }
  };

  // ==========================================
  // MODAL DE CONFIRMAÇÃO DE CANCELAMENTO
  // ==========================================
  const CancelConfirmModal = () => (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: '#111827', borderRadius: '20px',
        border: '1px solid rgba(241,196,15,0.3)',
        padding: '32px 28px', maxWidth: '400px', width: '100%',
        textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.8)'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>⚠️</div>
        <h3 style={{ color: '#f1c40f', fontSize: '20px', margin: '0 0 12px 0' }}>
          Cancelar a partida?
        </h3>
        <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.7', marginBottom: '8px' }}>
          Você está votando pelo cancelamento desta partida.
        </p>
        <p style={{ color: '#e2e8f0', fontSize: '14px', lineHeight: '1.7', marginBottom: '24px' }}>
          São necessários <strong style={{ color: '#f1c40f' }}>{CANCEL_THRESHOLD} votos</strong> para cancelar.
          Nenhum MMR será alterado caso o cancelamento seja aprovado.
        </p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setShowCancelModal(false)}
            style={{
              flex: 1, padding: '12px', borderRadius: '12px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#94a3b8', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer'
            }}
          >
            Voltar
          </button>
          <button
            onClick={handleConfirmCancel}
            style={{
              flex: 1, padding: '12px', borderRadius: '12px',
              background: 'rgba(241,196,15,0.15)',
              border: '1px solid rgba(241,196,15,0.5)',
              color: '#f1c40f', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer'
            }}
          >
            Confirmar Voto
          </button>
        </div>
      </div>
    </div>
  );

  // ==========================================
  // BLOCO DE CANCELAMENTO (reutilizável)
  // ==========================================
  const CancelVoteBlock = () => (
    <div style={{
      marginTop: '20px',
      background: 'rgba(241,196,15,0.05)',
      border: '1px solid rgba(241,196,15,0.2)',
      borderRadius: '14px',
      padding: '16px',
      textAlign: 'center'
    }}>
      <p style={{ color: '#94a3b8', fontSize: '12px', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '1px' }}>
        Cancelar Partida (sem perda de MMR)
      </p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '10px' }}>
        <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#f1c40f' }}>{cancelVotes}</div>
        <div style={{ color: '#64748b', fontSize: '12px' }}>/ {CANCEL_THRESHOLD} votos necessários</div>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '99px', height: '6px', marginBottom: '12px', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${Math.min((cancelVotes / CANCEL_THRESHOLD) * 100, 100)}%`,
          background: 'linear-gradient(90deg, #f1c40f, #e67e22)',
          borderRadius: '99px',
          transition: 'width 0.4s ease'
        }} />
      </div>
      {!userVotedCancel ? (
        <button
          onClick={() => setShowCancelModal(true)}
          style={{
            background: 'rgba(241,196,15,0.1)',
            border: '1px solid rgba(241,196,15,0.4)',
            color: '#f1c40f',
            padding: '10px 20px',
            borderRadius: '10px',
            fontWeight: 'bold',
            fontSize: '13px',
            cursor: 'pointer',
            width: '100%',
            transition: 'all 0.2s'
          }}
          onMouseOver={e => e.currentTarget.style.background = 'rgba(241,196,15,0.2)'}
          onMouseOut={e => e.currentTarget.style.background = 'rgba(241,196,15,0.1)'}
        >
          ⚠️ Votar pelo Cancelamento
        </button>
      ) : (
        <p style={{ color: '#f1c40f', fontSize: '13px', fontWeight: 'bold', margin: 0 }}>
          ✅ Você votou pelo cancelamento — aguardando demais jogadores...
        </p>
      )}
    </div>
  );

  // TELA DE CARREGAMENTO
  if (!currentUser || matchLoading) return (
    <div style={{ minHeight: '100vh', background: '#0b0f19', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
      <div style={{ width: '50px', height: '50px', border: '4px solid rgba(52,152,219,0.3)', borderTopColor: '#3498db', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      <h2 style={{ color: '#3498db', margin: 0 }}>Carregando...</h2>
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );

  // TELA DE DISCORD OBRIGATÓRIO
  if (!currentUser.discordId) {
    return (
      <div style={{ minHeight: '100vh', background: '#0b0f19', color: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"Urbanist", sans-serif', padding: '20px' }}>
        <div style={{ maxWidth: '500px', width: '100%', textAlign: 'center', background: 'linear-gradient(145deg, rgba(15,23,42,0.9), rgba(11,15,25,0.95))', borderRadius: '24px', padding: '40px 20px', border: '1px solid rgba(114,137,218,0.3)', boxShadow: '0 15px 40px rgba(0,0,0,0.6)' }}>
          <div style={{ fontSize: '64px', marginBottom: '15px' }}>👾</div>
          <h2 style={{ fontSize: '28px', color: '#fff', margin: '0 0 15px 0', letterSpacing: '-1px' }}>Discord Obrigatório</h2>
          <p style={{ color: '#94a3b8', fontSize: '15px', marginBottom: '30px', lineHeight: '1.6' }}>
            Para acessar o Hub Competitivo e ser movido automaticamente para o canal de voz do seu time, é necessário vincular sua conta do Discord.
          </p>
          <Link to="/perfil" style={{ display: 'inline-block', background: '#7289da', color: '#fff', textDecoration: 'none', padding: '14px 28px', borderRadius: '12px', fontWeight: 'bold', fontSize: '15px' }}>
            Vincular Discord no Perfil
          </Link>
        </div>
      </div>
    );
  }

  // VIEW 1: FILA
  if (phase === 'queue') {
    const tierName   = getTier(currentUser.points);
    const mmrTable   = MMR_BY_TIER[tierName];

    return (
      <div className="queue-wrapper" style={{ minHeight: '100vh', background: '#0b0f19', color: '#e2e8f0', fontFamily: '"Urbanist", sans-serif', padding: '40px 20px' }}>
        <style>{`
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          .queue-card { padding: 40px; }
          .title-queue { font-size: 48px; }
          @media (max-width: 480px) {
            .queue-card { padding: 25px 15px; }
            .title-queue { font-size: 36px; }
            .roles-grid button { flex: 1 1 45%; font-size: 13px; padding: 10px; }
          }
        `}</style>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <h2 className="title-queue" style={{ color: '#fff', margin: '0 0 10px 0', letterSpacing: '-1px' }}>Fila Competitiva</h2>

          {/* Badge de tier + MMR dinâmico */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '6px 16px', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#e2e8f0' }}>
              {TIER_LABELS[tierName] || '🥉 Bronze'}
            </span>
            <span style={{ color: '#64748b', fontSize: '12px' }}>·</span>
            <span style={{ color: '#94a3b8', fontSize: '12px' }}>{currentUser.points || 0} MMR</span>
          </div>


          {/* Contador de jogadores na fila em tempo real */}
<div style={{
  display: 'inline-flex', alignItems: 'center', gap: '8px',
  background: queueCount > 0 ? 'rgba(46,213,115,0.08)' : 'rgba(255,255,255,0.03)',
  border: `1px solid ${queueCount > 0 ? 'rgba(46,213,115,0.3)' : 'rgba(255,255,255,0.08)'}`,
  borderRadius: '20px', padding: '6px 16px', marginBottom: '14px'
}}>
  <span style={{
    width: '8px', height: '8px', borderRadius: '50%',
    background: queueCount > 0 ? '#2ed573' : '#475569',
    boxShadow: queueCount > 0 ? '0 0 8px #2ed573' : 'none'
  }} />
  <span style={{ fontSize: '13px', fontWeight: 'bold', color: queueCount > 0 ? '#2ed573' : '#64748b' }}>
    {queueCount} {queueCount === 1 ? 'jogador na fila' : 'jogadores na fila'}
  </span>
</div>

          {/* Indicador de ganho/perda do tier atual */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '14px' }}>
            <span style={{ fontSize: '13px', color: '#2ed573', fontWeight: 'bold' }}>
              Vitória: +{mmrTable.win} MMR
            </span>
            <span style={{ color: '#475569', fontSize: '12px' }}>|</span>
            <span style={{ fontSize: '13px', color: '#e74c3c', fontWeight: 'bold' }}>
              Derrota: {mmrTable.loss} MMR
            </span>
          </div>

          {/* Banner de fila fechada */}
          {!queueOpen && (
            <div style={{
              background: 'rgba(231,76,60,0.08)',
              border: '1px solid rgba(231,76,60,0.3)',
              borderRadius: '14px',
              padding: '16px 20px',
              marginBottom: '20px'
            }}>
              <p style={{ color: '#e74c3c', fontWeight: 'bold', fontSize: '15px', margin: '0 0 4px 0' }}>
                🔒 Fila fechada no momento
              </p>
              <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>
                A fila competitiva funciona das <strong style={{ color: '#e2e8f0' }}>22:00 às 23:59</strong> (horário de Brasília).
                Volte às {nextQueueOpenTime()}!
              </p>
            </div>
          )}

          <p style={{ color: '#94a3b8', fontSize: '16px', marginBottom: '30px' }}>O Matchmaking oculto garante partidas justas e balanceadas.</p>

          <div className="queue-card" style={{ background: 'linear-gradient(145deg, rgba(15,23,42,0.8), rgba(11,15,25,0.9))', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            {!isInQueue ? (
              <>
                <h4 style={{ color: '#fff', fontSize: '20px', marginBottom: '10px' }}>Selecione 2 Rotas</h4>
                <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>Escolha duas posições de preferência para entrar na fila.</p>
                <div className="roles-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginBottom: '30px' }}>
                  {rolesDisponiveis.map(role => (
                    <button
                      key={role}
                      onClick={() => toggleRole(role)}
                      style={{ background: selectedRoles.includes(role) ? '#3498db' : 'rgba(0,0,0,0.4)', color: selectedRoles.includes(role) ? '#fff' : '#94a3b8', border: selectedRoles.includes(role) ? '1px solid #3498db' : '1px solid rgba(255,255,255,0.1)', padding: '12px 20px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}
                    >
                      {role}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleToggleQueue}
                  disabled={selectedRoles.length !== 2 || !queueOpen}
                  style={{
                    width: '100%', padding: '16px', borderRadius: '14px', fontSize: '16px',
                    fontWeight: 'bold', border: 'none',
                    background: (selectedRoles.length === 2 && queueOpen) ? '#2ed573' : 'rgba(255,255,255,0.05)',
                    color: (selectedRoles.length === 2 && queueOpen) ? '#111827' : '#64748b',
                    cursor: (selectedRoles.length === 2 && queueOpen) ? 'pointer' : 'not-allowed',
                    transition: 'all 0.3s'
                  }}
                >
                  {!queueOpen
                    ? `🔒 Fila abre às ${nextQueueOpenTime()}`
                    : selectedRoles.length === 2
                      ? 'Entrar na Fila'
                      : `Selecione mais ${2 - selectedRoles.length} rota(s)`
                  }
                </button>
              </>
            ) : (
              <div style={{ padding: '20px 0' }}>
                <div style={{ width: '50px', height: '50px', border: '4px solid rgba(52,152,219,0.3)', borderTopColor: '#3498db', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px auto' }}></div>
                <h3 style={{ color: '#3498db', fontSize: '22px', margin: '0 0 10px 0' }}>Buscando Partida...</h3>
                <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '30px' }}>Não feche esta aba ou você sairá da fila.</p>
                <button onClick={handleToggleQueue} style={{ background: '#e74c3c', color: '#fff', border: 'none', padding: '12px 28px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>Sair da Fila</button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // VIEW 2: PARTIDA CANCELADA
  if (phase === 'match_cancelled') {
    return (
      <div style={{ minHeight: '100vh', background: '#0b0f19', color: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"Urbanist", sans-serif', padding: '20px' }}>
        <div style={{ maxWidth: '460px', width: '100%', textAlign: 'center', background: 'linear-gradient(145deg, rgba(15,23,42,0.9), rgba(11,15,25,0.95))', borderRadius: '24px', padding: '40px 24px', border: '1px solid rgba(241,196,15,0.2)', boxShadow: '0 15px 40px rgba(0,0,0,0.6)' }}>
          <div style={{ fontSize: '56px', marginBottom: '12px' }}>🚫</div>
          <h2 style={{ fontSize: '26px', color: '#f1c40f', margin: '0 0 10px 0', letterSpacing: '-0.5px' }}>Partida Cancelada</h2>
          <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.7', marginBottom: '28px' }}>
            A maioria dos jogadores votou pelo cancelamento.<br />
            <strong style={{ color: '#e2e8f0' }}>Nenhum MMR foi alterado.</strong> Você pode voltar para a fila normalmente.
          </p>
          <button
            onClick={handleResetLobby}
            style={{ width: '100%', background: 'linear-gradient(135deg, #f1c40f, #e67e22)', color: '#111827', border: 'none', padding: '14px', borderRadius: '12px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Voltar ao Hub
          </button>
        </div>
      </div>
    );
  }

  // VIEW 3: DRAFT / PARTIDA
  return (
    <div style={{ minHeight: '100vh', background: '#0b0f19', color: '#e2e8f0', padding: '20px 10px', fontFamily: '"Urbanist", sans-serif', overflowX: 'hidden' }}>

      {/* Modal de confirmação de cancelamento */}
      {showCancelModal && <CancelConfirmModal />}

      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .match-layout { display: flex; gap: 16px; align-items: flex-start; }
        .team-panel { flex: 1; min-width: 0; }
        .center-panel { flex: 1.5; min-width: 0; }
        .players-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        @media (max-width: 768px) {
          .match-layout { flex-direction: column; }
          .team-panel, .center-panel { width: 100%; }
          .center-panel { order: -1; }
          .players-grid { grid-template-columns: 1fr; }
          h2 { font-size: 20px !important; }
        }
      `}</style>

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '24px', color: '#fff', margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {phase === 'draft'        && 'Fase de Draft (Snake)'}
            {phase === 'match_ready'  && 'Partida em Andamento'}
            {phase === 'match_report' && 'Votação de Resultado'}
            {phase === 'match_finished' && 'Fim de Jogo'}
          </h2>
          {phase === 'draft' && (
            <>
              <div style={{ display: 'inline-block', background: currentTurn === 'blue' ? 'rgba(52,152,219,0.2)' : 'rgba(231,76,60,0.2)', border: `1px solid ${currentTurn === 'blue' ? '#3498db' : '#e74c3c'}`, padding: '8px 16px', borderRadius: '20px', color: currentTurn === 'blue' ? '#3498db' : '#e74c3c', fontWeight: 'bold', fontSize: '14px', marginBottom: '8px' }}>
                Turno: {currentTurn === 'blue' ? 'Time Azul' : 'Time Vermelho'}
                {isMyTurn && <span style={{ marginLeft: '8px', color: '#fff' }}>(Sua vez!)</span>}
              </div>
              <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>Pick {draftPickIndex} de 8</p>
            </>
          )}
        </div>

        <div className="match-layout">

          {/* TIME AZUL */}
          <div className="team-panel" style={{ background: 'linear-gradient(180deg, rgba(52,152,219,0.1) 0%, rgba(15,23,42,0.8) 100%)', border: `1px solid ${winnerTeam === 'blue' ? '#2ed573' : 'rgba(52,152,219,0.3)'}`, borderRadius: '20px', padding: '16px' }}>
            <h3 style={{ color: '#3498db', textAlign: 'center', borderBottom: '1px solid rgba(52,152,219,0.2)', paddingBottom: '12px', marginBottom: '16px', fontSize: '16px' }}>Time Azul {winnerTeam === 'blue' && '🏆'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {blueTeam.map((p, i) => (
                <div key={p.id} style={{ background: 'rgba(0,0,0,0.4)', padding: '10px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px', borderLeft: i === 0 ? '3px solid #f1c40f' : '3px solid #3498db' }}>
                  <img src={p.avatar} alt={p.name} style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.name} {i === 0 && <span style={{ fontSize: '9px', background: '#f1c40f', color: '#000', padding: '1px 4px', borderRadius: '4px', marginLeft: '4px' }}>CAP</span>}
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.selectedRoles?.join(', ') || 'N/A'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PAINEL CENTRAL */}
          <div className="center-panel">
            {phase === 'draft' && (
              <div style={{ background: 'rgba(15,23,42,0.9)', borderRadius: '20px', padding: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h4 style={{ textAlign: 'center', color: '#fff', marginBottom: '16px', fontSize: '15px' }}>Jogadores Disponíveis</h4>
                {!isMyTurn && (
                  <p style={{ color: '#f39c12', textAlign: 'center', fontSize: '13px', marginBottom: '12px', fontWeight: 'bold' }}>
                    Aguarde o {currentTurn === 'blue' ? 'Time Azul' : 'Time Vermelho'} escolher...
                  </p>
                )}
                <div className="players-grid">
                  {availablePlayers.map(p => {
                    const pTier    = getTier(p.points);
                    const pMmr     = MMR_BY_TIER[pTier];
                    return (
                      <div
                        key={p.id}
                        onClick={() => handlePickPlayer(p)}
                        style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', cursor: isMyTurn ? 'pointer' : 'not-allowed', opacity: isMyTurn ? 1 : 0.5, display: 'flex', alignItems: 'center', gap: '10px' }}
                      >
                        <img src={p.avatar} alt={p.name} style={{ width: '38px', height: '38px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                          <div style={{ color: '#64748b', fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.selectedRoles?.join(', ') || ''}</div>
                          {/* MMR e tier do jogador disponível */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                            <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 'bold' }}>
                              {p.points || 0} MMR
                            </span>
                            <span style={{ fontSize: '9px', color: '#475569' }}>·</span>
                            <span style={{ fontSize: '10px', color: '#64748b' }}>
                              {TIER_LABELS[pTier]}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {isCancellablePhase && <CancelVoteBlock />}
              </div>
            )}

            {phase === 'match_ready' && (
              <div style={{ textAlign: 'center', padding: '16px' }}>
                <h1 style={{ fontSize: '48px', margin: '0 0 12px 0' }}>⚔️</h1>
                {discordChannelLink && (
                  <div style={{ marginBottom: '14px' }}>
                    <a href={discordChannelLink} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(114,137,218,0.15)', border: '1px solid rgba(114,137,218,0.4)', color: '#7289da', padding: '10px 20px', borderRadius: '10px', fontWeight: 'bold', fontSize: '14px', textDecoration: 'none' }}>
                      🎙️ Entrar no Canal do Meu Time
                    </a>
                  </div>
                )}
                {!roomReady ? (
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(52,152,219,0.3)' }}>
                    {canSendCode ? (
                      <>
                        <h4 style={{ color: '#3498db', margin: '0 0 10px 0', fontSize: '18px' }}>Você é do Time Azul!</h4>
                        <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '16px' }}>Crie a sala no jogo e insira o ID abaixo.</p>
                        <input type="text" placeholder="ID da Sala" value={localRoomCode} onChange={(e) => setLocalRoomCode(e.target.value)} style={{ width: '100%', maxWidth: '200px', padding: '12px', borderRadius: '12px', border: '2px solid #3498db', background: 'rgba(52,152,219,0.1)', color: '#fff', fontSize: '20px', textAlign: 'center', fontWeight: 'bold', outline: 'none', marginBottom: '16px', boxSizing: 'border-box' }} />
                        <br />
                        <button onClick={sendRoomCode} disabled={localRoomCode.length < 3} style={{ width: '100%', maxWidth: '200px', background: localRoomCode.length >= 3 ? '#3498db' : 'rgba(52,152,219,0.3)', color: '#fff', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
                          Enviar Código
                        </button>
                      </>
                    ) : (
                      <>
                        <div style={{ width: '36px', height: '36px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#f1c40f', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px auto' }}></div>
                        <h4 style={{ color: '#f1c40f', margin: '0 0 8px 0', fontSize: '16px' }}>Aguardando a Sala...</h4>
                        <p style={{ color: '#94a3b8', fontSize: '13px' }}>O Time Azul está criando a sala.</p>
                      </>
                    )}
                  </div>
                ) : (
                  <div>
                    <p style={{ color: '#94a3b8', fontSize: '13px' }}>ID da Sala:</p>
                    <div style={{ background: 'rgba(46,213,115,0.1)', border: '2px solid rgba(46,213,115,0.5)', padding: '16px', borderRadius: '16px', color: '#2ed573', fontWeight: 'bold', fontSize: '36px', letterSpacing: '6px', margin: '12px 0' }}>
                      {roomCode}
                    </div>
                    {isBlueCaptain || isRedCaptain ? (
                      <button onClick={handleStartVoting} style={{ width: '100%', background: '#f39c12', color: '#111827', border: 'none', padding: '12px', borderRadius: '12px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }}>
                        Partida Finalizada? Iniciar Votação 🚩
                      </button>
                    ) : (
                      <div style={{ color: '#f39c12', fontSize: '13px', fontWeight: 'bold', marginTop: '15px' }}>
                        ⏳ Aguardando Capitão iniciar a votação...
                      </div>
                    )}
                  </div>
                )}
                {isCancellablePhase && <CancelVoteBlock />}
              </div>
            )}

            {phase === 'match_report' && (
              <div style={{ background: 'rgba(15,23,42,0.9)', borderRadius: '20px', padding: '24px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                <h3 style={{ color: '#fff', fontSize: '20px', marginBottom: '8px' }}>Quem venceu?</h3>
                <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '20px' }}>Necessário maioria dos votos.</p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', marginBottom: '24px' }}>
                  <div>
                    <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#3498db' }}>{blueVotes}</div>
                    <div style={{ color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase' }}>Azul</div>
                  </div>
                  <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                  <div>
                    <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#e74c3c' }}>{redVotes}</div>
                    <div style={{ color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase' }}>Vermelho</div>
                  </div>
                </div>
                {!userVoted ? (
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button onClick={() => handleCastVote('blue')} style={{ flex: '1 1 100%', background: 'rgba(52,152,219,0.2)', border: '2px solid #3498db', color: '#3498db', padding: '12px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>Votar Azul</button>
                    <button onClick={() => handleCastVote('red')} style={{ flex: '1 1 100%', background: 'rgba(231,76,60,0.2)', border: '2px solid #e74c3c', color: '#e74c3c', padding: '12px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>Votar Vermelho</button>
                  </div>
                ) : (
                  <div style={{ color: '#f1c40f', fontWeight: 'bold', fontSize: '15px' }}>Aguardando votos...</div>
                )}
                {isCancellablePhase && <CancelVoteBlock />}
              </div>
            )}

            {phase === 'match_finished' && (
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '10px' }}>🎉</div>
                <h3 style={{ color: '#2ed573', fontSize: '24px', marginBottom: '10px' }}>MMR Atualizado!</h3>
                <button onClick={handleResetLobby} style={{ width: '100%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '12px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', marginTop: '16px' }}>
                  Voltar para o Hub
                </button>
              </div>
            )}
          </div>

          {/* TIME VERMELHO */}
          <div className="team-panel" style={{ background: 'linear-gradient(180deg, rgba(231,76,60,0.1) 0%, rgba(15,23,42,0.8) 100%)', border: `1px solid ${winnerTeam === 'red' ? '#2ed573' : 'rgba(231,76,60,0.3)'}`, borderRadius: '20px', padding: '16px' }}>
            <h3 style={{ color: '#e74c3c', textAlign: 'center', borderBottom: '1px solid rgba(231,76,60,0.2)', paddingBottom: '12px', marginBottom: '16px', fontSize: '16px' }}>Time Vermelho {winnerTeam === 'red' && '🏆'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {redTeam.map((p, i) => (
                <div key={p.id} style={{ background: 'rgba(0,0,0,0.4)', padding: '10px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px', borderRight: i === 0 ? '3px solid #f1c40f' : '3px solid #e74c3c' }}>
                  <div style={{ flex: 1, textAlign: 'right', minWidth: 0 }}>
                    <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {i === 0 && <span style={{ fontSize: '9px', background: '#f1c40f', color: '#000', padding: '1px 4px', borderRadius: '4px', marginRight: '4px' }}>CAP</span>}
                      {p.name}
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.selectedRoles?.join(', ') || 'N/A'}</div>
                  </div>
                  <img src={p.avatar} alt={p.name} style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Inhouse;
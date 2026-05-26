import React, { useState, useEffect } from 'react';
import { auth, db } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc, increment, arrayUnion, runTransaction, query, where } from 'firebase/firestore';

function Inhouse() {
  const [currentUser, setCurrentUser] = useState(null);

  // ESTADOS DA FILA (Muito mais leve agora, apenas um booleano)
  const [isInQueue, setIsInQueue] = useState(false); 
  const [selectedRoles, setSelectedRoles] = useState([]); 
  
  // ESTADO GLOBAL DA PARTIDA
  const [activeMatch, setActiveMatch] = useState(null);
  const [localRoomCode, setLocalRoomCode] = useState('');

  const rolesDisponiveis = ['Rota Superior', 'Selva', 'Rota do Meio', 'Atirador', 'Suporte'];

  // Variáveis Derivadas da Partida Ativa
  const phase = activeMatch ? activeMatch.phase : 'queue';
  const blueTeam = activeMatch?.blueTeam || [];
  const redTeam = activeMatch?.redTeam || [];
  const availablePlayers = activeMatch?.availablePlayers || [];
  const draftPickIndex = activeMatch?.draftPickIndex || 0;
  const roomCode = activeMatch?.roomCode || '';
  const roomReady = roomCode.length >= 3;
  const blueVotes = activeMatch?.blueVotes || 0;
  const redVotes = activeMatch?.redVotes || 0;
  const votedUsers = activeMatch?.votedUsers || [];
  const userVoted = currentUser ? votedUsers.includes(currentUser.id) : false;
  const winnerTeam = activeMatch?.winner || null;

  const draftSequence = ['blue', 'red', 'red', 'blue', 'blue', 'red', 'red', 'blue'];
  const currentTurn = draftSequence[draftPickIndex] || 'none';

  const isBlueCaptain = currentUser?.id === blueTeam[0]?.id;
  const isRedCaptain = currentUser?.id === redTeam[0]?.id;
  const isMyTurn = (currentTurn === 'blue' && isBlueCaptain) || (currentTurn === 'red' && isRedCaptain);
  const canSendCode = blueTeam.some(p => p.id === currentUser?.id);

  // 1. CARREGA O USUÁRIO
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
    return () => {
      unsubscribeAuth();
      if (unsubscribeUser) unsubscribeUser();
    };
  }, []);

  // 2. ESCUTAS OTIMIZADAS (Economia GIGANTE no Firebase)
  useEffect(() => {
    if (!currentUser) return;

    // Escuta APENAS o documento do próprio usuário na fila, em vez de baixar a fila inteira de todos
    const userQueueRef = doc(db, 'queue', currentUser.id);
    const unsubQueue = onSnapshot(userQueueRef, (docSnap) => {
      setIsInQueue(docSnap.exists());
    });

    // Escuta APENAS a partida onde o usuário está jogando
    const matchesRef = collection(db, 'matches');
    const qMatches = query(matchesRef, where('participants', 'array-contains', currentUser.id));
    
    const unsubMatches = onSnapshot(qMatches, (snapshot) => {
      let myMatch = null;
      snapshot.forEach((docSnap) => {
        const matchData = { id: docSnap.id, ...docSnap.data() };
        if (!matchData.archivedFor?.includes(currentUser.id)) {
          myMatch = matchData;
        }
      });
      setActiveMatch(myMatch);
    });

    return () => { unsubQueue(); unsubMatches(); };
  }, [currentUser]);


  // ----------------------------------------------------
  // INTERAÇÕES BLINDADAS COM TRANSACTIONS
  // ----------------------------------------------------

  const handleToggleQueue = async () => {
    if (!currentUser) return;
    const userQueueRef = doc(db, 'queue', currentUser.id);
    try {
      if (isInQueue) {
        if (!window.confirm('Tem certeza que deseja sair da fila?')) return;
        await deleteDoc(userQueueRef); 
      } else {
        await setDoc(userQueueRef, { ...currentUser, selectedRoles }); 
      }
    } catch (error) { console.error("Erro na fila:", error); }
  };

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
        
        // DADOS DO SERVIDOR: Valida o turno usando o banco de dados, ignorando o estado local do React
        const serverTurn = draftSequence[currentData.draftPickIndex];
        const serverIsBlueTurn = serverTurn === 'blue' && currentUser.id === currentData.blueTeam[0]?.id;
        const serverIsRedTurn = serverTurn === 'red' && currentUser.id === currentData.redTeam[0]?.id;

        if (!serverIsBlueTurn && !serverIsRedTurn) {
          throw new Error("Não é o seu turno de escolha!");
        }
        
        const isStillAvailable = currentData.availablePlayers.some(p => p.id === player.id);
        if (!isStillAvailable) throw new Error("Jogador já foi escolhido por outro capitão!");

        const newAvailable = currentData.availablePlayers.filter(p => p.id !== player.id);
        const newBlue = serverTurn === 'blue' ? [...currentData.blueTeam, player] : currentData.blueTeam;
        const newRed = serverTurn === 'red' ? [...currentData.redTeam, player] : currentData.redTeam;
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
    if (!localRoomCode || !activeMatch) return;
    await updateDoc(doc(db, 'matches', activeMatch.id), { roomCode: localRoomCode });
  };

  const handleStartVoting = async () => {
    if (!activeMatch) return;
    await updateDoc(doc(db, 'matches', activeMatch.id), { phase: 'match_report' });
  };

  const handleCastVote = async (team) => {
    if (!activeMatch) return;
    const matchRef = doc(db, 'matches', activeMatch.id);

    try {
      // Usamos transação para impedir que o mesmo usuário vote duas vezes por causa de lag (Race Condition)
      await runTransaction(db, async (transaction) => {
        const matchSnap = await transaction.get(matchRef);
        if (!matchSnap.exists()) return;

        const data = matchSnap.data();
        if (data.votedUsers?.includes(currentUser.id)) {
          throw new Error("Você já votou nesta partida!");
        }

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

  const handleResetLobby = async () => {
    if (activeMatch) {
      await updateDoc(doc(db, 'matches', activeMatch.id), {
        archivedFor: arrayUnion(currentUser.id)
      });
      setLocalRoomCode('');
      setSelectedRoles([]);
    }
  };

  if (!currentUser) return <div style={{ minHeight: '100vh', background: '#0b0f19', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><h2 style={{ color: '#3498db' }}>Carregando Perfil...</h2></div>;

  // VIEW 1: FILA
  if (phase === 'queue') {
    return (
      <div style={{ minHeight: '100vh', background: '#0b0f19', color: '#e2e8f0', padding: '60px 20px', fontFamily: '"Urbanist", sans-serif' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '48px', color: '#fff', margin: '0 0 10px 0', letterSpacing: '-1px' }}>Fila Competitiva</h2>
          <p style={{ color: '#94a3b8', fontSize: '16px', marginBottom: '40px' }}>O Matchmaking oculto garante partidas justas e balanceadas.</p>
          <div style={{ background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.8), rgba(11, 15, 25, 0.9))', borderRadius: '24px', padding: '40px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            
            {!isInQueue ? (
              <>
                <h4 style={{ color: '#fff', fontSize: '20px', marginBottom: '10px' }}>Selecione 2 Rotas</h4>
                <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>Você precisa escolher duas posições de preferência para entrar na fila.</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', marginBottom: '30px' }}>
                  {rolesDisponiveis.map(role => (
                    <button
                      key={role} onClick={() => toggleRole(role)}
                      style={{ background: selectedRoles.includes(role) ? '#3498db' : 'rgba(0,0,0,0.4)', color: selectedRoles.includes(role) ? '#fff' : '#94a3b8', border: selectedRoles.includes(role) ? '1px solid #3498db' : '1px solid rgba(255,255,255,0.1)', padding: '12px 20px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}
                    >
                      {role}
                    </button>
                  ))}
                </div>
                <button 
                  onClick={handleToggleQueue} disabled={selectedRoles.length !== 2}
                  style={{ width: '100%', padding: '18px', borderRadius: '14px', fontSize: '18px', fontWeight: 'bold', border: 'none', background: selectedRoles.length === 2 ? '#2ed573' : 'rgba(255,255,255,0.05)', color: selectedRoles.length === 2 ? '#111827' : '#64748b', cursor: selectedRoles.length === 2 ? 'pointer' : 'not-allowed', transition: 'all 0.3s' }}
                >
                  {selectedRoles.length === 2 ? 'Entrar na Fila' : `Selecione mais ${2 - selectedRoles.length} rota(s)`}
                </button>
              </>
            ) : (
              <div style={{ padding: '20px 0' }}>
                <div style={{ width: '60px', height: '60px', border: '4px solid rgba(52, 152, 219, 0.3)', borderTopColor: '#3498db', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px auto' }}></div>
                <h3 style={{ color: '#3498db', fontSize: '24px', margin: '0 0 10px 0' }}>Buscando Partida...</h3>
                <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '30px' }}>O servidor está analisando as rotas da fila.</p>
                <button onClick={handleToggleQueue} style={{ background: '#e74c3c', color: '#fff', border: 'none', padding: '12px 30px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>Sair da Fila</button>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // VIEW 2: DRAFT, SALA E VOTAÇÃO
  return (
    <div style={{ minHeight: '100vh', background: '#0b0f19', color: '#e2e8f0', padding: '40px 20px', fontFamily: '"Urbanist", sans-serif' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h2 style={{ fontSize: '36px', color: '#fff', margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '2px' }}>
            {phase === 'draft' && 'Fase de Draft (Snake)'}
            {phase === 'match_ready' && 'Partida em Andamento'}
            {phase === 'match_report' && 'Votação de Resultado'}
            {phase === 'match_finished' && 'Fim de Jogo'}
          </h2>
          {phase === 'draft' && (
            <>
              <div style={{ display: 'inline-block', background: currentTurn === 'blue' ? 'rgba(52, 152, 219, 0.2)' : 'rgba(231, 76, 60, 0.2)', border: `1px solid ${currentTurn === 'blue' ? '#3498db' : '#e74c3c'}`, padding: '10px 20px', borderRadius: '20px', color: currentTurn === 'blue' ? '#3498db' : '#e74c3c', fontWeight: 'bold', fontSize: '18px', marginBottom: '10px' }}>
                Turno de Escolha: {currentTurn === 'blue' ? 'Time Azul' : 'Time Vermelho'}
                {isMyTurn && <span style={{ marginLeft: '10px', color: '#fff' }}>(Sua vez!)</span>}
              </div>
              <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>Pick {draftPickIndex} de 8</p>
            </>
          )}
        </div>

        <div style={{ display: 'flex', gap: '30px', alignItems: 'flex-start' }}>
          
          {/* TIME AZUL */}
          <div style={{ flex: 1, background: 'linear-gradient(180deg, rgba(52, 152, 219, 0.1) 0%, rgba(15, 23, 42, 0.8) 100%)', border: `1px solid ${winnerTeam === 'blue' ? '#2ed573' : 'rgba(52, 152, 219, 0.3)'}`, borderRadius: '24px', padding: '20px' }}>
            <h3 style={{ color: '#3498db', textAlign: 'center', borderBottom: '1px solid rgba(52, 152, 219, 0.2)', paddingBottom: '15px', marginBottom: '20px' }}>Time Azul (First Pick) {winnerTeam === 'blue' && '🏆'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {blueTeam.map((p, i) => (
                <div key={p.id} style={{ background: 'rgba(0,0,0,0.4)', padding: '10px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '15px', borderLeft: i === 0 ? '4px solid #f1c40f' : '4px solid #3498db' }}>
                  <img src={p.avatar} alt={p.name} style={{ width: '40px', borderRadius: '8px' }} />
                  <div>
                    <div style={{ color: '#fff', fontWeight: 'bold' }}>{p.name} {i === 0 && <span style={{ fontSize: '10px', background: '#f1c40f', color: '#000', padding: '2px 4px', borderRadius: '4px', marginLeft: '5px' }}>CAPITÃO</span>}</div>
                    <div style={{ color: '#94a3b8', fontSize: '11px' }}>Intenções: {p.selectedRoles?.join(', ') || 'N/A'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PAINEL CENTRAL DINÂMICO */}
          <div style={{ flex: 1.5 }}>
            {phase === 'draft' && (
              <div style={{ background: 'rgba(15, 23, 42, 0.9)', borderRadius: '24px', padding: '30px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h4 style={{ textAlign: 'center', color: '#fff', marginBottom: '20px' }}>Jogadores Disponíveis</h4>
                
                {!isMyTurn && (
                  <p style={{ color: '#f39c12', textAlign: 'center', fontSize: '14px', marginBottom: '15px', fontWeight: 'bold' }}>
                    Aguarde o {currentTurn === 'blue' ? 'Time Azul' : 'Time Vermelho'} escolher...
                  </p>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  {availablePlayers.map(p => (
                    <div 
                      key={p.id} onClick={() => handlePickPlayer(p)} 
                      style={{ background: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', cursor: isMyTurn ? 'pointer' : 'not-allowed', opacity: isMyTurn ? 1 : 0.5, display: 'flex', alignItems: 'center', gap: '15px', transition: 'all 0.2s' }}
                    >
                      <img src={p.avatar} alt={p.name} style={{ width: '45px', borderRadius: '10px' }} />
                      <div>
                        <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '14px' }}>{p.name}</div>
                        <div style={{ color: '#64748b', fontSize: '11px' }}>{p.selectedRoles?.join(', ') || ''}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {phase === 'match_ready' && (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <h1 style={{ fontSize: '64px', margin: '0 0 10px 0' }}>⚔️</h1>
                {!roomReady ? (
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '25px', borderRadius: '16px', border: '1px solid rgba(52, 152, 219, 0.3)' }}>
                    {canSendCode ? (
                      <>
                        <h4 style={{ color: '#3498db', margin: '0 0 10px 0', fontSize: '20px' }}>Você é do Time Azul!</h4>
                        <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '20px' }}>Alguém do seu time precisa criar a sala personalizada no jogo e digitar o ID abaixo para que os outros entrem.</p>
                        <input 
                          type="text" placeholder="ID da Sala" value={localRoomCode} onChange={(e) => setLocalRoomCode(e.target.value)}
                          style={{ width: '200px', padding: '15px', borderRadius: '12px', border: '2px solid #3498db', background: 'rgba(52, 152, 219, 0.1)', color: '#fff', fontSize: '24px', textAlign: 'center', fontWeight: 'bold', outline: 'none', marginBottom: '20px' }}
                        />
                        <br/>
                        <button onClick={sendRoomCode} disabled={localRoomCode.length < 3} style={{ background: localRoomCode.length >= 3 ? '#3498db' : 'rgba(52, 152, 219, 0.3)', color: '#fff', border: 'none', padding: '12px 30px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
                          Enviar Código para o Lobby
                        </button>
                      </>
                    ) : (
                      <>
                        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#f1c40f', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px auto' }}></div>
                        <h4 style={{ color: '#f1c40f', margin: '0 0 10px 0', fontSize: '18px' }}>Aguardando a Sala...</h4>
                        <p style={{ color: '#94a3b8', fontSize: '14px' }}>O <strong>Time Azul</strong> está criando a sala no jogo. O código aparecerá aqui em instantes.</p>
                      </>
                    )}
                  </div>
                ) : (
                  <div>
                    <p style={{ color: '#94a3b8' }}>Partida em andamento. ID da Sala:</p>
                    <div style={{ background: 'rgba(46, 213, 115, 0.1)', border: '2px solid rgba(46, 213, 115, 0.5)', padding: '20px', borderRadius: '16px', color: '#2ed573', fontWeight: 'bold', fontSize: '42px', letterSpacing: '6px', margin: '20px 0' }}>
                      {roomCode}
                    </div>
                    <button onClick={handleStartVoting} style={{ background: '#f39c12', color: '#111827', border: 'none', padding: '14px 35px', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>
                      Partida Finalizada? Iniciar Votação 🚩
                    </button>
                  </div>
                )}
              </div>
            )}

            {phase === 'match_report' && (
              <div style={{ background: 'rgba(15, 23, 42, 0.9)', borderRadius: '24px', padding: '40px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                <h3 style={{ color: '#fff', fontSize: '24px', marginBottom: '10px' }}>Quem venceu o confronto?</h3>
                <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '30px' }}>Votos para confirmar o resultado (Necessário Maioria).</p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '50px', marginBottom: '40px' }}>
                  <div>
                    <div style={{ fontSize: '42px', fontWeight: 'bold', color: '#3498db' }}>{blueVotes}</div>
                    <div style={{ color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase' }}>Votos Azul</div>
                  </div>
                  <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                  <div>
                    <div style={{ fontSize: '42px', fontWeight: 'bold', color: '#e74c3c' }}>{redVotes}</div>
                    <div style={{ color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase' }}>Votos Vermelho</div>
                  </div>
                </div>
                {!userVoted ? (
                  <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
                    <button onClick={() => handleCastVote('blue')} style={{ background: 'rgba(52, 152, 219, 0.2)', border: '2px solid #3498db', color: '#3498db', padding: '15px 30px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>Votar Azul</button>
                    <button onClick={() => handleCastVote('red')} style={{ background: 'rgba(231, 76, 60, 0.2)', border: '2px solid #e74c3c', color: '#e74c3c', padding: '15px 30px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>Votar Vermelho</button>
                  </div>
                ) : (
                  <div style={{ color: '#f1c40f', fontWeight: 'bold', fontSize: '16px' }}>Aguardando votos dos outros jogadores...</div>
                )}
              </div>
            )}

            {phase === 'match_finished' && (
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '54px', marginBottom: '10px' }}>🎉</div>
                <h3 style={{ color: '#2ed573', fontSize: '28px', marginBottom: '10px' }}>MMR Atualizado!</h3>
                <button onClick={handleResetLobby} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '14px 40px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', marginTop: '20px' }}>
                  Voltar para o Hub
                </button>
              </div>
            )}
          </div>

          {/* TIME VERMELHO */}
          <div style={{ flex: 1, background: 'linear-gradient(180deg, rgba(231, 76, 60, 0.1) 0%, rgba(15, 23, 42, 0.8) 100%)', border: `1px solid ${winnerTeam === 'red' ? '#2ed573' : 'rgba(231, 76, 60, 0.3)'}`, borderRadius: '24px', padding: '20px' }}>
            <h3 style={{ color: '#e74c3c', textAlign: 'center', borderBottom: '1px solid rgba(231, 76, 60, 0.2)', paddingBottom: '15px', marginBottom: '20px' }}>Time Vermelho {winnerTeam === 'red' && '🏆'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {redTeam.map((p, i) => (
                <div key={p.id} style={{ background: 'rgba(0,0,0,0.4)', padding: '10px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '15px', borderRight: i === 0 ? '4px solid #f1c40f' : '4px solid #e74c3c' }}>
                  <div style={{ flex: 1, textAlign: 'right' }}>
                    <div style={{ color: '#fff', fontWeight: 'bold' }}>{i === 0 && <span style={{ fontSize: '10px', background: '#f1c40f', color: '#000', padding: '2px 4px', borderRadius: '4px', marginRight: '5px' }}>CAPITÃO</span>} {p.name}</div>
                    <div style={{ color: '#94a3b8', fontSize: '11px' }}>Intenções: {p.selectedRoles?.join(', ') || 'N/A'}</div>
                  </div>
                  <img src={p.avatar} alt={p.name} style={{ width: '40px', borderRadius: '8px' }} />
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
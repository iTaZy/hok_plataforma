import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

function HubRanking() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Escuta todos os utilizadores do banco ordenados pelo maior MMR
  useEffect(() => {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, orderBy('points', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const leaderboard = [];
      snapshot.forEach((doc) => {
        leaderboard.push({ id: doc.id, ...doc.data() });
      });
      setUsers(leaderboard);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0b0f19', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"Urbanist", sans-serif' }}>
        <h2 style={{ color: '#f39c12', animation: 'pulse 1.5s infinite', fontSize: '24px' }}>Carregando o Ranking Global...</h2>
      </div>
    );
  }

  // Divide os dados: Top 3 vão para o pódio destacado, o resto vai para a tabela
  const podium = users.slice(0, 3);
  const remainder = users.slice(3);

  return (
    <div style={{ minHeight: '100vh', background: '#0b0f19', color: '#e2e8f0', padding: '60px 20px', fontFamily: '"Urbanist", sans-serif', overflowX: 'hidden' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        
        {/* CABEÇALHO */}
        <div style={{ textAlign: 'center', marginBottom: '50px' }}>
          <h2 style={{ fontSize: '48px', color: '#fff', margin: '0 0 10px 0', letterSpacing: '-1px' }}>Ranking da Liga</h2>
          <p style={{ color: '#94a3b8', fontSize: '18px' }}>Os melhores invocadores do Hub organizados por pontuação de MMR.</p>
        </div>

        {/* ==========================================
            SEÇÃO DO PÓDIO (ESTILIZADA E RESPONSIVA)
           ========================================== */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '20px', marginBottom: '60px', flexWrap: 'wrap', padding: '0 10px' }}>
          
          {/* TOP 2 (ESQUERDA) */}
          {podium[1] && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '1 1 200px', maxWidth: '220px' }}>
              <div style={{ position: 'relative', marginBottom: '15px' }}>
                <img src={podium[1].avatar || "https://via.placeholder.com/120?text=HoK"} alt={podium[1].name} style={{ width: '90px', height: '90px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #b4b4b4', boxShadow: '0 0 15px rgba(180, 180, 180, 0.1)' }} />
                <div style={{ position: 'absolute', bottom: '-5px', left: '50%', transform: 'translateX(-50%)', background: '#b4b4b4', color: '#111827', fontWeight: 'bold', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', border: '2px solid #111827' }}>2</div>
              </div>
              <div style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(15,23,42,0.5) 100%)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px 16px 0 0', width: '100%', padding: '20px 10px', textAlign: 'center', height: '130px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <h4 style={{ margin: '0 0 5px 0', color: '#fff', fontSize: '18px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{podium[1].name}</h4>
                <span style={{ color: '#b4b4b4',尊gweight: 'bold', fontSize: '14px' }}>🏆 {podium[1].points} MMR</span>
                <span style={{ color: '#64748b', fontSize: '11px', marginTop: '6px' }}>{podium[1].wins || 0}V / {podium[1].losses || 0}D</span>
              </div>
            </div>
          )}

          {/* TOP 1 (CENTRO DESTAQUE) */}
          {podium[0] && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '1 1 220px', maxWidth: '240px', zIndex: 2 }}>
              <div style={{ position: 'relative', marginBottom: '15px' }}>
                <div style={{ fontSize: '32px', position: 'absolute', top: '-32px', left: '50%', transform: 'translateX(-50%)', filter: 'drop-shadow(0 2px 5px rgba(241,196,15,0.5))' }}>👑</div>
                <img src={podium[0].avatar || "https://via.placeholder.com/120?text=HoK"} alt={podium[0].name} style={{ width: '110px', height: '110px', borderRadius: '50%', objectFit: 'cover', border: '4px solid #f1c40f', boxShadow: '0 0 25px rgba(241, 196, 15, 0.25)' }} />
                <div style={{ position: 'absolute', bottom: '-5px', left: '50%', transform: 'translateX(-50%)', background: '#f1c40f', color: '#111827', fontWeight: 'bold', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', border: '2px solid #111827' }}>1</div>
              </div>
              <div style={{ background: 'linear-gradient(180deg, rgba(241,196,15,0.04) 0%, rgba(15,23,42,0.8) 100%)', border: '1px solid rgba(241,196,15,0.15)', borderRadius: '20px 20px 0 0', width: '100%', padding: '25px 10px', textAlign: 'center', height: '160px', display: 'flex', flexDirection: 'column', justifyContent: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
                <h4 style={{ margin: '0 0 5px 0', color: '#fff', fontSize: '20px', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{podium[0].name}</h4>
                <span style={{ color: '#f1c40f', fontWeight: 'bold', fontSize: '16px' }}>🏆 {podium[0].points} MMR</span>
                <span style={{ color: '#94a3b8', fontSize: '12px', marginTop: '6px' }}>{podium[0].wins || 0}V / {podium[0].losses || 0}D</span>
              </div>
            </div>
          )}

          {/* TOP 3 (DIREITA) */}
          {podium[2] && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '1 1 200px', maxWidth: '220px' }}>
              <div style={{ position: 'relative', marginBottom: '15px' }}>
                <img src={podium[2].avatar || "https://via.placeholder.com/120?text=HoK"} alt={podium[2].name} style={{ width: '90px', height: '90px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #cd7f32', boxShadow: '0 0 15px rgba(205, 127, 50, 0.1)' }} />
                <div style={{ position: 'absolute', bottom: '-5px', left: '50%', transform: 'translateX(-50%)', background: '#cd7f32', color: '#111827', fontWeight: 'bold', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', border: '2px solid #111827' }}>3</div>
              </div>
              <div style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(15,23,42,0.5) 100%)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px 16px 0 0', width: '100%', padding: '20px 10px', textAlign: 'center', height: '115px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <h4 style={{ margin: '0 0 5px 0', color: '#fff', fontSize: '18px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{podium[2].name}</h4>
                <span style={{ color: '#cd7f32', fontWeight: 'bold', fontSize: '14px' }}>🏆 {podium[2].points} MMR</span>
                <span style={{ color: '#64748b', fontSize: '11px', marginTop: '6px' }}>{podium[2].wins || 0}V / {podium[2].losses || 0}D</span>
              </div>
            </div>
          )}

        </div>

        {/* ==========================================
            TABELA COMPLETA (POSIÇÕES #4 PARA BAIXO)
           ========================================== */}
        <div style={{ background: 'linear-gradient(145deg, #111827, #0b0f19)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', padding: '20px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', overflowX: 'auto' }}>
          {remainder.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#64748b', padding: '30px', margin: 0, fontWeight: 'bold' }}>Nenhum outro jogador listado na liga ainda.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '550px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <th style={{ padding: '15px 20px', color: '#64748b', fontWeight: 'bold', fontSize: '14px', textTransform: 'uppercase' }}>Rank</th>
                  <th style={{ padding: '15px 20px', color: '#64748b', fontWeight: 'bold', fontSize: '14px', textTransform: 'uppercase' }}>Invocador</th>
                  <th style={{ padding: '15px 20px', color: '#64748b', fontWeight: 'bold', fontSize: '14px', textTransform: 'uppercase' }}>Rota</th>
                  <th style={{ padding: '15px 20px', color: '#64748b', fontWeight: 'bold', fontSize: '14px', textTransform: 'uppercase', textAlign: 'right' }}>Winrate Geral</th>
                  <th style={{ padding: '15px 20px', color: '#64748b', fontWeight: 'bold', fontSize: '14px', textTransform: 'uppercase', textAlign: 'right' }}>Pontos MMR</th>
                </tr>
              </thead>
              <tbody>
                {remainder.map((player, index) => {
                  const position = index + 4;
                  const total = (player.wins || 0) + (player.losses || 0);
                  const rate = total > 0 ? Math.round((player.wins / total) * 100) : 0;

                  return (
                    <tr 
                      key={player.id} 
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.01)', transition: 'background 0.2s' }}
                      onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.01)'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '15px 20px', fontWeight: 'bold', color: '#64748b', fontSize: '15px' }}>#{position}</td>
                      <td style={{ padding: '15px 20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <img src={player.avatar || "https://via.placeholder.com/40?text=HoK"} alt={player.name} style={{ width: '40px', height: '40px', borderRadius: '10px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.05)' }} />
                        <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '15px' }}>{player.name}</span>
                      </td>
                      <td style={{ padding: '15px 20px', color: player.role === 'Não definido' ? '#64748b' : '#94a3b8', fontSize: '14px' }}>{player.role || 'Não definido'}</td>
                      <td style={{ padding: '15px 20px', textAlign: 'right', fontSize: '14px', color: '#94a3b8' }}>
                        <span style={{ color: '#2ed573', fontWeight: 'bold' }}>{player.wins || 0}W</span> / <span style={{ color: '#e74c3c' }}>{player.losses || 0}D</span>
                        <span style={{ marginLeft: '10px', color: '#64748b', fontSize: '12px' }}>({rate}%)</span>
                      </td>
                      <td style={{ padding: '15px 20px', textAlign: 'right', fontWeight: 'bold', color: '#f1c40f', fontSize: '16px' }}>{player.points}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

      </div>
      <style>{`
        @keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }
      `}</style>
    </div>
  );
}

export default HubRanking;
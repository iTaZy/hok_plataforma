import React, { useState, useEffect } from 'react';
import { db, auth } from '../services/firebase';
import { collection, query, orderBy, limit, getDocs, startAfter } from 'firebase/firestore';

const PAGE_SIZE = 10;

function MatchHistory({ userId }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  const uid = userId || auth.currentUser?.uid;

  const fetchMatches = async (afterDoc = null) => {
    if (!uid) return;

    try {
      let q = query(
        collection(db, 'users', uid, 'match_history'),
        orderBy('timestamp', 'desc'),
        limit(PAGE_SIZE)
      );
      if (afterDoc) q = query(
        collection(db, 'users', uid, 'match_history'),
        orderBy('timestamp', 'desc'),
        startAfter(afterDoc),
        limit(PAGE_SIZE)
      );

      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      setMatches(prev => afterDoc ? [...prev, ...data] : data);
      setLastVisible(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === PAGE_SIZE);
    } catch (e) {
      console.error('Erro ao carregar histórico:', e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => { fetchMatches(); }, [uid]);

  const handleLoadMore = async () => {
    if (!lastVisible || loadingMore) return;
    setLoadingMore(true);
    await fetchMatches(lastVisible);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '—';
    const date = timestamp.seconds
      ? new Date(timestamp.seconds * 1000)
      : new Date(timestamp);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
      <div style={{ width: '32px', height: '32px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#f39c12', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      Carregando histórico...
    </div>
  );

  if (matches.length === 0) return (
    <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
      <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎮</div>
      <p style={{ margin: 0, fontSize: '15px' }}>Nenhuma partida registrada ainda.</p>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {matches.map((match) => {
          const isVictory = match.result === 'Vitória';
          const mmrPositive = match.pointsEarned > 0;

          return (
            <div
              key={match.id}
              style={{
                background: isVictory
                  ? 'linear-gradient(135deg, rgba(46,213,115,0.06), rgba(15,23,42,0.8))'
                  : 'linear-gradient(135deg, rgba(231,76,60,0.06), rgba(15,23,42,0.8))',
                border: `1px solid ${isVictory ? 'rgba(46,213,115,0.2)' : 'rgba(231,76,60,0.2)'}`,
                borderRadius: '14px',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                flexWrap: 'wrap',
              }}
            >
              {/* Resultado */}
              <div style={{ textAlign: 'center', minWidth: '64px' }}>
                <div style={{
                  fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase',
                  letterSpacing: '1px', color: isVictory ? '#2ed573' : '#e74c3c',
                  marginBottom: '2px'
                }}>
                  {match.result}
                </div>
                <div style={{ fontSize: '20px' }}>{isVictory ? '🏆' : '💀'}</div>
              </div>

              {/* Divisor */}
              <div style={{ width: '1px', height: '40px', background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />

              {/* Detalhes */}
              <div style={{ flex: 1, minWidth: '120px' }}>
                <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>
                  Time {match.myTeam}
                </div>
                <div style={{ color: '#64748b', fontSize: '12px' }}>
                  🗺️ {match.rolePlayed || 'Desconhecida'}
                </div>
              </div>

              {/* MMR */}
              <div style={{ textAlign: 'right', minWidth: '70px' }}>
                <div style={{
                  fontSize: '20px', fontWeight: 'bold',
                  color: mmrPositive ? '#2ed573' : '#e74c3c',
                }}>
                  {mmrPositive ? '+' : ''}{match.pointsEarned}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>MMR</div>
              </div>

              {/* Data */}
              <div style={{ fontSize: '11px', color: '#64748b', textAlign: 'right', minWidth: '90px' }}>
                {formatDate(match.timestamp)}
              </div>
            </div>
          );
        })}
      </div>

      {hasMore && (
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              color: loadingMore ? '#64748b' : '#94a3b8',
              padding: '10px 28px', borderRadius: '10px',
              cursor: loadingMore ? 'not-allowed' : 'pointer',
              fontSize: '13px', fontWeight: 'bold', fontFamily: '"Urbanist", sans-serif',
            }}
          >
            {loadingMore ? 'Carregando...' : 'Ver mais partidas'}
          </button>
        </div>
      )}

      {!hasMore && matches.length > PAGE_SIZE && (
        <p style={{ textAlign: 'center', color: '#64748b', fontSize: '12px', marginTop: '12px' }}>
          Você viu todas as partidas.
        </p>
      )}
    </div>
  );
}

export default MatchHistory;

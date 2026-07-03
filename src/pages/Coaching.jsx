import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import {
  collection, addDoc, onSnapshot, query,
  where, orderBy, serverTimestamp, doc, getDoc
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import itemTazyFoto from '../assets/tazy_foto.webp';
import itemAlonsoFoto from '../assets/alonso_foto.webp';

// ─── dados dos coaches ────────────────────────────────────────────────────────
const coachesData = [
  {
    id: 1,
    name: 'Alonso',
    role: 'Selva',
    image: itemAlonsoFoto,
    color: '#f39c12',
    whatsapp: '55013988599151',
    description: 'Especialista em pathing agressivo, controle de mapa e domínio de objetivos no early game.',
    services: [
      { id: 'vod',  icon: '▶', title: 'Análise de VOD',       price: 60, unit: '/partida', desc: 'Receba uma análise detalhada quadro a quadro de suas mecânicas e um plano de treinamento focado nas suas fraquezas.' },
      { id: 'live', icon: '👤', title: 'Coaching ao Vivo',    price: 40, unit: '/partida', desc: 'Sessão de jogo ao vivo onde eu assisto e guio você em tempo real pelo Discord.' },
      { id: 'duo',  icon: '🎮', title: 'Jogue Comigo (Duo)',  price: 10, unit: '/partida', desc: 'Partidas ranqueadas juntos. Vou carregar o jogo e te passar calls avançadas de rotação.' },
    ],
  },
  {
    id: 2,
    name: 'TaZy',
    role: 'Suporte',
    image: itemTazyFoto,
    color: '#3498db',
    whatsapp: '55021999410110',
    description: 'Macro avançado, controle de visão estratégico e proteção impecável para carregar a rota inferior.',
    services: [
      { id: 'live',          icon: '👤', title: 'Coaching ao Vivo',          price: 40, unit: '/partida', desc: 'Foco total em leitura de mapa, tempo de ward e como fazer seu Atirador sair vivo de qualquer situação.' },
      { id: 'review_texto',  icon: '📝', title: 'Análise Detalhada + Dicas', price: 60, unit: '/partida', desc: 'Me envie a gravação da sua partida e te devolvo um vídeo privado com os principais erros e o foco de melhoria.' },
      { id: 'duo',           icon: '🎮', title: 'Jogue Comigo (Duo)',        price: 10, unit: '/partida', desc: 'Partidas ranqueadas juntos. Vou carregar o jogo e te passar calls avançadas de rotação.' },
    ],
  },
];

// ─── utilitários ──────────────────────────────────────────────────────────────
const tierColors = { S: '#f1c40f', A: '#e67e22', B: '#3498db', C: '#95a5a6', D: '#e74c3c' };

function StarRating({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div style={{ display: 'flex', gap: '4px' }}>
      {[1, 2, 3, 4, 5].map(n => (
        <span
          key={n}
          onClick={() => onChange && onChange(n)}
          onMouseEnter={() => onChange && setHovered(n)}
          onMouseLeave={() => onChange && setHovered(0)}
          style={{
            fontSize: '22px',
            cursor: onChange ? 'pointer' : 'default',
            color: n <= (hovered || value) ? '#f1c40f' : 'rgba(255,255,255,0.15)',
            transition: 'color 0.15s',
          }}
        >★</span>
      ))}
    </div>
  );
}

// ─── formulário de avaliação ──────────────────────────────────────────────────
function ReviewForm({ coachId, coachName, onSuccess }) {
  const auth = getAuth();
  const user = auth.currentUser;

  const [stars, setStars]     = useState(0);
  const [text, setText]       = useState('');
  const [service, setService] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError]     = useState('');

  const coach = coachesData.find(c => c.id === coachId);

  const handleSubmit = async () => {
    if (!user) { setError('Você precisa estar logado para avaliar.'); return; }
    if (stars === 0) { setError('Selecione uma nota de 1 a 5 estrelas.'); return; }
    if (text.trim().length < 20) { setError('Escreva pelo menos 20 caracteres no depoimento.'); return; }
    if (!service) { setError('Selecione qual serviço você contratou.'); return; }

    setSending(true);
    setError('');
    try {
      // Busca o nick atualizado do perfil no Firestore
      const userSnap = await getDoc(doc(db, 'users', user.uid));
      const userName = userSnap.exists()
        ? (userSnap.data().name || user.email?.split('@')[0] || 'Jogador')
        : (user.email?.split('@')[0] || 'Jogador');

      await addDoc(collection(db, 'coaching_reviews'), {
        coachId,
        coachName,
        userId: user.uid,
        userName,
        stars,
        text: text.trim(),
        service,
        createdAt: serverTimestamp(),
        approved: false,
      });
      onSuccess();
    } catch (e) {
      setError('Erro ao enviar. Tente novamente.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '16px', padding: '28px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <h3 style={{ margin: 0, fontSize: '18px', color: '#fff' }}>Deixe sua avaliação</h3>

      {/* Serviço contratado */}
      <div>
        <label style={{ display: 'block', fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Serviço contratado</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {coach?.services.map(s => (
            <button
              key={s.id}
              onClick={() => setService(s.title)}
              style={{
                background: service === s.title ? 'rgba(255,255,255,0.12)' : 'transparent',
                border: `1px solid ${service === s.title ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
                color: service === s.title ? '#fff' : '#64748b',
                padding: '6px 14px', borderRadius: '8px',
                fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s'
              }}
            >{s.title}</button>
          ))}
        </div>
      </div>

      {/* Nota */}
      <div>
        <label style={{ display: 'block', fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Nota</label>
        <StarRating value={stars} onChange={setStars} />
      </div>

      {/* Depoimento */}
      <div>
        <label style={{ display: 'block', fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Depoimento</label>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Conte como foi a experiência, o que melhorou no seu jogo..."
          maxLength={400}
          rows={4}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '10px', color: '#e2e8f0', fontSize: '14px',
            padding: '12px 14px', resize: 'vertical', outline: 'none',
            fontFamily: 'inherit', lineHeight: '1.6',
          }}
          onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.2)'}
          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
        />
        <div style={{ textAlign: 'right', fontSize: '11px', color: '#475569', marginTop: '4px' }}>{text.length}/400</div>
      </div>

      {error && <p style={{ margin: 0, fontSize: '13px', color: '#e74c3c', fontWeight: 'bold' }}>{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={sending}
        style={{
          alignSelf: 'flex-start', padding: '11px 24px',
          background: sending ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.12)',
          color: sending ? '#475569' : '#fff',
          borderRadius: '10px', fontSize: '14px', fontWeight: 'bold',
          cursor: sending ? 'not-allowed' : 'pointer', transition: 'all 0.2s'
        }}
      >
        {sending ? 'Enviando...' : 'Enviar avaliação →'}
      </button>

      <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: '1.5' }}>
        Avaliações passam por moderação antes de serem publicadas.
      </p>
    </div>
  );
}

// ─── lista de avaliações ──────────────────────────────────────────────────────
function ReviewList({ coachId }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'coaching_reviews'),
      where('coachId', '==', coachId),
      where('approved', '==', true),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, snap => {
      setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [coachId]);

  if (loading) return <p style={{ color: '#475569', fontSize: '14px' }}>Carregando avaliações...</p>;

  if (reviews.length === 0) return (
    <div style={{ textAlign: 'center', padding: '48px 0', color: '#475569' }}>
      <div style={{ fontSize: '36px', marginBottom: '12px' }}>💬</div>
      <p style={{ margin: 0, fontSize: '15px' }}>Ainda não há avaliações aprovadas para este coach.</p>
      <p style={{ margin: '6px 0 0', fontSize: '13px' }}>Seja o primeiro a deixar a sua!</p>
    </div>
  );

  // Média de estrelas
  const avg = (reviews.reduce((a, r) => a + r.stars, 0) / reviews.length).toFixed(1);

  return (
    <div>
      {/* Resumo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', padding: '16px 20px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '40px', fontWeight: '700', color: '#fff', lineHeight: 1 }}>{avg}</div>
          <StarRating value={Math.round(avg)} />
          <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>{reviews.length} avaliação{reviews.length !== 1 ? 'ões' : ''}</div>
        </div>
        <div style={{ flex: 1, paddingLeft: '16px', borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
          {[5, 4, 3, 2, 1].map(n => {
            const count = reviews.filter(r => r.stars === n).length;
            const pct = reviews.length ? (count / reviews.length) * 100 : 0;
            return (
              <div key={n} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '12px', color: '#64748b', width: '8px' }}>{n}</span>
                <span style={{ color: '#f1c40f', fontSize: '12px' }}>★</span>
                <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: '#f1c40f', borderRadius: '99px', transition: 'width 0.4s' }} />
                </div>
                <span style={{ fontSize: '12px', color: '#475569', width: '20px', textAlign: 'right' }}>{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {reviews.map(r => (
          <div key={r.id} style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '14px', padding: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <div style={{ fontWeight: 'bold', color: '#e2e8f0', fontSize: '14px' }}>{r.userName}</div>
                <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>{r.service}</div>
              </div>
              <StarRating value={r.stars} />
            </div>
            <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8', lineHeight: '1.7' }}>{r.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── tela de detalhe do coach ─────────────────────────────────────────────────
function CoachDetail({ coach, onBack }) {
  const [selectedService, setSelectedService] = useState(null);
  const [tab, setTab] = useState('services'); // 'services' | 'reviews'
  const [showThanks, setShowThanks] = useState(false);

  const tabStyle = active => ({
    padding: '10px 22px', borderRadius: '10px', fontWeight: 'bold',
    fontSize: '14px', cursor: 'pointer', border: 'none', transition: 'all 0.2s',
    background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
    color: active ? '#fff' : '#475569',
  });

  return (
    <div style={{ minHeight: '100vh', background: '#0b0f19', color: '#e2e8f0', padding: '40px 20px', fontFamily: '"Urbanist", sans-serif', position: 'relative', overflow: 'hidden' }}>

      {/* glow */}
      <div style={{ position: 'absolute', top: '5%', right: '-10%', width: '500px', height: '500px', background: coach.color, filter: 'blur(180px)', opacity: 0.12, zIndex: 0, pointerEvents: 'none' }} />

      <div style={{ maxWidth: '960px', margin: '0 auto', position: 'relative', zIndex: 1 }}>

        <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: '#475569', fontSize: '14px', cursor: 'pointer', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', padding: 0 }}
          onMouseOver={e => e.currentTarget.style.color = '#fff'}
          onMouseOut={e => e.currentTarget.style.color = '#475569'}
        >← Todos os coaches</button>

        {/* cabeçalho */}
        <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', marginBottom: '36px', alignItems: 'flex-start' }}>
          <div style={{ width: '260px', flexShrink: 0, borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
            <img src={coach.image} alt={coach.name} style={{ width: '100%', height: '260px', objectFit: 'cover', objectPosition: 'top', display: 'block' }} />
            <div style={{ padding: '16px 18px', background: 'rgba(15,23,42,0.8)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '3px' }}>Especialidade</div>
                  <div style={{ fontSize: '14px', color: '#e2e8f0', fontWeight: 'bold' }}>{coach.role}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: '#475569', marginBottom: '3px' }}>A partir de</div>
                  <div style={{ fontSize: '16px', color: '#2ed573', fontWeight: 'bold' }}>R${Math.min(...coach.services.map(s => s.price))}</div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ flex: 1, minWidth: '240px' }}>
            <div style={{ fontSize: '11px', color: coach.color, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 'bold', marginBottom: '8px' }}>Coach Profissional</div>
            <h1 style={{ fontSize: '52px', margin: '0 0 12px', color: '#fff', letterSpacing: '-1.5px', lineHeight: 1 }}>{coach.name}</h1>
            <p style={{ fontSize: '16px', color: '#64748b', margin: 0, lineHeight: '1.7', maxWidth: '480px' }}>{coach.description}</p>
          </div>
        </div>

        {/* abas */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '4px', width: 'fit-content', border: '1px solid rgba(255,255,255,0.05)' }}>
          <button style={tabStyle(tab === 'services')} onClick={() => setTab('services')}>Serviços</button>
          <button style={tabStyle(tab === 'reviews')} onClick={() => setTab('reviews')}>Avaliações</button>
        </div>

        {/* conteúdo da aba */}
        <div style={{ background: 'rgba(15,23,42,0.7)', borderRadius: '20px', padding: '32px', border: '1px solid rgba(255,255,255,0.05)' }}>

          {/* ── ABA SERVIÇOS ── */}
          {tab === 'services' && (
            <>
              <h2 style={{ margin: '0 0 6px', fontSize: '22px', color: '#fff' }}>Escolha um serviço</h2>
              <p style={{ color: '#475569', margin: '0 0 24px', fontSize: '14px' }}>Selecione o pacote que melhor atende ao seu momento de jogo.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
                {coach.services.map(service => {
                  const isSelected = selectedService?.id === service.id;
                  return (
                    <div
                      key={service.id}
                      onClick={() => setSelectedService(service)}
                      style={{
                        background: isSelected ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.2)',
                        border: `1px solid ${isSelected ? coach.color + '80' : 'rgba(255,255,255,0.05)'}`,
                        borderRadius: '14px', padding: '20px 22px', cursor: 'pointer',
                        transition: 'all 0.2s', display: 'flex', gap: '16px', alignItems: 'flex-start',
                      }}
                      onMouseOver={e => { if (!isSelected) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
                      onMouseOut={e => { if (!isSelected) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; }}
                    >
                      <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>{service.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
                          <span style={{ fontWeight: 'bold', color: '#fff', fontSize: '16px' }}>{service.title}</span>
                          <span style={{ fontWeight: 'bold', color: '#fff', fontSize: '15px', background: 'rgba(255,255,255,0.05)', padding: '3px 10px', borderRadius: '8px', whiteSpace: 'nowrap' }}>
                            R${service.price} <span style={{ fontSize: '12px', color: '#475569', fontWeight: 'normal' }}>{service.unit}</span>
                          </span>
                        </div>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '13px', lineHeight: '1.6' }}>{service.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ textAlign: 'center' }}>
                <button
                  disabled={!selectedService}
                  onClick={() => {
                    const msg = encodeURIComponent(
                      `Olá ${coach.name}! Vi seu perfil no HoK HuB e quero reservar o serviço *${selectedService.title}* (R$${selectedService.price}${selectedService.unit}). Podemos combinar?`
                    );
                    window.open(`https://wa.me/${coach.whatsapp}?text=${msg}`, '_blank');
                  }}
                  style={{
                    background: selectedService ? coach.color : 'rgba(255,255,255,0.03)',
                    color: selectedService ? '#111827' : '#334155',
                    border: `1px solid ${selectedService ? coach.color : 'transparent'}`,
                    padding: '14px 36px', borderRadius: '12px', fontSize: '15px',
                    fontWeight: 'bold', cursor: selectedService ? 'pointer' : 'not-allowed',
                    transition: 'all 0.25s',
                  }}
                  onMouseOver={e => { if (selectedService) e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  {selectedService ? `Reservar via WhatsApp →` : 'Selecione um serviço acima'}
                </button>
              </div>
            </>
          )}

          {/* ── ABA AVALIAÇÕES ── */}
          {tab === 'reviews' && (
            <>
              {showThanks ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>🙏</div>
                  <h3 style={{ color: '#fff', margin: '0 0 8px' }}>Obrigado pelo depoimento!</h3>
                  <p style={{ color: '#475569', fontSize: '14px', margin: '0 0 20px' }}>Sua avaliação será publicada após moderação.</p>
                  <button onClick={() => setShowThanks(false)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px' }}>Ver avaliações</button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                  <ReviewForm coachId={coach.id} coachName={coach.name} onSuccess={() => setShowThanks(true)} />
                  <div>
                    <h3 style={{ margin: '0 0 20px', fontSize: '18px', color: '#fff' }}>O que dizem os alunos</h3>
                    <ReviewList coachId={coach.id} />
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}

// ─── tela de listagem ─────────────────────────────────────────────────────────
export default function Coaching() {
  const [selected, setSelected] = useState(null);

  if (selected) return <CoachDetail coach={selected} onBack={() => setSelected(null)} />;

  return (
    <div style={{ minHeight: '100vh', background: '#0b0f19', color: '#e2e8f0', padding: '60px 20px', fontFamily: '"Urbanist", sans-serif' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        <div style={{ marginBottom: '56px' }}>
          <p style={{ color: '#f39c12', fontWeight: 'bold', letterSpacing: '0.12em', textTransform: 'uppercase', fontSize: '12px', marginBottom: '10px' }}>É a sua hora de brilhar</p>
          <h2 style={{ fontSize: '48px', color: '#fff', margin: '0 0 16px', letterSpacing: '-1.5px' }}>Aprenda com os melhores</h2>
          <p style={{ color: '#475569', fontSize: '17px', maxWidth: '560px', margin: 0, lineHeight: '1.7' }}>
            Acesso direto a coaches de alto nível. Escolha um profissional e reserve sua sessão em minutos.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
          {coachesData.map(coach => {
            const minPrice = Math.min(...coach.services.map(s => s.price));
            return (
              <div
                key={coach.id}
                onClick={() => setSelected(coach)}
                style={{
                  borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)',
                  overflow: 'hidden', height: '400px', position: 'relative',
                  cursor: 'pointer', transition: 'all 0.35s cubic-bezier(0.175,0.885,0.32,1.275)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                }}
                onMouseOver={e => {
                  e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)';
                  e.currentTarget.style.borderColor = coach.color + '50';
                  e.currentTarget.style.boxShadow = `0 20px 40px rgba(0,0,0,0.5), 0 0 24px ${coach.color}18`;
                }}
                onMouseOut={e => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)';
                }}
              >
                <img src={coach.image} alt={coach.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', opacity: 0.55, display: 'block' }} />

                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #0b0f19 30%, transparent 70%)' }} />

                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '24px' }}>
                  <div style={{ fontSize: '11px', color: coach.color, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 'bold', marginBottom: '4px' }}>{coach.role}</div>
                  <h3 style={{ margin: '0 0 14px', fontSize: '26px', color: '#fff', fontWeight: '700' }}>{coach.name}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)', padding: '8px 14px', borderRadius: '10px', backdropFilter: 'blur(8px)' }}>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>A partir de </span>
                      <span style={{ fontSize: '15px', color: '#2ed573', fontWeight: 'bold' }}>R${minPrice}</span>
                    </div>
                    <div style={{ background: coach.color + '20', border: `1px solid ${coach.color}40`, padding: '8px 14px', borderRadius: '10px', fontSize: '12px', color: coach.color, fontWeight: 'bold' }}>
                      {coach.services.length} serviços
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
import React, { useState } from 'react';
import itemTazyFoto from '../assets/tazy_foto.jpg';
// Se tiver a foto do Alonso, importe aqui: 
import itemAlonsoFoto from '../assets/alonso_foto.jpeg';

function Coaching() {
  const [selectedCoach, setSelectedCoach] = useState(null); // Controla qual coach está aberto
  const [selectedService, setSelectedService] = useState(null); // Controla qual serviço o usuário escolheu

  // Banco de dados de Coaches 
  const coachesData = [
    {
      id: 1,
      name: 'Alonso',
      role: 'Selva',
      rating: 5.0,
      reviews: 14,
      price: 150,
      // Troque a string abaixo por itemAlonsoFoto quando tiver a imagem dele salva
      image: itemAlonsoFoto,
      color: '#f39c12',
      description: 'Especialista em pathing agressivo, controle de mapa e domínio de objetivos no early game.'
    },
    {
      id: 2,
      name: 'TaZy',
      role: 'Suporte',
      rating: 4.9,
      reviews: 32,
      price: 120,
      image: itemTazyFoto,
      color: '#3498db',
      description: 'Macro avançado, controle de visão estratégico e proteção impecável para carregar a rota inferior.'
    },
  ];

  // ==========================================
  // TELA DE DETALHES DO COACH (PERFIL)
  // ==========================================
  if (selectedCoach) {
    return (
      <div style={{ minHeight: '100vh', background: '#0b0f19', color: '#e2e8f0', padding: '40px 20px', fontFamily: '"Urbanist", sans-serif', position: 'relative', overflow: 'hidden' }}>
        
        {/* Efeito de Neon no Fundo */}
        <div style={{ position: 'absolute', top: '10%', right: '-10%', width: '600px', height: '600px', background: selectedCoach.color, filter: 'blur(200px)', opacity: '0.15', zIndex: 0, pointerEvents: 'none' }}></div>

        <div style={{ maxWidth: '1000px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          
          {/* Botão Voltar */}
          <button 
            onClick={() => { setSelectedCoach(null); setSelectedService(null); }}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '16px', cursor: 'pointer', marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}
            onMouseOver={(e) => e.currentTarget.style.color = '#fff'}
            onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}
          >
            ← Voltar para todos os coaches
          </button>

          {/* Cabeçalho do Perfil */}
          <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap', marginBottom: '40px' }}>
            
            {/* Card Lateral Esquerdo (Foto e Stats) */}
            <div style={{ width: '280px', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
              <img src={selectedCoach.image} alt={selectedCoach.name} style={{ width: '100%', height: '280px', objectFit: 'cover' }} />
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ margin: 0, fontSize: '20px', color: '#fff' }}>{selectedCoach.name}</h3>
                  <div style={{ color: '#fff', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>★</span> {selectedCoach.rating.toFixed(1)} <span style={{ color: '#64748b' }}>({selectedCoach.reviews})</span>
                  </div>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Role</span>
                    <span style={{ fontSize: '13px', color: '#fff', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ color: selectedCoach.color }}>⚡</span> COACH</span>
                  </div>
                  <div>
                    <span style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Rate</span>
                    <span style={{ fontSize: '15px', color: '#fff', fontWeight: 'bold' }}>R${selectedCoach.price} <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'normal' }}>/hora</span></span>
                  </div>
                </div>
              </div>
            </div>

            {/* Informações da Direita */}
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: '56px', margin: '0 0 10px 0', color: '#fff', letterSpacing: '-1px' }}>{selectedCoach.name}</h1>
              <p style={{ fontSize: '18px', color: '#94a3b8', margin: 0 }}>{selectedCoach.description}</p>
            </div>
          </div>

          {/* Área de Serviços */}
          <div style={{ background: 'linear-gradient(145deg, #111827, #0b0f19)', borderRadius: '24px', padding: '40px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
            <h2 style={{ fontSize: '28px', color: '#fff', margin: '0 0 10px 0' }}>Reservar um profissional nunca foi tão fácil</h2>
            <p style={{ color: '#94a3b8', margin: '0 0 30px 0', fontSize: '16px' }}>Leva menos de 5 minutos para reservar sua primeira sessão de treinamento.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              
              {/* Card de Serviço 1: VOD */}
              <div 
                onClick={() => setSelectedService('vod')}
                style={{ background: selectedService === 'vod' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.3)', border: `1px solid ${selectedService === 'vod' ? selectedCoach.color : 'rgba(255,255,255,0.05)'}`, borderRadius: '16px', padding: '25px', cursor: 'pointer', transition: 'all 0.3s ease', display: 'flex', gap: '20px' }}
                onMouseOver={(e) => { if (selectedService !== 'vod') e.currentTarget.style.border = '1px solid rgba(255,255,255,0.2)'; }}
                onMouseOut={(e) => { if (selectedService !== 'vod') e.currentTarget.style.border = '1px solid rgba(255,255,255,0.05)'; }}
              >
                <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                  ▶
                </div>
                <div>
                  <h3 style={{ margin: '0 0 8px 0', color: '#fff', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Análise de VOD <span style={{ color: '#fff', fontSize: '15px', fontWeight: 'bold', marginLeft: '10px' }}>R${selectedCoach.price}/hora</span>
                  </h3>
                  <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px', lineHeight: '1.5' }}>
                    Receba uma análise personalizada quadro a quadro de suas mecânicas e um plano de treinamento focado em suas fraquezas.
                  </p>
                </div>
              </div>

              {/* Card de Serviço 2: Ao Vivo */}
              <div 
                onClick={() => setSelectedService('live')}
                style={{ background: selectedService === 'live' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.3)', border: `1px solid ${selectedService === 'live' ? selectedCoach.color : 'rgba(255,255,255,0.05)'}`, borderRadius: '16px', padding: '25px', cursor: 'pointer', transition: 'all 0.3s ease', display: 'flex', gap: '20px' }}
                onMouseOver={(e) => { if (selectedService !== 'live') e.currentTarget.style.border = '1px solid rgba(255,255,255,0.2)'; }}
                onMouseOut={(e) => { if (selectedService !== 'live') e.currentTarget.style.border = '1px solid rgba(255,255,255,0.05)'; }}
              >
                <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                  👤
                </div>
                <div>
                  <h3 style={{ margin: '0 0 8px 0', color: '#fff', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Coaching ao vivo <span style={{ color: '#fff', fontSize: '15px', fontWeight: 'bold', marginLeft: '10px' }}>R${selectedCoach.price}/hora</span>
                  </h3>
                  <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px', lineHeight: '1.5' }}>
                    Inclui uma sessão de jogo ao vivo onde seu coach assiste e guia você em tempo real. Receba conselhos instantâneos sobre estratégia e tomada de decisões.
                  </p>
                </div>
              </div>

            </div>

            {/* Botão de Prosseguir */}
            <div style={{ textAlign: 'center', marginTop: '40px' }}>
              <button 
                disabled={!selectedService}
                onClick={() => alert(`Reserva iniciada com ${selectedCoach.name} para o serviço: ${selectedService}`)}
                style={{ 
                  background: selectedService ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.02)', 
                  color: selectedService ? '#fff' : '#475569', 
                  border: `1px solid ${selectedService ? 'rgba(255,255,255,0.2)' : 'transparent'}`, 
                  padding: '16px 40px', 
                  borderRadius: '12px', 
                  fontSize: '16px', 
                  fontWeight: 'bold', 
                  cursor: selectedService ? 'pointer' : 'not-allowed', 
                  transition: 'all 0.3s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
                onMouseOver={(e) => { if (selectedService) e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
                onMouseOut={(e) => { if (selectedService) e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
              >
                Prosseguir para reserva →
              </button>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // TELA PRINCIPAL (MARKETPLACE GRID)
  // ==========================================
  return (
    <div style={{ minHeight: '100vh', background: '#0b0f19', color: '#e2e8f0', padding: '60px 20px', fontFamily: '"Urbanist", sans-serif' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Header Imersivo */}
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <p style={{ color: '#f39c12', fontWeight: 'bold', letterSpacing: '2px', textTransform: 'uppercase', fontSize: '14px', marginBottom: '10px' }}>É a sua hora de brilhar</p>
          <h2 style={{ fontSize: '48px', color: '#fff', marginBottom: '20px', letterSpacing: '-1px' }}>Aprenda com os melhores</h2>
          <p style={{ color: '#94a3b8', fontSize: '18px', maxWidth: '700px', margin: '0 auto' }}>
            Tenha acesso exclusivo a coaches de alto nível e campeões. Escolha um tópico para melhorar ou deixe-os guiar sua jornada de autodesenvolvimento.
          </p>
        </div>

        {/* Grade de Coaches Marketplace (Sem Filtros) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '30px', justifyContent: 'center' }}>
          {coachesData.map((coach) => (
            <div 
              key={coach.id}
              onClick={() => setSelectedCoach(coach)} // AQUI ESTÁ O CLIQUE QUE ABRE O PERFIL!
              style={{ 
                background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.9) 100%)', 
                borderRadius: '24px', 
                border: '1px solid rgba(255,255,255,0.05)',
                height: '420px',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'scale(1.03) translateY(-10px)';
                e.currentTarget.style.border = `1px solid ${coach.color}50`;
                e.currentTarget.style.boxShadow = `0 20px 40px rgba(0,0,0,0.5), 0 0 20px ${coach.color}20`;
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'scale(1) translateY(0)';
                e.currentTarget.style.border = '1px solid rgba(255,255,255,0.05)';
                e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.3)';
              }}
            >
              {/* Foto de Fundo */}
              <img 
                src={coach.image} 
                alt={coach.name} 
                style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: '0.5' }}
              />

              {/* Badge de Rating */}
              <div style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(0,0,0,0.6)', padding: '6px 12px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
                <span style={{ fontWeight: 'bold', color: '#fff', fontSize: '14px' }}>{coach.rating.toFixed(1)}</span>
                <span style={{ color: '#f1c40f', fontSize: '14px' }}>★</span>
              </div>

              {/* Overlay de Informações */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '25px', background: 'linear-gradient(0deg, rgba(11,15,25,1) 20%, rgba(11,15,25,0) 100%)' }}>
                <h3 style={{ margin: '0 0 5px 0', fontSize: '24px', color: '#fff' }}>{coach.name}</h3>
                <p style={{ margin: '0 0 15px 0', fontSize: '13px', color: coach.color, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  {coach.role}
                </p>
                
                {/* Badge de Preço Único */}
                <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '10px 15px', borderRadius: '15px', display: 'flex', alignItems: 'center', gap: '10px', width: 'fit-content' }}>
                  <span style={{ fontSize: '16px', color: '#fff', fontWeight: 'bold' }}>
                    R${coach.price}
                  </span>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>/ hora</span>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

export default Coaching;
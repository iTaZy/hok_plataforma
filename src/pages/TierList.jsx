import React, { useState } from 'react';
import { heroesDatabase } from '../data/heroesDatabase'; 

function TierList() {
  const [selectedRole, setSelectedRole] = useState('Todos');
  
  // Estados do Modal
  const [modalHero, setModalHero] = useState(null); 
  const [selectedModalRoute, setSelectedModalRoute] = useState(null);
  const [selectedModalBuild, setSelectedModalBuild] = useState(0);

  const tiersConfig = [
    { letter: 'S', color: '#ff4757', desc: 'Dominantes no Meta' },
    { letter: 'A', color: '#ffa502', desc: 'Excelentes Escolhas' },
    { letter: 'B', color: '#2ed573', desc: 'Sólidos e Balanceados' },
    { letter: 'C', color: '#1e90ff', desc: 'Situacionais' }
  ];

  const roles = ['Todos', 'Rota Superior', 'Selva', 'Rota do Meio', 'Atirador', 'Suporte'];

  const filteredHeroes = heroesDatabase.filter((hero) => {
    const matchesRole = selectedRole === 'Todos' || 
                        (Array.isArray(hero.role) ? hero.role.includes(selectedRole) : hero.role === selectedRole);
    return matchesRole;
  });

  // Função inteligente para abrir o modal e já selecionar a primeira rota/build caso o herói seja complexo
  const handleOpenModal = (hero) => {
    setModalHero(hero);
    if (hero.builds) {
      setSelectedModalRoute(Object.keys(hero.builds)[0]); // Pega a primeira rota (ex: 'Selva')
      setSelectedModalBuild(0); // Pega a primeira build (ex: 'Build Dano')
    } else {
      setSelectedModalRoute(null);
      setSelectedModalBuild(0);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0b0f19', color: '#e2e8f0', padding: '60px 20px', fontFamily: '"Urbanist", sans-serif' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '50px' }}>
          <h2 style={{ fontSize: '48px', color: '#fff', marginBottom: '10px' }}>HoK Hub - Tier List</h2>
          <p style={{ color: '#94a3b8' }}>Descubra os heróis mais fortes da atualização atual.</p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '50px', justifyContent: 'center' }}>
          {roles.map((role) => (
            <button
              key={role}
              onClick={() => setSelectedRole(role)}
              style={{
                padding: '8px 20px', borderRadius: '10px', cursor: 'pointer',
                background: selectedRole === role ? 'rgba(243, 156, 18, 0.2)' : 'rgba(0,0,0,0.3)',
                border: selectedRole === role ? '1px solid #f39c12' : '1px solid rgba(255,255,255,0.1)',
                color: selectedRole === role ? '#f39c12' : '#94a3b8', fontWeight: 'bold'
              }}
            >
              {role}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {tiersConfig.map((tier) => (
            <div key={tier.letter} style={{ display: 'flex', background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
              
              <div style={{ width: '100px', background: tier.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '32px' }}>
                {tier.letter}
              </div>

              <div style={{ flex: 1, padding: '20px', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                {filteredHeroes
                  .filter(h => h.tier === tier.letter)
                  .map(hero => (
                    <div 
                      key={hero.id} 
                      onClick={() => handleOpenModal(hero)} // Chama a nova função
                      style={{ width: '60px', textAlign: 'center', cursor: 'pointer' }}
                    >
                      <img 
                        src={hero.image} 
                        alt={hero.name} 
                        style={{ width: '60px', height: '60px', borderRadius: '10px', border: `2px solid ${tier.color}`, objectFit: 'cover', transition: 'transform 0.2s' }} 
                        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      />
                      <span style={{ fontSize: '10px', display: 'block', marginTop: '5px', color: '#fff' }}>{hero.name}</span>
                    </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================== */}
      {/* MODAL DE DETALHES DO HERÓI (SUPER INTELIGENTE) */}
      {/* ========================================== */}
      {modalHero && (
        <div 
          style={{ 
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
            background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', 
            justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(5px)' 
          }}
          onClick={() => setModalHero(null)}
        >
          <div 
            style={{ 
              background: '#0b0f19', padding: '40px', borderRadius: '24px', 
              width: '90%', maxWidth: '600px', border: `2px solid ${modalHero.color || '#f39c12'}`,
              position: 'relative', textAlign: 'left', overflowY: 'auto', maxHeight: '90vh',
              boxShadow: `0 10px 40px ${modalHero.color}30`
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setModalHero(null)}
              style={{ 
                position: 'absolute', top: '15px', right: '15px', background: 'transparent', 
                border: 'none', color: '#94a3b8', fontSize: '24px', cursor: 'pointer' 
              }}
            >
              ×
            </button>

            {/* Cabeçalho */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
              <img src={modalHero.image} alt={modalHero.name} style={{ width: '100px', height: '100px', borderRadius: '20px', border: `2px solid ${modalHero.color}`, objectFit: 'cover' }} />
              <div>
                <h2 style={{ color: '#fff', margin: '0 0 10px 0', fontSize: '36px' }}>{modalHero.name}</h2>
              </div>
            </div>

            {/* ABAS DE ROTAS (Mostra os botões se tiver builds múltiplas, se não, mostra só uma tag) */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '25px', flexWrap: 'wrap', background: 'rgba(0,0,0,0.3)', padding: '6px', borderRadius: '12px', width: 'fit-content', border: '1px solid rgba(255,255,255,0.05)' }}>
              {(Object.keys(modalHero.builds || {})).concat(
                modalHero.builds ? [] : (Array.isArray(modalHero.role) ? modalHero.role : [modalHero.role])
              ).map((rota, index) => (
                <button
                  key={index}
                  onClick={() => { if (modalHero.builds) { setSelectedModalRoute(rota); setSelectedModalBuild(0); } }}
                  style={{
                    padding: '8px 20px', borderRadius: '8px', border: 'none',
                    background: selectedModalRoute === rota || (!modalHero.builds && index === 0) ? modalHero.color : 'transparent',
                    color: selectedModalRoute === rota || (!modalHero.builds && index === 0) ? '#fff' : '#64748b',
                    fontWeight: 'bold', fontSize: '14px',
                    cursor: modalHero.builds ? 'pointer' : 'default',
                    transition: 'all 0.3s ease',
                  }}
                >
                  {rota}
                </button>
              ))}
            </div>

            <h4 style={{ color: '#fff', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px' }}>
              <span style={{ color: '#f39c12' }}>⚔️</span> Arsenal Recomendado
            </h4>

            {/* RENDERIZAÇÃO INTELIGENTE: Diferencia Heróis Complexos (Augran) de Simples (Agu) */}
            {modalHero.builds ? (
              <>
                {/* Abas de Build Dano / Build Tank */}
                {modalHero.builds[selectedModalRoute]?.length > 1 && (
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                    {modalHero.builds[selectedModalRoute].map((build, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedModalBuild(index)}
                        style={{
                          padding: '6px 18px', borderRadius: '20px',
                          border: `1px solid ${selectedModalBuild === index ? modalHero.color : 'rgba(255,255,255,0.1)'}`,
                          background: selectedModalBuild === index ? `${modalHero.color}20` : 'rgba(0,0,0,0.2)',
                          color: selectedModalBuild === index ? '#fff' : '#94a3b8',
                          fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s'
                        }}
                      >
                        {build.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Equipamentos da Build Selecionada */}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', background: 'rgba(0,0,0,0.3)', padding: '20px', borderRadius: '16px', marginBottom: '25px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  {modalHero.builds[selectedModalRoute]?.[selectedModalBuild]?.equipamentos.map((item, index) => (
                    <img key={index} src={item} alt={`Item ${index + 1}`} style={{ width: '50px', height: '50px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }} />
                  ))}
                </div>

                <h4 style={{ color: '#fff', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px' }}>
                  <span style={{ color: '#e74c3c' }}>🔮</span> Arcanas
                </h4>
                
                {/* Arcanas da Build Selecionada */}
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', background: 'rgba(0,0,0,0.3)', padding: '20px', borderRadius: '16px', marginBottom: '25px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  {modalHero.builds[selectedModalRoute]?.[selectedModalBuild]?.arcanas.map((arcana, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.05)', padding: '8px 12px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <img src={arcana.img} alt={arcana.nome} style={{ width: '25px', height: '25px', borderRadius: '50%' }} />
                      <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff' }}>{arcana.quantidade}x <span style={{ color: '#94a3b8', fontWeight: 'normal' }}>{arcana.nome}</span></span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              // RENDERIZAÇÃO PARA HERÓIS SIMPLES (Agu)
              <>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', background: 'rgba(0,0,0,0.3)', padding: '20px', borderRadius: '16px', marginBottom: '25px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  {modalHero.equipamentos && modalHero.equipamentos.length > 0 ? (
                    modalHero.equipamentos.map((item, index) => (
                      <img key={index} src={item} alt={`Item ${index + 1}`} style={{ width: '50px', height: '50px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }} />
                    ))
                  ) : <span style={{ color: '#64748b', fontSize: '14px' }}>Não cadastrado.</span>}
                </div>

                <h4 style={{ color: '#fff', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px' }}>
                  <span style={{ color: '#e74c3c' }}>🔮</span> Arcanas
                </h4>
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', background: 'rgba(0,0,0,0.3)', padding: '20px', borderRadius: '16px', marginBottom: '25px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  {modalHero.arcanas && modalHero.arcanas.length > 0 ? (
                    modalHero.arcanas.map((arcana, index) => (
                      <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.05)', padding: '8px 12px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <img src={arcana.img} alt={arcana.nome} style={{ width: '25px', height: '25px', borderRadius: '50%' }} />
                        <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff' }}>{arcana.quantidade}x <span style={{ color: '#94a3b8', fontWeight: 'normal' }}>{arcana.nome}</span></span>
                      </div>
                    ))
                  ) : <span style={{ color: '#64748b', fontSize: '14px' }}>Não cadastrado.</span>}
                </div>
              </>
            )}

            {/* Dica de Ouro (Exibida para todos) */}
            <h4 style={{ color: '#fff', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px' }}>
              <span style={{ color: '#3498db' }}>💡</span> Dica de Ouro
            </h4>
            <div style={{ background: 'rgba(52, 152, 219, 0.1)', borderLeft: '4px solid #3498db', padding: '15px', borderRadius: '0 12px 12px 0' }}>
              <p style={{ margin: 0, fontStyle: 'italic', color: '#cbd5e1', lineHeight: '1.5', fontSize: '14px' }}>
                "{modalHero.tips || "Sem dicas adicionais no momento."}"
              </p>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default TierList;
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

  // Função para buscar a imagem do herói pelo nome exato nos Matchups
  const getHeroByName = (name) => {
    return heroesDatabase.find(h => h.name === name);
  };

  const filteredHeroes = heroesDatabase.filter((hero) => {
    const matchesRole = selectedRole === 'Todos' || 
                        (Array.isArray(hero.role) ? hero.role.includes(selectedRole) : hero.role === selectedRole);
    return matchesRole;
  });

  // Função inteligente para abrir o modal e já selecionar a primeira rota/build
  const handleOpenModal = (hero) => {
    setModalHero(hero);
    if (hero.builds) {
      setSelectedModalRoute(Object.keys(hero.builds)[0]); // Pega a primeira rota
      setSelectedModalBuild(0); // Pega a primeira build
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
                color: selectedRole === role ? '#f39c12' : '#94a3b8', fontWeight: 'bold',
                transition: 'all 0.3s'
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
                  .filter(h => {
                    let heroTier;
                    
                    // Se o tier for apenas uma letra (herói simples)
                    if (typeof h.tier === 'string') {
                      heroTier = h.tier;
                    } 
                    // Se o tier for um objeto (herói multi-rotas)
                    else if (typeof h.tier === 'object') {
                      if (selectedRole === 'Todos') {
                        heroTier = h.tier.geral; // Usa o tier geral na tela principal
                      } else {
                        heroTier = h.tier[selectedRole]; // Puxa o tier exato da rota clicada
                      }
                    }
                    
                    return heroTier === tier.letter;
                  })
                  .map(hero => (
                    <div 
                      key={hero.id} 
                      onClick={() => handleOpenModal(hero)} 
                      style={{ width: '60px', textAlign: 'center', cursor: 'pointer' }}
                    >
                      <img 
                        loading="lazy"
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
      {/* MODAL DE DETALHES DO HERÓI                 */}
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
              <img loading="lazy" src={modalHero.image} alt={modalHero.name} style={{ width: '100px', height: '100px', borderRadius: '20px', border: `2px solid ${modalHero.color}`, objectFit: 'cover' }} />
              <div>
                <h2 style={{ color: '#fff', margin: '0 0 10px 0', fontSize: '36px' }}>{modalHero.name}</h2>
              </div>
            </div>

            {/* ABAS DE ROTAS */}
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

            {modalHero.builds ? (
              <>
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

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', background: 'rgba(0,0,0,0.3)', padding: '20px', borderRadius: '16px', marginBottom: '25px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  {modalHero.builds[selectedModalRoute]?.[selectedModalBuild]?.equipamentos.map((item, index) => (
                    <img loading="lazy" key={index} src={item} alt={`Item ${index + 1}`} style={{ width: '50px', height: '50px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }} />
                  ))}
                </div>

                <h4 style={{ color: '#fff', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px' }}>
                  <span style={{ color: '#e74c3c' }}>🔮</span> Arcanas
                </h4>
                
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', background: 'rgba(0,0,0,0.3)', padding: '20px', borderRadius: '16px', marginBottom: '25px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  {modalHero.builds[selectedModalRoute]?.[selectedModalBuild]?.arcanas.map((arcana, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.05)', padding: '8px 12px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <img loading="lazy" src={arcana.img} alt={arcana.nome} style={{ width: '25px', height: '25px', borderRadius: '50%' }} />
                      <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff' }}>{arcana.quantidade}x <span style={{ color: '#94a3b8', fontWeight: 'normal' }}>{arcana.nome}</span></span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', background: 'rgba(0,0,0,0.3)', padding: '20px', borderRadius: '16px', marginBottom: '25px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  {modalHero.equipamentos && modalHero.equipamentos.length > 0 ? (
                    modalHero.equipamentos.map((item, index) => (
                      <img loading="lazy" key={index} src={item} alt={`Item ${index + 1}`} style={{ width: '50px', height: '50px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }} />
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
                        <img loading="lazy" src={arcana.img} alt={arcana.nome} style={{ width: '25px', height: '25px', borderRadius: '50%' }} />
                        <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff' }}>{arcana.quantidade}x <span style={{ color: '#94a3b8', fontWeight: 'normal' }}>{arcana.nome}</span></span>
                      </div>
                    ))
                  ) : <span style={{ color: '#64748b', fontSize: '14px' }}>Não cadastrado.</span>}
                </div>
              </>
            )}

            {/* ========================================== */}
            {/* MATCHUPS: SINERGIAS E COUNTERS NO MODAL    */}
            {/* ========================================== */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginTop: '10px' }}>
              
              {/* SINERGIA (BEST WITH) */}
              {modalHero.bestWith && modalHero.bestWith.length > 0 && (
                <div style={{ background: 'rgba(46, 213, 115, 0.05)', border: '1px solid rgba(46, 213, 115, 0.2)', borderRadius: '16px', padding: '16px' }}>
                  <h4 style={{ color: '#fff', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                    <span style={{ color: '#2ed573' }}>🤝</span> Forte contra
                  </h4>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {modalHero.bestWith.map((heroName, index) => {
                      const ally = getHeroByName(heroName);
                      if (!ally) return null;
                      return (
                        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.4)', padding: '4px 10px 4px 4px', borderRadius: '30px', border: '1px solid rgba(46, 213, 115, 0.3)' }}>
                          <img loading="lazy" src={ally.image} alt={ally.name} style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
                          <span style={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}>{ally.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* COUNTERS (BAD AGAINST) */}
              {modalHero.badAgainst && modalHero.badAgainst.length > 0 && (
                <div style={{ background: 'rgba(231, 76, 60, 0.05)', border: '1px solid rgba(231, 76, 60, 0.2)', borderRadius: '16px', padding: '16px' }}>
                  <h4 style={{ color: '#fff', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                    <span style={{ color: '#e74c3c' }}>⚠️</span> Fraco contra
                  </h4>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {modalHero.badAgainst.map((heroName, index) => {
                      const enemy = getHeroByName(heroName);
                      if (!enemy) return null;
                      return (
                        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.4)', padding: '4px 10px 4px 4px', borderRadius: '30px', border: '1px solid rgba(231, 76, 60, 0.3)' }}>
                          <img loading="lazy" src={enemy.image} alt={enemy.name} style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
                          <span style={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}>{enemy.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default TierList;
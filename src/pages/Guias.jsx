import React, { useState } from 'react';
import { heroesDatabase } from '../data/heroesDatabase';


function Guias() {
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [selectedBuild, setSelectedBuild] = useState(0);
  const [selectedHero, setSelectedHero] = useState(null);
  const [searchTerm, setSearchTerm] = useState(''); // Estado para a barra de pesquisa
  const [selectedRole, setSelectedRole] = useState('Todos'); // Estado para os filtros de rota
  const heroesData = heroesDatabase;

  

  // Lista de rotas disponíveis para gerar os botões de filtro automaticamente
  const roles = ['Todos', 'Rota Superior','Selva', 'Rota do Meio', 'Atirador', 'Suporte' ];

  // Lógica que filtra os heróis com base na pesquisa E no filtro selecionado
  const filteredHeroes = heroesData.filter((hero) => {
    const matchesSearch = hero.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    // LÓGICA À PROVA DE BALAS: Verifica 'roles' (array), 'role' (array) ou 'role' (texto)
    const matchesRole = selectedRole === 'Todos' || 
                        (hero.roles && hero.roles.includes(selectedRole)) || 
                        (Array.isArray(hero.role) ? hero.role.includes(selectedRole) : hero.role === selectedRole);
                        
    return matchesSearch && matchesRole;
  });
  
   const getRoleClass = (role) => {
    if (role === 'Selva') return 'rbadge rb-selva';
    if (role === 'Atirador') return 'rbadge rb-atirador';
    if (role === 'Rota do Meio') return 'rbadge rb-meio';
    if (role === 'Suporte') return 'rbadge rb-suporte';
    if (role === 'Rota Superior') return 'rbadge rb-top';
    return 'rbadge';
  };

  // Função para dar uma cor única para cada rota
  const getRoleColor = (roleName) => {
    switch (roleName) {
      case 'Rota Superior': return '#3498db'; // Azul
      case 'Selva': return '#27ae60';         // Verde
      case 'Rota do Meio': return '#9b59b6';  // Roxo
      case 'Atirador': return '#e67e22';      // Laranja
      case 'Suporte': return '#1abc9c';       // Verde água
      default: return '#7f8c8d';              // Cinza padrão
    }
  };

  // Tela de Detalhes do Herói
  if (selectedHero) {
    return (
      <div style={{ minHeight: '100vh', background: '#0b0f19', color: '#e2e8f0', padding: '40px 20px', fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <button 
            onClick={() => setSelectedHero(null)}
            style={{ padding: '10px 20px', marginBottom: '25px', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.3s ease' }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#94a3b8'; }}
          >
            ← Voltar ao Arsenal
          </button>
          
          <div style={{ background: 'linear-gradient(145deg, #111827, #0b0f19)', padding: '40px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: `0 10px 40px ${selectedHero.color}20`, borderTop: `4px solid ${selectedHero.color}`, display: 'flex', gap: '40px', flexWrap: 'wrap', position: 'relative', overflow: 'hidden' }}>
            
            {/* Efeito de brilho de fundo na cor do herói */}
            <div style={{ position: 'absolute', top: '-50px', left: '-50px', width: '200px', height: '200px', background: selectedHero.color, filter: 'blur(100px)', opacity: '0.15', zIndex: 0, pointerEvents: 'none' }}></div>

            {/* Foto do Herói */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', zIndex: 1 }}>
              <img 
                src={selectedHero.image} 
                alt={selectedHero.name} 
                style={{ width: '180px', height: '180px', borderRadius: '20px', objectFit: 'cover', boxShadow: `0 0 25px ${selectedHero.color}40`, border: `2px solid ${selectedHero.color}` }}
              />
            </div>

            <div style={{ flex: 1, minWidth: '280px', zIndex: 1 }}>
              <h2 style={{ margin: '0 0 15px 0', fontSize: '38px', color: '#fff', textShadow: '0 2px 10px rgba(0,0,0,0.5)', letterSpacing: '-0.5px' }}>{selectedHero.name}</h2>
              
              {/* Tabs de Rota (Estilo HUD de Jogo) */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '25px', flexWrap: 'wrap', background: 'rgba(0,0,0,0.3)', padding: '6px', borderRadius: '12px', width: 'fit-content', border: '1px solid rgba(255,255,255,0.05)' }}>
                {(Object.keys(selectedHero.builds || {})).concat(
                  selectedHero.builds ? [] : (Array.isArray(selectedHero.role) ? selectedHero.role : [selectedHero.role])
                ).map((rota, index) => (
                  <button
                    key={index}
                    onClick={() => { if (selectedHero.builds) { setSelectedRoute(rota); setSelectedBuild(0); } }}
                    style={{
                      padding: '8px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      background: selectedRoute === rota ? selectedHero.color : 'transparent',
                      color: selectedRoute === rota ? '#fff' : '#64748b',
                      fontWeight: 'bold',
                      fontSize: '14px',
                      cursor: selectedHero.builds ? 'pointer' : 'default',
                      boxShadow: selectedRoute === rota ? `0 4px 15px ${selectedHero.color}50` : 'none',
                      transition: 'all 0.3s ease',
                      textShadow: selectedRoute === rota ? '0 1px 3px rgba(0,0,0,0.5)' : 'none'
                    }}
                  >
                    {rota}
                  </button>
                ))}
              </div>

              <h4 style={{ color: '#fff', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px' }}>
                <span style={{ color: '#f39c12' }}>⚔️</span> Arsenal Recomendado
              </h4>

              {selectedHero.builds ? (
                <>
                  {selectedHero.builds[selectedRoute]?.length > 1 && (
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                      {selectedHero.builds[selectedRoute].map((build, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedBuild(index)}
                          style={{
                            padding: '6px 18px',
                            borderRadius: '20px',
                            border: `1px solid ${selectedBuild === index ? selectedHero.color : 'rgba(255,255,255,0.1)'}`,
                            background: selectedBuild === index ? `${selectedHero.color}20` : 'rgba(0,0,0,0.2)',
                            color: selectedBuild === index ? '#fff' : '#94a3b8',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            fontSize: '13px',
                            transition: 'all 0.2s'
                          }}
                        >
                          {build.label}
                        </button>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '16px', marginBottom: '30px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    {selectedHero.builds[selectedRoute]?.[selectedBuild]?.equipamentos.map((item, index) => (
                      <img key={index} src={item} alt={`Item ${index + 1}`} style={{ width: '55px', height: '55px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', transition: 'transform 0.2s' }} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.15) translateY(-5px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1) translateY(0)'} />
                    ))}
                  </div>

                  <h4 style={{ color: '#fff', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px' }}>
                    <span style={{ color: '#e74c3c' }}>🔮</span> Arcanas
                  </h4>
                  <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '16px', marginBottom: '30px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    {selectedHero.builds[selectedRoute]?.[selectedBuild]?.arcanas.map((arcana, index) => (
                      <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.05)', padding: '8px 16px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <img src={arcana.img} alt={arcana.nome} style={{ width: '35px', height: '35px', borderRadius: '50%', boxShadow: '0 0 10px rgba(0,0,0,0.5)' }} />
                        <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>{arcana.quantidade}x <span style={{ color: '#94a3b8', fontWeight: 'normal' }}>{arcana.nome}</span></span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '16px', marginBottom: '30px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    {selectedHero.equipamentos?.map((item, index) => (
                      <img key={index} src={item} alt={`Item ${index + 1}`} style={{ width: '55px', height: '55px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', transition: 'transform 0.2s' }} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.15) translateY(-5px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1) translateY(0)'} />
                    ))}
                  </div>
                  <h4 style={{ color: '#fff', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px' }}>
                    <span style={{ color: '#e74c3c' }}>🔮</span> Arcanas
                  </h4>
                  <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '16px', marginBottom: '30px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    {selectedHero.arcanas?.map((arcana, index) => (
                      <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.05)', padding: '8px 16px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <img src={arcana.img} alt={arcana.nome} style={{ width: '35px', height: '35px', borderRadius: '50%', boxShadow: '0 0 10px rgba(0,0,0,0.5)' }} />
                        <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>{arcana.quantidade}x <span style={{ color: '#94a3b8', fontWeight: 'normal' }}>{arcana.nome}</span></span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <h4 style={{ color: '#fff', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px' }}>
                <span style={{ color: '#3498db' }}>💡</span> Dica de Ouro
              </h4>
              <div style={{ background: 'rgba(52, 152, 219, 0.1)', borderLeft: '4px solid #3498db', padding: '15px 20px', borderRadius: '0 12px 12px 0' }}>
                <p style={{ margin: 0, fontStyle: 'italic', color: '#cbd5e1', lineHeight: '1.6' }}>"{selectedHero.tips}"</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Tela Principal (Lista com Filtros e Busca)
  return (
    <div style={{ minHeight: '100vh', background: '#0b0f19', color: '#e2e8f0', padding: '50px 20px', fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '50px' }}>
          <h2 style={{ fontSize: '42px', color: '#fff', marginBottom: '15px', letterSpacing: '-1px', textShadow: '0 2px 15px rgba(243, 156, 18, 0.3)' }}>Banco de Dados HoK</h2>
          <p style={{ color: '#94a3b8', fontSize: '18px' }}>Estratégias, builds e arcanas para dominar o King's Rift.</p>
        </div>

        {/* Barra de Pesquisa Estilo Cyber/Gamer */}
        <div style={{ marginBottom: '35px', maxWidth: '650px', margin: '0 auto 35px auto', position: 'relative' }}>
          <input 
            type="text"
            placeholder="Buscar herói..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '18px 25px 18px 50px',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(0,0,0,0.4)',
              fontSize: '16px',
              color: '#fff',
              boxSizing: 'border-box',
              outline: 'none',
              boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)',
              transition: 'all 0.3s ease'
            }}
            onFocus={(e) => { e.target.style.border = '1px solid #f39c12'; e.target.style.boxShadow = '0 0 20px rgba(243, 156, 18, 0.2), inset 0 2px 10px rgba(0,0,0,0.5)'; }}
            onBlur={(e) => { e.target.style.border = '1px solid rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'inset 0 2px 10px rgba(0,0,0,0.5)'; }}
          />
          <span style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', fontSize: '20px', opacity: 0.5 }}>🔎</span>
        </div>

        {/* Filtros em Estilo HUD */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '50px', justifyContent: 'center' }}>
          {roles.map((role) => (
            <button
              key={role}
              onClick={() => setSelectedRole(role)}
              style={{
                padding: '10px 24px',
                borderRadius: '12px',
                border: selectedRole === role ? '1px solid #f39c12' : '1px solid rgba(255,255,255,0.1)',
                background: selectedRole === role ? 'rgba(243, 156, 18, 0.15)' : 'rgba(0,0,0,0.3)',
                color: selectedRole === role ? '#f39c12' : '#94a3b8',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: selectedRole === role ? '0 0 15px rgba(243, 156, 18, 0.3)' : 'none',
                fontSize: '14px',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}
              onMouseOver={(e) => { if(selectedRole !== role) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#fff'; } }}
              onMouseOut={(e) => { if(selectedRole !== role) { e.currentTarget.style.background = 'rgba(0,0,0,0.3)'; e.currentTarget.style.color = '#94a3b8'; } }}
            >
              {role}
            </button>
          ))}
        </div>

        {/* Grade de Heróis Escura com Efeitos de Neon */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
          gap: '25px' 
        }}>
          {filteredHeroes.map((hero) => (
            <div 
              key={hero.id}
              onClick={() => {
                setSelectedHero(hero);
                setSelectedBuild(0);
                if (hero.builds) {
                  setSelectedRoute(Object.keys(hero.builds)[0]);
                } else {
                  setSelectedRoute(null);
                }
              }}
              style={{ 
                background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)', 
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '16px', 
                padding: '20px', 
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                boxShadow: '0 10px 20px rgba(0,0,0,0.3)',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.border = `1px solid ${hero.color}50`;
                e.currentTarget.style.boxShadow = `0 15px 30px rgba(0,0,0,0.5), 0 0 20px ${hero.color}20`;
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.border = '1px solid rgba(255,255,255,0.05)';
                e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.3)';
              }}
            >
              <img 
                src={hero.image} 
                alt={hero.name} 
                style={{ width: '100%', height: '160px', borderRadius: '12px', objectFit: 'cover', marginBottom: '15px', border: '1px solid rgba(0,0,0,0.5)' }}
              />
              <h3 style={{ margin: '0 0 12px 0', fontSize: '20px', color: '#fff', fontWeight: 'bold', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{hero.name}</h3>
              
              {/* O segredo da cor está aqui dentro: puxando a cor específica com o 'getRoleColor(r)' */}
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                {(hero.roles || (Array.isArray(hero.role) ? hero.role : [hero.role])).map((r, index) => {
                  const corDaRota = getRoleColor(r);
                  return r && (
                    <span key={index} style={{ fontSize: '11px', color: '#fff', background: corDaRota, padding: '4px 10px', borderRadius: '6px', fontWeight: 'bold', whiteSpace: 'nowrap', boxShadow: `0 2px 8px ${corDaRota}60`, textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>
                      {r}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}

          {filteredHeroes.length === 0 && (
            <div style={{ gridColumn: '1 / -1', padding: '60px', color: '#64748b', textAlign: 'center', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#fff' }}>Herói não encontrado</h3>
              <p style={{ margin: 0 }}>Nenhum herói corresponde à sua busca no banco de dados.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Guias;
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../services/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const generateAvatarSVG = (nickname) => {
  const initials = nickname.substring(0, 2).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 150" width="150" height="150">
    <rect width="150" height="150" fill="#f39c12" />
    <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-size="64px" font-weight="bold">
      ${initials}
    </text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

/**
 * Salva o consentimento LGPD no Firestore.
 * - users/{uid}.lgpdConsent     → registro atual (fácil de consultar)
 * - users/{uid}/consentHistory  → subcoleção imutável (histórico legal)
 */
const salvarConsentimento = async (uid) => {
  const consentData = {
    acceptedAt: serverTimestamp(), // timestamp do servidor, nunca do cliente
    policyVersion: '1.0',
    method: 'checkbox_modal',
    userAgent: navigator.userAgent,
  };

  const userRef = doc(db, 'users', uid);

  // Atualiza o campo lgpdConsent no documento do usuário
  await setDoc(userRef, { lgpdConsent: consentData }, { merge: true });

  // Adiciona entrada no histórico imutável
  await addDoc(collection(db, 'users', uid, 'consentHistory'), consentData);
};

const checkAndCreateUserProfile = async (user) => {
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    const nickname = user.email.split('@')[0];
    await setDoc(userRef, {
      id: user.uid,
      name: nickname,
      avatar: generateAvatarSVG(nickname),
      role: 'Não definido',
      points: 0,
      wins: 0,
      losses: 0,
      discordId: null,
      discordUsername: null,
      discordAvatar: null,
      createdAt: new Date().toISOString(),
    });
  }
};

// ---------------------------------------------------------------------------
// Estilos compartilhados
// ---------------------------------------------------------------------------

const cardStyle = {
  background: 'linear-gradient(145deg, #111827, #0b0f19)',
  padding: '50px 40px',
  borderRadius: '24px',
  border: '1px solid rgba(255,255,255,0.05)',
  boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
  borderTop: '4px solid #f39c12',
  width: '100%',
  maxWidth: '400px',
  zIndex: 1,
  position: 'relative',
};

const inputStyle = {
  width: '100%',
  padding: '15px',
  borderRadius: '12px',
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(0,0,0,0.3)',
  color: '#fff',
  fontSize: '16px',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'all 0.3s',
};

// ---------------------------------------------------------------------------
// Modal de Termos LGPD
// ---------------------------------------------------------------------------

function TermosModal({ onAceitar, onRecusar }) {
  const [aceito, setAceito] = useState(false);
  const scrollRef = useRef(null);

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.82)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '16px',
    }}>
      <div style={{
        background: '#111827',
        border: '1px solid rgba(255,255,255,0.08)',
        borderTop: '3px solid #f39c12',
        borderRadius: '20px',
        width: '100%', maxWidth: '540px',
        display: 'flex', flexDirection: 'column',
        maxHeight: '90vh',
        boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
      }}>

        {/* Cabeçalho */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'rgba(243,156,18,0.15)', border: '1px solid rgba(243,156,18,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
            }}>🛡️</div>
            <div>
              <p style={{ margin: 0, fontWeight: 600, fontSize: '15px', color: '#fff' }}>
                Privacidade e proteção de dados
              </p>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                Política LGPD · HoK HuB · v1.0
              </p>
            </div>
          </div>
        </div>

        {/* Conteúdo rolável */}
        <div ref={scrollRef} style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          <p style={{ color: '#94a3b8', fontSize: '13px', lineHeight: 1.65, marginTop: 0 }}>
            Antes de criar sua conta, leia como tratamos seus dados, conforme a{' '}
            <strong style={{ color: '#cbd5e1' }}>Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018)</strong>.
          </p>

          <p style={{ color: '#64748b', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '16px 0 8px' }}>
            Dados que coletamos
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
            {['Nome / nickname', 'E-mail', 'ID do Discord', 'Partidas e MMR', 'IP e dados técnicos'].map(d => (
              <span key={d} style={{
                fontSize: '12px', color: '#93c5fd',
                background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)',
                borderRadius: '8px', padding: '4px 10px',
              }}>{d}</span>
            ))}
          </div>

          <p style={{ color: '#94a3b8', fontSize: '13px', lineHeight: 1.65 }}>
            Esses dados são usados exclusivamente para autenticação, matchmaking competitivo,
            exibição de estatísticas e notificações de partidas.{' '}
            <strong style={{ color: '#cbd5e1' }}>Nenhum dado é vendido ou compartilhado com terceiros para fins comerciais.</strong>
          </p>

          <p style={{ color: '#64748b', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '16px 0 8px' }}>
            Seus direitos (Art. 18 da LGPD)
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '16px' }}>
            {[
              'Acessar seus dados',
              'Corrigir informações',
              'Solicitar exclusão',
              'Revogar consentimento',
              'Portabilidade dos dados',
              'Confirmar o tratamento',
            ].map(d => (
              <div key={d} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#94a3b8' }}>
                <span style={{ color: '#4ade80', fontSize: '14px' }}>✓</span> {d}
              </div>
            ))}
          </div>

          <p style={{ color: '#94a3b8', fontSize: '13px', lineHeight: 1.65, marginBottom: 0 }}>
            Dados mantidos enquanto a conta estiver ativa. Ao solicitar exclusão, removemos em até 30 dias.
            Dúvidas: <strong style={{ color: '#f39c12' }}>privacidade@hokhub.com.br</strong>
          </p>
        </div>

        {/* Rodapé */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', marginBottom: '14px' }}>
            <input
              type="checkbox"
              checked={aceito}
              onChange={e => setAceito(e.target.checked)}
              style={{ marginTop: '2px', width: '15px', height: '15px', flexShrink: 0, cursor: 'pointer', accentColor: '#f39c12' }}
            />
            <span style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.5 }}>
              Li e concordo com a{' '}
              <a href="/termos" target="_blank" rel="noopener noreferrer" style={{ color: '#f39c12', textDecoration: 'underline' }}>
                Política de Privacidade
              </a>{' '}
              e o tratamento dos meus dados conforme descrito acima.
            </span>
          </label>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              onClick={onRecusar}
              style={{
                padding: '8px 16px', borderRadius: '10px', fontSize: '13px',
                border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
                color: '#64748b', cursor: 'pointer',
              }}
            >
              Recusar
            </button>
            <button
              onClick={onAceitar}
              disabled={!aceito}
              style={{
                padding: '8px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
                border: 'none', background: aceito ? '#f39c12' : 'rgba(243,156,18,0.3)',
                color: aceito ? '#fff' : 'rgba(255,255,255,0.3)',
                cursor: aceito ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
              }}
            >
              Criar conta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [message, setMessage] = useState('');
  const [waitingVerification, setWaitingVerification] = useState(false);
  const [showTermos, setShowTermos] = useState(false);

  const navigate = useNavigate();

  // Polling: checa a cada 3s se o e-mail foi verificado
  useEffect(() => {
    if (!waitingVerification) return;
    const interval = setInterval(async () => {
      const user = auth.currentUser;
      if (!user) return;
      await user.reload();
      if (user.emailVerified) {
        clearInterval(interval);
        navigate('/');
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [waitingVerification, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    // No cadastro, abre o modal de termos antes de criar a conta
    if (isRegistering) {
      setShowTermos(true);
      return;
    }

    // Login normal
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      if (!userCredential.user.emailVerified) {
        await auth.signOut();
        setMessage('Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada e a pasta de SPAM.');
        return;
      }
      await checkAndCreateUserProfile(userCredential.user);
      setMessage('Login realizado com sucesso!');
      setTimeout(() => navigate('/'), 1000);
    } catch (error) {
      console.error('Erro na autenticação:', error.code);
      if (error.code === 'auth/email-already-in-use') setMessage('Este e-mail já está em uso.');
      else if (error.code === 'auth/invalid-credential') setMessage('E-mail ou senha incorretos.');
      else if (error.code === 'auth/weak-password') setMessage('A senha deve ter pelo menos 6 caracteres.');
      else setMessage('Ocorreu um erro. Tente novamente.');
    }
  };

  // Chamado quando o usuário aceita os termos no modal
  const handleAceitarTermos = async () => {
    setShowTermos(false);
    setMessage('');

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      // 1. Cria o perfil primeiro (documento pai precisa existir antes da subcoleção)
      await checkAndCreateUserProfile(userCredential.user);

      // 2. Salva o consentimento LGPD na subcoleção
      await salvarConsentimento(userCredential.user.uid);

      // 3. Envia e-mail de verificação
      await sendEmailVerification(userCredential.user);

      setWaitingVerification(true);
    } catch (error) {
      console.error('Erro ao criar conta:', error.code);
      if (error.code === 'auth/email-already-in-use') setMessage('Este e-mail já está em uso.');
      else if (error.code === 'auth/weak-password') setMessage('A senha deve ter pelo menos 6 caracteres.');
      else setMessage('Ocorreu um erro. Tente novamente.');
    }
  };

  const handleRecusarTermos = () => {
    setShowTermos(false);
    setMessage('Para criar uma conta é necessário aceitar a política de privacidade.');
  };

  const handleResetPassword = async () => {
    if (!email) {
      setMessage('Por favor, digite seu e-mail no campo acima para recuperar a senha.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('E-mail de recuperação enviado! Verifique sua caixa de entrada (e SPAM).');
    } catch (error) {
      console.error('Erro ao redefinir senha:', error.code);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-email') {
        setMessage('E-mail não encontrado ou inválido.');
      } else {
        setMessage('Erro ao enviar e-mail. Tente novamente mais tarde.');
      }
    }
  };

  // Tela de espera após cadastro
  if (waitingVerification) {
    return (
      <div style={{ minHeight: '100vh', background: '#0b0f19', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
        <div style={{ position: 'absolute', width: '300px', height: '300px', background: '#f39c12', filter: 'blur(150px)', opacity: '0.15', zIndex: 0, pointerEvents: 'none' }} />
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          <div style={{ fontSize: '56px', marginBottom: '20px' }}>📬</div>
          <h2 style={{ fontSize: '26px', color: '#fff', margin: '0 0 12px 0', letterSpacing: '-0.5px' }}>Verifique seu e-mail</h2>
          <p style={{ color: '#94a3b8', lineHeight: '1.7', marginBottom: '24px' }}>
            Enviamos um link para <span style={{ color: '#f39c12', fontWeight: 'bold' }}>{email}</span>.
            {' '}Clique nele e você entrará automaticamente.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#64748b', fontSize: '13px' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#f39c12', animation: 'pulse 1.5s infinite' }} />
            Aguardando verificação...
          </div>
          <button
            onClick={() => { setWaitingVerification(false); setIsRegistering(false); }}
            style={{ marginTop: '30px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '13px' }}
            onMouseOver={e => e.currentTarget.style.color = '#94a3b8'}
            onMouseOut={e => e.currentTarget.style.color = '#64748b'}
          >
            Voltar para o login
          </button>
        </div>
        <style>{`@keyframes pulse { 0% { opacity: 0.4; } 50% { opacity: 1; } 100% { opacity: 0.4; } }`}</style>
      </div>
    );
  }

  return (
    <>
      {showTermos && (
        <TermosModal onAceitar={handleAceitarTermos} onRecusar={handleRecusarTermos} />
      )}

      <div style={{ minHeight: '100vh', background: '#0b0f19', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
        <div style={{ position: 'absolute', width: '300px', height: '300px', background: '#f39c12', filter: 'blur(150px)', opacity: '0.15', zIndex: 0, pointerEvents: 'none' }} />

        <div style={cardStyle}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h2 style={{ fontSize: '32px', color: '#fff', margin: '0 0 10px 0', letterSpacing: '-1px' }}>
              HoK <span style={{ color: '#f39c12' }}>HuB</span>
            </h2>
            <p style={{ color: '#94a3b8', margin: 0 }}>
              {isRegistering ? 'Cadastre-se para jogar a Liga' : 'Acesse sua conta para o Hub Competitivo'}
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: '#cbd5e1', fontWeight: 'bold', fontSize: '14px' }}>E-mail</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com" required
                style={inputStyle}
                onFocus={e => e.target.style.border = '1px solid #f39c12'}
                onBlur={e => e.target.style.border = '1px solid rgba(255,255,255,0.1)'}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: '#cbd5e1', fontWeight: 'bold', fontSize: '14px' }}>Senha</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required={isRegistering}
                style={inputStyle}
                onFocus={e => e.target.style.border = '1px solid #f39c12'}
                onBlur={e => e.target.style.border = '1px solid rgba(255,255,255,0.1)'}
              />
              {!isRegistering && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '12px', cursor: 'pointer', padding: 0 }}
                    onMouseOver={e => e.currentTarget.style.color = '#f39c12'}
                    onMouseOut={e => e.currentTarget.style.color = '#94a3b8'}
                  >
                    Esqueci minha senha
                  </button>
                </div>
              )}
            </div>

            {message && (
              <div style={{
                padding: '10px', borderRadius: '8px',
                background: message.includes('sucesso') || message.includes('Verifique') || message.includes('enviado') ? 'rgba(39,174,96,0.1)' : 'rgba(231,76,60,0.1)',
                border: `1px solid ${message.includes('sucesso') || message.includes('Verifique') || message.includes('enviado') ? '#27ae60' : '#e74c3c'}`,
                color: message.includes('sucesso') || message.includes('Verifique') || message.includes('enviado') ? '#2ecc71' : '#e74c3c',
                textAlign: 'center', fontSize: '14px', fontWeight: 'bold',
              }}>
                {message}
              </div>
            )}

            <button
              type="submit"
              style={{ padding: '16px', marginTop: '10px', background: '#f39c12', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', transition: 'all 0.3s ease', boxShadow: '0 4px 15px rgba(243,156,18,0.4)' }}
              onMouseOver={e => { e.currentTarget.style.background = '#e67e22'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseOut={e => { e.currentTarget.style.background = '#f39c12'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {isRegistering ? 'Continuar' : 'Entrar'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '25px' }}>
            <button
              onClick={() => { setIsRegistering(!isRegistering); setMessage(''); }}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '14px' }}
              onMouseOver={e => e.currentTarget.style.color = '#f39c12'}
              onMouseOut={e => e.currentTarget.style.color = '#94a3b8'}
            >
              {isRegistering ? 'Já tem uma conta? Faça login' : 'Não tem conta? Cadastre-se agora'}
            </button>
          </div>
          {/* ========================================== */}
          {/* NOVO BOTÃO: ACESSO LIMITADO SEM LOGIN      */}
          {/* ========================================== */}
          <div style={{ textAlign: 'center', marginTop: '15px', paddingTop: '15px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <button
              type="button"
              onClick={() => navigate('/')}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: '#64748b', 
                cursor: 'pointer', 
                fontSize: '13px', 
                textDecoration: 'underline',
                transition: 'color 0.2s ease'
              }}
              onMouseOver={e => e.currentTarget.style.color = '#cbd5e1'}
              onMouseOut={e => e.currentTarget.style.color = '#64748b'}
            >
              Continuar sem login (Acesso limitado ao Arsenal e Tier List)
            </button>
          </div>

        </div>
      </div>
    </>
  );
}

export default Login;

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../services/firebase'; // <-- Adicionamos o 'db' aqui
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore'; // <-- Importamos as funções do Firestore

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [message, setMessage] = useState('');

  const navigate = useNavigate();

  // FUNÇÃO NOVA: Checa e cria o perfil no banco de dados
  const checkAndCreateUserProfile = async (user) => {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      // Se não existir, cria o documento do jogador!
      // Pegamos o que vem antes do @ no e-mail para ser o nome provisório
      const nickname = user.email.split('@')[0]; 
      
      await setDoc(userRef, {
        id: user.uid,
        name: nickname,
        avatar: `https://via.placeholder.com/150/3498db/ffffff?text=${nickname.substring(0, 2).toUpperCase()}`,
        role: "Não definido",
        points: 1500, // MMR Inicial
        wins: 0,
        losses: 0,
        createdAt: new Date().toISOString()
      });
      console.log("Perfil criado no Firestore com sucesso!");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      let userCredential;

      if (isRegistering) {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await checkAndCreateUserProfile(userCredential.user); // <-- Salva no banco
        
        setMessage("Conta criada com sucesso!");
        setTimeout(() => { navigate('/'); }, 1500);
      } else {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
        await checkAndCreateUserProfile(userCredential.user); // <-- Salva/Verifica no banco
        
        setMessage("Login realizado com sucesso!");
        setTimeout(() => { navigate('/'); }, 1000);
      }
    } catch (error) {
      console.error("Erro na autenticação:", error.code);
      if (error.code === 'auth/email-already-in-use') {
        setMessage("Este e-mail já está em uso.");
      } else if (error.code === 'auth/invalid-credential') {
        setMessage("E-mail ou senha incorretos.");
      } else if (error.code === 'auth/weak-password') {
        setMessage("A senha deve ter pelo menos 6 caracteres.");
      } else {
        setMessage("Ocorreu um erro. Tente novamente.");
      }
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0b0f19', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
      
      {/* Efeito de brilho no fundo */}
      <div style={{ position: 'absolute', width: '300px', height: '300px', background: '#f39c12', filter: 'blur(150px)', opacity: '0.15', zIndex: 0, pointerEvents: 'none' }}></div>

      <div style={{ background: 'linear-gradient(145deg, #111827, #0b0f19)', padding: '50px 40px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 10px 40px rgba(0,0,0,0.5)', borderTop: '4px solid #f39c12', width: '100%', maxWidth: '400px', zIndex: 1, position: 'relative' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h2 style={{ fontSize: '32px', color: '#fff', margin: '0 0 10px 0', letterSpacing: '-1px' }}>HoK <span style={{ color: '#f39c12' }}>HuB</span></h2>
          <p style={{ color: '#94a3b8', margin: 0 }}>
            {isRegistering ? 'Cadastre-se para jogar a Liga' : 'Acesse sua conta para o Hub Competitivo'}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: '#cbd5e1', fontWeight: 'bold', fontSize: '14px' }}>E-mail</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: '16px', outline: 'none', boxSizing: 'border-box', transition: 'all 0.3s' }}
              onFocus={(e) => e.target.style.border = '1px solid #f39c12'}
              onBlur={(e) => e.target.style.border = '1px solid rgba(255,255,255,0.1)'}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: '#cbd5e1', fontWeight: 'bold', fontSize: '14px' }}>Senha</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: '16px', outline: 'none', boxSizing: 'border-box', transition: 'all 0.3s' }}
              onFocus={(e) => e.target.style.border = '1px solid #f39c12'}
              onBlur={(e) => e.target.style.border = '1px solid rgba(255,255,255,0.1)'}
            />
          </div>

          {message && (
            <div style={{ padding: '10px', borderRadius: '8px', background: message.includes('sucesso') ? 'rgba(39, 174, 96, 0.1)' : 'rgba(231, 76, 60, 0.1)', border: `1px solid ${message.includes('sucesso') ? '#27ae60' : '#e74c3c'}`, color: message.includes('sucesso') ? '#2ecc71' : '#e74c3c', textAlign: 'center', fontSize: '14px', fontWeight: 'bold' }}>
              {message}
            </div>
          )}

          <button 
            type="submit"
            style={{ padding: '16px', marginTop: '10px', background: '#f39c12', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', transition: 'all 0.3s ease', boxShadow: '0 4px 15px rgba(243, 156, 18, 0.4)' }}
            onMouseOver={(e) => { e.currentTarget.style.background = '#e67e22'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = '#f39c12'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            {isRegistering ? 'Criar Conta' : 'Entrar'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '25px' }}>
          <button 
            onClick={() => { setIsRegistering(!isRegistering); setMessage(''); }}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '14px', transition: 'color 0.2s' }}
            onMouseOver={(e) => e.currentTarget.style.color = '#f39c12'}
            onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}
          >
            {isRegistering ? 'Já tem uma conta? Faça login' : 'Não tem conta? Cadastre-se agora'}
          </button>
        </div>

      </div>
    </div>
  );
}

export default Login;
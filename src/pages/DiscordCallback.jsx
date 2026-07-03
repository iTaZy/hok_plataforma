import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { auth } from '../services/firebase';

function DiscordCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const code = searchParams.get('code');
    const user = auth.currentUser;

    if (!code || !user) {
      navigate('/perfil?discord=error');
      return;
    }

    // Pegamos a URL exata em que o usuário está agora (seja localhost ou site oficial)
    const currentOrigin = encodeURIComponent(window.location.origin);

    // Mandamos o origin junto com os outros dados para o backend
    const functionUrl = `https://us-central1-hok-plataforma.cloudfunctions.net/discordCallback?code=${code}&userId=${user.uid}&origin=${currentOrigin}`;
    window.location.href = functionUrl;
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#0b0f19', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <h2 style={{ color: '#7289da' }}>Conectando ao Discord...</h2>
    </div>
  );
}

export default DiscordCallback;
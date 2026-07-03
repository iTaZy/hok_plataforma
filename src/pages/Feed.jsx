import React, { useState, useEffect, useRef, useCallback } from 'react';
import { auth, db } from '../services/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, getDoc, limit, startAfter, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import PostCard from '../components/PostCard';

const generateAvatarSVG = (name) => {
  const initials = (name || '?').substring(0, 2).toUpperCase();
  const bg = '#f39c12';
  const color = '#ffffff';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 150" width="150" height="150">
    <rect width="150" height="150" fill="${bg}" />
    <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" fill="${color}" font-family="sans-serif" font-size="64px" font-weight="bold">${initials}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const MAX_CHARS = 400;
const PAGE_SIZE = 10;
const POST_COOLDOWN_MS = 30000; // 30 segundos entre posts

function PostSkeleton() {
  return (
    <div style={{ background: 'rgba(15, 23, 42, 0.6)', borderRadius: '20px', padding: '25px', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
        <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'rgba(255,255,255,0.06)', flexShrink: 0, animation: 'shimmer 1.5s infinite' }} />
        <div style={{ flex: 1 }}>
          <div style={{ width: '140px', height: '14px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', marginBottom: '10px', animation: 'shimmer 1.5s infinite' }} />
          <div style={{ width: '100%', height: '12px', borderRadius: '6px', background: 'rgba(255,255,255,0.04)', marginBottom: '8px', animation: 'shimmer 1.5s infinite' }} />
          <div style={{ width: '75%', height: '12px', borderRadius: '6px', background: 'rgba(255,255,255,0.04)', animation: 'shimmer 1.5s infinite' }} />
        </div>
      </div>
    </div>
  );
}

function EmptyFeed() {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗺️</div>
      <h3 style={{ color: '#94a3b8', fontSize: '20px', margin: '0 0 8px 0' }}>Nenhuma publicação ainda</h3>
      <p style={{ margin: 0, fontSize: '15px' }}>Seja o primeiro a postar algo para a comunidade!</p>
    </div>
  );
}

function Feed({ onOpenChat }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [newPostText, setNewPostText] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastVisible, setLastVisible] = useState(null);
  const [cooldownLeft, setCooldownLeft] = useState(0);

  const lastPostTimeRef = useRef(0);
  const cooldownTimerRef = useRef(null);
  const unsubscribePostsRef = useRef(null);

  // Carrega dados do usuário logado
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(userRef);
          if (docSnap.exists()) {
            setCurrentUser({ uid: user.uid, ...docSnap.data() });
          }
        } catch (error) {
          console.error("Erro ao carregar dados do usuário:", error);
        }
      } else {
        setCurrentUser(null);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // Listener em tempo real apenas para a primeira página
  useEffect(() => {
    if (!currentUser) return;

    if (unsubscribePostsRef.current) unsubscribePostsRef.current();

    const q = query(
      collection(db, 'posts'),
      orderBy('createdAt', 'desc'),
      limit(PAGE_SIZE)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setPosts(postsData);
      setLastVisible(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
      setLoadingPosts(false);
    });

    unsubscribePostsRef.current = unsubscribe;
    return () => unsubscribe();
  }, [currentUser]);

  // Cleanup do cooldown timer
  useEffect(() => {
    return () => { if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current); };
  }, []);

  // Carrega mais posts (paginação manual)
  const handleLoadMore = useCallback(async () => {
    if (!lastVisible || loadingMore || !hasMore) return;
    setLoadingMore(true);

    try {
      const q = query(
        collection(db, 'posts'),
        orderBy('createdAt', 'desc'),
        startAfter(lastVisible),
        limit(PAGE_SIZE)
      );
      const snapshot = await getDocs(q);
      const morePosts = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      setPosts(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const newOnes = morePosts.filter(p => !existingIds.has(p.id));
        return [...prev, ...newOnes];
      });
      setLastVisible(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
    } catch (error) {
      console.error("Erro ao carregar mais posts:", error);
    } finally {
      setLoadingMore(false);
    }
  }, [lastVisible, loadingMore, hasMore]);

  // Inicia o contador regressivo de cooldown
  const startCooldown = () => {
    lastPostTimeRef.current = Date.now();
    setCooldownLeft(Math.ceil(POST_COOLDOWN_MS / 1000));

    if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    cooldownTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - lastPostTimeRef.current;
      const remaining = Math.ceil((POST_COOLDOWN_MS - elapsed) / 1000);
      if (remaining <= 0) {
        setCooldownLeft(0);
        clearInterval(cooldownTimerRef.current);
      } else {
        setCooldownLeft(remaining);
      }
    }, 1000);
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPostText.trim() || !currentUser || isPosting) return;
    if (newPostText.length > MAX_CHARS) return;

    // Rate limiting no frontend
    const elapsed = Date.now() - lastPostTimeRef.current;
    if (elapsed < POST_COOLDOWN_MS) {
      const wait = Math.ceil((POST_COOLDOWN_MS - elapsed) / 1000);
      setCooldownLeft(wait);
      return;
    }

    setIsPosting(true);
    try {
      await addDoc(collection(db, 'posts'), {
        type: 'user_post',
        text: newPostText.trim(),
        authorId: currentUser.uid,
        authorName: currentUser.name || 'Jogador',
        authorAvatar: currentUser.avatar || '',
        createdAt: serverTimestamp(),
        likes: 0,
        likedBy: [],
        commentsCount: 0
      });
      setNewPostText('');
      startCooldown();
    } catch (error) {
      console.error("Erro ao criar post:", error);
      alert("Erro ao publicar. Tente novamente.");
    } finally {
      setIsPosting(false);
    }
  };

  const charsLeft = MAX_CHARS - newPostText.length;
  const isOverLimit = charsLeft < 0;
  const isNearLimit = charsLeft <= 40 && !isOverLimit;
  const isOnCooldown = cooldownLeft > 0;

  return (
    <div style={{ minHeight: '100vh', background: '#0b0f19', color: '#e2e8f0', padding: '60px 20px', fontFamily: '"Urbanist", sans-serif' }}>
      <style>{`
        @keyframes shimmer { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }
      `}</style>

      <div style={{ maxWidth: '800px', margin: '0 auto' }}>

        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h2 style={{ fontSize: '48px', color: '#fff', margin: '0 0 10px 0', letterSpacing: '-1px' }}>Comunidade</h2>
          <p style={{ color: '#94a3b8', fontSize: '16px', margin: 0 }}>Compartilhe estratégias, clips e novidades do meta.</p>
        </div>

        {/* Formulário de novo post */}
        {currentUser && (
          <div style={{ background: 'rgba(15, 23, 42, 0.6)', borderRadius: '20px', padding: '25px', marginBottom: '40px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <form onSubmit={handleCreatePost} style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
              <img
                src={currentUser.avatar || generateAvatarSVG(currentUser.name)}
                alt="Avatar"
                style={{ width: '50px', height: '50px', borderRadius: '12px', border: '2px solid #f39c12', objectFit: 'cover', flexShrink: 0 }}
              />
              <div style={{ flex: 1 }}>
                <textarea
                  value={newPostText}
                  onChange={(e) => setNewPostText(e.target.value)}
                  placeholder="O que está acontecendo no meta hoje?"
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.3)',
                    border: `1px solid ${isOverLimit ? '#e74c3c' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: '12px',
                    padding: '15px',
                    color: '#fff',
                    fontSize: '16px',
                    minHeight: '80px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                    transition: 'border 0.2s'
                  }}
                  onFocus={(e) => { if (!isOverLimit) e.target.style.border = '1px solid rgba(243,156,18,0.5)'; }}
                  onBlur={(e) => { e.target.style.border = `1px solid ${isOverLimit ? '#e74c3c' : 'rgba(255,255,255,0.1)'}`; }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                  <span style={{
                    fontSize: '13px',
                    color: isOverLimit ? '#e74c3c' : isNearLimit ? '#f39c12' : isOnCooldown ? '#64748b' : '#64748b',
                    fontWeight: isOverLimit || isNearLimit ? 'bold' : 'normal',
                    transition: 'color 0.2s'
                  }}>
                    {isOnCooldown
                      ? `Aguarde ${cooldownLeft}s para postar novamente`
                      : newPostText.length > 0 ? `${charsLeft} caracteres restantes` : ''}
                  </span>
                  <button
                    type="submit"
                    disabled={!newPostText.trim() || isPosting || isOverLimit || isOnCooldown}
                    style={{
                      background: isOnCooldown ? '#334155' : '#f39c12',
                      color: isOnCooldown ? '#64748b' : '#111827',
                      border: 'none',
                      padding: '10px 24px',
                      borderRadius: '8px',
                      fontWeight: 'bold',
                      fontSize: '14px',
                      cursor: (!newPostText.trim() || isPosting || isOverLimit || isOnCooldown) ? 'not-allowed' : 'pointer',
                      opacity: (!newPostText.trim() || isPosting || isOverLimit) ? 0.5 : 1,
                      transition: 'all 0.2s'
                    }}
                  >
                    {isPosting ? 'Publicando...' : isOnCooldown ? `${cooldownLeft}s` : 'Publicar'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Lista de posts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {loadingPosts ? (
            <>
              <PostSkeleton />
              <PostSkeleton />
              <PostSkeleton />
            </>
          ) : posts.length === 0 ? (
            <EmptyFeed />
          ) : (
            <>
              {posts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUser={currentUser}
                  onOpenChat={onOpenChat}
                />
              ))}

              {/* Botão carregar mais */}
              {hasMore && (
                <div style={{ textAlign: 'center', marginTop: '10px' }}>
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: loadingMore ? '#64748b' : '#94a3b8',
                      padding: '12px 32px',
                      borderRadius: '12px',
                      cursor: loadingMore ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      fontFamily: '"Urbanist", sans-serif',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => { if (!loadingMore) e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                  >
                    {loadingMore ? 'Carregando...' : 'Ver mais posts'}
                  </button>
                </div>
              )}

              {!hasMore && posts.length > PAGE_SIZE && (
                <p style={{ textAlign: 'center', color: '#64748b', fontSize: '13px', marginTop: '10px' }}>
                  Você chegou ao fim do feed.
                </p>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
}

export default Feed;

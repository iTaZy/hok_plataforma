import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, addDoc, updateDoc, doc, arrayUnion, arrayRemove, increment, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';

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

const MAX_COMMENT_CHARS = 200;

function PostCard({ post, currentUser, onOpenChat }) {
  const [comments, setComments] = useState([]);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);

  const likesCount = post.likes || 0;
  const likedBy = post.likedBy || [];
  const hasLiked = currentUser ? likedBy.includes(currentUser.uid) : false;
  const commentCharsLeft = MAX_COMMENT_CHARS - newComment.length;
  const isCommentOverLimit = commentCharsLeft < 0;

  useEffect(() => {
    if (!showComments) return;

    const commentsRef = collection(db, 'posts', post.id, 'comments');
    const q = query(commentsRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, [post.id, showComments]);

  const handleLike = async () => {
    if (!currentUser) return;
    const postRef = doc(db, 'posts', post.id);
    try {
      if (hasLiked) {
        await updateDoc(postRef, { likes: increment(-1), likedBy: arrayRemove(currentUser.uid) });
      } else {
        await updateDoc(postRef, { likes: increment(1), likedBy: arrayUnion(currentUser.uid) });
        
        // NOTIFICAÇÃO DE CURTIDA
        // Verifica se o post tem um autor (ignora posts do sistema de partidas) e se não é o próprio usuário
        if (post.authorId && post.authorId !== currentUser.uid) {
          await addDoc(collection(db, 'notifications'), {
            toUid: post.authorId,
            fromUid: currentUser.uid,
            fromName: currentUser.name || 'Jogador',
            type: 'like',
            message: `${currentUser.name || 'Um jogador'} curtiu sua publicação.`,
            read: false,
            createdAt: serverTimestamp(),
            postId: post.id
          });
        }
      }
    } catch (error) {
      console.error("Erro ao curtir:", error);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !currentUser || isCommenting || isCommentOverLimit) return;

    setIsCommenting(true);
    try {
      const postRef = doc(db, 'posts', post.id);
      const commentsRef = collection(db, 'posts', post.id, 'comments');
      const commentText = newComment.trim();

      await addDoc(commentsRef, {
        userId: currentUser.uid,
        userName: currentUser.name || 'Jogador',
        userAvatar: currentUser.avatar || '',
        text: commentText,
        createdAt: serverTimestamp()
      });

      await updateDoc(postRef, { commentsCount: increment(1) });
      
      // NOTIFICAÇÃO DE COMENTÁRIO
      if (post.authorId && post.authorId !== currentUser.uid) {
        await addDoc(collection(db, 'notifications'), {
          toUid: post.authorId,
          fromUid: currentUser.uid,
          fromName: currentUser.name || 'Jogador',
          type: 'comment',
          message: `${currentUser.name || 'Um jogador'} comentou: "${commentText.substring(0, 20)}${commentText.length > 20 ? '...' : ''}"`,
          read: false,
          createdAt: serverTimestamp(),
          postId: post.id
        });
      }

      setNewComment('');
    } catch (error) {
      console.error("Erro ao comentar:", error);
    } finally {
      setIsCommenting(false);
    }
  };

  const isMatchResult = post.type === 'match_result';

  return (
    <div style={{
      background: isMatchResult ? 'linear-gradient(145deg, rgba(243,156,18,0.12), rgba(15,23,42,0.9))' : 'linear-gradient(145deg, #111827, #0b0f19)',
      borderRadius: '20px',
      padding: '25px',
      border: isMatchResult ? '2px solid #f39c12' : '1px solid rgba(255,255,255,0.05)',
      boxShadow: isMatchResult ? '0 10px 30px rgba(243,156,18,0.1)' : 'none'
    }}>

      {/* POST DE PARTIDA */}
      {isMatchResult ? (
        <div style={{ textAlign: 'center' }}>
          <h3 style={{ color: '#f39c12', margin: '0 0 5px 0', fontSize: '20px', letterSpacing: '1px' }}>🏆 PARTIDA FINALIZADA</h3>
          <p style={{ color: '#94a3b8', margin: '0 0 20px 0', fontSize: '14px', textTransform: 'uppercase' }}>
            Vencedor: <strong style={{ color: post.winner === 'blue' ? '#3498db' : '#e74c3c' }}>Time {post.winner === 'blue' ? 'Azul' : 'Vermelho'}</strong>
          </p>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '20px' }}>
            <div style={{ flex: '1 1 200px', background: 'rgba(52,152,219,0.1)', border: '1px solid rgba(52,152,219,0.3)', borderRadius: '12px', padding: '15px', textAlign: 'left' }}>
              <h4 style={{ color: '#3498db', margin: '0 0 10px 0', borderBottom: '1px solid rgba(52,152,219,0.2)', paddingBottom: '8px' }}>🔵 Time Azul</h4>
              {post.blueTeam?.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', padding: '4px 0' }}>
                  <span style={{ color: '#e2e8f0' }}>{p.name}</span>
                  <span style={{ color: p.mmrChange > 0 ? '#2ed573' : '#ff4757', fontWeight: 'bold' }}>
                    {p.mmrChange > 0 ? `+${p.mmrChange}` : p.mmrChange}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ flex: '1 1 200px', background: 'rgba(231,76,60,0.1)', border: '1px solid rgba(231,76,60,0.3)', borderRadius: '12px', padding: '15px', textAlign: 'left' }}>
              <h4 style={{ color: '#e74c3c', margin: '0 0 10px 0', borderBottom: '1px solid rgba(231,76,60,0.2)', paddingBottom: '8px' }}>🔴 Time Vermelho</h4>
              {post.redTeam?.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', padding: '4px 0' }}>
                  <span style={{ color: '#e2e8f0' }}>{p.name}</span>
                  <span style={{ color: p.mmrChange > 0 ? '#2ed573' : '#ff4757', fontWeight: 'bold' }}>
                    {p.mmrChange > 0 ? `+${p.mmrChange}` : p.mmrChange}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* POST NORMAL */
        <>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '15px' }}>
            <Link to={`/perfil/${post.authorId}`}>
              <img
                src={post.authorAvatar || generateAvatarSVG(post.authorName)}
                alt={post.authorName}
                style={{ width: '45px', height: '45px', borderRadius: '10px', objectFit: 'cover' }}
              />
            </Link>
            <div>
              <Link to={`/perfil/${post.authorId}`} style={{ textDecoration: 'none' }}>
                <h4 style={{ margin: 0, color: '#fff', fontSize: '16px' }}>{post.authorName}</h4>
              </Link>
              {currentUser && post.authorId !== currentUser.uid && (
                <button
                  onClick={() => onOpenChat(post.authorId)}
                  style={{ background: 'none', border: 'none', color: '#3498db', fontSize: '12px', padding: 0, cursor: 'pointer', marginTop: '4px' }}
                >
                  💬 Enviar Mensagem
                </button>
              )}
            </div>
          </div>
          <p style={{ color: '#cbd5e1', fontSize: '16px', lineHeight: '1.6' }}>{post.text}</p>
        </>
      )}

      {/* BARRA DE AÇÕES */}
      <div style={{ display: 'flex', gap: '20px', marginTop: '15px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '15px' }}>
        <button
          onClick={handleLike}
          style={{ background: 'transparent', border: 'none', color: hasLiked ? '#e74c3c' : '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 'bold', transition: 'color 0.2s' }}
        >
          {hasLiked ? '❤️ Curtido' : '🤍 Curtir'} <span style={{ color: '#e2e8f0' }}>{likesCount}</span>
        </button>
        <button
          onClick={() => setShowComments(!showComments)}
          style={{ background: 'transparent', border: 'none', color: '#3498db', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 'bold' }}
        >
          💬 Comentários <span style={{ color: '#e2e8f0' }}>{post.commentsCount || 0}</span>
        </button>
      </div>

      {/* COMENTÁRIOS */}
      {showComments && (
        <div style={{ marginTop: '20px', background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '300px', overflowY: 'auto', marginBottom: '15px' }}>
            {comments.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', margin: 0 }}>Nenhum comentário ainda. Seja o primeiro!</p>
            ) : (
              comments.map(c => (
                <div key={c.id} style={{ display: 'flex', gap: '10px' }}>
                  <img
                    src={c.userAvatar || generateAvatarSVG(c.userName)}
                    alt={c.userName}
                    style={{ width: '30px', height: '30px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
                  />
                  <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px 14px', borderRadius: '0 12px 12px 12px', flex: 1 }}>
                    <strong style={{ display: 'block', fontSize: '13px', color: '#fff', marginBottom: '4px' }}>{c.userName}</strong>
                    <span style={{ fontSize: '14px', color: '#cbd5e1' }}>{c.text}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {currentUser ? (
            <form onSubmit={handleAddComment}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="Escreva um comentário..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'rgba(0,0,0,0.4)',
                    border: `1px solid ${isCommentOverLimit ? '#e74c3c' : 'rgba(255,255,255,0.1)'}`,
                    color: '#fff',
                    padding: '12px',
                    borderRadius: '8px',
                    outline: 'none',
                    transition: 'border 0.2s'
                  }}
                />
                <button
                  type="submit"
                  disabled={!newComment.trim() || isCommenting || isCommentOverLimit}
                  style={{
                    background: '#f39c12',
                    color: '#000',
                    border: 'none',
                    padding: '0 20px',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    cursor: (!newComment.trim() || isCommenting || isCommentOverLimit) ? 'not-allowed' : 'pointer',
                    opacity: (!newComment.trim() || isCommentOverLimit) ? 0.5 : 1
                  }}
                >
                  Enviar
                </button>
              </div>
              {newComment.length > 0 && (
                <p style={{ margin: '6px 0 0', fontSize: '12px', color: isCommentOverLimit ? '#e74c3c' : '#64748b', textAlign: 'right' }}>
                  {commentCharsLeft} caracteres restantes
                </p>
              )}
            </form>
          ) : (
            <p style={{ color: '#64748b', fontSize: '12px', textAlign: 'center' }}>Faça login para comentar.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default PostCard;
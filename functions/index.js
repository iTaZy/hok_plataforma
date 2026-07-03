const { onDocumentWritten, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { onValueWritten } = require("firebase-functions/v2/database");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

const discordBotToken = defineSecret("DISCORD_BOT_TOKEN");
const discordWebhookUrl = defineSecret("DISCORD_WEBHOOK_URL");
const discordClientId = defineSecret("DISCORD_CLIENT_ID");
const discordClientSecret = defineSecret("DISCORD_CLIENT_SECRET");

// ==========================================
// 1. MOTOR DE MATCHMAKING — FAIXAS DE MMR + EXPANSÃO POR TEMPO
// ==========================================

// --- Configuração de Tiers (limiares reduzidos) ---
const TIERS = [
  { name: 'bronze',   min: 0,    max: 599  },
  { name: 'prata',    min: 600,  max: 1199 },
  { name: 'ouro',     min: 1200, max: 1799 },
  { name: 'diamante', min: 1800, max: 2399 },
  { name: 'mestre',   min: 2400, max: Infinity }
];

// --- MMR dinâmico por tier ---
// Quem está embaixo sobe mais rápido e cai devagar.
// Quem está no topo sobe devagar e cai mais fácil.
const MMR_BY_TIER = {
  bronze:   { win: 35, loss: -15 },
  prata:    { win: 30, loss: -18 },
  ouro:     { win: 25, loss: -22 },
  diamante: { win: 25, loss: -25 },
  mestre:   { win: 25, loss: -30 },
};

// Diferença máxima de MMR permitida dentro de um lobby
const MAX_MMR_DIFF = 800;

// Janelas de expansão (em ms): quantos tiers vizinhos cada fase libera
const EXPANSION_WINDOWS = [
  { after: 0,      tierRadius: 0 }, // 0–30s: apenas mesmo tier
  { after: 30000,  tierRadius: 1 }, // 30–60s: ±1 tier
  { after: 60000,  tierRadius: 2 }, // 60–120s: ±2 tiers
  { after: 120000, tierRadius: 99 } // 120s+: global
];

// --- Horário permitido para fila (horário de Brasília, UTC-3) ---
// Fila aberta das 22:00 às 23:59
const QUEUE_START_HOUR = 22; // 22h
const QUEUE_END_HOUR   = 23; // até 23:59

/**
 * Retorna true se o horário atual (Brasília, UTC-3) estiver dentro da janela permitida.
 */
function isQueueOpen() {
  const now = new Date();

  const brasiliaOffset = -3 * 60;
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const brasiliaMinutes =
    ((utcMinutes + brasiliaOffset) % (24 * 60) + 24 * 60) % (24 * 60);

  const brasiliaHour = Math.floor(brasiliaMinutes / 60);

  return brasiliaHour >= QUEUE_START_HOUR &&
         brasiliaHour <= QUEUE_END_HOUR;
}
/** Retorna o índice do tier a partir dos pontos do jogador */
function getTierIndex(points) {
  const p = points || 0;
  return TIERS.findIndex(t => p >= t.min && p <= t.max);
}

/** Retorna o nome do tier a partir dos pontos */
function getTierName(points) {
  const t = TIERS.find(t => (points || 0) >= t.min && (points || 0) <= t.max);
  return t ? t.name : 'bronze';
}

/** Calcula quantos tiers de raio liberar para um jogador com base no tempo de espera */
function getAllowedTierRadius(queueStartedAt) {
  const waited = Date.now() - (queueStartedAt || Date.now());
  let radius = 0;
  for (const w of EXPANSION_WINDOWS) {
    if (waited >= w.after) radius = w.tierRadius;
  }
  return radius;
}

/**
 * Dado um pool de jogadores, tenta montar um lobby de 10 dentro das
 * restrições de tier e MAX_MMR_DIFF.
 */
function tryFormLobby(queue, now) {
  const sorted = [...queue].sort((a, b) => (a.queueStartedAt || 0) - (b.queueStartedAt || 0));

  for (const anchor of sorted) {
    const anchorTierIdx = getTierIndex(anchor.points);
    const anchorRadius   = getAllowedTierRadius(anchor.queueStartedAt);

    const candidates = sorted.filter(p => {
      if (p.id === anchor.id) return true;
      const pTierIdx = getTierIndex(p.points);
      const pRadius  = getAllowedTierRadius(p.queueStartedAt);
      const dist = Math.abs(pTierIdx - anchorTierIdx);
      return dist <= anchorRadius && dist <= pRadius;
    });

    if (candidates.length < 10) continue;

    let roleNeeds = { 'Rota Superior': 2, 'Selva': 2, 'Rota do Meio': 2, 'Atirador': 2, 'Suporte': 2 };
    let selected = [];

    for (const p of candidates) {
      if (selected.length >= 10) break;
      if (p.selectedRoles?.some(r => roleNeeds[r] > 0)) {
        selected.push(p);
        p.selectedRoles.forEach(r => { if (roleNeeds[r] > 0) roleNeeds[r]--; });
      }
    }
    for (const p of candidates) {
      if (selected.length >= 10) break;
      if (!selected.some(s => s.id === p.id)) selected.push(p);
    }

    if (selected.length < 10) continue;

    let finalCounts = { 'Rota Superior': 0, 'Selva': 0, 'Rota do Meio': 0, 'Atirador': 0, 'Suporte': 0 };
    selected.forEach(p => p.selectedRoles?.forEach(r => { if (r in finalCounts) finalCounts[r]++; }));
    if (!Object.values(finalCounts).every(c => c >= 2)) continue;

    const points = selected.map(p => p.points || 0);
    const mmrSpread = Math.max(...points) - Math.min(...points);
    if (mmrSpread > MAX_MMR_DIFF) {
      console.log(`Lobby rejeitado: spread de MMR ${mmrSpread} > ${MAX_MMR_DIFF} (âncora: ${anchor.id})`);
      continue;
    }

    return selected;
  }

  return null;
}

exports.matchmaking = onDocumentWritten("queue/{userId}", async (event) => {
  // --- VERIFICAÇÃO DE HORÁRIO ---
  // Se a fila estiver fora do horário permitido, remove o jogador automaticamente
  if (!isQueueOpen()) {
    const userId = event.params.userId;
    // Só age se foi uma escrita (entrada na fila), não uma deleção
    if (event.data.after?.exists) {
      try {
        await db.collection("queue").doc(userId).delete();
        console.log(`[HorárioFila] Jogador ${userId} tentou entrar fora do horário. Removido.`);
      } catch (e) {
        console.error("[HorárioFila] Erro ao remover jogador fora de horário:", e);
      }
    }
    return;
  }

  const queueRef = db.collection("queue");
  const lockRef  = db.collection("locks").doc("matchmaking");

  // Trava distribuída para evitar corridas
  try {
    await db.runTransaction(async (transaction) => {
      const lockSnap = await transaction.get(lockRef);
      if (lockSnap.exists && lockSnap.data().locked) return;
      transaction.set(lockRef, { locked: true, timestamp: admin.firestore.FieldValue.serverTimestamp() });
    });
  } catch (e) {
    console.log("Matchmaking já em execução.");
    return;
  }

  try {
    await db.runTransaction(async (transaction) => {
      const queueSnapshot = await transaction.get(queueRef);
      const now = Date.now();

      let queue = [];
      queueSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        queue.push({ id: docSnap.id, ...data });
      });
      if (queue.length < 10) return;

      const lobby = tryFormLobby(queue, now);
      if (!lobby) {
        console.log(`Fila com ${queue.length} jogador(es) — nenhum lobby viável no momento.`);
        return;
      }

      const sortedLobby = [...lobby].sort((a, b) => (b.points || 0) - (a.points || 0));
      const newMatchRef  = db.collection("matches").doc();

      const tierNames = sortedLobby.map(p => p.tier || getTierName(p.points)).filter(Boolean);
      const lobbyTierSummary = [...new Set(tierNames)].join(', ');

      transaction.set(newMatchRef, {
        phase: 'draft',
        participants: sortedLobby.map(p => p.id),
        archivedFor: [],
        blueTeam: [sortedLobby[0]],
        redTeam:  [sortedLobby[1]],
        availablePlayers: sortedLobby.slice(2),
        draftPickIndex: 0,
        roomCode: '',
        blueVotes: 0,
        redVotes:  0,
        votedUsers: [],
        cancelVotes: 0,
        cancelVotedUsers: [],
        isProcessingMMR: false,
        lobbyTiers: lobbyTierSummary,
        mmrSpread: (Math.max(...sortedLobby.map(p => p.points || 0)) -
                   Math.min(...sortedLobby.map(p => p.points || 0))),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      for (const p of sortedLobby) {
        transaction.delete(queueRef.doc(p.id));
      }

      console.log(
        `Partida ${newMatchRef.id} criada! Tiers: [${lobbyTierSummary}] | ` +
        `MMR: ${Math.min(...sortedLobby.map(p => p.points || 0))}–` +
        `${Math.max(...sortedLobby.map(p => p.points || 0))}`
      );
    });
  } catch (error) {
    console.error("Erro no Matchmaking:", error);
  } finally {
    try {
      await db.collection("locks").doc("matchmaking").delete();
    } catch (e) {
      console.error("Erro ao liberar trava:", e);
    }
  }
});

// ==========================================
// 2. ÁRBITRO DE PARTIDA, HISTÓRICO E CANCELAMENTO
// ==========================================
exports.processMatchResult = onDocumentWritten(
  { document: "matches/{matchId}", secrets: [discordBotToken] },
  async (event) => {
  const matchAfter = event.data.after?.data();
  if (!matchAfter || matchAfter.isProcessingMMR) return;

  const matchRef = db.collection("matches").doc(event.params.matchId);

  // ---- CANCELAMENTO: sem tocar no MMR ----
  if (matchAfter.phase === 'match_cancelled') {
    console.log(`Partida ${event.params.matchId} cancelada por votação. MMR preservado.`);
     await db.collection("matches").doc(event.params.matchId).update({ wasCancelled: true });

    const channels = matchAfter.discordChannels;
    if (channels) {
      try {
        const BOT_TOKEN = discordBotToken.value();
        const headers = { 'Authorization': `Bot ${BOT_TOKEN}` };
        await Promise.all([
          fetch(`https://discord.com/api/v10/channels/${channels.blue}`, { method: 'DELETE', headers }),
          fetch(`https://discord.com/api/v10/channels/${channels.red}`, { method: 'DELETE', headers })
        ]);
        console.log("Canais de Discord deletados após cancelamento.");
      } catch (err) {
        console.error("Erro ao deletar canais no cancelamento:", err);
      }
    }
    return;
  }

  // ---- RESULTADO NORMAL ----
  if (matchAfter.phase !== 'match_report') return;

  const blueWins = matchAfter.blueVotes >= 6;
  const redWins = matchAfter.redVotes >= 6;

  if (blueWins || redWins) {
    const winnerTeam = blueWins ? 'blue' : 'red';

    try {
      await db.runTransaction(async (transaction) => {
        const snap = await transaction.get(matchRef);
        if (snap.data().isProcessingMMR) return;

        transaction.update(matchRef, {
          isProcessingMMR: true,
          phase: 'match_finished',
          winner: winnerTeam
        });

        const updatePlayerStatsAndHistory = (team, teamColor, isWinner) => {
          const matchDate = admin.firestore.FieldValue.serverTimestamp();

          team.forEach(player => {
            // Calcula MMR dinâmico com base no tier atual do jogador
            const tierName = getTierName(player.points || 0);
            const mmrTable = MMR_BY_TIER[tierName] || MMR_BY_TIER['bronze'];
            const pointsChange = isWinner ? mmrTable.win : mmrTable.loss;

            const userRef = db.collection("users").doc(player.id);
// Garante que os pontos nunca ficam negativos
const currentPoints = player.points || 0;
const safePointsChange = Math.max(pointsChange, -currentPoints);
transaction.set(userRef, {
  points: admin.firestore.FieldValue.increment(safePointsChange),
  wins: admin.firestore.FieldValue.increment(isWinner ? 1 : 0),
  losses: admin.firestore.FieldValue.increment(isWinner ? 0 : 1)
}, { merge: true });

            const historyRef = userRef.collection("match_history").doc(event.params.matchId);
            transaction.set(historyRef, {
              matchId: event.params.matchId,
              result: isWinner ? 'Vitória' : 'Derrota',
              pointsEarned: pointsChange,
              myTeam: teamColor,
              rolePlayed: player.selectedRoles?.[0] || 'Desconhecida',
              timestamp: matchDate
            });
          });
        };

        updatePlayerStatsAndHistory(matchAfter.blueTeam, 'Azul', winnerTeam === 'blue');
        updatePlayerStatsAndHistory(matchAfter.redTeam, 'Vermelho', winnerTeam === 'red');
      });

      console.log(`Partida ${event.params.matchId} encerrada. Vitória: ${winnerTeam}`);
    } catch (error) {
      console.error("Erro ao processar MMR:", error);
    }
  }

  // ==========================================
  // POST AUTOMÁTICO NO FEED DA COMUNIDADE
  // Só cria o post se a partida foi realmente finalizada (não cancelada)
  // ==========================================
  if (matchAfter.phase !== 'match_finished' || matchAfter.wasCancelled) return;

  try {
    const postsRef = db.collection("posts");

    const existingPost = await postsRef.where("matchId", "==", event.params.matchId).limit(1).get();

    if (existingPost.empty) {
      const winnerTeam = matchAfter.winner || (matchAfter.blueVotes >= 6 ? 'blue' : 'red');

      const mapPlayers = (team, isWinner) => team.map(p => {
        const tierName = getTierName(p.points || 0);
        const mmrTable = MMR_BY_TIER[tierName] || MMR_BY_TIER['bronze'];
        return {
          id: p.id,
          name: p.name || 'Jogador',
          mmrChange: isWinner ? mmrTable.win : mmrTable.loss
        };
      });

      const blueWon = winnerTeam === 'blue';

      await postsRef.add({
        type: "match_result",
        matchId: event.params.matchId,
        winner: winnerTeam,
        blueTeam: mapPlayers(matchAfter.blueTeam, blueWon),
        redTeam: mapPlayers(matchAfter.redTeam, !blueWon),
        likes: 0,
        likedBy: [],
        commentsCount: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`Post automático criado para a partida ${event.params.matchId}`);
    }
  } catch (postError) {
    console.error("Erro ao gerar post automático da partida:", postError);
  }
});

// ==========================================
// 3. DISCORD — CANAIS + WEBHOOK + MOVER + PERMISSÕES
// ==========================================
exports.notifyDiscordOnMatchReady = onDocumentUpdated(
  { document: "matches/{matchId}", secrets: [discordBotToken, discordWebhookUrl] },
  async (event) => {
    const matchBefore = event.data.before.data();
    const matchAfter = event.data.after.data();

    // Criação dos canais quando o room code aparece
    if (!matchBefore.roomCode && matchAfter.roomCode) {
      const BOT_TOKEN = discordBotToken.value();
      const WEBHOOK_URL = discordWebhookUrl.value();
      const GUILD_ID = "1509548445395062867";
      const CATEGORY_ID = "1509548446875517089";

      const blueCaptain = matchAfter.blueTeam[0]?.name || "Time Azul";
      const redCaptain = matchAfter.redTeam[0]?.name || "Time Vermelho";

      const headers = {
        'Authorization': `Bot ${BOT_TOKEN}`,
        'Content-Type': 'application/json'
      };

      const buildPermissions = (allowedTeam, guildId) => {
        // VIEW_CHANNEL (1024) + CONNECT (1048576) + SPEAK (2097152) = 3146752
        const FULL_VOICE_PERMS = '3146752';
        const overwrites = [{ id: guildId, type: 0, deny: FULL_VOICE_PERMS }];
        for (const player of allowedTeam) {
          if (player.discordId) {
            overwrites.push({ id: player.discordId, type: 1, allow: FULL_VOICE_PERMS });
          }
        }
        return overwrites;
      };

      try {
        const [blueChannel, redChannel] = await Promise.all([
          fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/channels`, {
            method: 'POST', headers,
            body: JSON.stringify({
              name: `Time ${blueCaptain}`,
              type: 2,
              parent_id: CATEGORY_ID,
              user_limit: 5,
              permission_overwrites: buildPermissions(matchAfter.blueTeam, GUILD_ID)
            })
          }).then(r => r.json()),

          fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/channels`, {
            method: 'POST', headers,
            body: JSON.stringify({
              name: `Time ${redCaptain}`,
              type: 2,
              parent_id: CATEGORY_ID,
              user_limit: 5,
              permission_overwrites: buildPermissions(matchAfter.redTeam, GUILD_ID)
            })
          }).then(r => r.json())
        ]);

        console.log(`Canais criados: ${blueChannel.name} | ${redChannel.name}`);

        await db.collection('matches').doc(event.params.matchId).update({
          discordChannels: { blue: blueChannel.id, red: redChannel.id }
        });

        const movePlayer = async (player, channelId) => {
          if (!player.discordId) return;
          try {
            const res = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/members/${player.discordId}`, {
              method: 'PATCH', headers,
              body: JSON.stringify({ channel_id: channelId })
            });
            if (res.ok) console.log(`${player.name} movido para canal ${channelId}`);
            else {
              const err = await res.json();
              console.warn(`Não foi possível mover ${player.name}:`, err.message);
            }
          } catch (e) {
            console.error(`Erro ao mover ${player.name}:`, e);
          }
        };

        await Promise.all([
          ...matchAfter.blueTeam.map(p => movePlayer(p, blueChannel.id)),
          ...matchAfter.redTeam.map(p => movePlayer(p, redChannel.id))
        ]);

      } catch (error) {
        console.error("Erro ao criar canais:", error);
      }

      const discordPayload = {
        content: "🔥 **Uma nova partida competitiva acabou de começar!**",
        embeds: [{
          title: "⚔️ Partida Em Andamento",
          color: 15965186,
          fields: [
            { name: "Time Azul 🔵", value: `Capitão: **${blueCaptain}**`, inline: true },
            { name: "Time Vermelho 🔴", value: `Capitão: **${redCaptain}**`, inline: true },
            { name: "Código do Lobby", value: `\`\`\`${matchAfter.roomCode}\`\`\``, inline: false }
          ],
          footer: { text: "HoK HuB Matchmaking Automático" },
          timestamp: new Date().toISOString()
        }]
      };

      await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(discordPayload)
      });
    }

    // Deletar canais ao fim da partida (vitória normal)
    if (matchBefore.phase !== 'match_finished' && matchAfter.phase === 'match_finished') {
      const channels = matchAfter.discordChannels;
      if (!channels) return;

      const BOT_TOKEN = discordBotToken.value();
      const headers = { 'Authorization': `Bot ${BOT_TOKEN}` };

      try {
        await Promise.all([
          fetch(`https://discord.com/api/v10/channels/${channels.blue}`, { method: 'DELETE', headers }),
          fetch(`https://discord.com/api/v10/channels/${channels.red}`, { method: 'DELETE', headers })
        ]);
        console.log("Canais deletados após fim da partida.");
      } catch (error) {
        console.error("Erro ao deletar canais:", error);
      }
    }
  }
);

// ==========================================
// 4. DISCORD OAUTH
// ==========================================
exports.discordCallback = onRequest(
  { secrets: [discordClientId, discordClientSecret, discordBotToken] },
  async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST');
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }

    const { code, userId, origin } = req.query;
    if (!code || !userId) { res.status(400).json({ error: 'Parâmetros inválidos' }); return; }

    const ORIGIN = origin || 'http://localhost:5173';
    const REDIRECT_URI = `${ORIGIN}/discord-callback`;
    const GUILD_ID = "1509548445395062867";

    try {
      const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: discordClientId.value(),
          client_secret: discordClientSecret.value(),
          grant_type: 'authorization_code',
          code,
          redirect_uri: REDIRECT_URI,
        })
      });

      const tokenData = await tokenResponse.json();
      if (!tokenData.access_token) {
        res.status(400).json({ error: 'Token inválido', details: tokenData });
        return;
      }

      const userResponse = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });
      const discordUser = await userResponse.json();

      try {
        await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/members/${discordUser.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bot ${discordBotToken.value()}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ access_token: tokenData.access_token })
        });
        console.log(`${discordUser.username} adicionado ao servidor!`);
      } catch (guildError) {
        console.error('Erro ao adicionar ao servidor:', guildError);
      }

      await db.collection('users').doc(userId).update({
        discordId: discordUser.id,
        discordUsername: discordUser.username,
        discordAvatar: discordUser.avatar
          ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
          : null
      });

      console.log(`Discord vinculado: ${discordUser.username} → ${userId}`);
      res.redirect(`${ORIGIN}/perfil?discord=success`);

    } catch (error) {
      console.error('Erro no Discord OAuth:', error);
      res.redirect(`${ORIGIN}/perfil?discord=error`);
    }
  }
);

// ==========================================
// 5. GERENCIADOR DE PRESENÇA (RTDB -> Firestore)
// ==========================================
exports.onUserStatusChanged = onValueWritten(
  {
    ref: "/status/{uid}",
    instance: "hok-plataforma-default-rtdb"
  },
  async (event) => {
    const eventStatus = event.data.after.val();
    const uid = event.params.uid;

    if (!eventStatus || eventStatus.state === 'offline') {
      const queueRef = db.collection("queue").doc(uid);

      try {
        const doc = await queueRef.get();
        if (doc.exists) {
          await queueRef.delete();
          console.log(`[Presence] Jogador ${uid} desconectou. Removido da fila do HoK HuB.`);
        }
      } catch (error) {
        console.error("Erro ao remover jogador desconectado da fila:", error);
      }
    }
  }
);
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// ==========================================
// 1. MOTOR DE MATCHMAKING (COM TRAVA)
// ==========================================
exports.matchmaking = onDocumentWritten("queue/{userId}", async (event) => {
  const queueRef = db.collection("queue");
  const lockRef = db.collection("locks").doc("matchmaking");

  // Tenta adquirir a trava antes de começar
  try {
    await db.runTransaction(async (transaction) => {
      const lockSnap = await transaction.get(lockRef);
      if (lockSnap.exists && lockSnap.data().locked) {
        // Outra instância já está rodando o matchmaking – aborta
        return;
      }
      // Marca a trava como ocupada
      transaction.set(lockRef, { locked: true, timestamp: admin.firestore.FieldValue.serverTimestamp() });
    });
  } catch (e) {
    console.log("Matchmaking já em execução (trava ocupada).");
    return;
  }

  try {
    await db.runTransaction(async (transaction) => {
      const queueSnapshot = await transaction.get(queueRef);

      if (queueSnapshot.size < 10) return; // Ainda não tem 10 jogadores

      // Monta array com os jogadores na fila
      let queue = [];
      queueSnapshot.forEach((doc) => queue.push({ id: doc.id, ...doc.data() }));

      // Contagem de quantos precisamos para cada role
      let roleNeeds = {
        'Rota Superior': 2,
        'Selva': 2,
        'Rota do Meio': 2,
        'Atirador': 2,
        'Suporte': 2
      };

      let selected10 = [];

      // 1ª passada: prioriza quem preenche as roles necessárias
      for (let p of queue) {
        if (selected10.length >= 10) break;
        let helps = p.selectedRoles?.some(r => roleNeeds[r] > 0);
        if (helps) {
          selected10.push(p);
          p.selectedRoles.forEach(r => {
            if (roleNeeds[r] > 0) roleNeeds[r]--;
          });
        }
      }

      // 2ª passada (completar): preenche o resto até 10 se ainda não tiver
      for (let p of queue) {
        if (selected10.length >= 10) break;
        if (!selected10.some(s => s.id === p.id)) {
          selected10.push(p);
        }
      }

      // Verifica se cada role tem pelo menos 2
      let finalCounts = {
        'Rota Superior': 0,
        'Selva': 0,
        'Rota do Meio': 0,
        'Atirador': 0,
        'Suporte': 0
      };
      selected10.forEach(p => p.selectedRoles?.forEach(r => finalCounts[r]++));
      const matchEncontrada = Object.values(finalCounts).every(count => count >= 2);

      if (selected10.length === 10 && matchEncontrada) {
        // Ordena por pontos (mmr) para escolher os capitães
        const sortedPlayers = [...selected10].sort((a, b) => (b.points || 0) - (a.points || 0));

        const newMatchRef = db.collection("matches").doc();

        transaction.set(newMatchRef, {
          phase: 'draft',
          participants: sortedPlayers.map(p => p.id),
          archivedFor: [],
          blueTeam: [sortedPlayers[0]],            // Capitão azul (maior MMR)
          redTeam: [sortedPlayers[1]],             // Capitão vermelho (segundo maior)
          availablePlayers: sortedPlayers.slice(2), // Restantes para o draft
          draftPickIndex: 0,
          roomCode: '',
          blueVotes: 0,
          redVotes: 0,
          votedUsers: [],
          isProcessingMMR: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Remove os 10 jogadores da fila
        for (const p of sortedPlayers) {
          transaction.delete(queueRef.doc(p.id));
        }

        console.log(`Partida ${newMatchRef.id} criada com sucesso para 10 jogadores!`);
      }
    });
  } catch (error) {
    console.error("Erro crítico no Matchmaking:", error);
  } finally {
    // Libera a trava SEMPRE, mesmo que dê erro
    try {
      await db.collection("locks").doc("matchmaking").delete();
    } catch (e) {
      console.error("Erro ao liberar trava:", e);
    }
  }
});

// ==========================================
// 2. ÁRBITRO DE PARTIDA (CÁLCULO DE MMR)
// ==========================================
exports.processMatchResult = onDocumentWritten("matches/{matchId}", async (event) => {
  const matchAfter = event.data.after.data();

  if (!matchAfter || matchAfter.phase !== 'match_report' || matchAfter.isProcessingMMR) return;

  const blueWins = matchAfter.blueVotes >= 6;
  const redWins = matchAfter.redVotes >= 6;

  if (blueWins || redWins) {
    const winnerTeam = blueWins ? 'blue' : 'red';
    const matchRef = db.collection("matches").doc(event.params.matchId);

    try {
      await db.runTransaction(async (transaction) => {
        const snap = await transaction.get(matchRef);
        if (snap.data().isProcessingMMR) return; // já processada

        transaction.update(matchRef, {
          isProcessingMMR: true,
          phase: 'match_finished',
          winner: winnerTeam
        });

        const updatePlayerStats = (team, isWinner) => {
          const pointsChange = isWinner ? 25 : -25;
          team.forEach(player => {
            const userRef = db.collection("users").doc(player.id);
            transaction.update(userRef, {
              points: admin.firestore.FieldValue.increment(pointsChange),
              wins: admin.firestore.FieldValue.increment(isWinner ? 1 : 0),
              losses: admin.firestore.FieldValue.increment(isWinner ? 0 : 1)
            });
          });
        };

        updatePlayerStats(matchAfter.blueTeam, winnerTeam === 'blue');
        updatePlayerStats(matchAfter.redTeam, winnerTeam === 'red');
      });
      console.log(`Partida ${event.params.matchId} encerrada. Vitória do time ${winnerTeam}!`);
    } catch (error) {
      console.error("Erro ao processar MMR:", error);
    }
  }
});
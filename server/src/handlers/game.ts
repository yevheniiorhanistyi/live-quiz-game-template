import { Client, Game } from "../types/index.js";
import {
  isCreateGameData,
  isJoinGameData,
  isStartGameData,
  isAnswerData,
} from "../validators/gameValidators.js";
import {
  createGame,
  findGameByCode,
  findGameById,
  findPlayerById,
} from "../storage/memoryStore.js";
import { send, broadcast } from "../services/socketService.js";
import {
  getAllPlayersWs,
  createScoreboard,
  calculatePoints,
} from "../utils/gameUtils.js";

const questionAnswers: Map<
  string,
  Map<string | number, { answerIndex: number; timeAnswered: number }>
> = new Map();

const questionTimers: Map<
  string,
  { timer: NodeJS.Timeout; startTime: number }
> = new Map();

const checkAllAnswered = (game: Game): boolean => {
  const answers = questionAnswers.get(`${game.id}:${game.currentQuestion}`);
  return answers?.size === game.players.length;
};

const finishQuestion = (game: Game, startTime: number): void => {
  questionTimers.delete(game.id);

  const question = game.questions[game.currentQuestion];
  const answers =
    questionAnswers.get(`${game.id}:${game.currentQuestion}`) ?? new Map();
  const currentIndex = game.currentQuestion;

  const playerResults = game.players.map((player) => {
    const answer = answers.get(player.index);
    const answered = !!answer;
    const correct = answered && answer.answerIndex === question.correctIndex;
    let pointsEarned = 0;

    if (correct && answer) {
      pointsEarned = calculatePoints(
        answer.timeAnswered,
        startTime,
        question.timeLimitSec,
      );
      player.score += pointsEarned;
    }

    return {
      name: player.name,
      answered,
      correct,
      pointsEarned,
      totalScore: player.score,
    };
  });
  const allWs = getAllPlayersWs(game);

  broadcast(allWs, "question_result", {
    questionIndex: game.currentQuestion,
    correctIndex: question.correctIndex,
    playerResults,
  });

  broadcast(allWs, "update_players", game.players);

  const isLastQuestion = game.currentQuestion === game.questions.length - 1;

  if (isLastQuestion) {
    game.status = "finished";

    const scoreboard = createScoreboard(game.players);
    broadcast(allWs, "game_finished", { scoreboard });
  } else {
    game.currentQuestion++;
    broadcastQuestion(game);
  }
  questionAnswers.delete(`${game.id}:${currentIndex}`);
};

const broadcastQuestion = (game: Game): void => {
  const currentQuestion = game.questions[game.currentQuestion];
  const allWs = getAllPlayersWs(game);

  broadcast(allWs, "question", {
    questionNumber: game.currentQuestion + 1,
    totalQuestions: game.questions.length,
    text: currentQuestion.text,
    options: currentQuestion.options,
    timeLimitSec: currentQuestion.timeLimitSec,
  });

  const startTime = Date.now();

  const timer = setTimeout(() => {
    finishQuestion(game, startTime);
  }, currentQuestion.timeLimitSec * 1000);

  questionTimers.set(game.id, { timer, startTime });
};

export const handleCreateGame = (client: Client, data: unknown): void => {
  if (!client.playerId) {
    send(client.ws, "error", { message: "Not authenticated" });
    return;
  }

  if (!isCreateGameData(data)) {
    send(client.ws, "error", { message: "Invalid game data" });
    return;
  }

  const game = createGame(client.playerId, data.questions);
  client.gameId = game.id;

  send(client.ws, "game_created", {
    gameId: game.id,
    code: game.code,
  });
};

export const handleJoinGame = (client: Client, data: unknown): void => {
  if (!client.playerId) {
    send(client.ws, "error", { message: "Not authenticated" });
    return;
  }

  if (!isJoinGameData(data)) {
    send(client.ws, "error", { message: "Invalid game data" });
    return;
  }

  const game = findGameByCode(data.code);

  if (!game || game.status !== "waiting") {
    send(client.ws, "error", { message: "Game not found or already started" });
    return;
  }

  const player = findPlayerById(client.playerId);

  if (!player) {
    send(client.ws, "error", { message: "Player not found" });
    return;
  }

  game.players.push(player);
  client.gameId = game.id;
  send(client.ws, "game_joined", { gameId: game.id });

  const allWs = getAllPlayersWs(game);

  broadcast(allWs, "player_joined", {
    playerName: player.name,
    playerCount: game.players.length,
  });
  broadcast(allWs, "update_players", game.players);
};

export const handleLeaveGame = (client: Client): void => {
  if (!client.gameId || !client.playerId) return;

  const game = findGameById(client.gameId);
  if (!game) return;

  game.players = game.players.filter((p) => p.index !== client.playerId);
  const allWs = getAllPlayersWs(game);

  broadcast(allWs, "update_players", game.players);

  if (game.hostId === client.playerId) {
    game.status = "finished";
    const timerData = questionTimers.get(game.id);
    if (timerData) clearTimeout(timerData.timer);
    questionTimers.delete(game.id);

    broadcast(allWs, "game_finished", {
      scoreboard: createScoreboard(game.players),
    });
    return;
  }

  if (game.status === "in_progress") {
    if (checkAllAnswered(game)) {
      const timerData = questionTimers.get(game.id);
      if (timerData) {
        clearTimeout(timerData.timer);
        finishQuestion(game, timerData.startTime);
      }
    }
  }
};

export const handleStartGame = (client: Client, data: unknown): void => {
  if (!client.playerId) {
    send(client.ws, "error", { message: "Not authenticated" });
    return;
  }
  if (!isStartGameData(data)) {
    send(client.ws, "error", { message: "Invalid game data" });
    return;
  }

  const game = findGameById(data.gameId);

  if (!game) {
    send(client.ws, "error", { message: "Game not found" });
    return;
  }

  if (game.hostId !== client.playerId) {
    send(client.ws, "error", { message: "Only host can start the game" });
    return;
  }

  if (game.status !== "waiting") {
    send(client.ws, "error", { message: "Game already started" });
    return;
  }

  game.status = "in_progress";
  game.currentQuestion = 0;

  broadcastQuestion(game);
};

export const handleAnswer = (client: Client, data: unknown): void => {
  if (!client.playerId) {
    send(client.ws, "error", { message: "Not authenticated" });
    return;
  }

  if (!isAnswerData(data)) {
    send(client.ws, "error", { message: "Invalid answer data" });
    return;
  }

  const { gameId, questionIndex, answerIndex } = data;
  const game = findGameById(data.gameId);

  if (!game) {
    send(client.ws, "error", { message: "Game not found" });
    return;
  }

  if (game.status !== "in_progress") {
    send(client.ws, "error", { message: "Game not in progress" });
    return;
  }

  if (questionIndex !== game.currentQuestion) {
    send(client.ws, "error", { message: "Wrong question index" });
    return;
  }

  const key = `${gameId}:${questionIndex}`;
  if (!questionAnswers.has(key)) {
    questionAnswers.set(key, new Map());
  }

  const answers = questionAnswers.get(key);

  if (!answers) {
    send(client.ws, "error", { message: "Question not found" });
    return;
  }

  if (answers.has(client.playerId)) {
    send(client.ws, "error", { message: "Already answered" });
    return;
  }

  answers.set(client.playerId, {
    answerIndex,
    timeAnswered: Date.now(),
  });

  send(client.ws, "answer_accepted", { questionIndex });

  if (checkAllAnswered(game)) {
    const timerData = questionTimers.get(gameId);
    if (timerData) {
      clearTimeout(timerData.timer);
      finishQuestion(game, timerData.startTime);
    }
  }
};

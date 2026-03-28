import {
  CreateGameData,
  Question,
  JoinGameData,
  StartGameData,
  AnswerData,
} from "../types/index.js";

export function isQuestion(q: any): q is Question {
  return (
    typeof q.text === "string" &&
    Array.isArray(q.options) &&
    typeof q.correctIndex === "number" &&
    typeof q.timeLimitSec === "number"
  );
}

export function isCreateGameData(data: unknown): data is CreateGameData {
  return (
    typeof data === "object" &&
    data !== null &&
    "questions" in data &&
    Array.isArray((data as any).questions) &&
    (data as any).questions.every(isQuestion)
  );
}

export function isJoinGameData(data: unknown): data is JoinGameData {
  return (
    typeof data === "object" &&
    data !== null &&
    "code" in data &&
    typeof (data as any).code === "string"
  );
}

export function isStartGameData(data: unknown): data is StartGameData {
  return (
    typeof data === "object" &&
    data !== null &&
    "gameId" in data &&
    typeof (data as any).gameId === "string"
  );
}

export function isAnswerData(data: unknown): data is AnswerData {
  return (
    typeof data === "object" &&
    data !== null &&
    "gameId" in data &&
    typeof (data as any).gameId === "string" &&
    "questionIndex" in data &&
    typeof (data as any).questionIndex === "number" &&
    "answerIndex" in data &&
    typeof (data as any).answerIndex === "number"
  );
}

export const keys = {
  room: (roomCode: string) => `room:${roomCode}`,
  answer: (roomCode: string, questionId: string, playerId: string) =>
    `room:${roomCode}:answer:${questionId}:${playerId}`,
};

// TTL : 1 heure
export const ROOM_TTL_SECONDS = 60 * 60;
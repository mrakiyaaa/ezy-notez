import { StudyRoom } from "../../models/StudyRoom.model";

interface CreateRoomInput {
  name: string;
  host: string;
  workspaceId: string;
  quizId?: string;
  maxParticipants?: number;
}

export const studyRoomService = {
  async createRoom({
    name,
    host,
    workspaceId,
    quizId,
    maxParticipants = 50,
  }: CreateRoomInput) {
    const room = await StudyRoom.create({
      name,
      host,
      workspace: workspaceId,
      quiz: quizId,
      maxParticipants,
      participants: [{ user: host, joinedAt: new Date(), isActive: true }],
      status: "waiting",
    });

    return room;
  },

  async joinRoom(roomId: string, userId: string) {
    const room = await StudyRoom.findById(roomId);

    if (!room) {
      throw new Error("Study room not found");
    }

    if (room.participants.length >= room.maxParticipants) {
      throw new Error("Room is full");
    }

    const alreadyJoined = room.participants.some(
      (p: any) => p.user.toString() === userId
    );

    if (!alreadyJoined) {
      room.participants.push({
        user: userId as any,
        joinedAt: new Date(),
        isActive: true,
      });
      await room.save();
    }

    return room;
  },
};

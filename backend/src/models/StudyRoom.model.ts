import mongoose, { Document, Schema } from "mongoose";

export interface IStudyRoom extends Document {
  name: string;
  host: mongoose.Types.ObjectId;
  workspace: mongoose.Types.ObjectId;
  quiz?: mongoose.Types.ObjectId;
  maxParticipants: number;
  participants: Array<{
    user: mongoose.Types.ObjectId;
    joinedAt: Date;
    isActive: boolean;
  }>;
  status: "waiting" | "active" | "completed";
  createdAt: Date;
  updatedAt: Date;
}

const studyRoomSchema = new Schema<IStudyRoom>(
  {
    name: {
      type: String,
      required: true,
    },
    host: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    workspace: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    quiz: {
      type: Schema.Types.ObjectId,
      ref: "Quiz",
    },
    maxParticipants: {
      type: Number,
      default: 50,
    },
    participants: [
      {
        user: {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
        isActive: {
          type: Boolean,
          default: true,
        },
      },
    ],
    status: {
      type: String,
      enum: ["waiting", "active", "completed"],
      default: "waiting",
    },
  },
  {
    timestamps: true,
  }
);

export const StudyRoom = mongoose.model<IStudyRoom>("StudyRoom", studyRoomSchema);

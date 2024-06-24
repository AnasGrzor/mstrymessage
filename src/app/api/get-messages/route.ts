import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User";
import mongoose from "mongoose";
import { User } from "next-auth";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/options";

export async function GET(request: Request) {
  await dbConnect();
  const session = await getServerSession(authOptions);
  const _user: User = session?.user;

  if (!session || !_user) {
    return new Response(
      JSON.stringify({ success: false, message: "Not authenticated" }),
      { status: 401 }
    );
  }
  const userId = new mongoose.Types.ObjectId(_user._id);

  try {
    const user = await UserModel.aggregate([
      { $match: { _id: userId } },
      { $unwind: { path: "$message", preserveNullAndEmptyArrays: true } },
      { $sort: { "message.createdAt": -1 } },
      { $group: { _id: "$_id", message: { $push: "$message" } } },
    ]).exec();

    if (!user || user.length === 0) {
      return new Response(
        JSON.stringify({ message: "User not found", success: false }),
        { status: 404 }
      );
    }

    const messages = user[0].message;
    if (messages.length === 0 || !messages[0]) {
      return new Response(
        JSON.stringify({ message: "You have no messages", success: true }),
        { status: 200 }
      );
    }

    return new Response(JSON.stringify({ messages: messages }), {
      status: 200,
    });
  } catch (error) {
    console.error("An unexpected error occurred:", error);
    return new Response(
      JSON.stringify({ message: "Internal server error", success: false }),
      { status: 500 }
    );
  }
}

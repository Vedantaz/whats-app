import mongoose from "mongoose";
import User from "../models/User.js"; // adjust the path if needed
import { config } from "dotenv";

config(); // load .env

mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error", err));

const updateUsers = async () => {
  try {
    const result = await User.updateMany(
      { fullName: { $exists: false } }, 
      [ { $set: { fullName: "$username" } } ]
    );

    console.log(`✅ Updated ${result.modifiedCount} users`);
  } catch (err) {
    console.error("❌ Update failed", err);
  } finally {
    mongoose.connection.close();
  }
};

updateUsers();

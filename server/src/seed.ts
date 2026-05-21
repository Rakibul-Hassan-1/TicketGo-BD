import dotenv from "dotenv";
import mongoose from "mongoose";
import { User } from "./models/User";

dotenv.config();

async function seed() {
  const {
    MONGODB_URI,
    ADMIN_NAME,
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
    ADMIN_PHONE,
    ADMIN_ROLE,
  } = process.env;

  if (!MONGODB_URI) throw new Error("MONGODB_URI not defined in environment");
  if (!ADMIN_NAME) throw new Error("ADMIN_NAME not defined in environment");
  if (!ADMIN_EMAIL) throw new Error("ADMIN_EMAIL not defined in environment");
  if (!ADMIN_PASSWORD)
    throw new Error("ADMIN_PASSWORD not defined in environment");
  if (!ADMIN_PHONE) throw new Error("ADMIN_PHONE not defined in environment");

  await mongoose.connect(MONGODB_URI);

  await User.deleteOne({ email: ADMIN_EMAIL });

  await User.create({
    name: ADMIN_NAME,
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    phone: ADMIN_PHONE,
    role: ADMIN_ROLE || "admin",
    isActive: true,
  });

  console.log("✅ Admin created!");
  console.log(`   Email: ${ADMIN_EMAIL}`);
  console.log(`   Password: ${ADMIN_PASSWORD}`);
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(console.error);

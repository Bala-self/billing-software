const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const uri = process.env.MONGO_URI || "mongodb://localhost:27017/FSD_billing";

async function clearDatabase() {
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });

    const dbName = mongoose.connection.name || "FSD_billing";
    await mongoose.connection.db.dropDatabase();

    console.log(
      `✅ Database '${dbName}' has been cleared and reset to a fresh empty state.`,
    );
  } catch (error) {
    console.error("❌ Could not clear the database.");
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

clearDatabase();

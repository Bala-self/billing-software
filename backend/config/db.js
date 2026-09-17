const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      autoIndex: true, // Builds indexes in development (turn off in large-scale production)
    });

    console.log(` MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(` MongoDB Connection Error: ${err.message}`);
    process.exit(1);
  }
};

mongoose.connection.on("disconnected", () => {
  console.warn(" MongoDB connection lost. Reconnecting...");
});

module.exports = connectDB;

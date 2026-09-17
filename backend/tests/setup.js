/**
 * Jest global test DB setup.
 * Required at the top of every integration test file.
 *
 * Usage:
 *   require("./setup");  // ← at top of any test file that needs MongoDB
 */
const mongoose = require("mongoose");
const { MongoMemoryReplSet } = require("mongodb-memory-server");

let mongoServer;

beforeAll(async () => {
  // Disconnect any existing connection first (e.g. if index.js already connected)
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  mongoServer = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  const uri = mongoServer.getUri();
  await mongoose.connect(uri, { dbName: "test" });
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/quiz-app";

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// MongoDB connection
let db;
let client;

async function connectToMongoDB() {
  try {
    client = new MongoClient(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      tls: true, // Required if not using +srv
    });
    await client.connect();
    db = client.db("quiz-app");
    console.log("Connected to MongoDB successfully");

    // Create indexes for better performance
    await db.collection("questions").createIndex({ question: 1 });
    await db.collection("questions").createIndex({ category: 1 });
    await db.collection("practice-results").createIndex({ timestamp: -1 });
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
}

// Test connection endpoint
app.get("/api/test-connection", async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: "Database not connected" });
    }

    await db.admin().ping();
    res.json({
      success: true,
      status: "connected",
      message: "MongoDB connection is healthy",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: "error",
      message: error.message,
    });
  }
});

// Questions endpoints
app.get("/api/questions", async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: "Database not connected" });
    }

    const questions = await db.collection("questions").find({}).toArray();
    res.json(questions);
  } catch (error) {
    console.error("Error fetching questions:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/questions", async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: "Database not connected" });
    }

    const question = {
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("questions").insertOne(question);
    res.status(201).json({
      _id: result.insertedId,
      ...question,
    });
  } catch (error) {
    console.error("Error creating question:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/questions/bulk", async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: "Database not connected" });
    }

    const questions = req.body.map((q) => ({
      ...q,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const result = await db.collection("questions").insertMany(questions);
    res.status(201).json({
      insertedCount: result.insertedCount,
      insertedIds: result.insertedIds,
    });
  } catch (error) {
    console.error("Error bulk creating questions:", error);
    res.status(500).json({ error: error.message });
  }
});

// Import JSON-formatted questions (from Python export)
app.post("/api/questions/import-json", async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: "Database not connected" });
    }

    const data = req.body;

    if (!Array.isArray(data)) {
      return res.status(400).json({ error: "Invalid JSON format. Must be an array of questions." });
    }

    const added = [];
    const errors = [];
    const now = new Date();

    for (const [index, item] of data.entries()) {
      const { question, options, correct_answers, category, difficulty = "medium" } = item;

      if (
        typeof question !== "string" ||
        !Array.isArray(options) ||
        !Array.isArray(correct_answers)
      ) {
        errors.push(`Câu ${index + 1} không hợp lệ`);
        continue;
      }

      const correctIndex = options.findIndex((opt) =>
        correct_answers.includes(opt)
      );

      if (correctIndex === -1) {
        errors.push(`Câu ${index + 1} không tìm thấy đáp án đúng`);
        continue;
      }

      added.push({
        content: question,
        options,
        correctAnswer: correctIndex,
        category,
        difficulty,
        createdAt: now,
        updatedAt: now,
      });
    }

    if (added.length > 0) {
      await db.collection("questions").insertMany(added);
    }

    res.status(201).json({
      addedCount: added.length,
      errors,
    });
  } catch (error) {
    console.error("Error importing JSON:", error);
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/questions/:id", async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: "Database not connected" });
    }

    const { id } = req.params;
    const updateData = {
      ...req.body,
      updatedAt: new Date(),
    };

    const result = await db
      .collection("questions")
      .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Question not found" });
    }

    res.json({ message: "Question updated successfully" });
  } catch (error) {
    console.error("Error updating question:", error);
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/questions/:id", async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: "Database not connected" });
    }

    const { id } = req.params;
    const result = await db
      .collection("questions")
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Question not found" });
    }

    res.json({ message: "Question deleted successfully" });
  } catch (error) {
    console.error("Error deleting question:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/questions/check-duplicates", async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: "Database not connected" });
    }

    const { questions } = req.body;
    const duplicates = [];

    for (const question of questions) {
      const existing = await db.collection("questions").findOne({
        question: question.question,
      });

      if (existing) {
        duplicates.push({
          question: question.question,
          existingId: existing._id,
        });
      }
    }

    res.json({ duplicates });
  } catch (error) {
    console.error("Error checking duplicates:", error);
    res.status(500).json({ error: error.message });
  }
});

// Practice results endpoints
app.get("/api/practice-results", async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: "Database not connected" });
    }

    const results = await db
      .collection("practice-results")
      .find({})
      .sort({ timestamp: -1 })
      .toArray();

    res.json(results);
  } catch (error) {
    console.error("Error fetching practice results:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/practice-results", async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: "Database not connected" });
    }

    const result = {
      ...req.body,
      timestamp: new Date(),
    };

    const insertResult = await db
      .collection("practice-results")
      .insertOne(result);
    res.status(201).json({
      _id: insertResult.insertedId,
      ...result,
    });
  } catch (error) {
    console.error("Error saving practice result:", error);
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/practice-results/:id", async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: "Database not connected" });
    }

    const { id } = req.params;
    const result = await db
      .collection("practice-results")
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Practice result not found" });
    }

    res.json({ message: "Practice result deleted successfully" });
  } catch (error) {
    console.error("Error deleting practice result:", error);
    res.status(500).json({ error: error.message });
  }
});

// Statistics endpoint
app.get("/api/statistics", async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: "Database not connected" });
    }

    const [questionCount, resultCount, recentResults] = await Promise.all([
      db.collection("questions").countDocuments(),
      db.collection("practice-results").countDocuments(),
      db
        .collection("practice-results")
        .find({})
        .sort({ timestamp: -1 })
        .limit(10)
        .toArray(),
    ]);

    const avgScore =
      recentResults.length > 0
        ? recentResults.reduce((sum, r) => sum + (r.score || 0), 0) /
          recentResults.length
        : 0;

    res.json({
      totalQuestions: questionCount,
      totalResults: resultCount,
      averageScore: Math.round(avgScore * 100) / 100,
      recentResults: recentResults.slice(0, 5),
    });
  } catch (error) {
    console.error("Error fetching statistics:", error);
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    mongodb: db ? "connected" : "disconnected",
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Unhandled error:", error);
  res.status(500).json({
    error: "Internal server error",
    message: error.message,
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down gracefully...");
  if (client) {
    await client.close();
  }
  process.exit(0);
});

// Start server
async function startServer() {
  try {
    await connectToMongoDB();
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`MongoDB connected to: ${MONGODB_URI}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const morgan = require("morgan");

const app = express();
const corsOptions = {
  origin: [
    "http://localhost:4200",
    "http://angular:80",
    "http://angular",
    "http://express:3000",
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept"],
  credentials: true,
};
app.use(cors(corsOptions)); // Allow cross-origin requests
app.use(bodyParser.json());
app.use(morgan("combined")); // Add morgan middleware for logging

let dailyMeal = {};

const mongoDbUrl =
  (process.env.MONGO_DB_URL || "mongodb://localhost:27017") + "/meals";

// Connect to MongoDB
mongoose.connect(mongoDbUrl, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define a Meal schema
const mealSchema = new mongoose.Schema({
  title: String,
  ingredients: [String],
  cookingTime: Number,
  effortLevel: Number,
  imageUrl: { type: String, required: false },
  lastSelected: { type: Date, default: null },
});

// Create a Meal model
const Meal = mongoose.model("Meal", mealSchema);

// RESTful API Endpoints
// Get all meals
app.get("/api/meals", async (req, res) => {
  try {
    console.log("Fetching all meals");
    const meals = await Meal.find();
    res.json(meals);
  } catch (error) {
    console.error("Error fetching meals:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get Daily Meal
app.get("/api/meals/daily", async (req, res) => {
  try {
    console.log("Fetching daily meal");
    if (dailyMeal && dailyMeal.title) {
      res.json(dailyMeal);
      return;
    }
    await setDailyMeal();
    res.json(dailyMeal);
  } catch (error) {
    console.error("Error fetching daily meal:", error);
    res.status(500).json({ error: error.message });
  }
});

// Reset Daily Meal
app.post("/api/meals/daily/reset", async (req, res) => {
  try {
    console.log("Resetting daily meal");
    await setDailyMeal();
    res.json(dailyMeal);
  } catch (error) {
    console.error("Error resetting daily meal:", error);
    res.status(500).json({ error: error.message });
  }
});

// Add a new meal
app.post("/api/meals", async (req, res) => {
  try {
    console.log("Adding a new meal");
    const newMeal = new Meal(req.body);
    await newMeal.save();
    res.json(newMeal);
  } catch (error) {
    console.error("Error adding meal:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update a meal
app.put("/api/meals/:id", async (req, res) => {
  try {
    console.log(`Updating meal with id ${req.params.id}`);
    const updatedMeal = await Meal.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json(updatedMeal);
  } catch (error) {
    console.error(`Error updating meal with id ${req.params.id}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a meal
app.delete("/api/meals/:id", async (req, res) => {
  try {
    console.log(`Deleting meal with id ${req.params.id}`);
    await Meal.findByIdAndDelete(req.params.id);
    console.log("Meal deleted");
    if (dailyMeal._id == req.params.id) {
      await setDailyMeal();
    }
    res.json({ message: "Meal deleted" });
  } catch (error) {
    console.error(`Error deleting meal with id ${req.params.id}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Start the server
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});

async function setDailyMeal() {
  const meals = await Meal.find();

  if (!meals || meals.length === 0) {
    return null;
  }

  // Filter out the current daily meal if it exists
  const eligibleMeals = meals.filter(
    (meal) => !dailyMeal || meal._id !== dailyMeal._id
  );

  if (eligibleMeals.length === 0) {
    // Reset the daily meal to null so we can select from all meals again
    dailyMeal = null;
    // Get all meals except the one with the most recent lastSelected date
    const sortedMeals = meals.sort((a, b) => {
      if (!a.lastSelected) return -1;
      if (!b.lastSelected) return 1;
      return b.lastSelected - a.lastSelected;
    });
    // Use all meals except the most recently selected one
    return await setDailyMeal();
  }

  // Calculate weights based on lastSelected date
  const now = new Date();
  const weights = eligibleMeals.map((meal) => {
    if (!meal.lastSelected) {
      return 1; // Highest weight for never selected meals
    }

    // Calculate days since last selection
    const daysSinceLastSelected = Math.floor(
      (now - new Date(meal.lastSelected)) / (1000 * 60 * 60 * 24)
    );

    // Weight increases with days since last selection
    // Base weight is 0.1 to ensure even recently used meals have a small chance
    return Math.max(0.1, Math.min(daysSinceLastSelected / 14, 1));
  });

  // Weighted random selection
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let random = Math.random() * totalWeight;

  let selectedIndex = 0;
  for (let i = 0; i < weights.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      selectedIndex = i;
      break;
    }
  }

  // Update the selected meal's lastSelected date
  const selectedMeal = eligibleMeals[selectedIndex];
  await Meal.findByIdAndUpdate(selectedMeal._id, {
    lastSelected: now,
  });

  dailyMeal = selectedMeal;
  return selectedMeal;
}
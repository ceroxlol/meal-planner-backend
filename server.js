const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const morgan = require("morgan");

const app = express();
app.use(cors()); // Allow cross-origin requests
app.use(bodyParser.json());
app.use(morgan("combined")); // Add morgan middleware for logging

// Connect to MongoDB
mongoose.connect("mongodb://localhost:27017/meals", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define a Meal schema
const mealSchema = new mongoose.Schema({
  title: String,
  ingredients: [String],
  cookTime: Number,
  effortLevel: Number,
  imageUrl: { type: String, required: false },
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

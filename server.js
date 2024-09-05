const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors()); // Allow cross-origin requests
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/meals', { useNewUrlParser: true, useUnifiedTopology: true });

// Define a Meal schema
const mealSchema = new mongoose.Schema({
  title: String,
  ingredients: [String],
  cookTime: Number,
  effortLevel: Number,
});

// Create a Meal model
const Meal = mongoose.model('Meal', mealSchema);

// RESTful API Endpoints
// Get all meals
app.get('/api/meals', async (req, res) => {
  const meals = await Meal.find();
  res.json(meals);
});

// Add a new meal
app.post('/api/meals', async (req, res) => {
  const newMeal = new Meal(req.body);
  await newMeal.save();
  res.json(newMeal);
});

// Update a meal
app.put('/api/meals/:id', async (req, res) => {
  const updatedMeal = await Meal.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(updatedMeal);
});

// Delete a meal
app.delete('/api/meals/:id', async (req, res) => {
  await Meal.findByIdAndDelete(req.params.id);
  res.json({ message: 'Meal deleted' });
});

// Start the server
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Route = require('../models/Route');

// POST /api/routes – create route (body: name, description, destination, type, pathEncoded, pathDaysEncoded)
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, destination, type, pathEncoded, pathDaysEncoded } = req.body;
    const username = req.user.username;
    if (!username || !name || !destination || !type || !pathEncoded) {
      return res.status(400).json({ message: 'Username, name, destination, type, and pathEncoded are required' });
    }
    if (typeof pathEncoded !== 'string' || pathEncoded.trim() === '') {
      return res.status(400).json({ message: 'pathEncoded must be a non-empty string' });
    }
    if (pathDaysEncoded != null && !Array.isArray(pathDaysEncoded)) {
      return res.status(400).json({ message: 'pathDaysEncoded must be an array of strings' });
    }
    const newRoute = new Route({
      username,
      name,
      description,
      destination,
      type,
      pathEncoded,
      pathDaysEncoded: pathDaysEncoded || [],
      isSaved: true,
      savedAt: new Date(),
      lastViewedAt: new Date(),
    });
    await newRoute.save();
    res.status(201).json({ message: 'Route created successfully', route: newRoute });
  } catch (error) {
    console.error('Create route error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/routes – list current user's routes (query: saved=true|false optional)
router.get('/', auth, async (req, res) => {
  try {
    const username = req.user.username;
    const { saved } = req.query;
    let query = { username };
    let sort = { lastViewedAt: -1 };
    const limit = 60;
    if (saved === 'true') {
      query.isSaved = true;
      sort = { savedAt: -1 };
    } else if (saved === 'false') {
      query.isSaved = false;
      sort = { lastViewedAt: -1 };
    }
    const routes = await Route.find(query).sort(sort).limit(limit);
    res.json(routes);
  } catch (error) {
    console.error('Get routes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/routes/:id – get one route, update lastViewedAt
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const username = req.user.username;
    const route = await Route.findOne({ _id: id, username });
    if (!route) {
      return res.status(404).json({ message: 'Route not found' });
    }
    route.lastViewedAt = new Date();
    await route.save();
    res.json(route);
  } catch (error) {
    console.error('Get route error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/routes/:id/save – set isSaved, savedAt (body: { save: boolean })
router.patch('/:id/save', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { save } = req.body;
    const username = req.user.username;
    if (typeof save !== 'boolean') {
      return res.status(400).json({ message: 'save parameter must be a boolean' });
    }
    const route = await Route.findOne({ _id: id, username });
    if (!route) {
      return res.status(404).json({ message: 'Route not found' });
    }
    route.isSaved = save;
    route.savedAt = save ? new Date() : null;
    await route.save();
    res.json({
      message: save ? 'Route saved successfully' : 'Route unsaved successfully',
      route,
    });
  } catch (error) {
    console.error('Save route error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/routes/:id/touch – update lastViewedAt only
router.patch('/:id/touch', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const username = req.user.username;
    const route = await Route.findOne({ _id: id, username });
    if (!route) {
      return res.status(404).json({ message: 'Route not found' });
    }
    route.lastViewedAt = new Date();
    await route.save();
    res.json({ message: 'Route last viewed time updated', route });
  } catch (error) {
    console.error('Touch route error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/routes/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const username = req.user.username;
    const deletedRoute = await Route.findOneAndDelete({ _id: id, username });
    if (!deletedRoute) {
      return res.status(404).json({ message: 'Route not found' });
    }
    res.json({ message: 'Route deleted successfully' });
  } catch (error) {
    console.error('Delete route error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Create a new user
router.post('/', async (req, res) => {
  try {
    const { username, email } = req.body;
    
    if (!username || !email) {
      return res.status(400).json({ error: 'Username and email are required' });
    }

    const result = await db.run(
      'INSERT INTO users (username, email) VALUES (?, ?)',
      [username, email]
    );

    res.status(201).json({
      id: result.id,
      username,
      email,
      message: 'User created successfully'
    });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      res.status(400).json({ error: 'Username or email already exists' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Get all users
router.get('/', async (req, res) => {
  try {
    const users = await db.all('SELECT id, username, email, created_at FROM users');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const user = await db.get(
      'SELECT id, username, email, created_at FROM users WHERE id = ?',
      [req.params.id]
    );
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

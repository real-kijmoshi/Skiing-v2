const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Create a new skiing session
router.post('/', async (req, res) => {
  try {
    const { name, creator_id, location } = req.body;
    
    if (!name || !creator_id) {
      return res.status(400).json({ error: 'Name and creator_id are required' });
    }

    const result = await db.run(
      'INSERT INTO sessions (name, creator_id, location) VALUES (?, ?, ?)',
      [name, creator_id, location || null]
    );

    // Auto-join creator to the session
    await db.run(
      'INSERT INTO session_participants (session_id, user_id) VALUES (?, ?)',
      [result.id, creator_id]
    );

    res.status(201).json({
      id: result.id,
      name,
      creator_id,
      location,
      message: 'Session created successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all sessions
router.get('/', async (req, res) => {
  try {
    const sessions = await db.all(`
      SELECT s.*, u.username as creator_name,
             COUNT(DISTINCT sp.user_id) as participant_count
      FROM sessions s
      JOIN users u ON s.creator_id = u.id
      LEFT JOIN session_participants sp ON s.id = sp.session_id
      GROUP BY s.id
      ORDER BY s.start_time DESC
    `);
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get session by ID
router.get('/:id', async (req, res) => {
  try {
    const session = await db.get(`
      SELECT s.*, u.username as creator_name
      FROM sessions s
      JOIN users u ON s.creator_id = u.id
      WHERE s.id = ?
    `, [req.params.id]);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Get participants
    const participants = await db.all(`
      SELECT u.id, u.username, sp.joined_at
      FROM session_participants sp
      JOIN users u ON sp.user_id = u.id
      WHERE sp.session_id = ?
    `, [req.params.id]);

    session.participants = participants;
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Join a session
router.post('/:id/join', async (req, res) => {
  try {
    const { user_id } = req.body;
    
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    await db.run(
      'INSERT INTO session_participants (session_id, user_id) VALUES (?, ?)',
      [req.params.id, user_id]
    );

    res.json({ message: 'Joined session successfully' });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      res.status(400).json({ error: 'User already in session' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// End a session
router.patch('/:id/end', async (req, res) => {
  try {
    await db.run(
      'UPDATE sessions SET end_time = CURRENT_TIMESTAMP, status = ? WHERE id = ?',
      ['ended', req.params.id]
    );

    res.json({ message: 'Session ended successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

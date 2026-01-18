const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Update position for a user in a session
router.post('/', async (req, res) => {
  try {
    const { session_id, user_id, latitude, longitude, altitude, speed } = req.body;
    
    if (!session_id || !user_id || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ 
        error: 'session_id, user_id, latitude, and longitude are required' 
      });
    }

    const result = await db.run(
      `INSERT INTO positions (session_id, user_id, latitude, longitude, altitude, speed) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [session_id, user_id, latitude, longitude, altitude || null, speed || null]
    );

    // Update stats if speed is provided
    if (speed !== undefined) {
      await updateStats(session_id, user_id, speed, altitude);
    }

    res.status(201).json({
      id: result.id,
      message: 'Position updated successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get latest positions for all users in a session
router.get('/session/:sessionId/latest', async (req, res) => {
  try {
    const positions = await db.all(`
      SELECT p.*, u.username
      FROM positions p
      JOIN users u ON p.user_id = u.id
      WHERE p.session_id = ?
      AND p.id IN (
        SELECT MAX(id)
        FROM positions
        WHERE session_id = ?
        GROUP BY user_id
      )
      ORDER BY p.timestamp DESC
    `, [req.params.sessionId, req.params.sessionId]);
    
    res.json(positions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get position history for a user in a session
router.get('/session/:sessionId/user/:userId', async (req, res) => {
  try {
    const positions = await db.all(`
      SELECT * FROM positions
      WHERE session_id = ? AND user_id = ?
      ORDER BY timestamp DESC
      LIMIT 100
    `, [req.params.sessionId, req.params.userId]);
    
    res.json(positions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to update stats
async function updateStats(sessionId, userId, speed, altitude) {
  try {
    // Check if stats record exists
    const existing = await db.get(
      'SELECT * FROM stats WHERE session_id = ? AND user_id = ?',
      [sessionId, userId]
    );

    if (existing) {
      // Update existing stats
      const maxSpeed = Math.max(existing.max_speed, speed);
      const maxAltitude = altitude && existing.max_altitude 
        ? Math.max(existing.max_altitude, altitude)
        : altitude || existing.max_altitude;
      const minAltitude = altitude && existing.min_altitude
        ? Math.min(existing.min_altitude, altitude)
        : altitude || existing.min_altitude;

      await db.run(
        `UPDATE stats 
         SET max_speed = ?, max_altitude = ?, min_altitude = ?
         WHERE session_id = ? AND user_id = ?`,
        [maxSpeed, maxAltitude, minAltitude, sessionId, userId]
      );
    } else {
      // Create new stats record
      await db.run(
        `INSERT INTO stats (session_id, user_id, max_speed, max_altitude, min_altitude)
         VALUES (?, ?, ?, ?, ?)`,
        [sessionId, userId, speed, altitude, altitude]
      );
    }
  } catch (error) {
    console.error('Error updating stats:', error);
  }
}

module.exports = router;

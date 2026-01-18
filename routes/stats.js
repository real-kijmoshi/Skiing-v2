const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Get stats for a specific session and user
router.get('/session/:sessionId/user/:userId', async (req, res) => {
  try {
    const stats = await db.get(`
      SELECT s.*, u.username
      FROM stats s
      JOIN users u ON s.user_id = u.id
      WHERE s.session_id = ? AND s.user_id = ?
    `, [req.params.sessionId, req.params.userId]);
    
    if (!stats) {
      return res.status(404).json({ error: 'Stats not found' });
    }
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all stats for a session
router.get('/session/:sessionId', async (req, res) => {
  try {
    const stats = await db.all(`
      SELECT s.*, u.username
      FROM stats s
      JOIN users u ON s.user_id = u.id
      WHERE s.session_id = ?
      ORDER BY s.max_speed DESC
    `, [req.params.sessionId]);
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get leaderboard - top speeds across all sessions
router.get('/leaderboard/speed', async (req, res) => {
  try {
    const limit = req.query.limit || 10;
    const leaderboard = await db.all(`
      SELECT 
        u.id,
        u.username,
        s.max_speed as top_speed,
        ses.name as session_name,
        ses.location
      FROM stats s
      JOIN users u ON s.user_id = u.id
      JOIN sessions ses ON s.session_id = ses.id
      WHERE s.max_speed = (
        SELECT MAX(s2.max_speed)
        FROM stats s2
        WHERE s2.user_id = u.id
      )
      AND s.max_speed > 0
      GROUP BY u.id
      ORDER BY top_speed DESC
      LIMIT ?
    `, [limit]);
    
    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get leaderboard - total distance
router.get('/leaderboard/distance', async (req, res) => {
  try {
    const limit = req.query.limit || 10;
    const leaderboard = await db.all(`
      SELECT 
        u.id,
        u.username,
        SUM(s.total_distance) as total_distance,
        COUNT(DISTINCT s.session_id) as sessions_count
      FROM stats s
      JOIN users u ON s.user_id = u.id
      WHERE s.total_distance > 0
      GROUP BY u.id
      ORDER BY total_distance DESC
      LIMIT ?
    `, [limit]);
    
    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get leaderboard - most runs
router.get('/leaderboard/runs', async (req, res) => {
  try {
    const limit = req.query.limit || 10;
    const leaderboard = await db.all(`
      SELECT 
        u.id,
        u.username,
        SUM(s.runs_count) as total_runs,
        COUNT(DISTINCT s.session_id) as sessions_count
      FROM stats s
      JOIN users u ON s.user_id = u.id
      WHERE s.runs_count > 0
      GROUP BY u.id
      ORDER BY total_runs DESC
      LIMIT ?
    `, [limit]);
    
    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's personal stats across all sessions
router.get('/user/:userId/summary', async (req, res) => {
  try {
    const summary = await db.get(`
      SELECT 
        u.username,
        COUNT(DISTINCT s.session_id) as total_sessions,
        MAX(s.max_speed) as personal_best_speed,
        SUM(s.total_distance) as total_distance,
        SUM(s.runs_count) as total_runs,
        AVG(s.avg_speed) as overall_avg_speed,
        MAX(s.max_altitude) as highest_altitude
      FROM stats s
      JOIN users u ON s.user_id = u.id
      WHERE s.user_id = ?
    `, [req.params.userId]);
    
    if (!summary || !summary.total_sessions) {
      return res.status(404).json({ error: 'No stats found for user' });
    }
    
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

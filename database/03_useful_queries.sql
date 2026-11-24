-- ============================================================================
-- ZIP Game - Consultas SQL útiles para verificación y demostración
-- ============================================================================

USE zip_game;

-- 1. Verificar usuarios registrados (las contraseñas deben mostrarse con hash scrypt)
SELECT id, full_name, email, LEFT(password, 24) AS password_hash_preview, created_at
FROM users;

-- 2. Listar niveles sembrados y cantidad de checkpoints
SELECT id, name, difficulty, grid_size, JSON_LENGTH(clues) AS clues_count, is_generated
FROM levels
ORDER BY id ASC;

-- 3. Historial de partidas completadas con detalle de nivel y puntaje
SELECT
  gs.id AS session_id,
  u.full_name AS player,
  l.name AS level_name,
  l.difficulty,
  gs.status,
  gs.elapsed_seconds,
  gs.mistakes_count,
  gs.hints_used,
  s.points,
  gs.finished_at
FROM game_sessions gs
INNER JOIN users u ON u.id = gs.user_id
INNER JOIN levels l ON l.id = gs.level_id
LEFT JOIN scores s ON s.game_session_id = gs.id
ORDER BY gs.finished_at DESC;

-- 4. Ranking global (regla: mayor puntaje total, luego más niveles completados, luego menor tiempo promedio)
SELECT
  u.id AS user_id,
  u.full_name,
  SUM(s.points) AS total_points,
  COUNT(DISTINCT s.level_id) AS completed_levels,
  COUNT(s.id) AS total_games,
  ROUND(AVG(s.elapsed_seconds)) AS avg_elapsed_seconds
FROM scores s
INNER JOIN users u ON u.id = s.user_id
GROUP BY u.id, u.full_name
ORDER BY total_points DESC, completed_levels DESC, avg_elapsed_seconds ASC
LIMIT 20;

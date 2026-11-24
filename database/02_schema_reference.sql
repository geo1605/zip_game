-- ============================================================================
-- ZIP Game - Esquema relacional de referencia (MySQL 8)
-- Nota: Las tablas reales se crean mediante migraciones de AdonisJS Lucid
--       (node ace migration:run). Este archivo sirve como documentación y
--       referencia para el diagrama Entidad-Relación.
-- ============================================================================

USE zip_game;

CREATE TABLE users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(254) NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE auth_access_tokens (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  tokenable_id INT UNSIGNED NOT NULL,
  type VARCHAR(255) NOT NULL,
  name VARCHAR(255) NULL,
  hash VARCHAR(255) NOT NULL,
  abilities TEXT NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP NULL DEFAULT NULL,
  expires_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_access_tokens_user FOREIGN KEY (tokenable_id)
    REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE levels (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  difficulty ENUM('easy', 'medium', 'hard') NOT NULL DEFAULT 'easy',
  grid_size INT UNSIGNED NOT NULL DEFAULT 6,
  clues JSON NOT NULL COMMENT 'Lista de checkpoints [{number, cell}] con celdas 0..35',
  solution JSON NOT NULL COMMENT 'Camino hamiltoniano completo de 36 celdas [0..35]',
  is_generated TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_levels_difficulty (difficulty)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE game_sessions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  level_id INT UNSIGNED NOT NULL,
  status ENUM('in_progress', 'completed', 'abandoned') NOT NULL DEFAULT 'in_progress',
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at TIMESTAMP NULL DEFAULT NULL,
  elapsed_seconds INT UNSIGNED NOT NULL DEFAULT 0,
  mistakes_count INT UNSIGNED NOT NULL DEFAULT 0,
  hints_used INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_game_sessions_user_status (user_id, status),
  KEY idx_game_sessions_user_level (user_id, level_id),
  CONSTRAINT fk_game_sessions_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_game_sessions_level FOREIGN KEY (level_id)
    REFERENCES levels (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE game_moves (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  game_session_id INT UNSIGNED NOT NULL,
  step_order INT UNSIGNED NOT NULL,
  cell_index INT UNSIGNED NOT NULL,
  is_valid TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_game_moves_session_step (game_session_id, step_order),
  CONSTRAINT fk_game_moves_session FOREIGN KEY (game_session_id)
    REFERENCES game_sessions (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE scores (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  level_id INT UNSIGNED NOT NULL,
  game_session_id INT UNSIGNED NOT NULL,
  points INT UNSIGNED NOT NULL,
  elapsed_seconds INT UNSIGNED NOT NULL,
  mistakes_count INT UNSIGNED NOT NULL DEFAULT 0,
  hints_used INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_scores_game_session (game_session_id),
  KEY idx_scores_ranking (points, elapsed_seconds),
  KEY idx_scores_user_level (user_id, level_id),
  CONSTRAINT fk_scores_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_scores_level FOREIGN KEY (level_id)
    REFERENCES levels (id) ON DELETE CASCADE,
  CONSTRAINT fk_scores_game_session FOREIGN KEY (game_session_id)
    REFERENCES game_sessions (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

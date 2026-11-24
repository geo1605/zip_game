-- ============================================================================
-- ZIP Game - Creación de bases de datos y usuario MySQL 8
-- Ejecutar como root en MySQL Workbench, HeidiSQL o consola MySQL.
-- Reemplazar 'TU_CONTRASEÑA' antes de ejecutar en tu entorno local.
-- ============================================================================

CREATE DATABASE IF NOT EXISTS zip_game
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS zip_game_test
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'zip_user'@'localhost' IDENTIFIED BY 'TU_CONTRASEÑA';
CREATE USER IF NOT EXISTS 'zip_user'@'127.0.0.1' IDENTIFIED BY 'TU_CONTRASEÑA';

GRANT ALL PRIVILEGES ON zip_game.*      TO 'zip_user'@'localhost';
GRANT ALL PRIVILEGES ON zip_game.*      TO 'zip_user'@'127.0.0.1';
GRANT ALL PRIVILEGES ON zip_game_test.* TO 'zip_user'@'localhost';
GRANT ALL PRIVILEGES ON zip_game_test.* TO 'zip_user'@'127.0.0.1';

FLUSH PRIVILEGES;

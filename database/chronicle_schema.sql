-- ====================================================================
-- CHRONICLE – Digital Time Capsule and Memory Journey Platform
-- Database Schema (Maintained up to Second Normal Form - 2NF)
-- Database Engine: MySQL / MariaDB
-- ====================================================================

CREATE DATABASE IF NOT EXISTS `chronicle_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `chronicle_db`;

-- Drop existing tables to allow clean recreation if needed
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `Capsule_Recipients`;
DROP TABLE IF EXISTS `Capsules`;
DROP TABLE IF EXISTS `Users`;
SET FOREIGN_KEY_CHECKS = 1;

-- --------------------------------------------------------------------
-- TABLE 1: Users
-- Stores registered user accounts and identities
-- --------------------------------------------------------------------
CREATE TABLE `Users` (
  `user_id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `full_name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- --------------------------------------------------------------------
-- TABLE 2: Capsules
-- Stores capsule message, creator, category, unlock schedule, and chain link
-- Self-referencing foreign key `parent_capsule_id` enables the Capsule Journey
-- --------------------------------------------------------------------
CREATE TABLE `Capsules` (
  `capsule_id` INT AUTO_INCREMENT PRIMARY KEY,
  `creator_id` INT NOT NULL,
  `title` VARCHAR(150) NOT NULL,
  `message` TEXT NOT NULL,
  `category` VARCHAR(50) NOT NULL DEFAULT 'Personal',
  `media_url` VARCHAR(255) DEFAULT NULL,
  `unlock_date` DATETIME NOT NULL,
  `is_public` TINYINT(1) DEFAULT 0,
  `parent_capsule_id` INT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_capsule_creator` FOREIGN KEY (`creator_id`) REFERENCES `Users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_capsule_parent` FOREIGN KEY (`parent_capsule_id`) REFERENCES `Capsules` (`capsule_id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- --------------------------------------------------------------------
-- TABLE 3: Capsule_Recipients
-- Resolves the many-to-many relationship between Capsules and Users
-- Tracks recipient status (sealed, unlocked) and opening timestamp
-- --------------------------------------------------------------------
CREATE TABLE `Capsule_Recipients` (
  `recipient_id` INT AUTO_INCREMENT PRIMARY KEY,
  `capsule_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `status` ENUM('sealed', 'unlocked') DEFAULT 'sealed',
  `opened_at` DATETIME DEFAULT NULL,
  CONSTRAINT `fk_recip_capsule` FOREIGN KEY (`capsule_id`) REFERENCES `Capsules` (`capsule_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_recip_user` FOREIGN KEY (`user_id`) REFERENCES `Users` (`user_id`) ON DELETE CASCADE,
  UNIQUE KEY `uk_capsule_user` (`capsule_id`, `user_id`)
) ENGINE=InnoDB;

-- ====================================================================
-- Sample Seed Data (Aligned with Synopsis & Team Members)
-- ====================================================================

-- 1. Insert Team Members & Users
INSERT INTO `Users` (`user_id`, `username`, `full_name`, `email`, `password_hash`) VALUES
(1, 'mounika.shetty', 'Mounika Shetty', 'mounika@example.com', '$2y$10$e8wF...demoHash'),
(2, 'daron.john', 'Daron John', 'daron@example.com', '$2y$10$e8wF...demoHash'),
(3, 'sanjay.patil', 'Sanjay Patil', 'sanjay@example.com', '$2y$10$e8wF...demoHash'),
(4, 'kishan.kumar', 'Kishan Kumar', 'kishan@example.com', '$2y$10$e8wF...demoHash'),
(5, 'ananya.rao', 'Ananya Rao', 'ananya@example.com', '$2y$10$e8wF...demoHash'),
(6, 'rahul.nair', 'Rahul Nair', 'rahul@example.com', '$2y$10$e8wF...demoHash');

-- 2. Insert Sample Capsules
-- Capsule 1: Personal Letter created by Daron John for Himself
INSERT INTO `Capsules` (`capsule_id`, `creator_id`, `title`, `message`, `category`, `unlock_date`, `is_public`, `parent_capsule_id`, `created_at`) VALUES
(1, 2, 'Graduation Day', 'Reflecting on our journey through web technologies, late night coding sessions, and building Chronicle together. Don\'t forget where it all began!', 'Milestone', '2027-02-14 00:00:00', 1, NULL, '2026-10-11 10:00:00');

-- Capsule 2: Milestone capsule for Future Self (Unlocks in 2 years)
INSERT INTO `Capsules` (`capsule_id`, `creator_id`, `title`, `message`, `category`, `unlock_date`, `is_public`, `parent_capsule_id`, `created_at`) VALUES
(2, 2, 'Open When You\'re 30', 'A milestone checkpoint for your future self. Are you still coding? Have you traveled to Japan? Stay true to your principles.', 'Personal', '2028-10-11 00:00:00', 0, NULL, '2026-09-01 12:00:00');

-- Capsule 3: Origin capsule created by Mounika for Daron (Ready to unlock)
INSERT INTO `Capsules` (`capsule_id`, `creator_id`, `title`, `message`, `category`, `unlock_date`, `is_public`, `parent_capsule_id`, `created_at`) VALUES
(3, 1, 'A Letter to My Future Self', 'Dear Future Me,\n\nIf you\'re reading this, you\'ve made it. I hope the world is kinder now, and that you\'ve become someone I\'d be proud of.\n\nRemember the late nights, the doubts, the small wins that kept you going. None of it was wasted.\n\nKeep creating. Keep caring.\n\n— Past You', 'Friendship', '2026-10-10 09:00:00', 1, NULL, '2026-08-15 14:30:00');

-- Capsule 4: Continued Journey capsule (Parent is Capsule #3)
INSERT INTO `Capsules` (`capsule_id`, `creator_id`, `title`, `message`, `category`, `unlock_date`, `is_public`, `parent_capsule_id`, `created_at`) VALUES
(4, 5, 'Pass It Forward: Reflections', 'Passed on from Mounika\'s capsule chain. Passing the inspiration forward to our team!', 'Friendship', '2027-01-09 10:00:00', 1, 3, '2027-01-09 10:00:00');

-- 3. Link Recipients
-- Daron receives Capsule 1 (himself)
INSERT INTO `Capsule_Recipients` (`capsule_id`, `user_id`, `status`, `opened_at`) VALUES
(1, 2, 'sealed', NULL);

-- Daron receives Capsule 2 (himself)
INSERT INTO `Capsule_Recipients` (`capsule_id`, `user_id`, `status`, `opened_at`) VALUES
(2, 2, 'sealed', NULL);

-- Daron receives Capsule 3 from Mounika (ready/opened)
INSERT INTO `Capsule_Recipients` (`capsule_id`, `user_id`, `status`, `opened_at`) VALUES
(3, 2, 'unlocked', '2026-10-11 12:00:00');

-- Ananya receives Capsule 4
INSERT INTO `Capsule_Recipients` (`capsule_id`, `user_id`, `status`, `opened_at`) VALUES
(4, 5, 'sealed', NULL);

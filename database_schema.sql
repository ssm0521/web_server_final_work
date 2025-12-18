-- 출석 관리 시스템 데이터베이스 스키마
-- MySQL 8.0 이상 버전

-- ENUM 타입 정의
-- MySQL은 ENUM을 지원하지만, Prisma는 VARCHAR로 저장하므로 VARCHAR로 정의

-- 1. 사용자 테이블
CREATE TABLE `User` (
  `id` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `password` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `studentNumber` VARCHAR(191) NULL,
  `role` ENUM('ADMIN', 'INSTRUCTOR', 'STUDENT') NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `User_email_key` (`email`),
  INDEX `User_email_idx` (`email`),
  INDEX `User_role_idx` (`role`),
  INDEX `User_studentNumber_idx` (`studentNumber`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. 학기 테이블
CREATE TABLE `Semester` (
  `id` VARCHAR(191) NOT NULL,
  `year` INT NOT NULL,
  `term` INT NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `startDate` DATETIME(3) NOT NULL,
  `endDate` DATETIME(3) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `Semester_year_term_key` (`year`, `term`),
  INDEX `Semester_year_term_idx` (`year`, `term`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. 학과 테이블
CREATE TABLE `Department` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `code` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `Department_name_key` (`name`),
  UNIQUE KEY `Department_code_key` (`code`),
  INDEX `Department_name_idx` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. 강의/과목 테이블
CREATE TABLE `Course` (
  `id` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `code` VARCHAR(191) NOT NULL,
  `section` VARCHAR(191) NOT NULL,
  `instructorId` VARCHAR(191) NOT NULL,
  `semesterId` VARCHAR(191) NOT NULL,
  `departmentId` VARCHAR(191) NULL,
  `description` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `Course_code_section_semesterId_key` (`code`, `section`, `semesterId`),
  INDEX `Course_instructorId_idx` (`instructorId`),
  INDEX `Course_semesterId_idx` (`semesterId`),
  CONSTRAINT `Course_instructorId_fkey` FOREIGN KEY (`instructorId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `Course_semesterId_fkey` FOREIGN KEY (`semesterId`) REFERENCES `Semester` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `Course_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `Department` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. 출석 정책 테이블
CREATE TABLE `AttendancePolicy` (
  `id` VARCHAR(191) NOT NULL,
  `courseId` VARCHAR(191) NOT NULL,
  `maxAbsent` INT NOT NULL DEFAULT 3,
  `lateToAbsent` INT NOT NULL DEFAULT 3,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `AttendancePolicy_courseId_key` (`courseId`),
  CONSTRAINT `AttendancePolicy_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `Course` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. 수강신청 테이블
CREATE TABLE `Enrollment` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `courseId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `Enrollment_userId_courseId_key` (`userId`, `courseId`),
  INDEX `Enrollment_userId_idx` (`userId`),
  INDEX `Enrollment_courseId_idx` (`courseId`),
  CONSTRAINT `Enrollment_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Enrollment_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `Course` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. 수업 세션 테이블 (주차별 수업)
CREATE TABLE `ClassSession` (
  `id` VARCHAR(191) NOT NULL,
  `courseId` VARCHAR(191) NOT NULL,
  `week` INT NOT NULL,
  `startAt` DATETIME(3) NOT NULL,
  `endAt` DATETIME(3) NOT NULL,
  `room` VARCHAR(191) NULL,
  `attendanceMethod` ENUM('ELECTRONIC', 'CODE', 'ROLL_CALL') NOT NULL,
  `attendanceCode` VARCHAR(191) NULL,
  `isOpen` BOOLEAN NOT NULL DEFAULT FALSE,
  `isClosed` BOOLEAN NOT NULL DEFAULT FALSE,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `ClassSession_courseId_idx` (`courseId`),
  INDEX `ClassSession_startAt_idx` (`startAt`),
  INDEX `ClassSession_isOpen_isClosed_idx` (`isOpen`, `isClosed`),
  CONSTRAINT `ClassSession_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `Course` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. 출석 기록 테이블
CREATE TABLE `Attendance` (
  `id` VARCHAR(191) NOT NULL,
  `sessionId` VARCHAR(191) NOT NULL,
  `studentId` VARCHAR(191) NOT NULL,
  `status` ENUM('PENDING', 'PRESENT', 'LATE', 'ABSENT', 'EXCUSED') NOT NULL DEFAULT 'PENDING',
  `checkedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `Attendance_sessionId_studentId_key` (`sessionId`, `studentId`),
  INDEX `Attendance_sessionId_idx` (`sessionId`),
  INDEX `Attendance_studentId_idx` (`studentId`),
  INDEX `Attendance_status_idx` (`status`),
  CONSTRAINT `Attendance_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `ClassSession` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Attendance_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. 공결 신청 테이블
CREATE TABLE `ExcuseRequest` (
  `id` VARCHAR(191) NOT NULL,
  `sessionId` VARCHAR(191) NOT NULL,
  `studentId` VARCHAR(191) NOT NULL,
  `reason` TEXT NOT NULL,
  `reasonCode` VARCHAR(191) NULL,
  `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  `files` JSON NULL,
  `instructorComment` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `ExcuseRequest_sessionId_idx` (`sessionId`),
  INDEX `ExcuseRequest_studentId_idx` (`studentId`),
  INDEX `ExcuseRequest_status_idx` (`status`),
  CONSTRAINT `ExcuseRequest_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `ClassSession` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ExcuseRequest_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. 이의제기 테이블
CREATE TABLE `Appeal` (
  `id` VARCHAR(191) NOT NULL,
  `attendanceId` VARCHAR(191) NOT NULL,
  `studentId` VARCHAR(191) NOT NULL,
  `message` TEXT NOT NULL,
  `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  `instructorComment` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `Appeal_attendanceId_idx` (`attendanceId`),
  INDEX `Appeal_studentId_idx` (`studentId`),
  INDEX `Appeal_status_idx` (`status`),
  CONSTRAINT `Appeal_attendanceId_fkey` FOREIGN KEY (`attendanceId`) REFERENCES `Attendance` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Appeal_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. 메시지 테이블
CREATE TABLE `Message` (
  `id` VARCHAR(191) NOT NULL,
  `senderId` VARCHAR(191) NOT NULL,
  `receiverId` VARCHAR(191) NOT NULL,
  `courseId` VARCHAR(191) NULL,
  `subject` VARCHAR(191) NULL,
  `content` TEXT NOT NULL,
  `isRead` BOOLEAN NOT NULL DEFAULT FALSE,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `Message_senderId_idx` (`senderId`),
  INDEX `Message_receiverId_idx` (`receiverId`),
  INDEX `Message_isRead_idx` (`isRead`),
  CONSTRAINT `Message_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Message_receiverId_fkey` FOREIGN KEY (`receiverId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. 공지사항 테이블
CREATE TABLE `Announcement` (
  `id` VARCHAR(191) NOT NULL,
  `courseId` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `content` TEXT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `Announcement_courseId_idx` (`courseId`),
  INDEX `Announcement_createdAt_idx` (`createdAt`),
  CONSTRAINT `Announcement_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `Course` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. 투표 테이블
CREATE TABLE `Vote` (
  `id` VARCHAR(191) NOT NULL,
  `courseId` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `endAt` DATETIME(3) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `Vote_courseId_idx` (`courseId`),
  INDEX `Vote_endAt_idx` (`endAt`),
  CONSTRAINT `Vote_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `Course` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. 투표 옵션 테이블
CREATE TABLE `VoteOption` (
  `id` VARCHAR(191) NOT NULL,
  `voteId` VARCHAR(191) NOT NULL,
  `label` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `VoteOption_voteId_idx` (`voteId`),
  CONSTRAINT `VoteOption_voteId_fkey` FOREIGN KEY (`voteId`) REFERENCES `Vote` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. 투표 기록 테이블
CREATE TABLE `VoteRecord` (
  `id` VARCHAR(191) NOT NULL,
  `voteId` VARCHAR(191) NOT NULL,
  `optionId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `VoteRecord_voteId_userId_key` (`voteId`, `userId`),
  INDEX `VoteRecord_voteId_idx` (`voteId`),
  INDEX `VoteRecord_userId_idx` (`userId`),
  CONSTRAINT `VoteRecord_voteId_fkey` FOREIGN KEY (`voteId`) REFERENCES `Vote` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `VoteRecord_optionId_fkey` FOREIGN KEY (`optionId`) REFERENCES `VoteOption` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `VoteRecord_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. 알림 테이블
CREATE TABLE `Notification` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `type` ENUM('ATTENDANCE_OPEN', 'ATTENDANCE_CLOSE', 'EXCUSE_RESULT', 'APPEAL_RESULT', 'COURSE_ANNOUNCEMENT', 'VOTE_NOTIFICATION', 'ABSENCE_WARNING', 'MESSAGE_RECEIVED') NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `content` TEXT NOT NULL,
  `isRead` BOOLEAN NOT NULL DEFAULT FALSE,
  `link` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `Notification_userId_idx` (`userId`),
  INDEX `Notification_isRead_idx` (`isRead`),
  INDEX `Notification_createdAt_idx` (`createdAt`),
  CONSTRAINT `Notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. 감사 로그 테이블
CREATE TABLE `AuditLog` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NULL,
  `action` VARCHAR(191) NOT NULL,
  `targetType` VARCHAR(191) NULL,
  `targetId` VARCHAR(191) NULL,
  `oldValue` JSON NULL,
  `newValue` JSON NULL,
  `ipAddress` VARCHAR(191) NULL,
  `userAgent` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `AuditLog_userId_idx` (`userId`),
  INDEX `AuditLog_targetType_targetId_idx` (`targetType`, `targetId`),
  INDEX `AuditLog_createdAt_idx` (`createdAt`),
  CONSTRAINT `AuditLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. 시스템 설정 테이블
CREATE TABLE `system_settings` (
  `id` VARCHAR(191) NOT NULL DEFAULT 'system',
  `key` VARCHAR(191) NOT NULL,
  `value` JSON NOT NULL,
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `updatedBy` VARCHAR(191) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `SystemSettings_key_key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


import { UserRole, AttendanceStatus, AttendanceMethod, ExcuseStatus, AppealStatus, NotificationType } from '@prisma/client'

export type { UserRole, AttendanceStatus, AttendanceMethod, ExcuseStatus, AppealStatus, NotificationType }

export interface SessionUser {
  id: string
  email: string
  name: string
  role: UserRole
}



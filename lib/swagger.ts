import swaggerJsdoc from "swagger-jsdoc"

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "출석 관리 시스템 API",
      version: "1.0.0",
      description: "출석 관리 시스템의 RESTful API 문서",
      contact: {
        name: "API Support",
        email: "support@example.com",
      },
    },
    servers: [
      {
        url: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
        description: "개발 서버",
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "next-auth.session-token",
          description: "NextAuth.js 세션 쿠키",
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            error: {
              type: "string",
              description: "에러 메시지",
            },
          },
        },
        User: {
          type: "object",
          properties: {
            id: { type: "string" },
            email: { type: "string" },
            name: { type: "string" },
            role: {
              type: "string",
              enum: ["ADMIN", "INSTRUCTOR", "STUDENT"],
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Course: {
          type: "object",
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            code: { type: "string" },
            section: { type: "string" },
            instructorId: { type: "string" },
            semesterId: { type: "string" },
            departmentId: { type: "string", nullable: true },
            description: { type: "string", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        ClassSession: {
          type: "object",
          properties: {
            id: { type: "string" },
            courseId: { type: "string" },
            week: { type: "integer" },
            startAt: { type: "string", format: "date-time" },
            endAt: { type: "string", format: "date-time" },
            room: { type: "string", nullable: true },
            attendanceMethod: {
              type: "string",
              enum: ["ELECTRONIC", "CODE", "ROLL_CALL"],
            },
            attendanceCode: { type: "string", nullable: true },
            isOpen: { type: "boolean" },
            isClosed: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Attendance: {
          type: "object",
          properties: {
            id: { type: "string" },
            sessionId: { type: "string" },
            studentId: { type: "string" },
            status: {
              type: "string",
              enum: ["PENDING", "PRESENT", "LATE", "ABSENT", "EXCUSED"],
            },
            checkedAt: { type: "string", format: "date-time", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        ExcuseRequest: {
          type: "object",
          properties: {
            id: { type: "string" },
            sessionId: { type: "string" },
            studentId: { type: "string" },
            reason: { type: "string" },
            reasonCode: { type: "string", nullable: true },
            status: {
              type: "string",
              enum: ["PENDING", "APPROVED", "REJECTED"],
            },
            files: { type: "array", items: { type: "string" }, nullable: true },
            instructorComment: { type: "string", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Appeal: {
          type: "object",
          properties: {
            id: { type: "string" },
            attendanceId: { type: "string" },
            studentId: { type: "string" },
            message: { type: "string" },
            status: {
              type: "string",
              enum: ["PENDING", "APPROVED", "REJECTED"],
            },
            instructorComment: { type: "string", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
      },
    },
    security: [
      {
        cookieAuth: [],
      },
    ],
  },
  apis: [
    "./app/api/**/*.ts", // API 라우트 파일 경로
  ],
}

export const swaggerSpec = swaggerJsdoc(options)


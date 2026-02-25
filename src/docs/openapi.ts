import swaggerJsdoc from 'swagger-jsdoc';

export const openapi_spec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Mycelium API',
      version: '1.0.0',
      description: 'Gallery NAS API',
    },
    servers: [
      { url: 'http://localhost:8888', description: 'Local Dev' },
      { url: 'http://localhost:3001', description: 'Docs Sandbox DB' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Firebase UID', example: 'abc123uid' },
            email: { type: 'string', format: 'email', example: 'jane@example.com' },
            name: { type: 'string', nullable: true, example: 'Jane Doe' },
            first_name: { type: 'string', nullable: true, example: 'Jane' },
            last_name: { type: 'string', nullable: true, example: 'Doe' },
            date_of_birth: { type: 'string', format: 'date', nullable: true, example: '1990-06-15' },
            onboarding_complete: { type: 'boolean', example: false },
            media_library_permission_granted: { type: 'boolean', example: false },
            device_info: { type: 'string', nullable: true, example: null },
            created_at: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00.000Z' },
          },
        },
        MediaItem: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' },
            user: { type: 'string', description: 'Firebase UID of the owner', example: 'abc123uid' },
            file_path: { type: 'string', example: '/storage/images/originals/uuid.jpg' },
            file_name: { type: 'string', example: 'photo.jpg' },
            mime_type: { type: 'string', example: 'image/jpeg' },
            media_type: { type: 'string', enum: ['image', 'video'], example: 'image' },
            file_size: { type: 'integer', nullable: true, example: 2048000 },
            width: { type: 'integer', nullable: true, example: 1920 },
            height: { type: 'integer', nullable: true, example: 1080 },
            duration_secs: { type: 'number', nullable: true, example: null },
            taken_at: { type: 'string', format: 'date-time', nullable: true, example: null },
            is_vaulted: { type: 'boolean', example: false },
            processing_status: {
              type: 'string',
              enum: ['uploaded', 'processing', 'done', 'failed'],
              example: 'uploaded',
            },
            thumbnail_path: { type: 'string', nullable: true, example: null },
            placeholder_path: { type: 'string', nullable: true, example: null },
            hls_dir: { type: 'string', nullable: true, example: null },
            video_thumb_path: { type: 'string', nullable: true, example: null },
            rotation: { type: 'integer', nullable: true, example: null },
            codec: { type: 'string', nullable: true, example: null },
            error_message: { type: 'string', nullable: true, example: null },
            deleted_at: { type: 'string', format: 'date-time', nullable: true, example: null },
            created_at: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00.000Z' },
            updated_at: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00.000Z' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Unauthorized' },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
  },
  apis: ['./src/routes/*.ts'],
});

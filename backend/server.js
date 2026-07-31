/**
 * Laundry Management System - RESTful API
 * Main Entry Point
 * Author: TIM 03 - Rekayasa Web
 */

const express = require('express');
const cors = require('cors');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config();

const routes = require('./src/routes');
const { runOnStartup, healthCheck } = require('./migrations/runner');

// Initialize Express app
const app = express();

// Middleware
// Parse CORS_ORIGIN from comma-separated string to array
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : '*';

app.use(cors({
  origin: allowedOrigins === '*'
    ? '*'
    : (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, etc)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Welcome route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Laundry Management System API',
    version: '1.0.0',
    documentation: '/api-docs',
    endpoints: {
      auth: '/api/v1/auth',
      users: '/api/v1/users',
      customers: '/api/v1/customers',
      orders: '/api/v1/orders',
      services: '/api/v1/services',
      payments: '/api/v1/payments',
      stats: '/api/v1/stats'
    }
  });
});

// API Routes
app.use('/api/v1', routes);

// Swagger Configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Laundry Management System API',
      version: '1.0.0',
      description: `
        RESTful API untuk Laundry Management System

        ## Features
        - JWT Authentication & Role-Based Access Control
        - Full CRUD untuk 7 resource
        - Order status tracking dengan audit trail
        - Payment management dengan auto-update status
        - Dashboard statistics

        ## Entity Codes (Hybrid ID Strategy)
        Setiap entity utama punya **business code** publik di samping PK INT internal.
        Semua endpoint dengan path param \`{id}\` menerima **baik integer (legacy) maupun code**.

        | Entity    | Code Format              | Contoh               |
        |-----------|--------------------------|----------------------|
        | users     | \`USR-XXXXXX\`            | \`USR-7KQ2M9\`        |
        | customers | \`CUS-XXXXXX\`            | \`CUS-4F8KP2\`        |
        | services  | \`SVC-NN\`                | \`SVC-01\`            |
        | orders    | \`ORD-YYMMDD-XXXXXX\`     | \`ORD-260614-K7M2QF\` |
        | payments  | \`PAY-YYMMDD-XXXXXX\`     | \`PAY-260614-9F2K4M\` |

        Random segment: Base32 Crockford (tanpa I/L/O/U). Code **case-insensitive** di input,
        disimpan uppercase. Contoh: \`GET /customers/CUS-4F8KP2\` ≡ \`GET /customers/5\`.

        Pada payload create order, referensi entity juga menerima code:
        \`customer_code\` / \`customer_id\`, \`items[].service_code\` / \`items[].service_id\`.

        ## Authentication
        Sebagian besar endpoint memerlukan JWT token. Gunakan endpoint POST /api/v1/auth/login untuk mendapatkan token.

        ## Roles
        - **admin**: Akses penuh ke semua endpoint
        - **pegawai**: Akses terbatas (tidak bisa CRUD users, services write, dll)

        ## Default Credentials
        - Admin: username=admin, password=password123
        - Pegawai: username=pegawai1, password=password123
      `,
      contact: {
        name: 'TIM 03 - Rekayasa Web'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token yang didapat dari login'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              example: 'Error message'
            }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              example: 'Success message'
            },
            data: {
              type: 'object'
            }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start Server with Migrations
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║     Laundry Management System - RESTful API             ║');
    console.log('╚══════════════════════════════════════════════════════════╝');

    // Run migrations on startup
    console.log('🔄 Running database migrations...');
    await runOnStartup();

    // Health check - verify critical migrations
    console.log('🏥 Running migration health check...');
    const healthResult = await healthCheck();

    if (!healthResult.healthy) {
      console.error('❌ Migration health check failed!');
      console.error(`⚠️  Error: ${healthResult.error}`);
      console.error('⚠️  Server will continue, but some features may not work correctly.');
      console.error('⚠️  Please check database connection and migration files.');
    } else {
      console.log('✅ Migration health check passed!');
    }

    // Start listening
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📚 API Docs: http://localhost:${PORT}/api-docs`);
      console.log(`🔗 Base URL: http://localhost:${PORT}/api/v1`);
      console.log('╔══════════════════════════════════════════════════════════╗');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

// Start server asynchronously
startServer();

module.exports = app;

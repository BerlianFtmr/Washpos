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

// Initialize Express app
const app = express();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
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

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║     Laundry Management System - RESTful API             ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📚 API Docs: http://localhost:${PORT}/api-docs`);
  console.log(`🔗 Base URL: http://localhost:${PORT}/api/v1`);
  console.log('╔══════════════════════════════════════════════════════════╗');
});

module.exports = app;

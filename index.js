const fastify = require('fastify')({ logger: true });
const mongoose = require('mongoose');
const gameRoutes = require('./route-services/game/routes');
const path = require('path');

// Register environment variables
require('dotenv').config();

// Register handlebars view engine
fastify.register(require('@fastify/view'), {
    engine: {
        handlebars: require('handlebars')
    },
    root: path.join(__dirname, 'views'),
    layout: 'layouts/main.handlebars'
});

// Register static file serving
fastify.register(require('@fastify/static'), {
    root: path.join(__dirname, 'public')
});

// Add route for the game page
fastify.get('/', async (request, reply) => {
    return reply.view('game.handlebars');
});

async function registerSwagger(fastify) {
    await fastify.register(require('@fastify/swagger'), {
        swagger: {
            info: {
                title: 'Tango Game API',
                description: 'Tango Game API documentation',
                version: '1.0.0'
            },
        }
    });

    await fastify.register(require('@fastify/swagger-ui'), {
        routePrefix: '/documentation',
        uiConfig: {
            docExpansion: 'none'
        },
        staticCSP: false
    });
}

registerSwagger(fastify);

// Register routes
fastify.register(gameRoutes);

// Database connection
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/tango');
        fastify.log.info('MongoDB connected successfully');
    } catch (err) {
        fastify.log.error('MongoDB connection error:', err);
        process.exit(1);
    }
};

fastify.register(require('@fastify/cors'), {
  origin: '*', // In production, replace with your actual domain
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
})

// Start server
const start = async () => {
    try {
        await connectDB();
        await fastify.listen({ port: process.env.PORT || 5003, host: '0.0.0.0' });
        fastify.log.info(`Server is running on ${fastify.server.address().port}`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
const { Pool } = require('pg');
require('dotenv').config();

// Check if we should use mock database
const useRealDatabase = process.env.DB_PASSWORD && process.env.DB_PASSWORD !== 'your_postgres_password';

let pool;
let usingMockDb = false;

if (useRealDatabase) {
    // Database connection pool
    pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'carcleaning010',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    });
} else {
    console.log('🎯 Using mock database for testing - configure real database in .env for full functionality');
    const mockDb = require('./mock');
    usingMockDb = true;
    
    // Export mock database functions directly
    module.exports = mockDb;
}

// Only setup pool events if using real database
if (!usingMockDb && pool) {
    // Test connection
    pool.on('connect', () => {
        console.log('✅ Connected to PostgreSQL database');
    });

    pool.on('error', (err) => {
        console.error('❌ Unexpected error on idle client', err);
        process.exit(-1);
    });
}

// Only export real database functions if using real database
if (!usingMockDb && pool) {
    // Helper function voor queries
    const query = async (text, params) => {
        const start = Date.now();
        try {
            const res = await pool.query(text, params);
            const duration = Date.now() - start;
            console.log('📊 Query executed', { text: text.slice(0, 50) + '...', duration, rows: res.rowCount });
            return res;
        } catch (error) {
            console.error('❌ Database query error:', error);
            throw error;
        }
    };

    // Helper function voor transactions
    const transaction = async (callback) => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    };

    // Export pool en helpers
    module.exports = {
        pool,
        query,
        transaction,
        
        // Database health check
        async healthCheck() {
            try {
                const result = await query('SELECT NOW() as current_time');
                return { status: 'healthy', timestamp: result.rows[0].current_time };
            } catch (error) {
                return { status: 'error', error: error.message };
            }
        },

        // Close connection (voor graceful shutdown)
        async close() {
            await pool.end();
            console.log('🔌 Database connection closed');
        }
    };
}
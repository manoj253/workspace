const { Pool } = require('pg');

let pool = null;

exports.getDbConnection = async (config) => {
    if (!pool) {
        pool = new Pool({
            user: config.username,
            host: config.host,
            database: config.dbname,
            password: config.password,
            port: config.port,
            max: 1,
            idleTimeoutMillis: 120000,
            connectionTimeoutMillis: 10000
        });

        pool.on('error', (err) => {
            console.error('Unexpected error on idle client', err);
            process.exit(-1);
        });
    }
    
    return await pool.connect();
};

exports.closePool = async () => {
    if (pool) {
        await pool.end();
        pool = null;
    }
}; 
const { Pool } = require('pg');

  const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'posdb',
    password: '12345',
    port: 5432,
  });

  
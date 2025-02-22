const mssql = require('mssql');
const config = {
    user: "sa",
    password: "my-secret-pw",
    database: "Northwind",
    server: "localhost",
    pool: {
        min: 0,
        max: 10,
        idleTimeoutMillis: 30000
    },
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

async function q(sql) {
    let pool;
    try {
        pool = await mssql.connect(config);
        const result = await pool.request().query(sql);
        return result;
    } catch (err) {
        console.error('SQL error', err);
        throw err;
    } finally {
        if (pool) {
            pool.close();
        }
    }
}
q('SELECT * FROM Customers').then(result => {
    console.log(result.recordset);
}).catch(err => {
    console.error('Error', err);
});
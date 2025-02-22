const oracledb = require('oracledb');
var pool = null;

try {
    oracledb.initOracleClient({
        libDir: '/home/dperezs/cliente_oracle' 
    });
} catch (err) {
    console.error('Whoops!');
    console.error(err);
}

async function getPool(con){
    return new Promise(async (resolve, reject) => {
        if (pool) resolve(pool);
        try {
            pool = await oracledb.createPool(con);
            resolve(pool);
        } catch (err) {
            reject(err);
        }
    });
}

async function q(sql, parameters){
    let connection;
    await getPool({
        user: "C##DATOS",
        password: "datos",
        connectString: "localhost:1521/xe",
        poolAlias: "curso"
    });
    try {
        connection = await oracledb.getConnection("curso");
        const result = await connection.execute(sql, parameters, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        console.log(result.rows);
    } catch (err) {
        console.error('Error executing query:', err);
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
}

q("SELECT * FROM Customers", []);
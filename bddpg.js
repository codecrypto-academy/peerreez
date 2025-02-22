const { Pool } = require('pg');

const poolPg = new Pool({
    user: "postgres",
    host: "localhost",
    database: "postgres",
    password: "my-secret-pw",
    port: 5432
});

function q(sql, parametros = []) {
    return new Promise((resolve, reject) => {
        poolPg.connect((err, client, done) => {
            if (err) {
                reject(err);
                return;
            }
            client.query(sql, parametros, (err, rows) => {
                done();
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    });
}
q("SELECT * FROM Customers", []).then(datos => {
    console.log(datos);
}).catch(error => {
    console.error(error);
}).finally(() => {
    console.log("Fin de la ejecución");
});
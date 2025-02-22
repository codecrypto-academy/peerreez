const mysql = require("mysql8"); // Asegúrate de que el módulo correcto esté instalado
const pool = mysql.createPool({
    host: "localhost",
    port: 3306,
    user: "root",
    password: "my-secret-pw",
    database: "northwind"
});

function q(sql) {
    return new Promise((resolve, reject) => {
        pool.query(sql, (error, result, fields) => {
            if (error) reject(error);
            resolve(result);
        });
    });
}
q("SELECT * FROM Customers LIMIT 1").then(datos => {
    console.log(datos);
}).catch(error => {
    console.error(error);
});
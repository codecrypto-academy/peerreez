const mysql = require("mysql8")

var pool = mysql.createPool({
    connectionLimit: 1,
    host: 'localhost',
    user: 'root',
    password: 'my-secret-pw',
    database: 'northwind',
    port: 3306
})

function q (sql, parameters){
    return new Promise((resolve, reject)=>{
        pool.query(sql, parameters, function(err, results, fields){
            if (err){
                reject(err)
                return
            }
            return resolve([results, fields])
        })

    })
}

module.exports = {
    q
}
npx nodemon generar-claves.js --name dps

npx nodemon encriptar-fichero.js --private dps --public mvp --data fichero.txt
npx nodemon desencriptar-fichero.js --private mvp --public dps --data fichero.txt

npx nodemon encriptar-fichero-stream.js --private dps --public mvp --data fichero.txt
npx nodemon desencriptar-fichero-stream.js --private mvp --public dps --data fichero.txt

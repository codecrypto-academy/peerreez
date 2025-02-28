const {createCipheriv, createECDH} = require('crypto');
const { exit } = require('process');
const args = require('yargs').argv;
const fs = require('fs');

if (!args.private && !args.public && !args.data) {
  console.error('Faltan argumentos');
  exit(0);
}
const origen = createECDH('secp521r1');
const key = fs.readFileSync("./data/" + args.private + ".key").toString();
origen.setPrivateKey(key, 'hex');

const pub = fs.readFileSync("./data/" + args.public + ".pb").toString();

const secret = Uint8Array.from(origen.computeSecret(pub, 'hex', 'binary'));

// Ciframos el fichero
const algo = 'aes-256-ctr';
const cifrador = createCipheriv(algo, secret.slice(0,32), secret.slice(0, 16));
const texto = fs.readFileSync("./data/"+args.data);
let encriptado = cifrador.update(texto, 'utf8', 'hex');
encriptado += cifrador.final('hex');
console.log(encriptado);
fs.writeFileSync("./data/"+args.public+"-"+args.data+ ".enc", encriptado);
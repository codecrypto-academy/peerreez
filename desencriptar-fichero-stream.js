const {createECDH, createDecipheriv} = require("crypto")
const args = require("yargs").argv
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

// Desciframos el fichero
const algo = 'aes-256-ctr';
const descifrador = createDecipheriv(algo, secret.slice(0,32), secret.slice(0, 16));
const imputFile = "./data/"+args.private+ "-" + args.data+ ".enc"
const outputFile = "./data/"+args.private+ "-" + args.data+ ".des"
fs.createReadStream(imputFile)
.pipe(descifrador)
.pipe(new fs.createWriteStream(outputFile))
const express = require("express");
const { Web3 } = require("web3"); // Fíjate en las llaves { Web3 }
const cors = require('cors');
const app = express();

const URL_INFURA = "https://mainnet.infura.io/v3/b02d687800a0479e9d783b40c80dea43";
const web3 = new Web3(URL_INFURA);

app.use(cors());

app.get("/", async (req, res) => {
    try {
        const bloque = await web3.eth.getBlockNumber();
        res.json({ bloque: Number(bloque) }); // Convertimos BigInt a Number
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.get("/bloque/:bloque", async (req, res) => {
    try {
        const bloque = await web3.eth.getBlock(req.params.bloque);
        
        // Convertimos todos los BigInt a String
        const bloqueLimpio = JSON.parse(JSON.stringify(bloque, (key, value) =>
            typeof value === "bigint" ? value.toString() : value
        ));

        res.json(bloqueLimpio);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get("/tx/:tx", async (req, res) => {
    try {
        const tx = await web3.eth.getTransaction(req.params.tx);

        // Convertimos todos los BigInt a String
        const txLimpia = JSON.parse(JSON.stringify(tx, (key, value) =>
            typeof value === "bigint" ? value.toString() : value
        ));

        res.json(txLimpia);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get("/balance/:address", async (req, res) => {
    try {
        const balance = await web3.eth.getBalance(req.params.address);
        const balanceInWei = BigInt(balance).toString(); // Asegura que sea un string
        res.json({
            balance: balanceInWei,
            ethers: web3.utils.fromWei(balanceInWei, "ether")
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(3333, () => console.log("Servidor corriendo en puerto 3333"));

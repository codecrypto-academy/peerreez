require('dotenv').config();
const {Web3} = require('web3');

// Conéctate a tu nodo Ethereum
const web = new Web3('http://localhost:6017');

// Dirección de la cuenta que realizará la transacción (actualizada)
const fromAddress = '0xCB7291CAAa10683f2E8761F1e8d50F66713267D2';

// Dirección de destino
const toAddress = '0x197406734F7E9F66075DF9977Cf21F60bD9F6cCf';

// Monto en Wei (reducido para pruebas)
const valueInWei = web.utils.toWei('200', 'ether'); // Reducido a 0.01 ETH

// Gas fijo para transferencias simples
const GAS_LIMIT = 21000; // Como número

// Verificar que la clave privada existe
if (!process.env.PRIVATE_KEY) {
    console.error('Error: La clave privada no está definida en el archivo .env');
    process.exit(1);
}

// Función para verificar el saldo de la cuenta
async function checkBalance() {
    try {
        const balance = await web.eth.getBalance(fromAddress);
        const gasPrice = await web.eth.getGasPrice();
        const totalCost = BigInt(valueInWei) + (BigInt(GAS_LIMIT) * BigInt(gasPrice));
        
        console.log('Balance actual:', web.utils.fromWei(balance, 'ether'), 'ETH');
        console.log('Costo total estimado:', web.utils.fromWei(totalCost.toString(), 'ether'), 'ETH');
        
        if (BigInt(balance) < totalCost) {
            console.log('Error: Saldo insuficiente para realizar la transacción.');
            console.log('Se necesita:', web.utils.fromWei(totalCost.toString(), 'ether'), 'ETH');
            console.log('Se tiene:', web.utils.fromWei(balance, 'ether'), 'ETH');
            return false;
        }
        return true;
    } catch (error) {
        console.error('Error al obtener el saldo:', error);
        return false;
    }
}

// Función para enviar la transacción
async function sendTransaction() {
    try {
        // Verificar saldo
        const hasBalance = await checkBalance();
        if (!hasBalance) return;

        // Obtener el chainId
        const chainId = await web.eth.getChainId();
        console.log('Chain ID:', chainId);

        // Obtener el precio del gas actual
        const gasPrice = await web.eth.getGasPrice();
        console.log('Gas Price:', gasPrice, 'wei');

        // Obtener el nonce
        const nonce = await web.eth.getTransactionCount(fromAddress);

        // Crear la transacción
        const tx = {
            from: fromAddress,
            to: toAddress,
            value: valueInWei,
            gas: GAS_LIMIT,
            gasPrice: gasPrice,
            nonce: nonce,
            chainId: chainId
        };

        console.log('Transacción a enviar:', tx);

        // Usar la clave privada desde .env
        const signedTx = await web.eth.accounts.signTransaction(tx, process.env.PRIVATE_KEY);
        console.log('Transacción firmada');
        
        const receipt = await web.eth.sendSignedTransaction(signedTx.rawTransaction);
        console.log('Transacción enviada:', receipt);
    } catch (error) {
        console.error('Error al enviar la transacción:', error);
    }
}

// Ejecutar la función para enviar la transacción
sendTransaction();

async function getTransactionDetails(txHash) {
    try {
        // Obtener los detalles de la transacción
        const tx = await web.eth.getTransaction(txHash);
        console.log('\nDetalles de la transacción:');
        console.log('------------------------');
        console.log('Hash:', tx.hash);
        console.log('De:', tx.from);
        console.log('Para:', tx.to);
        console.log('Valor:', web.utils.fromWei(tx.value, 'ether'), 'ETH');
        console.log('Gas Price:', web.utils.fromWei(tx.gasPrice, 'gwei'), 'Gwei');
        console.log('Gas Limit:', tx.gas);
        console.log('Nonce:', tx.nonce);
        console.log('Block Number:', tx.blockNumber);

        // Obtener el recibo de la transacción para más detalles
        const receipt = await web.eth.getTransactionReceipt(txHash);
        console.log('\nRecibo de la transacción:');
        console.log('------------------------');
        console.log('Estado:', receipt.status ? 'Exitosa' : 'Fallida');
        console.log('Gas Usado:', receipt.gasUsed);
        console.log('Bloque:', receipt.blockNumber);
        console.log('Confirmaciones:', await web.eth.getBlockNumber() - receipt.blockNumber);

    } catch (error) {
        console.error('Error al obtener los detalles de la transacción:', error);
    }
}

// Llamar a la función con el hash de la transacción
getTransactionDetails('0x78745d6a21b1154034181cbcbb22b13e2d36efe80a72d4041537ce22b2893c2d');

import pkg from 'elliptic';
const { ec: EC } = pkg;
import { ethers } from 'ethers';
import { Buffer } from 'buffer';
import keccak256 from 'keccak256';
import fs from 'fs';

async function callApi(url, method, params) {
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 })
    });
    const json = await response.json();
    return json;
}

function createKeys(ip) {
    const ec = new EC('secp256k1');
    const keyPair = ec.genKeyPair();
    const privateKey = keyPair.getPrivate('hex');
    const publicKey = keyPair.getPublic('hex');
    const pubKeyBuffer = keccak256(Buffer.from(publicKey.slice(2), 'hex'));
    const address = pubKeyBuffer.toString('hex').slice(-40);
    const enode = `enode://${publicKey.slice(2)}@${ip}:30303`;
    return { privateKey, publicKey, address, enode };
}

async function getBalance(url, address) {
    const data = await callApi(url, 'eth_getBalance', [address, 'latest']);
    return BigInt(data.result);
}

async function transferFrom(url, fromPrivate, to, amount) {
    const wallet = new ethers.Wallet(fromPrivate);
    const provider = new ethers.JsonRpcProvider(url);
    const connectedWallet = wallet.connect(provider);
    const tx = await connectedWallet.sendTransaction({
        to: to,
        value: ethers.parseEther(amount.toString())
    });
    const receipt = await tx.wait();
    return receipt;
}

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    switch (command) {
        case 'create-keys': {
            const ip = args[1];
            const dir = args[2] || '.';
            if (!ip) { console.error('IP is required'); process.exit(1); }
            const keys = createKeys(ip);
            fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(`${dir}/key.priv`, keys.privateKey);
            fs.writeFileSync(`${dir}/key.pub`, keys.publicKey);
            fs.writeFileSync(`${dir}/address`, keys.address);
            fs.writeFileSync(`${dir}/enode`, keys.enode);
            console.log('Keys created successfully');
            break;
        }
        case 'balance': {
            const address = args[1];
            const url = args[2] || 'http://localhost:8545';
            if (!address) { console.error('Address required'); process.exit(1); }
            try {
                const balance = await getBalance(url, address);
                console.log('Balance:', ethers.formatEther(balance), 'ETH');
            } catch (e) { console.error('Error:', e); process.exit(1); }
            break;
        }
        case 'transfer': {
            const fromPrivate = args[1];
            const to = args[2];
            const amount = args[3];
            const url = args[4] || 'http://localhost:8545';
            if (!fromPrivate || !to || !amount) { console.error('From, To and Amount required'); process.exit(1); }
            try {
                const tx = await transferFrom(url, fromPrivate, to, amount);
                console.log('Transaction sent:', tx);
            } catch (e) { console.error('Error:', e); process.exit(1); }
            break;
        }
        default:
            console.error('Unknown command');
            process.exit(1);
    }
}

main().catch(err => { console.error('Error:', err); process.exit(1); });

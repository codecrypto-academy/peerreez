import pkg from 'elliptic';
const { ec: EC } = pkg;
import { ethers, id } from 'ethers';

import { Buffer } from 'buffer';
import keccak256 from 'keccak256';
import fs from 'fs';

async function callApi(url, method, params) {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            jsonrpc: '2.0',
            method: method,
            params: params,
            id: 1
        })
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
    return {
        privateKey,
        publicKey,
        address,
        enode
    };
}

async function getBalance(url, address) {
    const data = await callApi(url, 'eth_getBalance', [address, 'latest']);
    return BigInt(data.result);
}
async function getBlockNumber(url) { }
async function transferFrom(url, fromPrivate, to, amount) {

    const wallet = new ethers.Wallet(fromPrivate);
    const provider = new ethers.JsonRpcProvider(url, {
        chainId: 55255,
        name: "private"
    });

    const connectedWallet = wallet.connect(provider);
    const tx = await connectedWallet.sendTransaction({
        to: to,
        value: ethers.parseEther(amount.toString())
    });
    const receipt = await tx.wait();
    return receipt;
}

async function getNextworkInfo(url) {
    const version = await callApi("http://localhost:8888", "net_version", []);
    const peerCount = await callApi("http://localhost:8888", "net_peerCount", []);
    return {
        version,
        peerCount
    }
}
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    switch (command) {
        case 'create-keys':
            const ip = args[1];
            if (!ip) {
                console.error('IP is required');
                process.exit(1);
            }
            const keys = createKeys(ip);
            fs.writeFileSync('./key.priv', keys.privateKey);
            fs.writeFileSync('./key.pub', keys.publicKey);
            fs.writeFileSync('./address', keys.address);
            fs.writeFileSync('./enode', keys.enode);
            console.log('Keys created successfully');
            break;
        case 'network-info':
            const url = args[1] || 'http://localhost:8888';
            const info = await getNextworkInfo(url);
            console.log('Network Info:', info);
            break;
        case 'balance':
            const balanceAddrees = args[1];
            if (!balanceAddrees) {
                console.error('Address is required');
                process.exit(1);
            }
            try {
                const balance = await getBalance("http://localhost:8888", balanceAddrees);
                console.log('Balance:', ethers.formatEther(balance), 'ETH');
            } catch (e) {
                console.error('Error:', e);
                process.exit(1);
            }
            break
        case 'transfer':
            const fromPrivateKey = args[1];
            const toAddress = args[2];
            const amount = args[3];
            if (!fromPrivateKey || !toAddress || !amount) {
                console.error('From, To and Amount are required');
                process.exit(1);
            }
            try {
                const tx = await transferFrom("http://localhost:8888", fromPrivateKey, toAddress, amount);
                console.log('Transaction sent:', tx);
            } catch (e) {
                console.error('Error:', e);
                process.exit(1);
            }
            break;
        default:
            console.error('Unknown command');
            process.exit(1);
    }
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
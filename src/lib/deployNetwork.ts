// deployNetwork.ts
// Crea una red Besu con los parámetros dados

import { fileURLToPath } from 'url';
import path from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { exec as _exec } from 'child_process';
import { promisify } from 'util';
import { mkdir, writeFile } from 'fs/promises';
import crypto from 'crypto';

const exec = promisify(_exec);

/**
 * Despliega una red Besu con los parámetros dados.
 * Replica la lógica de deploy.sh
 * @param networkName Nombre de la red
 * @param chainId Chain ID de la red
 */
export async function deployNetwork(networkName: string, chainId: number): Promise<void> {
    // --- Helpers deben ir antes de su uso ---
    async function generarClavesNodo(dir: string, ip: string, nodo: string) {
        console.log(`Generando claves para nodo ${nodo}...`);
        await exec(`cd "${dir}" && node ../../../../scripts/operations.mjs create-keys "${ip}"`);
    }

    async function generarClaveAccount(dir: string) {
        const ip = '172.30.0.30';
        console.log('Generando claves para la cuenta adicional (account)...');
        await exec(`cd "${dir}" && node ../../../../scripts/operations.mjs create-keys "${ip}"`);
    }
    if (!networkName || !chainId) throw new Error('networkName y chainId son requeridos');

    // 1. Verificar requisitos (docker, node, operations.mjs)
    await verificarRequisitos();
    // 2. Buscar subred disponible
    const redSubnet = await buscarSubredDisponible(networkName);
    if (!redSubnet) throw new Error('No hay subredes libres disponibles en 172.30.0.0/16, 172.31.0.0/16 ni 172.32.0.0/16');
    console.log(`Subred seleccionada: ${redSubnet}`);
    // 3. Calcular IPs y puertos
    // Asignar IPs en la subred
    const bootIp = redSubnet.replace('0/24', '20');
    const bootKeyIp = redSubnet.replace('0/24', '21');
    const minerIp = redSubnet.replace('0/24', '22');
    const minerKeyIp = minerIp;

    // Función para calcular puertos únicos por red
    function calcularPuerto(base: number, offset: number, name: string): number {
        const hash = crypto.createHash('md5').update(name).digest('hex').slice(0, 2);
        const dec = parseInt(hash, 16);
        return base + dec + offset;
    }

    const rpcBase = calcularPuerto(8500, 0, networkName);
    const rpcPub = calcularPuerto(8800, 0, networkName);
    const minerRpc = calcularPuerto(8500, 1, networkName);
    const minerRpcPub = calcularPuerto(8800, 1, networkName);

    // Nodos RPC extra
    const extraRpcCount = 2;
    const extraRpc: number[] = [];
    const extraRpcIps: string[] = [];
    for (let i = 0; i < extraRpcCount; i++) {
        const port = calcularPuerto(9000, i, networkName);
        extraRpc.push(port);
        const ipIdx = 23 + i;
        extraRpcIps.push(redSubnet.replace('0/24', `${ipIdx}`));
    }

    // Mostrar resumen de IPs y puertos calculados
    console.log('IPs y puertos asignados:');
    console.log({ bootIp, bootKeyIp, minerIp, minerKeyIp, rpcBase, rpcPub, minerRpc, minerRpcPub, extraRpc, extraRpcIps });
    // 4. Limpiar recursos previos (opcional)
    await limpiarRecursosPrevios(networkName);

    // 5. Crear estructura de directorios
    // La carpeta networks debe estar en src/lib/networks
    const baseDir = path.resolve(__dirname, 'networks', networkName);
    const dirBoot = path.join(baseDir, 'bootnode');
    const dirMiner = path.join(baseDir, 'miner');
    const extraRpcDirs = extraRpc.map(port => path.join(baseDir, `rpc${port}`));
    const accountDir = path.join(baseDir, 'account');
    await mkdir(dirBoot, { recursive: true });
    await mkdir(dirMiner, { recursive: true });
    for (const dir of extraRpcDirs) {
        await mkdir(dir, { recursive: true });
    }
    await mkdir(accountDir, { recursive: true });
    console.log('Directorios creados:', { dirBoot, dirMiner, extraRpcDirs, accountDir });

    // Variables globales para la red
    let bootAddr = '';
    let minerAddr = '';
    let bootEnode = '';

    // ...existing code...

    /**
     * Limpia contenedores, red y directorio previos de la red si existen
     */
    async function limpiarRecursosPrevios(networkName: string): Promise<void> {
        const LABEL_RED = `network=${networkName}`;
        try {
            const { stdout: containers } = await exec(`docker ps -aq --filter "label=${LABEL_RED}"`);
            if (containers.trim()) {
                console.log('Eliminando contenedores previos...');
                await exec(`docker rm -f ${containers.trim().replace(/\n/g, ' ')}`);
            }
        } catch { }
        try {
            await exec(`docker network inspect ${networkName}`);
            console.log('Eliminando red Docker anterior...');
            await exec(`docker network rm ${networkName}`);
        } catch { }
        // Eliminar directorio de red en src/lib/networks
        const networkDir = path.resolve(__dirname, 'networks', networkName);
        try {
            await exec(`[ -d "${networkDir}" ] && rm -rf "${networkDir}"`);
            console.log('Eliminando directorios de datos previos de la red actual...');
        } catch { }
    }
    // 6. Crear red Docker
    await crearRedDocker(networkName, redSubnet);

    // ...existing code...

    /**
     * Crea una red Docker personalizada para la red Besu
     */
    async function crearRedDocker(networkName: string, subnet: string): Promise<void> {
        // Si existe una red con el mismo nombre, eliminarla primero (ya hecho en limpieza)
        try {
            await exec(`docker network create ${networkName} --subnet ${subnet} --label network=${networkName} --label type=besu`);
            console.log(`Red Docker '${networkName}' creada con subred ${subnet}`);
        } catch (err: any) {
            throw new Error(`No se pudo crear la red Docker: ${err?.stderr || err}`);
        }
    }
    // 7. Generar claves de nodos y cuenta extra
    await generarClavesNodo(dirBoot, bootKeyIp, 'Bootnode');
    await generarClavesNodo(dirMiner, minerKeyIp, 'Miner');
    await generarClaveAccount(accountDir);

    // Leer direcciones y enode
    bootAddr = await leerArchivo(path.join(dirBoot, 'address'));
    minerAddr = await leerArchivo(path.join(dirMiner, 'address'));
    bootEnode = await leerArchivo(path.join(dirBoot, 'enode'));
    bootEnode = bootEnode.replace(bootKeyIp, bootIp);

    // 8. Crear archivos de configuración (genesis, toml) ANTES de lanzar contenedores
    await crearArchivosConfiguracion({
        genesisPath: path.join(baseDir, 'genesis.json'),
        confBoot: path.join(baseDir, 'config.toml'),
        confMiner: path.join(baseDir, 'miner_config.toml'),
        chainId,
        minerAddr,
        bootAddr,
        bootEnode,
        rpcBase,
        minerRpc
    });

    // 9. Lanzar contenedores (bootnode, miner, rpc extras)
    const imagenBesu = 'hyperledger/besu:latest';
    const dataBoot = '/data/bootnode/data';
    const dataMiner = '/data/miner/data';
    const keyBoot = '/data/bootnode/key.priv';
    const keyMiner = '/data/miner/key.priv';
    const genesisDocker = '/data/genesis.json';
    const confBootDocker = '/data/config.toml';
    const confMinerDocker = '/data/miner_config.toml';

    await lanzarContenedor({
        name: `${networkName}-bootnode`,
        ip: bootIp,
        portLocal: rpcBase,
        portPub: rpcPub,
        confFile: confBootDocker,
        dataPath: dataBoot,
        keyFile: keyBoot,
        label: 'bootnode',
        networkName,
        imagenBesu,
        baseDir
    });
    await lanzarContenedor({
        name: `${networkName}-miner`,
        ip: minerIp,
        portLocal: minerRpc,
        portPub: minerRpcPub,
        confFile: confMinerDocker,
        dataPath: dataMiner,
        keyFile: keyMiner,
        label: 'miner',
        networkName,
        imagenBesu,
        baseDir
    });

    // Lanzar nodos RPC adicionales
    for (let i = 0; i < extraRpc.length; i++) {
        const port = extraRpc[i];
        const ip = extraRpcIps[i];
        const dir = extraRpcDirs[i];
        const name = `${networkName}-rpc${port}`;
        const data = `/data/rpc${port}/data`;
        const key = `/data/rpc${port}/key.priv`;
        const conf = `/data/rpc${port}_config.toml`;
        await generarClavesNodo(dir, ip, `RPC${port}`);
        await crearConfigRpcExtra({
            confPath: path.join(baseDir, `rpc${port}_config.toml`),
            genesisDocker,
            port,
            bootEnode
        });
        await lanzarContenedor({
            name,
            ip,
            portLocal: port,
            portPub: port,
            confFile: conf,
            dataPath: data,
            keyFile: key,
            label: 'rpc',
            networkName,
            imagenBesu,
            baseDir
        });
    }

    // 10. Esperar sincronización
    await esperarSincronizacion(50);

    // 11. Verificar nodo RPC
    await verificarBootnode(extraRpc[0]);

    // 12. Transferir fondos a cuentas mnemonic
    await transferirFondosMnemonic({
        privPath: path.join(dirBoot, 'key.priv'),
        rpcPort: extraRpc[0],
        baseDir
    });

    // 13. Mostrar resumen
    mostrarResumen({
        networkName,
        redSubnet,
        chainId,
        bootIp,
        rpcPub,
        bootAddr,
        minerIp,
        minerRpcPub,
        minerAddr,
        extraRpc,
        extraRpcIps,
        baseDir
    });
    async function crearConfigRpcExtra({ confPath, genesisDocker, port, bootEnode }: any) {
        const conf = `genesis-file="${genesisDocker}"
  p2p-host="0.0.0.0"
  p2p-port=30303
  p2p-enabled=true
  rpc-http-enabled=true
  rpc-http-host="0.0.0.0"
  rpc-http-port=${port}
  rpc-http-cors-origins=["*"]
  rpc-http-api=["ETH","NET","CLIQUE","ADMIN", "TRACE", "DEBUG", "TXPOOL", "PERM"]
  host-allowlist=["*"]
  bootnodes=["${bootEnode}"]
  sync-mode="FULL"
`;
        await writeFile(confPath, conf);
    }

    async function lanzarContenedor({ name, ip, portLocal, portPub, confFile, dataPath, keyFile, label, networkName, imagenBesu, baseDir }: any) {
        console.log(`Lanzando contenedor ${name}...`);
        // El volumen debe ser src/lib/networks/<network>:/data
        const vol = `${baseDir}:/data`;
        let portMap = '';
        if (label === 'rpc') {
            portMap = `-p ${portPub}:${portLocal}`;
        }
        await exec(`docker run -d --name "${name}" --label nodo="${label}" --label network="${networkName}" --ip "${ip}" --network "${networkName}" ${portMap} -v "${vol}" "${imagenBesu}" --config-file="${confFile}" --data-path="${dataPath}" --node-private-key-file="${keyFile}" --genesis-file="/data/genesis.json"`);
    }

    async function esperarSincronizacion(segundos: number) {
        console.log(`Esperando a que los nodos se sincronicen (${segundos}s)...`);
        for (let i = 1; i <= segundos; i++) {
            process.stdout.write(`\r⏳ ${i}/${segundos} segundos`);
            await new Promise(res => setTimeout(res, 1000));
        }
        process.stdout.write('\n');
    }

    async function verificarBootnode(rpcPort: number) {
        console.log('Verificando que el nodo RPC responde...');
        const max = 5;
        for (let count = 1; count <= max; count++) {
            try {
                await exec(`curl -s -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' http://localhost:${rpcPort}`);
                console.log('Nodo RPC responde correctamente');
                return;
            } catch {
                console.log(`Intento ${count}/${max}: Nodo RPC aún no responde`);
                await new Promise(res => setTimeout(res, 5000));
            }
        }
        console.log('Nodo RPC no respondió tras varios intentos.');
    }

    async function transferirFondosMnemonic({ privPath, rpcPort, baseDir }: any) {
        const mnemonic = 'test test test test test test test test test test test junk';
        const amount = '1';
        const priv = await leerArchivo(privPath);
        console.log('==============================');
        console.log('Transfiriendo fondos a las primeras 10 cuentas del mnemonic...');
        console.log(`Usando clave: ${privPath}`);
        console.log(`RPC: http://localhost:${rpcPort}`);
        await exec(`cd "${baseDir}" && node ../../../scripts/operations.mjs fund-mnemonic "${priv}" "${mnemonic}" "${amount}" "http://localhost:${rpcPort}"`);
        console.log('Fondos transferidos');
        console.log('==============================');
    }

    function mostrarResumen({ networkName, redSubnet, chainId, bootIp, rpcPub, bootAddr, minerIp, minerRpcPub, minerAddr, extraRpc, extraRpcIps, baseDir }: any) {
        console.log(`\n🎉 Red Besu desplegada exitosamente!`);
        console.log('==========================================');
        console.log(`Nombre de la red: ${networkName}`);
        console.log(`Subnet: ${redSubnet}`);
        console.log(`Chain ID: ${chainId}`);
        console.log('\n=== NODOS DESPLEGADOS ===');
        console.log(`• Bootnode: IP interna: ${bootIp}`);
        console.log(`• Miner: IP interna: ${minerIp}`);
        for (let i = 0; i < extraRpc.length; i++) {
            const port = extraRpc[i];
            const ip = extraRpcIps[i];
            let rpcAddr = '(no encontrado)';
            try {
                rpcAddr = require('fs').readFileSync(path.join(baseDir, `rpc${port}/address`), 'utf8').trim();
            } catch { }
            console.log(`• Nodo RPC ${port}: IP interna: ${ip}, Puerto RPC externo: ${port}`);
        }
        console.log('\n=== ENDPOINTS RPC ===');
        for (let i = 0; i < extraRpc.length; i++) {
            const port = extraRpc[i];
            if (i === 0) {
                console.log(`• RPC principal: http://localhost:${port}`);
            } else {
                console.log(`• RPC ${port}: http://localhost:${port}`);
            }
        }
        console.log('\n=== MNEMONIC PARA TESTING ===');
        console.log('Mnemonic: test test test test test test test test test test test junk');
        console.log('Derivation path: m/44\'/60\'/0\'/0/X (donde X = 0-9)');
        console.log('✅ Las primeras 10 cuentas ya tienen 1 ETH cada una');
        console.log('\n=== COMANDOS ÚTILES ===');
        console.log(`• Ver logs del bootnode: docker logs ${networkName}-bootnode`);
        console.log(`• Ver logs del miner: docker logs ${networkName}-miner`);
        console.log(`• Detener la red: docker rm -f $(docker ps -aq --filter "label=network=${networkName}")`);
        console.log(`• Eliminar la red: docker network rm ${networkName}`);
    }

    // Eliminado: duplicidad de declaración de variables y creación de archivos de configuración

    async function leerArchivo(filePath: string): Promise<string> {
        const { stdout } = await exec(`cat "${filePath}"`);
        return stdout.trim();
    }

    async function crearArchivosConfiguracion({ genesisPath, confBoot, confMiner, chainId, minerAddr, bootAddr, bootEnode, rpcBase, minerRpc }: any) {
        // genesis.json
        const extraData = `0x${'0'.repeat(64)}${minerAddr}${'0'.repeat(130)}`;
        const genesis = {
            config: {
                chainId,
                londonBlock: 0,
                clique: {
                    blockperiodseconds: 4,
                    epochlength: 30000,
                    createemptyblocks: true
                }
            },
            extraData,
            gasLimit: '0x1fffffffffffff',
            difficulty: '0x1',
            alloc: {
                [bootAddr]: { balance: '0x200000000000000000000000000000000000000000000000000000000000000' },
                [minerAddr]: { balance: '0x200000000000000000000000000000000000000000000000000000000000000' }
            }
        };
        await writeFile(genesisPath, JSON.stringify(genesis, null, 2));

        // config.toml bootnode
        const confBootStr = `genesis-file="/data/genesis.json"
  p2p-host="0.0.0.0"
  p2p-port=30303
  p2p-enabled=true
  rpc-http-enabled=true
  rpc-http-host="0.0.0.0"
  rpc-http-port=${rpcBase}
  rpc-http-cors-origins=["*"]
  rpc-http-api=["ETH","NET","CLIQUE","ADMIN", "TRACE", "DEBUG", "TXPOOL", "PERM"]
  host-allowlist=["*"]
  sync-mode="FULL"
  `;
        await writeFile(confBoot, confBootStr);

        // config.toml miner
        const confMinerStr = `genesis-file="/data/genesis.json"
  p2p-host="0.0.0.0"
  p2p-port=30303
  p2p-enabled=true
  rpc-http-enabled=true
  rpc-http-host="0.0.0.0"
  rpc-http-port=${minerRpc}
  rpc-http-cors-origins=["*"]
  rpc-http-api=["ETH","NET","CLIQUE","ADMIN", "TRACE", "DEBUG", "TXPOOL", "PERM"]
  host-allowlist=["*"]
  miner-enabled=true
  miner-coinbase="0x${minerAddr}"
  bootnodes=["${bootEnode}"]
  sync-mode="FULL"
  `;
        await writeFile(confMiner, confMinerStr);
    }

    /**
     * Busca una subred libre en 172.30-32.X.0/24 (X=1..250) usando hash del nombre de red
     */
    async function buscarSubredDisponible(networkName: string): Promise<string | null> {
        // Hash del nombre para elegir un bloque inicial
        const hash = crypto.createHash('md5').update(networkName).digest('hex').slice(0, 2);
        let dec = parseInt(hash, 16);
        if (dec < 1) dec = 1;
        if (dec > 250) dec = 250;
        const blocks = [30, 31, 32];
        for (const block of blocks) {
            for (let i = 0; i < 250; i++) {
                const tryIdx = ((dec + i - 1) % 250) + 1;
                const subnet = `172.${block}.${tryIdx}.0/24`;
                const ocupado = await subredEstaLibre(subnet);
                if (ocupado) return subnet;
            }
        }
        return null;
    }

    /**
     * Verifica si una subred está libre (no usada por ninguna red Docker)
     */
    async function subredEstaLibre(subnet: string): Promise<boolean> {
        try {
            const { stdout } = await exec(`docker network ls --format '{{.Name}}' | xargs -I{} docker network inspect {} --format '{{range .IPAM.Config}}{{.Subnet}}{{end}}' | grep -q '^${subnet}$' && echo ocupado || echo libre`);
            return stdout.trim() === 'libre';
        } catch {
            return false;
        }
    }
}

/**
 * Verifica que docker, node y operations.mjs estén disponibles
 */
async function verificarRequisitos(): Promise<void> {
    const dependencias = ['docker', 'node'];
    for (const dep of dependencias) {
        try {
            await exec(`command -v ${dep}`);
        } catch {
            throw new Error(`Dependencia requerida no encontrada: ${dep}`);
        }
    }
    // Verificar que operations.mjs existe en scripts/operations.mjs desde src/lib
    const operationsPath = path.resolve(__dirname, '../scripts/operations.mjs');
    try {
        await exec(`[ -f "${operationsPath}" ]`);
    } catch {
        throw new Error('No se encontró operations.mjs en scripts.');
    }
    console.log('✔️ Todas las herramientas están disponibles');
}

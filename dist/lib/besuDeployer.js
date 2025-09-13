import Docker from 'dockerode';
export class BesuDeployer {
    docker;
    options;
    constructor(options) {
        this.docker = new Docker();
        this.options = options;
    }
    async verifyRequirements() {
        console.log('➡️ Verificando dependencias...');
        // Verifica Docker
        try {
            await this.docker.ping();
        }
        catch {
            throw new Error('Docker no está disponible.');
        }
        // Verifica Node.js
        const { exec } = await import('child_process');
        await new Promise((resolve, reject) => {
            exec('node -v', (err) => {
                if (err)
                    reject(new Error('Node.js no está disponible.'));
                else
                    resolve();
            });
        });
        // Verifica operations.mjs
        const { join } = await import('path');
        const { existsSync } = await import('fs');
        const opPath = join(this.options.baseDir, 'src/scripts/operations.mjs');
        if (!existsSync(opPath)) {
            throw new Error('operations.mjs no encontrado en src/scripts.');
        }
        console.log('✔ Todas las herramientas están disponibles');
    }
    async cleanResources() {
        console.log('➡️ Limpiando recursos previos...');
        const { networkName, baseDir } = this.options;
        const { join } = await import('path');
        const { existsSync } = await import('fs');
        const { readdir, stat } = await import('node:fs/promises');
        const fsExtra = await import('fs-extra/esm');
        // Elimina contenedores con la label de la red
        const containers = await this.docker.listContainers({ all: true, filters: { label: [`network=${networkName}`] } });
        for (const c of containers) {
            const container = this.docker.getContainer(c.Id);
            try {
                await container.remove({ force: true });
            }
            catch { }
        }
        // Elimina la red docker si existe
        const networks = await this.docker.listNetworks({ filters: { name: [networkName] } });
        for (const n of networks) {
            const net = this.docker.getNetwork(n.Id);
            try {
                await net.remove();
            }
            catch { }
        }
        // Elimina directorios de datos previos
        // Limpiar src/lib/networks para evitar datos viejos
        const networksDir = join(baseDir, 'src', 'lib', 'networks');
        if (existsSync(networksDir)) {
            const subdirs = await readdir(networksDir);
            for (const sub of subdirs) {
                const full = join(networksDir, sub);
                if ((await stat(full)).isDirectory()) {
                    await fsExtra.remove(full);
                }
            }
        }
        console.log('✔ Limpieza completada');
    }
    async createDirectories() {
        console.log('➡️ Creando estructura de directorios...');
        const { networkName, nodes, baseDir, extraRpcNodes } = this.options;
        const { join } = await import('path');
        const fsExtra = await import('fs-extra/esm');
        // Forzar que networks esté en src/lib siempre
        const base = join(baseDir, 'src', 'lib', 'networks', networkName);
        for (const node of nodes) {
            const dir = join(base, node.type === 'rpc' ? `rpc${node.rpcPort}` : node.type);
            await fsExtra.ensureDir(dir);
        }
        // Crear directorios para nodos RPC adicionales
        if (extraRpcNodes && extraRpcNodes.length > 0) {
            for (const rpcNode of extraRpcNodes) {
                const dir = join(base, `rpc${rpcNode.rpcPort}`);
                await fsExtra.ensureDir(dir);
            }
        }
        // Directorio para cuenta adicional
        await fsExtra.ensureDir(join(base, 'account'));
        console.log('✔ Directorios listos');
    }
    async createDockerNetwork() {
        console.log('➡️ Creando red Docker personalizada...');
        const { networkName, subnet } = this.options;
        const networks = await this.docker.listNetworks({ filters: { name: [networkName] } });
        if (networks.length === 0) {
            await this.docker.createNetwork({
                Name: networkName,
                Driver: 'bridge',
                IPAM: { Config: [{ Subnet: subnet }] },
                Labels: { network: networkName, type: 'besu' },
            });
        }
        console.log(`✔ Red Docker '${networkName}' creada`);
    }
    async generateNodeKeys(node, ipOverride) {
        // Ejecuta operations.mjs para generar claves
        const { networkName, baseDir } = this.options;
        const { join } = await import('path');
        const { exec } = await import('child_process');
        // Forzar que networks esté en src/lib siempre
        const nodeDir = join(baseDir, 'src', 'lib', 'networks', networkName, node.type === 'rpc' ? `rpc${node.rpcPort}` : node.type);
        const ip = ipOverride || node.ip;
        const opPath = join(baseDir, 'src', 'scripts', 'operations.mjs');
        return new Promise((resolve, reject) => {
            exec(`node ${opPath} create-keys ${ip}`, { cwd: nodeDir }, (err, stdout, stderr) => {
                if (err)
                    reject(new Error(`Error generando claves para ${node.name}: ${stderr}`));
                else
                    resolve();
            });
        });
    }
    // ...otros métodos sin cambios...
    async generateAccountKey() {
        // Genera claves para la cuenta adicional (sin fondos)
        const { networkName, baseDir } = this.options;
        const { join } = await import('path');
        const { exec } = await import('child_process');
        // Forzar que networks esté en src/lib siempre
        const dir = join(baseDir, 'src', 'lib', 'networks', networkName, 'account');
        const opPath = join(baseDir, 'src', 'scripts', 'operations.mjs');
        return new Promise((resolve, reject) => {
            exec(`node ${opPath} create-keys 172.30.0.30`, { cwd: dir }, (err, stdout, stderr) => {
                if (err)
                    reject(new Error(`Error generando claves para account: ${stderr}`));
                else
                    resolve();
            });
        });
    }
    async generateExtraRpcKeys() {
        // Genera claves para nodos RPC adicionales
        const { networkName, baseDir, extraRpcNodes } = this.options;
        if (!extraRpcNodes || extraRpcNodes.length === 0)
            return;
        const { join } = await import('path');
        const { exec } = await import('child_process');
        const opPath = join(baseDir, 'src', 'scripts', 'operations.mjs');
        for (const node of extraRpcNodes) {
            const nodeDir = join(baseDir, 'src', 'lib', 'networks', networkName, `rpc${node.rpcPort}`);
            await new Promise((resolve, reject) => {
                exec(`node ${opPath} create-keys ${node.ip}`, { cwd: nodeDir }, (err, stdout, stderr) => {
                    if (err)
                        reject(new Error(`Error generando claves para rpc${node.rpcPort}: ${stderr}`));
                    else
                        resolve();
                });
            });
        }
    }
    async createExtraRpcConfigs(bootEnode) {
        // Crea archivos de configuración para nodos RPC adicionales
        const { networkName, baseDir, extraRpcNodes, genesisConfig } = this.options;
        if (!extraRpcNodes || extraRpcNodes.length === 0)
            return;
        const { join } = await import('path');
        const { writeFile } = await import('node:fs/promises');
        for (const node of extraRpcNodes) {
            const netDir = join(baseDir, 'src', 'lib', 'networks', networkName);
            const confPath = join(netDir, `rpc${node.rpcPort}_config.toml`);
            const conf = [
                'genesis-file="/data/genesis.json"',
                'p2p-host="0.0.0.0"',
                'p2p-port=30303',
                'p2p-enabled=true',
                'rpc-http-enabled=true',
                'rpc-http-host="0.0.0.0"',
                `rpc-http-port=${node.rpcPort}`,
                'rpc-http-cors-origins=["*"]',
                'rpc-http-api=["ETH","NET","CLIQUE","ADMIN", "TRACE", "DEBUG", "TXPOOL", "PERM"]',
                'host-allowlist=["*"]',
                `bootnodes=["${bootEnode}"]`,
                'sync-mode="FULL"',
            ].join('\n');
            await writeFile(confPath, conf);
        }
    }
    async createConfigFiles() {
        console.log('➡️ Creando archivos de configuración...');
        const { networkName, nodes, baseDir, genesisConfig, extraRpcNodes } = this.options;
        const { join } = await import('path');
        const fsExtra = await import('fs-extra/esm');
        const { readFile, writeFile } = await import('node:fs/promises');
        // Forzar que networks esté en src/lib siempre
        const netDir = join(baseDir, 'src', 'lib', 'networks', networkName);
        const bootNode = nodes.find(n => n.type === 'bootnode');
        const minerNode = nodes.find(n => n.type === 'miner');
        if (!bootNode || !minerNode)
            throw new Error('Faltan nodos bootnode o miner');
        const bootAddr = (await readFile(join(netDir, 'bootnode', 'address'), 'utf8')).trim();
        const minerAddr = (await readFile(join(netDir, 'miner', 'address'), 'utf8')).trim();
        const bootEnodeRaw = (await readFile(join(netDir, 'bootnode', 'enode'), 'utf8')).trim();
        // Enode debe tener la IP pública del bootnode
        const bootEnode = bootEnodeRaw.replace(bootNode.ip, bootNode.ip);
        // Crear genesis.json
        const genesis = {
            ...genesisConfig,
            alloc: {
                [bootAddr]: { balance: '0x200000000000000000000000000000000000000000000000000000000000000' },
                [minerAddr]: { balance: '0x200000000000000000000000000000000000000000000000000000000000000' },
            },
            extraData: `0x0000000000000000000000000000000000000000000000000000000000000000${minerAddr}0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000`,
        };
        await fsExtra.writeJson(join(netDir, 'genesis.json'), genesis, { spaces: 2 });
        // Configuración bootnode
        const confBoot = [
            'genesis-file="/data/genesis.json"',
            'p2p-host="0.0.0.0"',
            'p2p-port=30303',
            'p2p-enabled=true',
            'rpc-http-enabled=true',
            'rpc-http-host="0.0.0.0"',
            `rpc-http-port=${bootNode.rpcPort}`,
            'rpc-http-cors-origins=["*"]',
            'rpc-http-api=["ETH","NET","CLIQUE","ADMIN", "TRACE", "DEBUG", "TXPOOL", "PERM"]',
            'host-allowlist=["*"]',
            'sync-mode="FULL"',
        ].join('\n');
        await writeFile(join(netDir, 'config.toml'), confBoot);
        // Configuración miner
        const confMiner = [
            'genesis-file="/data/genesis.json"',
            'p2p-host="0.0.0.0"',
            'p2p-port=30303',
            'p2p-enabled=true',
            'rpc-http-enabled=true',
            'rpc-http-host="0.0.0.0"',
            `rpc-http-port=${minerNode.rpcPort}`,
            'rpc-http-cors-origins=["*"]',
            'rpc-http-api=["ETH","NET","CLIQUE","ADMIN", "TRACE", "DEBUG", "TXPOOL", "PERM"]',
            'host-allowlist=["*"]',
            'miner-enabled=true',
            `miner-coinbase="0x${minerAddr}"`,
            `bootnodes=["${bootEnode}"]`,
            'sync-mode="FULL"',
        ].join('\n');
        await writeFile(join(netDir, 'miner_config.toml'), confMiner);
        // Configuración nodos RPC adicionales
        await this.createExtraRpcConfigs(bootEnode);
        console.log('✔ Archivos de configuración generados');
    }
    async launchContainer(node) {
        console.log(`➡️ Lanzando contenedor ${node.name}...`);
        const { networkName, image, baseDir } = this.options;
        const { join } = await import('path');
        // Forzar que networks esté en src/lib siempre
        const netDir = join(baseDir, 'src', 'lib', 'networks', networkName);
        const nodeDir = node.type === 'rpc' ? `rpc${node.rpcPort}` : node.type;
        const dataPath = `/data/${nodeDir}/data`;
        const keyFile = `/data/${nodeDir}/key.priv`;
        const configFile = node.type === 'bootnode'
            ? '/data/config.toml'
            : node.type === 'miner'
                ? '/data/miner_config.toml'
                : `/data/rpc${node.rpcPort}_config.toml`;
        // Exponer el puerto público del host al puerto RPC interno del contenedor
        let portBindings = {};
        if (node.type === 'bootnode' || node.type === 'miner' || node.type === 'rpc') {
            // Igual que en deploy.sh: -p PUBLIC_PORT:RPC_PORT
            portBindings[`${node.rpcPort}/tcp`] = [{ HostPort: `${node.publicPort}`, HostIp: '0.0.0.0' }];
        }
        await this.docker.createContainer({
            name: `${networkName}-${node.name}`,
            Image: image,
            Labels: {
                nodo: node.type,
                network: networkName,
            },
            HostConfig: {
                NetworkMode: networkName,
                Binds: [`${netDir}:/data`],
                PortBindings: portBindings,
            },
            NetworkingConfig: {
                EndpointsConfig: {
                    [networkName]: {
                        IPAMConfig: { IPv4Address: node.ip },
                    },
                },
            },
            Cmd: [
                `--config-file=${configFile}`,
                `--data-path=${dataPath}`,
                `--node-private-key-file=${keyFile}`,
                `--genesis-file=/data/genesis.json`,
            ],
        }).then(container => container.start());
        console.log(`✔ Contenedor ${node.name} lanzado`);
    }
    async launchExtraRpcContainers() {
        // Lanza los contenedores para nodos RPC adicionales
        const { networkName, image, baseDir, extraRpcNodes } = this.options;
        if (!extraRpcNodes || extraRpcNodes.length === 0)
            return;
        const { join } = await import('path');
        // Forzar que networks esté en src/lib siempre
        const netDir = join(baseDir, 'src', 'lib', 'networks', networkName);
        for (const node of extraRpcNodes) {
            const nodeDir = `rpc${node.rpcPort}`;
            const dataPath = `/data/${nodeDir}/data`;
            const keyFile = `/data/${nodeDir}/key.priv`;
            const configFile = `/data/rpc${node.rpcPort}_config.toml`;
            let portBindings = {};
            portBindings[`${node.rpcPort}/tcp`] = [{ HostPort: `${node.publicPort}`, HostIp: '0.0.0.0' }];
            // Exponer explícitamente el puerto para que docker ps lo muestre igual que en Bash
            let exposedPorts = {};
            exposedPorts[`${node.rpcPort}/tcp`] = {};
            await this.docker.createContainer({
                name: `${networkName}-rpc${node.rpcPort}`,
                Image: image,
                Labels: {
                    nodo: 'rpc',
                    network: networkName,
                },
                ExposedPorts: exposedPorts,
                HostConfig: {
                    NetworkMode: networkName,
                    Binds: [`${netDir}:/data`],
                    PortBindings: portBindings,
                },
                NetworkingConfig: {
                    EndpointsConfig: {
                        [networkName]: {
                            IPAMConfig: { IPv4Address: node.ip },
                        },
                    },
                },
                Cmd: [
                    `--config-file=${configFile}`,
                    `--data-path=${dataPath}`,
                    `--node-private-key-file=${keyFile}`,
                    `--genesis-file=/data/genesis.json`,
                ],
            }).then(container => container.start());
            console.log(`✔ Contenedor rpc${node.rpcPort} lanzado`);
        }
    }
    async waitForSync() {
        console.log('➡️ Esperando sincronización de nodos...');
        const WAIT = 50;
        for (let i = 1; i <= WAIT; i++) {
            process.stdout.write(`\r⏳ ${i}/${WAIT} segundos`);
            await new Promise(r => setTimeout(r, 1000));
        }
        process.stdout.write('\n');
        console.log('✔ Espera finalizada');
    }
    async verifyBootnode() {
        console.log('➡️ Verificando que el bootnode responde...');
        const { nodes } = this.options;
        const bootNode = nodes.find(n => n.type === 'bootnode');
        if (!bootNode)
            throw new Error('No se encontró el bootnode');
        const url = `http://localhost:${bootNode.publicPort}`;
        const MAX = 5;
        for (let count = 1; count <= MAX; count++) {
            try {
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 })
                });
                if (res.ok) {
                    const json = await res.json();
                    if (json.result !== undefined) {
                        console.log('✔ Bootnode responde correctamente');
                        return;
                    }
                }
            }
            catch { }
            console.log(`⚠ Intento ${count}/${MAX}: Bootnode aún no responde`);
            await new Promise(r => setTimeout(r, 5000));
        }
        throw new Error('Bootnode no respondió tras varios intentos.');
    }
    async fundMnemonicAccounts() {
        if (!this.options.mnemonic)
            return;
        console.log('➡️ Transfiriendo fondos a cuentas del mnemonic...');
        const { networkName, baseDir, mnemonic } = this.options;
        const { join } = await import('path');
        const { readFile } = await import('node:fs/promises');
        const { exec } = await import('child_process');
        const priv = (await readFile(join(baseDir, 'src', 'lib', 'networks', networkName, 'bootnode', 'key.priv'), 'utf8')).trim();
        const opPath = join(baseDir, 'src', 'scripts', 'operations.mjs');
        // Usar spawn para log en tiempo real, igual que el deploy.sh
        const { spawn } = await import('child_process');
        return new Promise((resolve, reject) => {
            const child = spawn('node', [opPath, 'fund-mnemonic', priv, mnemonic, '1', 'http://localhost:8888'], {
                cwd: join(baseDir, 'src', 'scripts'),
                stdio: ['ignore', 'pipe', 'pipe']
            });
            child.stdout.setEncoding('utf8');
            child.stderr.setEncoding('utf8');
            child.stdout.on('data', (data) => {
                // Resalta transferencias y direcciones
                data.split(/\r?\n/).forEach(line => {
                    if (line.trim()) {
                        if (/0x[a-fA-F0-9]{40}/.test(line)) {
                            // Si la línea contiene una dirección, resáltala
                            console.log(`\x1b[1;34m➡️ ${line}\x1b[0m`);
                        }
                        else if (/ETH|wei|transfer/i.test(line)) {
                            // Si la línea menciona transferencias
                            console.log(`\x1b[1;32m✔ ${line}\x1b[0m`);
                        }
                        else {
                            console.log(line);
                        }
                    }
                });
            });
            child.stderr.on('data', (data) => {
                data.split(/\r?\n/).forEach(line => {
                    if (line.trim()) {
                        console.warn(`\x1b[1;33m⚠️ ${line}\x1b[0m`);
                    }
                });
            });
            child.on('close', (code) => {
                if (code === 0)
                    resolve();
                else
                    reject(new Error(`Error transfiriendo fondos: proceso terminó con código ${code}`));
            });
        });
    }
    async deploy() {
        await this.verifyRequirements();
        await this.cleanResources();
        await this.createDirectories();
        await this.createDockerNetwork();
        // Generar claves para nodos principales
        for (const node of this.options.nodes) {
            await this.generateNodeKeys(node);
        }
        // Generar clave para cuenta adicional
        await this.generateAccountKey();
        await this.createConfigFiles();
        for (const node of this.options.nodes) {
            await this.launchContainer(node);
        }
        await this.launchExtraRpcContainers();
        await this.waitForSync();
        await this.verifyBootnode();
        await this.fundMnemonicAccounts();
        console.log('🎉 Red Besu desplegada exitosamente!');
    }
}
// Ejemplo de uso:
// const deployer = new BesuDeployer(options);
// await deployer.deploy();

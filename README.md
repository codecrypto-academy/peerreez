# PFM WEB3 - Supply Chain Traceability

## 🎯 Proyecto Actualizado

Plataforma de trazabilidad blockchain usando **Hyperledger Fabric** con arquitectura simplificada.

### 🏗️ Arquitectura Final

**Blockchain**: Red Hyperledger Fabric personalizada para supply chain
- **ProducerOrg** = Productores de materia prima 
- **FactoryOrg** = Fábricas transformadoras
- **RetailerOrg** = Minoristas distribuidores
- **ConsumerOrg** = Consumidores finales
- **Canal**: `supply-chain-channel`

### 📁 Estructura del Proyecto

```
web25-control-panel-besu-2025/
├── src/                         # Frontend Next.js
│   ├── app/                    # App Router
│   ├── components/             # Componentes React
│   └── lib/                   # Utilidades y SDK Fabric
├── supply-chain-network/       # Red blockchain personalizada
│   ├── configtx/              # Configuración de organizaciones
│   ├── crypto-config/         # Configuración de certificados
│   ├── docker/               # Docker compose de la red
│   ├── scripts/             # Scripts de automatización
│   └── chaincode/          # Smart contracts
├── package.json             # Dependencias Next.js
└── README.md               # Este archivo
```

### 🚀 Plan de Desarrollo Simplificado

#### Fase 1: Frontend Base ✅
- [x] Next.js configurado con TypeScript
- [x] Tailwind CSS instalado
- [x] Test-network Fabric funcionando

#### Fase 2: Infraestructura Blockchain 🔄
- [x] Red con 4 organizaciones configurada
- [ ] Scripts de automatización
- [ ] Chaincode para supply chain

#### Fase 3: Integración Frontend
- [ ] Sistema de 4 roles: Producer, Factory, Retailer, Consumer
- [ ] SDK Fabric Gateway
- [ ] Conexión frontend-blockchain

#### Fase 4: Funcionalidades Supply Chain
- [ ] Registro de materias primas (Producer)
- [ ] Transformación en productos (Factory)
- [ ] Distribución (Retailer)
- [ ] Trazabilidad completa (Consumer)

### 🔧 Comandos Importantes

```bash
# Iniciar red Supply Chain
cd supply-chain-network
./scripts/network.sh up

# Crear canal supply-chain
./scripts/network.sh createChannel

# Desplegar chaincode
./scripts/network.sh deployCC

# Detener red
./scripts/network.sh down

# Iniciar frontend
npm run dev
```

### 📝 Próximos Pasos

1. **Crear scripts de red** - Automatización completa de la red
2. **Desarrollar chaincode** - Supply chain específico 
3. **Integrar Fabric Gateway SDK** - Conexión con 4 organizaciones
4. **Implementar frontend** - Interfaces específicas por rol

---

**Arquitectura simplificada y funcional basada en componentes probados de Hyperledger Fabric.**

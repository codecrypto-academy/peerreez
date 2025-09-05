// src/lib/testCreateNetwork.ts
import { createNetwork } from "./createNetwork.js"; // <<=== OJO: añadir .js
createNetwork({
    nameNetwork: "network0",
    chainId: 55255,
    subnet: "172.24.0.0/16",
    founderAccounts: [
        "0xCB7291CAAa10683f2E8761F1e8d50F66713267D2",
        "0x8BD4C37E1d60A8bDaa2E82e6De8568faBb346201",
    ],
    rpcPort: 8888,
});
createNetwork({
    nameNetwork: "network1",
    chainId: 55355,
    subnet: "172.25.0.0/16",
    founderAccounts: [
        "0xCB7291CAAa10683f2E8761F1e8d50F66713267D2",
        "0x8BD4C37E1d60A8bDaa2E82e6De8568faBb346201",
    ],
    rpcPort: 8889,
});

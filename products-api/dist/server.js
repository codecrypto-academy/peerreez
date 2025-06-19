"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fabric_gateway_1 = require("@hyperledger/fabric-gateway");
const fabric_common_1 = require("fabric-common");
const fs_1 = require("fs");
const _ = __importStar(require("lodash"));
const tslog_1 = require("tslog");
const yaml = __importStar(require("yaml"));
const config_1 = require("./config");
const utils_1 = require("./utils");
const FabricCAServices = require("fabric-ca-client");
const express = require("express");
const log = new tslog_1.Logger({ name: "products-api" });
async function main() {
    (0, config_1.checkConfig)();
    const networkConfig = yaml.parse(await fs_1.promises.readFile(config_1.config.networkConfigPath, 'utf8'));
    const orgPeerNames = _.get(networkConfig, `organizations.${config_1.config.mspID}.peers`);
    if (!orgPeerNames) {
        throw new Error(`Organization ${config_1.config.mspID} doesn't have any peers`);
    }
    let peerUrl = "";
    let peerCACert = "";
    let idx = 0;
    for (const peerName of orgPeerNames) {
        const peer = networkConfig.peers[peerName];
        const peerUrlKey = `url`;
        const peerCACertKey = `tlsCACerts.pem`;
        peerUrl = _.get(peer, peerUrlKey).replace("grpcs://", "");
        peerCACert = _.get(peer, peerCACertKey);
        idx++;
        if (idx >= 1) {
            break;
        }
    }
    if (!peerUrl || !peerCACert) {
        throw new Error(`Organization ${config_1.config.mspID} doesn't have any peers`);
    }
    const ca = networkConfig.certificateAuthorities[config_1.config.caName];
    if (!ca) {
        throw new Error(`Certificate authority ${config_1.config.caName} not found in network configuration`);
    }
    const caURL = ca.url;
    if (!caURL) {
        throw new Error(`Certificate authority ${config_1.config.caName} does not have a URL`);
    }
    const fabricCAServices = new FabricCAServices(caURL, {
        trustedRoots: [ca.tlsCACerts.pem[0]],
        verify: true,
    }, ca.caName);
    const identityService = fabricCAServices.newIdentityService();
    const registrarUserResponse = await fabricCAServices.enroll({
        enrollmentID: ca.registrar.enrollId,
        enrollmentSecret: ca.registrar.enrollSecret
    });
    const registrar = fabric_common_1.User.createUser(ca.registrar.enrollId, ca.registrar.enrollSecret, config_1.config.mspID, registrarUserResponse.certificate, registrarUserResponse.key.toBytes());
    const adminUser = _.get(networkConfig, `organizations.${config_1.config.mspID}.users.${config_1.config.hlfUser}`);
    const userCertificate = _.get(adminUser, "cert.pem");
    const userKey = _.get(adminUser, "key.pem");
    if (!userCertificate || !userKey) {
        throw new Error(`User ${config_1.config.hlfUser} not found in network configuration`);
    }
    const grpcConn = await (0, utils_1.newGrpcConnection)(peerUrl, Buffer.from(peerCACert));
    const connectOptions = await (0, utils_1.newConnectOptions)(grpcConn, config_1.config.mspID, Buffer.from(userCertificate), userKey);
    const gateway = (0, fabric_gateway_1.connect)(connectOptions);
    const network = gateway.getNetwork(config_1.config.channelName);
    const contract = network.getContract(config_1.config.chaincodeName);
    const app = express();
    app.use(express.json());
    app.use((req, res, next) => {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        next();
    });
    const users = {};
    app.post("/signup", async (req, res) => {
        const { username, password } = req.body;
        let identityFound = null;
        try {
            identityFound = await identityService.getOne(username, registrar);
        }
        catch (e) {
            log.info("Identity not found, registering", e);
        }
        if (identityFound) {
            res.status(400);
            res.send("Username already taken");
            return;
        }
        await fabricCAServices.register({
            enrollmentID: username,
            enrollmentSecret: password,
            affiliation: "",
            role: "client",
            attrs: [],
            maxEnrollments: -1
        }, registrar);
        res.send("OK");
    });
    app.post("/login", async (req, res) => {
        const { username, password } = req.body;
        let identityFound = null;
        try {
            identityFound = await identityService.getOne(username, registrar);
        }
        catch (e) {
            log.info("Identity not found, registering", e);
            res.status(400);
            res.send("Username not found");
            return;
        }
        const r = await fabricCAServices.enroll({
            enrollmentID: username,
            enrollmentSecret: password,
        });
        users[username] = r;
        res.send("OK");
    });
    app.use(async (req, res, next) => {
        req.contract = contract;
        try {
            log.info(Object.keys(users));
            const user = req.headers["x-user"];
            if (user && users[user]) {
                log.info(`utilizando usuario ${user}`);
                const connectOptions = await (0, utils_1.newConnectOptions)(grpcConn, config_1.config.mspID, Buffer.from(users[user].certificate), users[user].key.toBytes());
                const gateway = (0, fabric_gateway_1.connect)(connectOptions);
                const network = gateway.getNetwork(config_1.config.channelName);
                const contract = network.getContract(config_1.config.chaincodeName);
                req.contract = contract;
            }
            next();
        }
        catch (e) {
            log.error(e);
            next(e);
        }
    });
    app.get("/ping", async (req, res) => {
        try {
            const responseBuffer = await req.contract.evaluateTransaction("Ping");
            const responseString = Buffer.from(responseBuffer).toString();
            res.send(responseString);
        }
        catch (e) {
            res.status(400);
            res.send(e.details && e.details.length ? e.details : e.message);
        }
    });
    app.post("/evaluate", async (req, res) => {
        try {
            const fcn = req.body.fcn;
            const responseBuffer = await req.contract.evaluateTransaction(fcn, ...(req.body.args || []));
            const responseString = Buffer.from(responseBuffer).toString();
            res.send(responseString);
        }
        catch (e) {
            res.status(400);
            res.send(e.details && e.details.length ? e.details : e.message);
        }
    });
    app.post("/submit", async (req, res) => {
        try {
            const fcn = req.body.fcn;
            const responseBuffer = await req.contract.submitTransaction(fcn, ...(req.body.args || []));
            const responseString = Buffer.from(responseBuffer).toString();
            res.send(responseString);
        }
        catch (e) {
            res.status(400);
            res.send(e.details && e.details.length ? e.details : e.message);
        }
    });
    const server = app.listen({
        port: process.env.PORT || 3003,
        host: process.env.HOST || "0.0.0.0",
    }, () => {
        const addressInfo = server.address();
        console.log(`
        Server is running!
        Listening on ${addressInfo.address}:${addressInfo.port}
      `);
    });
}
main();

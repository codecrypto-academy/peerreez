"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkConfig = exports.config = void 0;
exports.config = {
    caName: process.env.CA_NAME,
    channelName: process.env.CHANNEL_NAME,
    chaincodeName: process.env.CHAINCODE_NAME,
    mspID: process.env.MSP_ID,
    hlfUser: process.env.HLF_USER,
    networkConfigPath: process.env.NETWORK_CONFIG_PATH,
};
function checkConfig() {
    if (!exports.config.caName) {
        throw new Error("CA_NAME is not set");
    }
    if (!exports.config.channelName) {
        throw new Error("CHANNEL_NAME is not set");
    }
    if (!exports.config.chaincodeName) {
        throw new Error("CHAINCODE_NAME is not set");
    }
    if (!exports.config.mspID) {
        throw new Error("MSP_ID is not set");
    }
    if (!exports.config.hlfUser) {
        throw new Error("HLF_USER is not set");
    }
    if (!exports.config.networkConfigPath) {
        throw new Error("NETWORK_CONFIG_PATH is not set");
    }
}
exports.checkConfig = checkConfig;

module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/supply-chain-network/chaincode/**/?(*.)+(spec|test).[tj]s?(x)'],
    moduleNameMapper: {
        '^fabric-contract-api$': '<rootDir>/supply-chain-network/chaincode/supply-chain/test/__mocks__/fabric-contract-api.ts'
    },
    globals: {
        'ts-jest': {
            tsconfig: 'tsconfig.json'
        }
    }
};

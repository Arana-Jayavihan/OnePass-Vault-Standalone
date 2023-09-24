/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.9",
    defaultNetwork: "onepassDocker",
    networks: {
      onepassDocker: {
        url: 'http://localhost:8979',
        accounts: [`0x${process.env.PRIVATE_KEY_DOCKER}`]
      }
    },
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
};

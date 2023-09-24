/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.9",
    defaultNetwork: "onepassDocker",
    networks: {
      sepolia: {
        url: 'https://blissful-billowing-flower.ethereum-sepolia.discover.quiknode.pro/6b1e4d4ca823095216bbc885ec729c9082a482a6/',
        accounts: [`0x${process.env.PRIVATE_KEY_ONLINE}`]
        
      },
      onepass: {
        url: 'http://localhost:8979',
        accounts: [`0x${process.env.PRIVATE_KEY_STANDALONE}`]
      },
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

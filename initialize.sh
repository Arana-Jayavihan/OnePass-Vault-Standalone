#!/usr/bin/bash

############################################
#                                          #
# INITIALIZE THE PRIVATE ETHEREUM NETWORK  #
#                                          #
############################################

mkdir privatechain-onepass/privateChainDocker
cp privatechain-onepass/templates/gethDockerFile privatechain-onepass/privateChainDocker/Dockerfile

# Creating the bootnode
bootnode --genkey privatechain-onepass/privateChainDocker/bootNode.key
bootNodeEnode=$(bootnode -nodekey privatechain-onepass/privateChainDocker/bootNode.key -writeaddress)

# Creating directories for blockchain nodes
mkdir privatechain-onepass/privateChainDocker/node1 privatechain-onepass/privateChainDocker/node2 privatechain-onepass/privateChainDocker/node3 privatechain-onepass/privateChainDocker/node4
gpg --gen-random --armor 2 32 > privatechain-onepass/privateChainDocker/node1/passNode1
gpg --gen-random --armor 2 32 > privatechain-onepass/privateChainDocker/node2/passNode2
gpg --gen-random --armor 2 32 > privatechain-onepass/privateChainDocker/node3/passNode3
gpg --gen-random --armor 2 32 > privatechain-onepass/privateChainDocker/node4/passNode4
gpg --gen-random --armor 2 32 > privatechain-onepass/privateChainDocker/node1/passAccount1
gpg --gen-random --armor 2 32 > privatechain-onepass/privateChainDocker/node1/passAccount2

CHAINID=210567
printf "chainId: $CHAINID\n\n" > privatechain-onepass/chainInfo

# Account creation and genesis configuration
signers=''

geth account new --datadir privatechain-onepass/privateChainDocker/node1/ --password privatechain-onepass/privateChainDocker/node1/passNode1
files=(privatechain-onepass/privateChainDocker/node1/keystore/*)
pubKey1=$(cat "${files[0]}" | cut -d "," -f 1 | cut -d ":" -f 2 | tr -d '"')
signers+="$pubKey1"
pass=$(cat privatechain-onepass/privateChainDocker/node1/passNode1)
printf "node1\n\tpublicKey: $pubKey1\n\tpass: $pass\n\n" >> privatechain-onepass/chainInfo

geth account new --datadir privatechain-onepass/privateChainDocker/node2/ --password privatechain-onepass/privateChainDocker/node2/passNode2
pubKey2=$(cat privatechain-onepass/privateChainDocker/node2/keystore/UTC* | cut -d "," -f 1 | cut -d ":" -f 2 | tr -d '"')
signers+="$pubKey2"
pass=$(cat privatechain-onepass/privateChainDocker/node2/passNode2)
printf "node2\n\tpublicKey: $pubKey2\n\tpass: $pass\n\n" >> privatechain-onepass/chainInfo

geth account new --datadir privatechain-onepass/privateChainDocker/node3/ --password privatechain-onepass/privateChainDocker/node3/passNode3
pubKey3=$(cat privatechain-onepass/privateChainDocker/node3/keystore/UTC* | cut -d "," -f 1 | cut -d ":" -f 2 | tr -d '"')
signers+="$pubKey3"
pass=$(cat privatechain-onepass/privateChainDocker/node3/passNode3)
printf "node3\n\tpublicKey: $pubKey3\n\tpass: $pass\n\n" >> privatechain-onepass/chainInfo

geth account new --datadir privatechain-onepass/privateChainDocker/node4/ --password privatechain-onepass/privateChainDocker/node4/passNode4
pubKey4=$(cat privatechain-onepass/privateChainDocker/node4/keystore/UTC* | cut -d "," -f 1 | cut -d ":" -f 2 | tr -d '"')
signers+="$pubKey4"
pass=$(cat privatechain-onepass/privateChainDocker/node4/passNode4)
printf "node4\n\tpublicKey: $pubKey4\n\tpass: $pass\n\n" >> privatechain-onepass/chainInfo

geth account new --datadir privatechain-onepass/privateChainDocker/node1/ --password privatechain-onepass/privateChainDocker/node1/passAccount1
files=(privatechain-onepass/privateChainDocker/node1/keystore/*)
pubKeyAcc1=$(cat "${files[1]}" | cut -d "," -f 1 | cut -d ":" -f 2 | tr -d '"')
pass=$(cat privatechain-onepass/privateChainDocker/node1/passAccount1)
keyStore=$(cat "${files[1]}")
printf "account1\n\tpublicKey: $pubKeyAcc1\n\tpass: $pass\n\tkeystore: $keyStore\n\n" >> privatechain-onepass/chainInfo
printf "$keyStore" >> privatechain-onepass/account_1.json

geth account new --datadir privatechain-onepass/privateChainDocker/node1/ --password privatechain-onepass/privateChainDocker/node1/passAccount2
files=(privatechain-onepass/privateChainDocker/node1/keystore/*)
pubKeyAcc2=$(cat "${files[2]}" | cut -d "," -f 1 | cut -d ":" -f 2 | tr -d '"')
pass=$(cat privatechain-onepass/privateChainDocker/node1/passAccount2)
keyStore=$(cat "${files[2]}")
printf "account2\n\tpublicKey: $pubKeyAcc2\n\tpass: $pass\n\tkeystore: $keyStore\n\n" >> privatechain-onepass/chainInfo
printf "$keyStore" >> privatechain-onepass/account_2.json

# Genesis block configuration
extraData="0x0000000000000000000000000000000000000000000000000000000000000000"
extraData+="$signers"
extraData+="0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"

cp privatechain-onepass/templates/genesisTemplate.json privatechain-onepass/privateChainDocker/
sed -i "s/"CHAINID"/$CHAINID/" privatechain-onepass/privateChainDocker/genesisTemplate.json
sed -i "s/"SIGNERS"/$extraData/" privatechain-onepass/privateChainDocker/genesisTemplate.json
sed -i "s/"PREFUNDACC1"/$pubKeyAcc1/" privatechain-onepass/privateChainDocker/genesisTemplate.json
sed -i "s/"PREFUNDACC2"/$pubKeyAcc2/" privatechain-onepass/privateChainDocker/genesisTemplate.json
mv privatechain-onepass/privateChainDocker/genesisTemplate.json privatechain-onepass/privateChainDocker/genesis.json

# Enivironment variable configuration
currentDir=$(pwd)
cp privatechain-onepass/templates/envTemplate privatechain-onepass/.env
sed -i "s/"CHAINID"/$CHAINID/" privatechain-onepass/.env
sed -i "s/"NODE1_ACC_PUB"/0x$pubKey1/" privatechain-onepass/.env
sed -i "s/"NODE2_ACC_PUB"/0x$pubKey2/" privatechain-onepass/.env
sed -i "s/"NODE3_ACC_PUB"/0x$pubKey3/" privatechain-onepass/.env
sed -i "s/"NODE4_ACC_PUB"/0x$pubKey4/" privatechain-onepass/.env
sed -i "s/"BOOTNODE_PUB_KEY"/$bootNodeEnode/" privatechain-onepass/.env
sed -i "s@"CURRENT_WORK_DIR"@$currentDir/privatechain-onepass/@" privatechain-onepass/.env

# Initialize nodes with genesis state
geth init --datadir privatechain-onepass/privateChainDocker/node1 privatechain-onepass/privateChainDocker/genesis.json
printf "Initialized Node 1\n\n"
geth init --datadir privatechain-onepass/privateChainDocker/node2 privatechain-onepass/privateChainDocker/genesis.json
printf "Initialized Node 2\n\n"
geth init --datadir privatechain-onepass/privateChainDocker/node3 privatechain-onepass/privateChainDocker/genesis.json
printf "Initialized Node 3\n\n"
geth init --datadir privatechain-onepass/privateChainDocker/node4 privatechain-onepass/privateChainDocker/genesis.json
printf "Initialized Node 4\n\n"

rm privatechain-onepass/privateChainDocker/node*/geth/nodekey


#################################################
#                                               #
#       INITIALIZE NODE SERVER ENV              #
#                                               #
#################################################

PORT=9000
AES_SECRET=$(gpg --gen-random --armor 2 32)
cp privatechain-onepass/templates/nodeEnv server-onepass/.env
sed -i "s/"PORT_VALUE"/$PORT/" server-onepass/.env
sed -i "s/"NETWORKID_VALUE"/$CHAINID/" server-onepass/.env
sed -i "s@"AES_SECRET_VALUE"@$AES_SECRET@" server-onepass/.env
sed -i "s@"RPCHOST_VALUE"@"http://172.16.254.7:8979"@" server-onepass/.env

openssl ecparam -name secp521r1 -genkey -noout -out server-onepass/ecdsaPrivKey.pem
openssl ec -in server-onepass/ecdsaPrivKey.pem -pubout -out server-onepass/ecdsaPubKey.pem

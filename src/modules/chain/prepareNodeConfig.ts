import { Chain, PublicClient } from 'viem';
import {
  ChainConfig,
  PrepareNodeConfigParams,
  createRollupPrepareTransaction,
  createRollupPrepareTransactionReceipt,
  prepareNodeConfig,
} from '@arbitrum/chain-sdk';
import { config } from 'dotenv';
import { GenerateNodeConfigurationResult } from '../../types';
config();

function getRpcUrl(chain: Chain) {
  return chain.rpcUrls.default.http[0];
}

export async function generateNodeConfiguration(
  txHash: `0x${string}`,
  parentChain: Chain,
  parentChainPublicClient: PublicClient
): Promise<GenerateNodeConfigurationResult> {

  // get the transaction
  const tx = createRollupPrepareTransaction(
    await parentChainPublicClient.getTransaction({ hash: txHash }),
  );

  // get the transaction receipt
  const txReceipt = createRollupPrepareTransactionReceipt(
    await parentChainPublicClient.getTransactionReceipt({ hash: txHash }),
  );

  const txConfig = tx.getInputs()[0].config;
  // get the chain config from the transaction inputs
  const chainConfig: ChainConfig = JSON.parse(txConfig.chainConfig);
  // get the core contracts from the transaction receipt
  const coreContracts = txReceipt.getCoreContracts();

  // prepare the node config
  const nodeConfigParameters: PrepareNodeConfigParams = {
    chainName: 'My Orbit Chain',
    chainConfig,
    coreContracts,
    batchPosterPrivateKey: process.env.BATCH_POSTER_PRIVATE_KEY as `0x${string}`,
    validatorPrivateKey: process.env.VALIDATOR_PRIVATE_KEY as `0x${string}`,
    stakeToken: txConfig.stakeToken,
    parentChainId: parentChain.id as 1 | 1337 | 412346 | 42161 | 42170 | 8453 | 11155111 | 421614 | 84532, // Chain-sdk only supports these parent chain ids
    parentChainRpcUrl: getRpcUrl(parentChain),
  };

  const nodeConfig = prepareNodeConfig(nodeConfigParameters);

  return { nodeConfig, chainConfig };
}
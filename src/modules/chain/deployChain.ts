import inquirer from 'inquirer';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { sanitizePrivateKey, generateChainId } from '@arbitrum/chain-sdk/utils';
import logger from '../../utils/logger';
import { Chain, createWalletClient, http, parseEther, PrivateKeyAccount, PublicClient } from 'viem';
import { ChainConfig, createRollup, createRollupPrepareDeploymentParamsConfig, CreateRollupResults, prepareChainConfig } from '@arbitrum/chain-sdk';
import { generateNodeConfiguration } from './prepareNodeConfig';
import { writeFile } from 'fs/promises';
import { GenerateNodeConfigurationResult } from '../../types';
import { runtimeAccount } from '../..';

const BASE_STAKE = parseEther('0.00001');
const TEST_TOKENS_AMOUNT = parseEther('0.001');
const TOKEN_NEEDS_FOR_DEPLOY = BASE_STAKE + TEST_TOKENS_AMOUNT * 4n; // gas needs for2 validators + 1 batch poster + 1 deployer

/**
 * Simulate a delay for mock operations
 */
const delay = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

const sendTestTokens = async (sender: PrivateKeyAccount, toAddress: string, parentChainPublicClient: PublicClient): Promise<`0x${string}`> => {
  const amount = TEST_TOKENS_AMOUNT;
  const walletClient = createWalletClient({
    account: sender,
    chain: parentChainPublicClient.chain,
    transport: http(process.env.PARENT_CHAIN_RPC),
  });
  const tx = await walletClient.sendTransaction({
    to: toAddress as `0x${string}`,
    value: amount,
    chain: parentChainPublicClient.chain
  });
  return tx;
};


// Deploy the rollup contracts, we need one batch poster and two validators for this playbook
const deployRollupContracts = async (
  deployer: PrivateKeyAccount,
  validatorAddresses: `0x${string}`[],
  batchPosterAddress: `0x${string}`,
  parentChainPublicClient: PublicClient,
  chainId: number
): Promise<CreateRollupResults> => {
  const createRollupConfig = createRollupPrepareDeploymentParamsConfig(parentChainPublicClient, {
    chainId: BigInt(chainId),
    owner: deployer.address,
    baseStake: BASE_STAKE,
    chainConfig: prepareChainConfig({
      chainId,
      arbitrum: {
        InitialChainOwner: deployer.address,
        DataAvailabilityCommittee: true,
      },
    }),
  });

  try {
    return await createRollup({
      params: {
        config: createRollupConfig,
        batchPosters: [batchPosterAddress],
        validators: validatorAddresses,
      },
      account: deployer,
      parentChainPublicClient,
    });
  } catch (error) {
    console.error(`Rollup creation failed with error: ${error}`);
    throw error;
  }
};

/**
 * Deploy a new blockchain (mock implementation)
 */
export async function deployChain(parentChain: Chain): Promise<ChainConfig | null> {
  logger.section('Deploy New Chain');

  const deployer = runtimeAccount.deployer;

  const parentChainPublicClient = runtimeAccount.parentChainPublicClient;

  const balance = await parentChainPublicClient.getBalance({ address: deployer.address });
  if (balance < TOKEN_NEEDS_FOR_DEPLOY) {
    logger.error('Insufficient balance to deploy chain. Please top up the account.');
    return null;
  }

  const randomChainId = generateChainId();

  const answers = await inquirer.prompt<{ chainId: number; confirm: boolean }>([
    {
      type: 'input',
      name: 'chainId',
      message: `Enter Chain ID (leave empty to use random chain id: ${randomChainId}):`,
      default: randomChainId,
    },
    {
      type: 'confirm',
      name: 'confirm',
      message: (answers: { chainId: number }) => `Deploy chain with Chain ID: ${answers.chainId}?`,
      default: true,
    },
  ]);

  if (!answers.confirm) {
    logger.warn('Chain deployment cancelled.');
    return null;
  }

  const chainId: number = answers.chainId;

  logger.newline();
  logger.info('Starting chain deployment...');

  // Deployment steps
  const steps = [
    'Generating the validator keys...',
    'Sending test tokens to the validator accounts...',
    'Deploying the rollup contracts...',
    'Generating node configuration file...',
  ];

  // Initialize the keys parameters
  let validatorKeys1: `0x${string}`;
  let validatorKeys2: `0x${string}`;
  let batchPosterKeys: `0x${string}`;

  // Initialize the addresses parameters
  let validator1Address: `0x${string}`;
  let validator2Address: `0x${string}`;
  let batchPosterAddress: `0x${string}`;

  // Initialize the deploy rollup hash parameter
  let deployRollupHash: `0x${string}`;

  // Initialize the node configuration result parameter
  let nodeConfigResult: GenerateNodeConfigurationResult;

  for (let i = 0; i < steps.length; i++) {
    logger.step(i + 1, steps.length, steps[i]);
    switch (i) {
      case 0:
        // Generate the validator keys and the batch poster key
        validatorKeys1 = generatePrivateKey();
        validatorKeys2 = generatePrivateKey();
        batchPosterKeys = generatePrivateKey();

        // Get the addresses of the validator and the batch poster
        validator1Address = privateKeyToAccount(sanitizePrivateKey(validatorKeys1)).address;
        validator2Address = privateKeyToAccount(sanitizePrivateKey(validatorKeys2)).address;
        batchPosterAddress = privateKeyToAccount(sanitizePrivateKey(batchPosterKeys)).address;

        break;
      case 1:
        // Send test tokens to the validator accounts and the batch poster account
        await sendTestTokens(deployer, validator1Address!, parentChainPublicClient);
        await sendTestTokens(deployer, validator2Address!, parentChainPublicClient);
        await sendTestTokens(deployer, batchPosterAddress!, parentChainPublicClient);
        break;
      case 2:
        // Deploy the rollup contracts
        const deployRollupResult = await deployRollupContracts(deployer, [validator1Address!, validator2Address!], batchPosterAddress!, parentChainPublicClient, chainId);
        deployRollupHash = deployRollupResult.transaction.hash;

        break;
      case 3:
        // Generate the node configuration file
        nodeConfigResult = await generateNodeConfiguration(deployRollupHash!, parentChain, parentChainPublicClient);

        await writeFile('node-config.json', JSON.stringify(nodeConfigResult.nodeConfig, null, 2));
        logger.success(`Node config written to "node-config.json"`);
        break;
    }
  }

  logger.newline();
  logger.success('Chain deployed successfully!');
  logger.newline();

  // Build ChainConfig from the SDK chain config
  const chainConfig = nodeConfigResult!.chainConfig;

  // Display chain info
  logger.raw(`  Chain ID:       ${chainConfig.chainId}`);

  logger.newline();

  return chainConfig;
}

export default deployChain;


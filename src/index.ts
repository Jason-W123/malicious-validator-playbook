#!/usr/bin/env node

/**
 * Malicious Validator Playbook
 * 
 * An interactive command-line tool for learning about 
 * malicious validator behaviors in blockchain networks.
 * 
 * For educational purposes only.
 */

import { privateKeyToAccount } from 'viem/accounts';
import { mainMenu } from './menu/mainMenu';
import logger from './utils/logger';
import { config } from 'dotenv';
import { sanitizePrivateKey } from '@arbitrum/chain-sdk/utils';
import { createPublicClient, http } from 'viem';
import { arbitrumSepolia } from 'viem/chains';
import { RuntimeAccount } from './types';
config();

if (typeof process.env.DEPLOYER_PRIVATE_KEY === 'undefined') {
  throw new Error(`Please provide the "DEPLOYER_PRIVATE_KEY" environment variable`);
}

if (typeof process.env.PARENT_CHAIN_RPC === 'undefined' || process.env.PARENT_CHAIN_RPC === '') {
  throw new Error(`Please provide the "PARENT_CHAIN_RPC" environment variable`);
}

const deployer = privateKeyToAccount(sanitizePrivateKey(process.env.DEPLOYER_PRIVATE_KEY!));

const parentChainPublicClient = createPublicClient({
  chain: arbitrumSepolia,
  transport: http(process.env.PARENT_CHAIN_RPC!),
});

export const runtimeAccount: RuntimeAccount = {
  deployer,
  parentChainPublicClient,
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  
  try {
    // Clear console for clean start
    console.clear();
    
    // Show main menu
    await mainMenu.show();
    
    // Exit cleanly
    process.exit(0);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ERR_USE_AFTER_CLOSE') {
      // User pressed Ctrl+C, exit gracefully
      logger.newline();
      logger.info('Goodbye!');
      process.exit(0);
    }
    
    logger.error(`An unexpected error occurred: ${(error as Error).message}`);
    process.exit(1);
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  logger.newline();
  logger.info('Interrupted. Goodbye!');
  process.exit(0);
});

// Run the application
main();


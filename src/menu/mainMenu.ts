import inquirer from 'inquirer';
import { MenuAction, GenerateNodeConfigurationResult } from '../types';
import { deployChain } from '../modules/chain/deployChain';
import { nodeManager } from '../modules/docker/nodeManager';
import logger from '../utils/logger';
import { arbitrumSepolia } from 'viem/chains';

/**
 * Main menu handler for the CLI application
 */
export class MainMenu {
  
  private chainConfig: GenerateNodeConfigurationResult["chainConfig"] | null = null;
  private isRunning: boolean = true;

  /**
   * Display the main menu and handle user input
   */
  async show(): Promise<void> {
    logger.title('Malicious Validator Playbook');

    while (this.isRunning) {
      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'Select an action:',
          choices: [
            { 
              name: this.chainConfig 
                ? `Deploy New Chain (Already deployed: Chain ${this.chainConfig.chainId})` 
                : 'Deploy New Chain',
              value: MenuAction.DEPLOY_CHAIN,
              disabled: this.chainConfig ? 'Chain already deployed' : false,
            },
            { name: 'Manage Nodes', value: MenuAction.MANAGE_NODES },
            { name: 'Call Node Interface', value: MenuAction.CALL_INTERFACE },
            { name: 'View Status', value: MenuAction.VIEW_STATUS },
            new inquirer.Separator(),
            { name: 'Exit', value: MenuAction.EXIT },
          ],
        },
      ]);

      await this.handleAction(action);
    }
  }

  /**
   * Handle the selected menu action
   */
  private async handleAction(action: MenuAction): Promise<void> {
    switch (action) {
      case MenuAction.DEPLOY_CHAIN:
        await this.handleDeployChain();
        break;

      case MenuAction.MANAGE_NODES:
        await this.handleManageNodes();
        break;

      case MenuAction.CALL_INTERFACE:
        await this.handleCallInterface();
        break;

      case MenuAction.VIEW_STATUS:
        this.handleViewStatus();
        break;

      case MenuAction.EXIT:
        await this.handleExit();
        break;
    }
  }

  /**
   * Handle chain deployment
   */
  private async handleDeployChain(): Promise<void> {
    // Todo: Add a prompt to select the parent chain
    const parentChain = arbitrumSepolia;

    const config = await deployChain(parentChain);
    
    if (config) {
      this.chainConfig = config;
      nodeManager.setChainConfig(config);
    }
  }

  /**
   * Handle node management
   */
  private async handleManageNodes(): Promise<void> {
    if (!this.chainConfig) {
      logger.error('No chain deployed. Please deploy a chain first.');
      logger.newline();
      return;
    }

    await nodeManager.manageNodes();
  }

  /**
   * Handle node interface calls
   */
  private async handleCallInterface(): Promise<void> {
    logger.error('Not implemented');
    // if (!this.chainConfig) {
    //   logger.error('No chain deployed. Please deploy a chain first.');
    //   logger.newline();
    //   return;
    // }

    // await nodeInterface.interactWithNodes();
  }

  /**
   * Handle view status
   */
  private handleViewStatus(): void {
    logger.section('Current Status');

    // Chain status
    if (this.chainConfig) {
      logger.raw('Chain Information:');
      logger.raw(`  Chain ID:     ${this.chainConfig.chainId}`);
      // Todo: Add more chain information
      logger.newline();
    } else {
      logger.warn('No chain deployed yet.');
      logger.newline();
    }

    // Node status
    nodeManager.displayStatus();
    logger.newline();
  }

  /**
   * Handle exit
   */
  private async handleExit(): Promise<void> {
    const nodes = nodeManager.getNodes();
    const runningNodes = Array.from(nodes.values()).filter(n => n.status === 'running');

    if (runningNodes.length > 0) {
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `${runningNodes.length} node(s) are still running. Stop them and exit?`,
          default: true,
        },
      ]);

      if (confirm) {
        await nodeManager.stopAllNodes();
      } else {
        return; // Don't exit
      }
    }

    logger.newline();
    logger.success('Thank you for using Malicious Validator Playbook!');
    logger.newline();

    this.isRunning = false;
  }
}

export const mainMenu = new MainMenu();
export default mainMenu;


import inquirer from 'inquirer';
import { NodeType, NodeStatus, InterfaceAction } from '../../types';
import { nodeManager } from '../docker/nodeManager';
import logger from '../../utils/logger';

/**
 * Simulate a delay for mock operations
 */
const delay = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Generate mock transaction hash
 */
const generateTxHash = (): string => {
  return '0x' + Array.from({ length: 64 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
};

/**
 * Node Interface - provides methods to interact with nodes
 */
export class NodeInterface {
  /**
   * Call a specific node's RPC endpoint
   */
  async callNode(nodeId: string, method: string, params: unknown[] = []): Promise<unknown> {
    const node = nodeManager.getNode(nodeId);

    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    if (node.status !== NodeStatus.RUNNING) {
      throw new Error(`Node ${node.config.name} is not running`);
    }

    logger.info(`Calling ${node.config.name}: ${method}`);
    await delay(200);

    // Mock RPC responses
    switch (method) {
      case 'eth_blockNumber':
        return node.blockHeight || 0;
      
      case 'eth_getValidators':
        return this.getMockValidators(node.config.type);
      
      case 'eth_sendTransaction':
        return this.processMockTransaction(node.config.type, params);
      
      default:
        return { success: true, method, params };
    }
  }

  /**
   * Get mock validators based on node type
   */
  private getMockValidators(nodeType: NodeType): object[] {
    const validators = [
      { address: '0x1111...1111', stake: '100 ETH', status: 'active' },
      { address: '0x2222...2222', stake: '100 ETH', status: 'active' },
      { address: '0x3333...3333', stake: '100 ETH', status: 'active' },
    ];

    if (nodeType === NodeType.MALICIOUS) {
      // Malicious node might report different/manipulated data
      validators.push({
        address: '0xBAD0...BAD0',
        stake: '1000 ETH', // Inflated stake
        status: 'active',
      });
    }

    return validators;
  }

  /**
   * Process a mock transaction
   */
  private processMockTransaction(nodeType: NodeType, params: unknown[]): object {
    const txHash = generateTxHash();

    if (nodeType === NodeType.MALICIOUS) {
      // Malicious behavior examples
      const behaviors = [
        'Transaction reordered for MEV extraction',
        'Transaction censored (not included in block)',
        'Double-spending attempt initiated',
        'Front-running detected',
      ];
      const behavior = behaviors[Math.floor(Math.random() * behaviors.length)];

      return {
        txHash,
        status: 'pending',
        maliciousBehavior: behavior,
        warning: '⚠️ This node may be acting maliciously!',
      };
    }

    return {
      txHash,
      status: 'pending',
      estimatedConfirmation: '~12 seconds',
    };
  }

  /**
   * Get block height from a node
   */
  async getBlockHeight(nodeId: string): Promise<number> {
    const result = await this.callNode(nodeId, 'eth_blockNumber');
    return result as number;
  }

  /**
   * Get validator set from a node
   */
  async getValidatorSet(nodeId: string): Promise<object[]> {
    const result = await this.callNode(nodeId, 'eth_getValidators');
    return result as object[];
  }

  /**
   * Submit a transaction through a node
   */
  async submitTransaction(nodeId: string, txData: object): Promise<object> {
    const result = await this.callNode(nodeId, 'eth_sendTransaction', [txData]);
    return result as object;
  }

  /**
   * Interactive node interface menu
   */
  async interactWithNodes(): Promise<void> {
    const nodes = nodeManager.getNodes();
    const runningNodes = Array.from(nodes.values())
      .filter(n => n.status === NodeStatus.RUNNING);

    if (runningNodes.length === 0) {
      logger.error('No running nodes available. Please start a node first.');
      return;
    }

    while (true) {
      logger.section('Node Interface');

      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'Select action:',
          choices: [
            { name: 'Get Block Height', value: InterfaceAction.GET_BLOCK_HEIGHT },
            { name: 'Get Validator Set', value: InterfaceAction.GET_VALIDATOR_SET },
            { name: 'Submit Transaction', value: InterfaceAction.SUBMIT_TRANSACTION },
            new inquirer.Separator(),
            { name: 'Start play honest game', value: InterfaceAction.ACT_HONEST },
            { name: 'Start play malicious game', value: InterfaceAction.ACT_MALICIOUS },
            new inquirer.Separator(),
            { name: '← Back to Main Menu', value: InterfaceAction.BACK },
          ],
        },
      ]);

      if (action === InterfaceAction.BACK) {
        return;
      }

      // Refresh running nodes list
      const currentRunningNodes = Array.from(nodeManager.getNodes().values())
        .filter(n => n.status === NodeStatus.RUNNING);

      if (currentRunningNodes.length === 0) {
        logger.error('No running nodes available.');
        continue;
      }

      try {
        switch (action) {
          case InterfaceAction.GET_BLOCK_HEIGHT:
            await this.handleGetBlockHeight(currentRunningNodes);
            break;

          case InterfaceAction.GET_VALIDATOR_SET:
            await this.handleGetValidatorSet(currentRunningNodes);
            break;

          case InterfaceAction.SUBMIT_TRANSACTION:
            await this.handleSubmitTransaction(currentRunningNodes);
            break;

          case InterfaceAction.ACT_HONEST:
            // TODO: Implement honest game
            break;

          case InterfaceAction.ACT_MALICIOUS:
            // TODO: Implement malicious game
            break;
        }
      } catch (error) {
        logger.error(`Error: ${(error as Error).message}`);
      }

      logger.newline();
    }
  }

  /**
   * Handle get block height action
   */
  private async handleGetBlockHeight(nodes: Array<{ config: { id: string; name: string } }>): Promise<void> {
    const { nodeId } = await this.selectNode(nodes, 'Select node to query:');
    if (!nodeId) return;

    const height = await this.getBlockHeight(nodeId);
    logger.success(`Block Height: ${height}`);
  }

  /**
   * Handle get validator set action
   */
  private async handleGetValidatorSet(nodes: Array<{ config: { id: string; name: string } }>): Promise<void> {
    const { nodeId } = await this.selectNode(nodes, 'Select node to query:');
    if (!nodeId) return;

    const validators = await this.getValidatorSet(nodeId);
    logger.success('Validator Set:');
    validators.forEach((v, i) => {
      const validator = v as Record<string, unknown>;
      logger.raw(`  ${i + 1}. ${validator.address} - Stake: ${validator.stake} (${validator.status})`);
    });
  }

  /**
   * Handle submit transaction action
   */
  private async handleSubmitTransaction(nodes: Array<{ config: { id: string; name: string } }>): Promise<void> {
    const { nodeId } = await this.selectNode(nodes, 'Select node to submit through:');
    if (!nodeId) return;

    const { to, value } = await inquirer.prompt([
      {
        type: 'input',
        name: 'to',
        message: 'Recipient address:',
        default: '0x742d35Cc6634C0532925a3b844Bc9e7595f8fE00',
      },
      {
        type: 'input',
        name: 'value',
        message: 'Value (ETH):',
        default: '1.0',
      },
    ]);

    const result = await this.submitTransaction(nodeId, { to, value });
    logger.success('Transaction submitted:');
    Object.entries(result).forEach(([key, val]) => {
      logger.raw(`  ${key}: ${val}`);
    });
  }

  /**
   * Call a node by type
   */
  private async callNodeByType(type: NodeType): Promise<void> {
    const nodes = Array.from(nodeManager.getNodes().values())
      .filter(n => n.status === NodeStatus.RUNNING && n.config.type === type);

    if (nodes.length === 0) {
      const typeName = type === NodeType.HONEST ? 'honest' : 'malicious';
      logger.error(`No running ${typeName} nodes available.`);
      return;
    }

    const node = nodes[0]; // Use first available node of this type

    const { method } = await inquirer.prompt([
      {
        type: 'list',
        name: 'method',
        message: `Select method to call on ${node.config.name}:`,
        choices: [
          { name: 'Get Block Height', value: 'eth_blockNumber' },
          { name: 'Get Validator Set', value: 'eth_getValidators' },
          { name: 'Submit Transaction', value: 'eth_sendTransaction' },
        ],
      },
    ]);

    const result = await this.callNode(node.config.id, method);
    logger.success('Result:');
    logger.raw(JSON.stringify(result, null, 2));
  }

  /**
   * Helper to select a node from a list
   */
  private async selectNode(
    nodes: Array<{ config: { id: string; name: string } }>,
    message: string
  ): Promise<{ nodeId: string | null }> {
    const { nodeId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'nodeId',
        message,
        choices: [
          ...nodes.map(n => ({
            name: n.config.name,
            value: n.config.id,
          })),
          new inquirer.Separator(),
          { name: '← Cancel', value: null },
        ],
      },
    ]);

    return { nodeId };
  }
}

// Export singleton instance
export const nodeInterface = new NodeInterface();
export default nodeInterface;


/**
 * Type definitions for Malicious Validator Playbook
 */

import { ChainConfig, NodeConfig } from "@arbitrum/chain-sdk";
import { PrivateKeyAccount, PublicClient } from "viem";

// Runtime account types
export interface RuntimeAccount {
  deployer: PrivateKeyAccount;
  parentChainPublicClient: PublicClient;
  // TODO: Add more runtime accounts here (Maybe will be useful for future features)
  // validator1: PrivateKeyAccount;
  // validator2: PrivateKeyAccount;
  // batchPoster: PrivateKeyAccount;
  // deployer: PrivateKeyAccount;
  // parentChainPublicClient: PublicClient;
  // parentChainPublicClient: PublicClient;
}

// Node types
export enum NodeType {
  HONEST = 'honest',
  MALICIOUS = 'malicious',
}

// Node status
export enum NodeStatus {
  STOPPED = 'stopped',
  STARTING = 'starting',
  RUNNING = 'running',
  ERROR = 'error',
}

// Generate node configuration result
export interface GenerateNodeConfigurationResult {
  nodeConfig: NodeConfig;
  chainConfig: ChainConfig;
}

// Node instance (runtime state)
export interface NodeInstance {
  config: SingleNodeConfig;
  status: NodeStatus;
  containerId?: string;
  startedAt?: Date;
  blockHeight?: number;
}

export interface SingleNodeConfig {
  id: string;
  name: string;
  type: NodeType;
  port: number;
  rpcEndpoint: string;
}

// Global application state
export interface AppState {
  chain: ChainConfig | null;
  nodes: Map<string, NodeInstance>;
}

// Menu action types
export enum MenuAction {
  DEPLOY_CHAIN = 'deploy_chain',
  MANAGE_NODES = 'manage_nodes',
  CALL_INTERFACE = 'call_interface',
  VIEW_STATUS = 'view_status',
  EXIT = 'exit',
}

// Node management action types
export enum NodeAction {
  START_MAIN = 'start_main',
  START_HONEST = 'start_honest',
  START_MALICIOUS = 'start_malicious',
  START_BOTH = 'start_both',
  STOP_NODE = 'stop_node',
  STOP_ALL = 'stop_all',
  BACK = 'back',
}

// Interface call action types
export enum InterfaceAction {
  ACT_HONEST = 'act_honest',
  ACT_MALICIOUS = 'act_malicious',
  GET_BLOCK_HEIGHT = 'get_block_height',
  GET_VALIDATOR_SET = 'get_validator_set',
  SUBMIT_TRANSACTION = 'submit_transaction',
  BACK = 'back',
}


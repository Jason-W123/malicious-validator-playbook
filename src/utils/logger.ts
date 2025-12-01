import chalk from 'chalk';

/**
 * Logger utility for consistent console output
 */
export const logger = {
  /**
   * Log informational message
   */
  info: (message: string): void => {
    console.log(chalk.blue('ℹ'), chalk.blue(message));
  },

  /**
   * Log success message
   */
  success: (message: string): void => {
    console.log(chalk.green('✔'), chalk.green(message));
  },

  /**
   * Log warning message
   */
  warn: (message: string): void => {
    console.log(chalk.yellow('⚠'), chalk.yellow(message));
  },

  /**
   * Log error message
   */
  error: (message: string): void => {
    console.log(chalk.red('✖'), chalk.red(message));
  },

  /**
   * Log a step in a process
   */
  step: (step: number, total: number, message: string): void => {
    console.log(chalk.cyan(`[${step}/${total}]`), message);
  },

  /**
   * Log a title/header
   */
  title: (message: string): void => {
    console.log();
    console.log(chalk.bold.magenta('🎮 ' + message));
    console.log(chalk.magenta('='.repeat(message.length + 3)));
    console.log();
  },

  /**
   * Log a section header
   */
  section: (message: string): void => {
    console.log();
    console.log(chalk.bold.cyan('▸ ' + message));
    console.log();
  },

  /**
   * Log a divider line
   */
  divider: (): void => {
    console.log(chalk.gray('─'.repeat(50)));
  },

  /**
   * Log node status with appropriate color
   */
  nodeStatus: (nodeName: string, status: string, type: string): void => {
    const typeColor = type === 'honest' ? chalk.green : chalk.red;
    const statusColor = status === 'running' ? chalk.green : 
                       status === 'stopped' ? chalk.gray :
                       status === 'starting' ? chalk.yellow : chalk.red;
    
    console.log(
      `  ${typeColor('●')} ${chalk.bold(nodeName)} - ${statusColor(status)} (${typeColor(type)})`
    );
  },

  /**
   * Log raw message without formatting
   */
  raw: (message: string): void => {
    console.log(message);
  },

  /**
   * Print empty line
   */
  newline: (): void => {
    console.log();
  },
};

export default logger;


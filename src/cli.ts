#!/usr/bin/env node

import { Command } from 'commander';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const program = new Command();

program
  .name('openapi-explorer')
  .description('OpenAPI Explorer with MCP server integration')
  .version('1.0.0');

program
  .command('mcp')
  .description('Start the MCP server (stdio transport)')
  .option('-p, --port <port>', 'Port for HTTP transport (if using HTTP mode)')
  .option('--http', 'Use HTTP transport instead of stdio')
  .action((options) => {
    const serverPath = options.http 
      ? join(__dirname, 'mcp', 'http-server.js')
      : join(__dirname, 'mcp', 'server.js');
    
    const env = { ...process.env };
    if (options.port && options.http) {
      env.PORT = options.port;
    }

    console.log(`🚀 Starting OpenAPI Explorer MCP Server (${options.http ? 'HTTP' : 'stdio'} transport)...`);
    
    if (options.http) {
      console.log(`📡 HTTP server will be available on port ${options.port || 3001}`);
      console.log(`📖 Documentation: http://localhost:${options.port || 3001}/docs`);
    }

    const child = spawn('node', [serverPath], {
      stdio: 'inherit',
      env
    });

    child.on('error', (error) => {
      console.error('Failed to start server:', error);
      process.exit(1);
    });

    child.on('exit', (code) => {
      process.exit(code || 0);
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      child.kill('SIGINT');
    });

    process.on('SIGTERM', () => {
      child.kill('SIGTERM');
    });
  });

program
  .command('web')
  .description('Start the web interface (development server)')
  .option('-p, --port <port>', 'Port for web server', '5173')
  .action((options) => {
    console.log('🌐 Starting OpenAPI Explorer web interface...');
    console.log(`📱 Web interface will be available on http://localhost:${options.port}`);
    
    const child = spawn('npx', ['vite', '--port', options.port], {
      stdio: 'inherit',
      cwd: join(__dirname, '..')
    });

    child.on('error', (error) => {
      console.error('Failed to start web server:', error);
      console.error('Note: Web interface requires the full project for development mode.');
      process.exit(1);
    });

    child.on('exit', (code) => {
      process.exit(code || 0);
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      child.kill('SIGINT');
    });

    process.on('SIGTERM', () => {
      child.kill('SIGTERM');
    });
  });

program
  .command('setup')
  .description('Show setup instructions for MCP integration')
  .action(() => {
    console.log(`
🚀 OpenAPI Explorer MCP Setup

📋 Quick Start:
1. Start MCP server: npx openapi-explorer mcp
2. Configure your AI client (Claude Desktop, Cursor, etc.)

📖 For detailed setup instructions, visit:
   https://github.com/your-username/openapi-explorer#mcp-setup

🔧 Available Commands:
   npx openapi-explorer mcp          # Start stdio MCP server
   npx openapi-explorer mcp --http   # Start HTTP MCP server
   npx openapi-explorer setup        # Show this help
   npx openapi-explorer web          # Start web interface (dev mode)

💡 Claude Desktop Config Example:
{
  "mcpServers": {
    "openapi-explorer": {
      "command": "npx",
      "args": ["openapi-explorer", "mcp"]
    }
  }
}

🌐 HTTP Transport (port 3001):
   npx openapi-explorer mcp --http --port 3001
`);
  });

// Show help if no command provided
if (process.argv.length <= 2) {
  program.help();
}

program.parse();
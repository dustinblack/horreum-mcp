/**
 * Smoke test for the Horreum MCP server in HTTP mode.
 *
 * Starts the server, sends a ping request via curl, and validates the response.
 */
import { execa } from 'execa';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');
const serverEntry = path.join(projectRoot, 'build', 'index.js');

const PORT = 3001; // Use a different port to avoid conflicts
const AUTH_TOKEN = 'test-token';

async function run() {
  let serverProcess;

  try {
    console.log('Starting server in HTTP mode for smoke test...');
    serverProcess = execa('node', [serverEntry], {
      env: {
        HTTP_MODE_ENABLED: 'true',
        HTTP_PORT: PORT,
        HTTP_AUTH_TOKEN: AUTH_TOKEN,
        HORREUM_BASE_URL: 'http://localhost:8080', // Dummy value
      },
      // pipe stdout/stderr for debugging
      stdio: 'inherit',
    });

    // Prevent unhandled promise rejection when the process is killed
    serverProcess.catch((error) => {
      if (!error.isTerminated) {
        console.error('Server process error:', error);
      }
    });

    // Give the server a moment to start up by retrying the connection
    let connected = false;
    for (let i = 0; i < 10; i++) {
      try {
        await execa('curl', ['-s', `http://localhost:${PORT}/mcp`], { timeout: 500 });
        connected = true;
        break;
      } catch (error) {
        // ignore connection errors
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    if (!connected) {
      throw new Error('Could not connect to the server after multiple retries.');
    }

    console.log('Server started. Initializing MCP session...');

    // Step 1: Initialize the session
    const initProcess = await execa('curl', [
      '-s',
      '-i', // Include response headers
      '-X',
      'POST',
      `http://localhost:${PORT}/mcp`,
      '-H',
      'Content-Type: application/json',
      '-H',
      'Accept: application/json, text/event-stream',
      '-H',
      `Authorization: Bearer ${AUTH_TOKEN}`,
      '-d',
      JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'smoke-test', version: '1.0.0' },
        },
      }),
    ]);

    console.log('Full init response:', initProcess.stdout);

    // Extract session ID from headers
    const sessionIdMatch = initProcess.stdout.match(/mcp-session-id:\s*([^\r\n]+)/i);
    const sessionId = sessionIdMatch ? sessionIdMatch[1].trim() : null;

    // Extract JSON response body
    const jsonMatch = initProcess.stdout.match(/\r?\n\r?\n(.*)$/s);
    const initResponse = jsonMatch ? JSON.parse(jsonMatch[1]) : {};

    console.log('Init response:', JSON.stringify(initResponse, null, 2));
    console.log('Session ID:', sessionId);

    if (!sessionId && !initResponse.result) {
      throw new Error(
        'Failed to initialize session - no session ID or result received'
      );
    }

    console.log('Session initialized. Sending ping request...');

    // Step 2: Call the ping tool with session ID
    const curlProcess = await execa('curl', [
      '-s',
      '-X',
      'POST',
      `http://localhost:${PORT}/mcp`,
      '-H',
      'Content-Type: application/json',
      '-H',
      'Accept: application/json, text/event-stream',
      '-H',
      `Authorization: Bearer ${AUTH_TOKEN}`,
      ...(sessionId ? ['-H', `Mcp-Session-Id: ${sessionId}`] : []),
      '-d',
      JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'ping',
          arguments: { message: 'smoke-test' },
        },
      }),
    ]);

    const response = JSON.parse(curlProcess.stdout);
    console.log('Ping response:', JSON.stringify(response, null, 2));

    const pongMessage = response.result?.content?.[0]?.text;
    if (pongMessage !== 'smoke-test') {
      throw new Error(`Ping failed. Expected "smoke-test", got: ${pongMessage}`);
    }

    console.log('✅ HTTP smoke test passed!');
  } catch (error) {
    console.error('❌ HTTP smoke test failed:', error);
    process.exit(1);
  } finally {
    if (serverProcess) {
      console.log('Stopping server...');
      serverProcess.kill('SIGTERM');
    }
  }
}

run();

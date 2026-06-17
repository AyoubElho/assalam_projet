const fs = require('fs');
const net = require('net');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const root = __dirname;
const host = process.env.HOST || '127.0.0.1';
const requestedPort = Number(process.env.PORT || 8000);

function existingPaths(paths) {
  return paths.filter((entry) => entry && fs.existsSync(entry));
}

function phpCandidates() {
  const xamppRoots = [
    process.env.XAMPP_HOME,
    process.env.XAMPP_ROOT,
    'C:\\xampp',
    'D:\\xampp',
  ];

  return [
    process.env.PHP_BINARY,
    ...existingPaths(
      xamppRoots
        .filter(Boolean)
        .map((xamppRoot) => path.join(xamppRoot, 'php', 'php.exe'))
    ),
    'php',
  ].filter(Boolean);
}

function canRunPhp(command) {
  const result = spawnSync(command, ['-v'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  return result.status === 0;
}

function findPhpBinary() {
  return phpCandidates().find(canRunPhp);
}

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });

    server.listen(port, host);
  });
}

async function findAvailablePort(startPort) {
  for (let port = startPort; port < startPort + 20; port += 1) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }

  return null;
}

async function start() {
  const phpBinary = findPhpBinary();

  if (!phpBinary) {
    console.error('PHP was not found. Install XAMPP or add php.exe to PATH.');
    console.error('Expected XAMPP path: C:\\xampp\\php\\php.exe');
    process.exit(1);
  }

  const port = await findAvailablePort(requestedPort);
  if (!port) {
    console.error(`No free port found between ${requestedPort} and ${requestedPort + 19}.`);
    process.exit(1);
  }

  const url = `http://localhost:${port}/index.html`;
  const child = spawn(phpBinary, ['-S', `${host}:${port}`, '-t', root], {
    cwd: root,
    stdio: 'inherit',
  });

  console.log(`Website running at ${url}`);
  console.log('PHP API is enabled. Keep XAMPP MySQL running.');

  child.on('error', (error) => {
    console.error(`Failed to start PHP server: ${error.message}`);
    process.exit(1);
  });

  child.on('exit', (code) => {
    process.exit(code || 0);
  });
}

start();

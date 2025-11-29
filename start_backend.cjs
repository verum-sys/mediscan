
const net = require('net');
const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');

const startPort = 3001;
const endPort = 3010;

function checkPort(port) {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.once('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                resolve(false);
            } else {
                reject(err);
            }
        });
        server.once('listening', () => {
            server.close();
            resolve(true);
        });
        server.listen(port);
    });
}

async function findFreePort() {
    for (let port = startPort; port <= endPort; port++) {
        const isFree = await checkPort(port);
        if (isFree) {
            return port;
        }
    }
    throw new Error('No free ports found');
}

function updateFiles(newPort) {
    const files = [
        'src/pages/Dashboard.tsx',
        'src/pages/Search.tsx',
        'src/pages/DDXTool.tsx',
        'src/pages/Triage.tsx',
        'src/pages/Upload.tsx',
        'src/pages/NewVisit.tsx',
        'src/pages/VisitDetail.tsx', // Might be missed in grep if not using full url
        'src/pages/Result.tsx'
    ];

    // Also check for any other files using grep
    // For now, I'll just walk the src directory or rely on the list I saw.
    // The grep output showed: Dashboard.tsx, Search.tsx, DDXTool.tsx, Triage.tsx, Upload.tsx, NewVisit.tsx.
    // I should also check VisitDetail.tsx and Result.tsx as they likely fetch data too.

    const dir = './src';

    function walk(dir) {
        const list = fs.readdirSync(dir);
        list.forEach(file => {
            file = path.resolve(dir, file);
            const stat = fs.statSync(file);
            if (stat && stat.isDirectory()) {
                walk(file);
            } else {
                if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.js')) {
                    let content = fs.readFileSync(file, 'utf8');
                    if (content.includes('http://localhost:3001')) {
                        console.log(`Updating ${file} to port ${newPort}`);
                        const newContent = content.replace(/http:\/\/localhost:3001/g, `http://localhost:${newPort}`);
                        fs.writeFileSync(file, newContent);
                    }
                }
            }
        });
    }

    walk(dir);
}

async function run() {
    try {
        const port = await findFreePort();
        console.log(`Found free port: ${port}`);

        if (port !== 3001) {
            console.log('Updating frontend files...');
            updateFiles(port);
        }

        console.log(`Starting server on port ${port}...`);
        const server = spawn('node', ['server.js'], {
            env: { ...process.env, PORT: port },
            stdio: 'inherit'
        });

        server.on('close', (code) => {
            console.log(`Server exited with code ${code}`);
        });

    } catch (err) {
        console.error(err);
    }
}

run();

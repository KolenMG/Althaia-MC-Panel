const express = require('express');
const { exec } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

const MINECRAFT_DIR = path.resolve(process.env.HOME, 'minecraft/server');
const SERVER_SESSION = 'mcserver';
const LOG_FILE = path.join(MINECRAFT_DIR, 'logs', 'latest.log');

app.use(express.static('public'));

// Store file watcher
let logWatcher = null;
let lastLogPosition = 0;

// Function to check if server is running
function checkServerRunning() {
  return new Promise((resolve) => {
    exec('ps aux | grep "java.*server.jar" | grep -v grep', (error, stdout) => {
      if (error || !stdout) return resolve({ running: false, pid: null, uptime: null });
      
      const lines = stdout.trim().split('\n');
      if (lines.length === 0) return resolve({ running: false, pid: null, uptime: null });
      
      const parts = lines[0].trim().split(/\s+/);
      const pid = parseInt(parts[1]);
      
      exec(`ps -p ${pid} -o lstart=`, (err, startOutput) => {
        let uptime = null;
        if (!err && startOutput) {
          try {
            const startTime = new Date(startOutput.trim());
            uptime = Math.floor((Date.now() - startTime) / 1000);
          } catch (e) {
            console.error('Error parsing process start time:', e);
          }
        }
        resolve({ running: true, pid, uptime });
      });
    });
  });
}

// Read new lines from log file
function readNewLogLines() {
  if (!fs.existsSync(LOG_FILE)) {
    return;
  }

  try {
    const stats = fs.statSync(LOG_FILE);
    const currentSize = stats.size;

    // If file was truncated or is new
    if (currentSize < lastLogPosition) {
      lastLogPosition = 0;
    }

    if (currentSize > lastLogPosition) {
      const stream = fs.createReadStream(LOG_FILE, {
        start: lastLogPosition,
        end: currentSize,
        encoding: 'utf8'
      });

      let buffer = '';
      
      stream.on('data', (chunk) => {
        buffer += chunk;
        const lines = buffer.split('\n');
        
        // Keep the last incomplete line in buffer
        buffer = lines.pop() || '';
        
        // Emit complete lines
        lines.forEach(line => {
          if (line.trim()) {
            io.emit('console', line + '\n');
          }
        });
      });

      stream.on('end', () => {
        lastLogPosition = currentSize;
      });

      stream.on('error', (error) => {
        console.error('Error reading log file:', error);
      });
    }
  } catch (error) {
    console.error('Error checking log file:', error);
  }
}

// Start watching the log file
function startLogWatching() {
  stopLogWatching();

  if (!fs.existsSync(LOG_FILE)) {
    console.log('Log file not found yet:', LOG_FILE);
    return;
  }

  try {
    // Get initial file size
    const stats = fs.statSync(LOG_FILE);
    lastLogPosition = stats.size;

    // Watch for changes
    logWatcher = fs.watchFile(LOG_FILE, { interval: 500 }, (curr, prev) => {
      if (curr.mtime > prev.mtime) {
        readNewLogLines();
      }
    });

    console.log('Started watching log file');
  } catch (error) {
    console.error('Failed to start log watching:', error);
  }
}

// Stop watching
function stopLogWatching() {
  if (logWatcher) {
    fs.unwatchFile(LOG_FILE);
    logWatcher = null;
  }
}

// Send recent log lines to a socket
function sendRecentLogs(socket) {
  if (!fs.existsSync(LOG_FILE)) return;

  exec(`tail -n 50 "${LOG_FILE}"`, (error, stdout) => {
    if (!error && stdout) {
      const lines = stdout.split('\n');
      lines.forEach(line => {
        if (line.trim()) {
          socket.emit('console', line + '\n');
        }
      });
    }
  });
}

// Emit server status and stats
async function emitServerStatus() {
  const serverInfo = await checkServerRunning();
  
  if (serverInfo.running) {
    io.emit('status', 'online');
    let uptimeSeconds = serverInfo.uptime || 0;
    io.emit('stats', {
      cpu: os.loadavg()[0].toFixed(2),
      ram: ((os.totalmem() - os.freemem()) / 1024 / 1024).toFixed(0),
      uptime: uptimeSeconds
    });
  } else {
    io.emit('status', 'offline');
    io.emit('stats', {
      cpu: os.loadavg()[0].toFixed(2),
      ram: ((os.totalmem() - os.freemem()) / 1024 / 1024).toFixed(0),
      uptime: 0
    });
  }
}

setInterval(emitServerStatus, 5000);

io.on('connection', (socket) => {
  console.log('User connected');
  emitServerStatus();
  
  // Send recent logs to new connection
  checkServerRunning().then(serverInfo => {
    if (serverInfo.running) {
      sendRecentLogs(socket);
    }
  });

  const statsInterval = setInterval(emitServerStatus, 5000);

  // START server
  socket.on('start', () => {
    checkServerRunning().then(serverInfo => {
      if (serverInfo.running) {
        socket.emit('console', 'Server is already running!\n');
        return;
      }

      io.emit('status', 'starting');

      exec(
        `tmux new-session -d -s ${SERVER_SESSION} 'java -Xmx11G -Xms6G -XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=50 -XX:+UnlockExperimentalVMOptions -XX:+DisableExplicitGC -XX:+AlwaysPreTouch -XX:G1NewSizePercent=30 -XX:G1MaxNewSizePercent=40 -XX:G1HeapRegionSize=8M -XX:G1ReservePercent=20 -XX:InitiatingHeapOccupancyPercent=15 -jar server.jar nogui'`,
        { cwd: MINECRAFT_DIR },
        (err) => {
          if (err) {
            socket.emit('console', `Failed to start server: ${err.message}\n`);
            io.emit('status', 'offline');
            return;
          }

          socket.emit('console', 'Server started in tmux session.\n');
          
          // Wait for log file to be created, then start watching
          setTimeout(() => {
            startLogWatching();
            io.emit('status', 'online');
          }, 2000);
        }
      );
    });
  });

  // STOP server
  socket.on('stop', () => {
    exec(`tmux send-keys -t ${SERVER_SESSION} "stop" Enter`, (err) => {
      if (err) socket.emit('console', `Failed to stop server: ${err.message}\n`);
      else socket.emit('console', 'Stop command sent to server.\n');
    });
  });

  // KILL server
  socket.on('kill', () => {
    checkServerRunning().then(serverInfo => {
      if (!serverInfo.running) {
        socket.emit('console', 'No server process to kill!\n');
        return;
      }

      exec(`kill -9 ${serverInfo.pid}`, (err) => {
        if (err) socket.emit('console', `Failed to kill process: ${err.message}\n`);
        else {
          socket.emit('console', 'Server process killed!\n');
          stopLogWatching();
        }
      });
    });
  });

  // SEND command
  socket.on('send', (msg) => {
    checkServerRunning().then(serverInfo => {
      if (!serverInfo.running) {
        socket.emit('console', 'Cannot send command - server is not running!\n');
        return;
      }

      exec(`tmux send-keys -t ${SERVER_SESSION} "${msg}" Enter`, (err) => {
        if (err) socket.emit('console', `Failed to send command: ${err.message}\n`);
        // Command output will appear in the log automatically
      });
    });
  });

  socket.on('disconnect', () => {
    clearInterval(statsInterval);
  });
});

// Check for existing server and start watching if needed
checkServerRunning().then(serverInfo => {
  if (serverInfo.running) {
    console.log('Detected running Minecraft server - starting log watch');
    startLogWatching();
  }
});

http.listen(3000, () => {
  console.log('Panel running on http://localhost:3000');
  emitServerStatus();
});
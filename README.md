# Althaia MC - Minecraft Server Control Panel

<div align="center">

![Minecraft](https://img.shields.io/badge/Minecraft-Server-green?style=for-the-badge&logo=minecraft)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

**A beautiful, real-time web control panel for your Minecraft server**

[Features](#features) • [Installation](#installation) • [Usage](#usage) • [Configuration](#configuration) • [Troubleshooting](#troubleshooting)

</div>

---

## 📋 Features


- 🎮 **Start/Stop/Kill** server controls
- 📊 **Real-time monitoring** - CPU, RAM, and uptime statistics
- 💬 **Live console output** - See server logs in real-time
- ⌨️ **Command execution** - Send commands directly to your server
- 🎨 **Modern UI** - Beautiful, responsive design with Minecraft aesthetics
- 🔄 **Auto-reconnect** - Seamless connection recovery with Socket.IO
- 📱 **Mobile friendly** - Works on all devices - after you connect a domain. 
- 🌙 **Dark theme** - Easy on the eyes during late-night gaming sessions

---

## 📸 Screenshots

<img width="1683" height="921" alt="image" src="https://github.com/user-attachments/assets/eebb122f-9aa9-4d03-a53d-586617ceec06" />


---

## 🔧 Requirements

### System Requirements
- **OS**: Linux (Ubuntu 20.04+, Debian 10+, CentOS 8+, or similar)
- **RAM**: 512MB minimum (for the panel only)
- **CPU**: Any modern CPU
- **Disk**: 100MB for panel files

### Software Requirements
- **Node.js**: v18.0.0 or higher
- **npm**: v8.0.0 or higher (comes with Node.js)
- **tmux**: Terminal multiplexer
- **Java**: 17+ (for Minecraft server)
- **Nginx** or **Apache** (optional, for reverse proxy)

---

## 📦 Installation

### Step 1: Install System Dependencies

#### Ubuntu/Debian:
```bash
# Update package list
sudo apt update

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install tmux
sudo apt install -y tmux

# Verify installations
node --version  # Should show v18.x.x or higher
npm --version   # Should show v8.x.x or higher
tmux -V         # Should show tmux version
```

#### CentOS/RHEL/Fedora:
```bash
# Install Node.js 18.x
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Install tmux
sudo yum install -y tmux

# Verify installations
node --version
npm --version
tmux -V
```

### Step 2: Set Up Your Minecraft Server (OPTIONAL, if you already have one, skip)

If you don't have a Minecraft server yet:

```bash
# Create directory for Minecraft server
mkdir -p ~/minecraft/server
cd ~/minecraft/server

# Download server jar (example for 1.20.1)
wget https://piston-data.mojang.com/v1/objects/84194a2f286ef7c14ed7ce0090dba59902951553/server.jar

# Accept EULA
echo "eula=true" > eula.txt

# Test run (optional)
java -Xmx2G -Xms1G -jar server.jar nogui
# Press Ctrl+C after it starts successfully
```

### Step 3: Clone and Set Up the Panel

```bash
# Navigate to your home directory or wherever you want to install
cd ~

# Clone the repository
git clone https://github.com/KolenMG/Althaia-MC-Panel.git
cd althaia-mc-panel

# Install Node.js dependencies
npm install

# Create public directory for static files
mkdir -p public

# Move index.html to public directory
mv index.html public/
```

### Step 4: Configure the Panel

Edit `server.js` to match your Minecraft server location:

```bash
nano server.js
```

Find and modify this line if needed:
```javascript
const MINECRAFT_DIR = path.resolve(process.env.HOME, 'minecraft/server');
```

Change it to your actual Minecraft server path, for example:
```javascript
const MINECRAFT_DIR = '/home/youruser/minecraft/server';
```

### Step 5: Start the Panel

#### Option A: Direct Start (for testing)
```bash
node server.js
```

The panel will be available at `http://localhost:3000`

#### Option B: Using PM2 (recommended for production)

PM2 keeps your panel running even after server restarts:

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start the panel with PM2
pm2 start server.js --name "minecraft-panel"

# Save PM2 process list
pm2 save

# Set PM2 to start on boot
pm2 startup
# Follow the instructions shown

# View panel status
pm2 status

# View logs
pm2 logs minecraft-panel

# Restart panel
pm2 restart minecraft-panel

# Stop panel
pm2 stop minecraft-panel
```

---

## 🌐 Setting Up Reverse Proxy (Optional but Recommended)

### Using Nginx

#### Install Nginx:
```bash
sudo apt install nginx  # Ubuntu/Debian
# or
sudo yum install nginx  # CentOS/RHEL
```

#### Configure Nginx:
```bash
sudo nano /etc/nginx/sites-available/minecraft-panel
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;  # Change this to your domain or IP

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Socket.IO WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:3000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

Enable the site and restart Nginx:
```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/minecraft-panel /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Enable Nginx on boot
sudo systemctl enable nginx
```

#### Add SSL with Let's Encrypt (recommended):
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal is set up automatically!
```

### Using Apache

```bash
# Install Apache
sudo apt install apache2

# Enable required modules
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod proxy_wstunnel

# Create config
sudo nano /etc/apache2/sites-available/minecraft-panel.conf
```

Add this configuration:
```apache
<VirtualHost *:80>
    ServerName your-domain.com
    
    ProxyPreserveHost On
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/
    
    # WebSocket support
    RewriteEngine on
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule ^/?(.*) "ws://localhost:3000/$1" [P,L]
</VirtualHost>
```

Enable and restart:
```bash
sudo a2ensite minecraft-panel
sudo systemctl restart apache2
```

---

## 🚀 Usage

### Starting Your Server
1. Open the panel in your browser (`http://your-server:3000`)
2. Click **"Start Server"** button
3. Watch the console for server startup logs
4. Server status indicator will turn green when online

### Stopping Your Server
1. Click **"Stop Server"** to gracefully shutdown
2. Wait for the server to complete shutdown (watch console)

### Killing the Server (Emergency)
1. Use **"Kill Process"** only if the server is frozen
2. This force-kills the Java process (not graceful!)

### Sending Commands
1. Type your command in the console input field (e.g., `say Hello!`)
2. Press Enter or click **"Send"**
3. Command output appears in the console

### Console Controls
- **Clear Console**: Erases console history
- **Toggle Auto-scroll**: Enable/disable automatic scrolling
- **Copy Console**: Copy all console content to clipboard

---

## ⚙️ Configuration

### Adjusting Java Memory Allocation

Edit `server.js` and modify the Java arguments:

```javascript
exec(
  `tmux new-session -d -s ${SERVER_SESSION} 'java -Xmx11G -Xms6G ...`,
  //                                               ^^^    ^^^
  //                                               max    min
```

**Recommendations:**
- **Small server (1-10 players)**: `-Xmx2G -Xms1G`
- **Medium server (10-30 players)**: `-Xmx4G -Xms2G`
- **Large server (30-50 players)**: `-Xmx8G -Xms4G`
- **Very large server (50+ players)**: `-Xmx11G -Xms6G` or higher

### Changing the Port

Edit `server.js` and change:
```javascript
http.listen(3000, () => {
  //         ^^^^ Change this port
```

Don't forget to update your Nginx/Apache configuration!

### Customizing the UI

All styles are in `public/index.html` within the `<style>` tags. You can customize:
- Colors (`:root` CSS variables)
- Fonts
- Layout
- Button styles

---

## 🔒 Security Considerations

### Important Security Notes:

1. **Firewall Rules**: Only expose necessary ports
```bash
# Allow only port 80/443 (Nginx) from outside
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Port 3000 should NOT be accessible externally if using Nginx
```

2. **Authentication**: This panel has NO built-in authentication!
   - Use Nginx basic auth, or
   - Implement your own authentication system, or
   - Only allow access from trusted IPs

**Example: Add Basic Auth to Nginx:**
```bash
# Install apache2-utils
sudo apt install apache2-utils

# Create password file
sudo htpasswd -c /etc/nginx/.htpasswd admin

# Add to Nginx config
auth_basic "Minecraft Panel";
auth_basic_user_file /etc/nginx/.htpasswd;
```

3. **File Permissions**: Ensure proper permissions
```bash
chmod 755 ~/minecraft/server
chmod 644 ~/minecraft/server/server.jar
```

4. **Regular Updates**:
```bash
# Update panel dependencies
cd ~/althaia-mc-panel
npm update

# Update Node.js when needed
```

---

## 🐛 Troubleshooting

### Panel won't start

**Problem**: `Error: Cannot find module 'express'`
```bash
# Solution: Install dependencies
cd ~/althaia-mc-panel
npm install
```

**Problem**: `Error: listen EADDRINUSE: address already in use :::3000`
```bash
# Solution: Port is already in use, kill the process
sudo lsof -i :3000
sudo kill -9 <PID>
# Or change the port in server.js
```

### 502 Bad Gateway (Nginx)

```bash
# Check if panel is running
pm2 status

# Check panel logs
pm2 logs minecraft-panel

# Restart panel
pm2 restart minecraft-panel

# Test nginx config
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

### Console not showing output

1. **Check log file exists:**
```bash
ls -la ~/minecraft/server/logs/latest.log
```

2. **Check file permissions:**
```bash
chmod 644 ~/minecraft/server/logs/latest.log
```

3. **Verify MINECRAFT_DIR path in server.js is correct**

4. **Restart the panel:**
```bash
pm2 restart minecraft-panel
```

### Server won't start

1. **Check Java installation:**
```bash
java -version
```

2. **Check server.jar exists:**
```bash
ls -la ~/minecraft/server/server.jar
```

3. **Test manual start:**
```bash
cd ~/minecraft/server
java -Xmx2G -Xms1G -jar server.jar nogui
```

4. **Check tmux session:**
```bash
tmux ls
tmux attach -t mcserver  # Press Ctrl+B then D to detach
```

### High CPU/RAM usage

1. **Optimize Java flags** (already optimized in the script)
2. **Reduce render distance** in `server.properties`
3. **Limit player count** in `server.properties`
4. **Use Paper/Spigot** instead of vanilla for better performance

---

## 📁 My OWN Project Structure

```
althaia-mc-panel/
├── server.js           # Main Node.js backend
├── package.json        # Node.js dependencies
├── public/
│   └── index.html     # Frontend UI
├── node_modules/       # Dependencies (created by npm install)
└── README.md          # This file
minecraft/
├── server
│   └── <server files>
```

---

## 🔄 Updating the Panel

```bash
# Navigate to panel directory
cd ~/althaia-mc-panel

# Pull latest changes
git pull origin main

# Update dependencies
npm install

# Restart panel
pm2 restart minecraft-panel
```

---

## 📝 package.json

Create this file in your project root:

```json
{
  "name": "althaia-mc-panel",
  "version": "1.0.0",
  "description": "Beautiful web control panel for Minecraft servers",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "keywords": [
    "minecraft",
    "server",
    "control-panel",
    "web-panel"
  ],
  "author": "KolenMG",
  "license": "MIT",
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.6.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=8.0.0"
  }
}
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📜 License

This project is licensed under the MIT License - see below for details:

```
MIT License

Copyright (c) 2025 KolenMG

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 💖 Support

If you find this project helpful, please consider:
- ⭐ Starring this repository
- 🐛 Reporting bugs
- 💡 Suggesting new features
- 📖 Improving documentation

---

## 🙏 Acknowledgments

- Built with [Express.js](https://expressjs.com/)
- Real-time communication via [Socket.IO](https://socket.io/)
- UI inspired by modern Minecraft aesthetics
- Icons from [Font Awesome](https://fontawesome.com/)
- Fonts from [Google Fonts](https://fonts.google.com/)

---

## 📞 Contact

- **GitHub**: [@KolenMG](https://github.com/KolenMG)
- **Issues**: [Report a bug](https://github.com/KolenMG/althaia-mc-panel/issues)

---

<div align="center">

**Made with ❤️ for the Minecraft community**

⭐ Star this repo if you find it useful! ⭐

</div>

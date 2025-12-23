# IM Application Deployment Guide

This guide covers deploying the IM application for production use, enabling calls to work over mobile networks.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Required Ports](#required-ports)
- [Linux Deployment (Ubuntu)](#linux-deployment-ubuntu)
- [Windows Server Deployment](#windows-server-deployment)
- [Mobile App Build](#mobile-app-build)
- [Troubleshooting](#troubleshooting)
- [Security Checklist](#security-checklist)

---

## Architecture Overview

```
┌─────────────────┐     ┌──────────────────────────────────────────┐
│   Mobile App    │     │         Production Server                │
│  (iOS/Android)  │────▶│  (test.thrivecoretech.com)               │
└─────────────────┘     │                                          │
                        │  ┌────────────────┐  ┌────────────────┐  │
                        │  │  .NET Backend  │  │  PostgreSQL    │  │
                        │  │  (Port 5000)   │  │  Database      │  │
                        │  └────────────────┘  └────────────────┘  │
                        │                                          │
                        │  ┌────────────────┐  ┌────────────────┐  │
                        │  │  LiveKit SFU   │  │  TURN Server   │  │
                        │  │  (Port 7880)   │  │  (coturn)      │  │
                        │  └────────────────┘  └────────────────┘  │
                        └──────────────────────────────────────────┘
```

## Server Requirements

- **OS**: Windows Server 2019/2022 or Ubuntu 22.04+
- **RAM**: Minimum 4GB (8GB recommended)
- **CPU**: 2+ cores
- **Public IP address**
- **Domain name with SSL certificate**

## Required Ports

| Port | Protocol | Service | Description |
|------|----------|---------|-------------|
| 80 | TCP | HTTP | Redirect to HTTPS |
| 443 | TCP | HTTPS | Backend API & SignalR |
| 7880 | TCP | LiveKit | WebRTC signaling |
| 7881 | UDP | LiveKit | WebRTC media |
| 3478 | TCP/UDP | TURN | NAT traversal |
| 5349 | TCP | TURN/TLS | Secure NAT traversal |
| 50000-60000 | UDP | RTP | Media relay range |

---

# Linux Deployment (Ubuntu)

## Step 1: Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install .NET 8
wget https://packages.microsoft.com/config/ubuntu/22.04/packages-microsoft-prod.deb
sudo dpkg -i packages-microsoft-prod.deb
sudo apt update
sudo apt install -y dotnet-sdk-8.0

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Nginx (reverse proxy)
sudo apt install -y nginx certbot python3-certbot-nginx

# Install Docker (for LiveKit)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

## Step 2: Configure PostgreSQL

```bash
sudo -u postgres psql

CREATE USER im_user WITH PASSWORD 'your_secure_password';
CREATE DATABASE im_db OWNER im_user;
GRANT ALL PRIVILEGES ON DATABASE im_db TO im_user;
\q
```

## Step 3: Deploy Backend

```bash
# Clone repository
git clone https://github.com/your-repo/IM.git
cd IM/backend

# Build
dotnet publish -c Release -o /var/www/im-api

# Create systemd service
sudo nano /etc/systemd/system/im-api.service
```

**im-api.service:**
```ini
[Unit]
Description=IM API Backend
After=network.target

[Service]
WorkingDirectory=/var/www/im-api
ExecStart=/usr/bin/dotnet /var/www/im-api/IM.API.dll
Restart=always
RestartSec=10
User=www-data
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=ASPNETCORE_URLS=http://localhost:5000

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable im-api
sudo systemctl start im-api
```

## Step 4: Install LiveKit with TURN Server

Create `livekit.yaml`:

```yaml
port: 7880
rtc:
  port_range_start: 50000
  port_range_end: 60000
  tcp_port: 7881
  use_external_ip: true

turn:
  enabled: true
  domain: test.thrivecoretech.com
  tls_port: 5349
  udp_port: 3478
  external_tls: true

keys:
  your_api_key: your_api_secret

logging:
  level: info
```

Run LiveKit:
```bash
docker run -d \
  --name livekit \
  --network host \
  -v /path/to/livekit.yaml:/livekit.yaml \
  livekit/livekit-server \
  --config /livekit.yaml
```

## Step 5: Configure Nginx (Reverse Proxy)

```nginx
# /etc/nginx/sites-available/im

# HTTP redirect
server {
    listen 80;
    server_name test.thrivecoretech.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS - Backend API
server {
    listen 443 ssl http2;
    server_name test.thrivecoretech.com;

    ssl_certificate /etc/letsencrypt/live/test.thrivecoretech.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/test.thrivecoretech.com/privkey.pem;

    # API endpoints
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # SignalR WebSocket
    location /hubs {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
}

# LiveKit WebSocket
server {
    listen 7880 ssl;
    server_name test.thrivecoretech.com;

    ssl_certificate /etc/letsencrypt/live/test.thrivecoretech.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/test.thrivecoretech.com/privkey.pem;

    location / {
        proxy_pass http://localhost:7880;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/im /etc/nginx/sites-enabled/
sudo certbot --nginx -d test.thrivecoretech.com
sudo nginx -t && sudo systemctl reload nginx
```

## Step 6: Configure Backend for Production

Update `/var/www/im-api/appsettings.Production.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=im_db;Username=im_user;Password=your_secure_password"
  },
  "LiveKit": {
    "Host": "https://test.thrivecoretech.com:7880",
    "ApiKey": "your_api_key",
    "ApiSecret": "your_api_secret"
  },
  "AllowedOrigins": [
    "https://test.thrivecoretech.com"
  ]
}
```

## Step 7: Firewall Configuration (Linux)

```bash
# UFW rules
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 7880/tcp
sudo ufw allow 7881/udp
sudo ufw allow 3478/tcp
sudo ufw allow 3478/udp
sudo ufw allow 5349/tcp
sudo ufw allow 50000:60000/udp
sudo ufw enable
```

---

# Windows Server Deployment

## Step 1: Install Prerequisites

### Install .NET 8 SDK

1. Download .NET 8 SDK from https://dotnet.microsoft.com/download/dotnet/8.0
2. Run the installer
3. Verify installation:
```powershell
dotnet --version
```

### Install PostgreSQL

1. Download PostgreSQL from https://www.postgresql.org/download/windows/
2. Run the installer (remember the superuser password)
3. Add PostgreSQL to PATH: `C:\Program Files\PostgreSQL\16\bin`

Create database:
```powershell
psql -U postgres

CREATE USER im_user WITH PASSWORD 'your_secure_password';
CREATE DATABASE im_db OWNER im_user;
GRANT ALL PRIVILEGES ON DATABASE im_db TO im_user;
\q
```

### Install IIS with WebSocket Support

```powershell
# Run PowerShell as Administrator

# Install IIS with required features
Install-WindowsFeature -Name Web-Server, Web-WebSockets, Web-Asp-Net45 -IncludeManagementTools

# Install URL Rewrite Module (download from Microsoft)
# https://www.iis.net/downloads/microsoft/url-rewrite

# Install Application Request Routing (ARR)
# https://www.iis.net/downloads/microsoft/application-request-routing
```

### Install Docker Desktop (for LiveKit)

1. Download Docker Desktop from https://www.docker.com/products/docker-desktop
2. Enable WSL2 backend during installation
3. Restart the server

## Step 2: Deploy Backend Application

```powershell
# Clone repository
git clone https://github.com/your-repo/IM.git
cd IM\backend

# Build and publish
dotnet publish -c Release -o C:\inetpub\wwwroot\im-api

# Copy appsettings.Production.json
copy appsettings.Production.json C:\inetpub\wwwroot\im-api\
```

### Create Windows Service for Backend

```powershell
# Install as Windows Service using NSSM (Non-Sucking Service Manager)
# Download NSSM from https://nssm.cc/download

nssm install IMBackend "C:\Program Files\dotnet\dotnet.exe"
nssm set IMBackend AppParameters "C:\inetpub\wwwroot\im-api\IM.API.dll"
nssm set IMBackend AppDirectory "C:\inetpub\wwwroot\im-api"
nssm set IMBackend AppEnvironmentExtra "ASPNETCORE_ENVIRONMENT=Production" "ASPNETCORE_URLS=http://localhost:5000"
nssm set IMBackend DisplayName "IM Backend API"
nssm set IMBackend Start SERVICE_AUTO_START
nssm start IMBackend
```

Or use the built-in Windows Service hosting:
```powershell
# In the .csproj, add:
# <PackageReference Include="Microsoft.Extensions.Hosting.WindowsServices" Version="8.0.0" />

# Then publish as self-contained
dotnet publish -c Release -r win-x64 --self-contained -o C:\Services\IMBackend

# Create service
sc create IMBackend binPath= "C:\Services\IMBackend\IM.API.exe" start= auto
sc start IMBackend
```

## Step 3: Configure IIS as Reverse Proxy

### Enable Proxy in ARR

1. Open IIS Manager
2. Select Server node → Application Request Routing Cache
3. Click "Server Proxy Settings" in Actions pane
4. Check "Enable proxy" and click Apply

### Create Website with URL Rewrite Rules

1. Open IIS Manager
2. Right-click Sites → Add Website
   - Site name: `IM`
   - Physical path: `C:\inetpub\wwwroot\im-site` (create empty folder)
   - Binding: HTTPS, port 443, hostname: `test.thrivecoretech.com`
   - SSL Certificate: Select your certificate

3. Create `web.config` in `C:\inetpub\wwwroot\im-site`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <system.webServer>
        <rewrite>
            <rules>
                <!-- API Endpoints -->
                <rule name="API Proxy" stopProcessing="true">
                    <match url="^api/(.*)" />
                    <action type="Rewrite" url="http://localhost:5000/api/{R:1}" />
                    <serverVariables>
                        <set name="HTTP_X_FORWARDED_HOST" value="{HTTP_HOST}" />
                        <set name="HTTP_X_REAL_IP" value="{REMOTE_ADDR}" />
                        <set name="HTTP_X_FORWARDED_PROTO" value="https" />
                    </serverVariables>
                </rule>

                <!-- SignalR WebSocket -->
                <rule name="SignalR Proxy" stopProcessing="true">
                    <match url="^hubs/(.*)" />
                    <action type="Rewrite" url="http://localhost:5000/hubs/{R:1}" />
                    <serverVariables>
                        <set name="HTTP_X_FORWARDED_HOST" value="{HTTP_HOST}" />
                        <set name="HTTP_CONNECTION" value="Upgrade" />
                    </serverVariables>
                </rule>
            </rules>
        </rewrite>

        <!-- Enable WebSocket -->
        <webSocket enabled="true" />

        <!-- Increase timeout for WebSocket connections -->
        <httpRuntime executionTimeout="86400" />
    </system.webServer>
</configuration>
```

### Configure WebSocket Support

1. In IIS Manager, select your site
2. Double-click "Configuration Editor"
3. Navigate to `system.webServer/webSocket`
4. Set `enabled` to `True`
5. Set `receiveBufferLimit` to `4194304` (4MB)

## Step 4: Install SSL Certificate

### Using Win-ACME (Let's Encrypt)

```powershell
# Download win-acme from https://www.win-acme.com/
# Extract to C:\win-acme

cd C:\win-acme
wacs.exe

# Follow prompts:
# - Create new certificate
# - Select IIS binding
# - Enter domain: test.thrivecoretech.com
# - Choose HTTP validation
# - Select IIS to install certificate
```

### Or Import Existing Certificate

```powershell
# Import PFX certificate
Import-PfxCertificate -FilePath "C:\certs\certificate.pfx" -CertStoreLocation Cert:\LocalMachine\My -Password (ConvertTo-SecureString -String "password" -AsPlainText -Force)

# Bind in IIS Manager or via command:
New-WebBinding -Name "IM" -Protocol "https" -Port 443 -HostHeader "test.thrivecoretech.com" -SslFlags 1
```

## Step 5: Run LiveKit with Docker

```powershell
# Create livekit config directory
mkdir C:\livekit
```

Create `C:\livekit\livekit.yaml`:
```yaml
port: 7880
rtc:
  port_range_start: 50000
  port_range_end: 60000
  tcp_port: 7881
  use_external_ip: true

turn:
  enabled: true
  domain: test.thrivecoretech.com
  tls_port: 5349
  udp_port: 3478
  external_tls: true

keys:
  your_api_key: your_api_secret

logging:
  level: info
```

```powershell
# Run LiveKit container
docker run -d `
  --name livekit `
  --restart always `
  -p 7880:7880 `
  -p 7881:7881/udp `
  -p 3478:3478/tcp `
  -p 3478:3478/udp `
  -p 5349:5349/tcp `
  -p 50000-50100:50000-50100/udp `
  -v C:\livekit\livekit.yaml:/livekit.yaml `
  livekit/livekit-server `
  --config /livekit.yaml
```

## Step 6: Configure Windows Firewall

```powershell
# Run PowerShell as Administrator

# HTTP/HTTPS
New-NetFirewallRule -DisplayName "HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow
New-NetFirewallRule -DisplayName "HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow

# LiveKit
New-NetFirewallRule -DisplayName "LiveKit Signaling" -Direction Inbound -Protocol TCP -LocalPort 7880 -Action Allow
New-NetFirewallRule -DisplayName "LiveKit RTC TCP" -Direction Inbound -Protocol TCP -LocalPort 7881 -Action Allow
New-NetFirewallRule -DisplayName "LiveKit RTC UDP" -Direction Inbound -Protocol UDP -LocalPort 7881 -Action Allow

# TURN Server
New-NetFirewallRule -DisplayName "TURN TCP" -Direction Inbound -Protocol TCP -LocalPort 3478 -Action Allow
New-NetFirewallRule -DisplayName "TURN UDP" -Direction Inbound -Protocol UDP -LocalPort 3478 -Action Allow
New-NetFirewallRule -DisplayName "TURN TLS" -Direction Inbound -Protocol TCP -LocalPort 5349 -Action Allow

# RTP Media Ports
New-NetFirewallRule -DisplayName "RTP Media" -Direction Inbound -Protocol UDP -LocalPort 50000-60000 -Action Allow
```

## Step 7: Configure Backend for Production

Update `C:\inetpub\wwwroot\im-api\appsettings.Production.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=im_db;Username=im_user;Password=your_secure_password"
  },
  "LiveKit": {
    "Host": "https://test.thrivecoretech.com:7880",
    "ApiKey": "your_api_key",
    "ApiSecret": "your_api_secret"
  },
  "AllowedOrigins": [
    "https://test.thrivecoretech.com"
  ]
}
```

Restart the backend service:
```powershell
Restart-Service IMBackend
# Or if using NSSM:
nssm restart IMBackend
```

---

# Mobile App Build

## Android

```bash
cd mobile

# Use production environment
cp .env.production .env

# Build release APK
cd android
./gradlew assembleRelease

# APK location: android/app/build/outputs/apk/release/app-release.apk
```

## iOS

```bash
cd mobile/ios

# Use production environment
ENVFILE=../.env.production pod install

# Open in Xcode and archive for distribution
open IM.xcworkspace
```

---

## Troubleshooting

### Calls Not Connecting Over Mobile Network

**Linux:**
```bash
# Test TURN connectivity
turnutils_uclient -T -u username -w password test.thrivecoretech.com

# Verify ports are open
sudo netstat -tulpn | grep -E '7880|7881|3478|5349'

# Check LiveKit logs
docker logs livekit
```

**Windows:**
```powershell
# Check if ports are listening
netstat -an | findstr "7880 7881 3478 5349"

# Check LiveKit logs
docker logs livekit

# Test port connectivity from external
Test-NetConnection -ComputerName test.thrivecoretech.com -Port 7880
```

### SignalR Connection Failures

**Linux:**
```bash
# Check WebSocket upgrade
curl -i -N -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: test" \
  https://test.thrivecoretech.com/hubs/chat

# Check backend logs
sudo journalctl -u im-api -f
```

**Windows:**
```powershell
# Check if backend is running
Get-Service IMBackend

# View backend logs (if using NSSM)
nssm status IMBackend

# Check IIS logs
Get-Content C:\inetpub\logs\LogFiles\W3SVC1\*.log -Tail 50

# Check Event Viewer for application errors
Get-EventLog -LogName Application -Source "*IM*" -Newest 20
```

### IIS WebSocket Issues (Windows)

1. **Verify WebSocket is enabled:**
```powershell
Get-WindowsFeature Web-WebSockets
# Should show [X] installed
```

2. **Check ARR proxy is enabled:**
   - Open IIS Manager → Server → Application Request Routing Cache
   - Verify "Enable proxy" is checked

3. **Check URL Rewrite rules:**
   - Open IIS Manager → Site → URL Rewrite
   - Verify rules exist for `/api/*` and `/hubs/*`

4. **Enable Failed Request Tracing:**
```powershell
# Enable FREB for 502 errors
%windir%\system32\inetsrv\appcmd set config "IM" -section:tracing/traceFailedRequests /+"[path='*']"
%windir%\system32\inetsrv\appcmd set config "IM" -section:tracing/traceFailedRequests/[path='*'].traceAreas /+"[provider='WWW Server',areas='*',verbosity='Verbose']"
```

### Database Connection Issues

**Windows PostgreSQL:**
```powershell
# Check PostgreSQL service
Get-Service postgresql*

# Test connection
psql -h localhost -U im_user -d im_db -c "SELECT 1"

# Check pg_hba.conf allows local connections
notepad "C:\Program Files\PostgreSQL\16\data\pg_hba.conf"
```

## Security Checklist

- [ ] Generate new JWT secret key for production
- [ ] Generate new encryption keys
- [ ] Use strong database password
- [ ] Enable SSL/TLS for all endpoints
- [ ] Configure firewall rules
- [ ] Set up rate limiting
- [ ] Enable CORS for specific origins only
- [ ] Disable debug logging in production
- [ ] Set up log rotation
- [ ] Configure backup for database

## Monitoring

Consider setting up:
- Prometheus + Grafana for metrics
- ELK Stack for log aggregation
- Uptime monitoring (UptimeRobot, Pingdom)
- SSL certificate expiry alerts

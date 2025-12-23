# LiveKit Setup Script for Windows Server
# Run this script as Administrator in PowerShell on your VPS (68.168.211.251)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "LiveKit Server Setup" -ForegroundColor Cyan
Write-Host "Server IP: 68.168.211.251" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Step 1: Create LiveKit configuration file
Write-Host "`n[Step 1/5] Creating LiveKit configuration..." -ForegroundColor Yellow

$livekitConfig = @"
port: 7880
bind_addresses:
  - "0.0.0.0"

rtc:
  port_range_start: 50000
  port_range_end: 60000
  tcp_port: 7881
  udp_port: 7882
  use_external_ip: true
  node_ip: "68.168.211.251"

keys:
  devkey: "ZFy+QC1SRE+FuBR8NvZTdHkKGvtlyiFpSGz7Rok9nhs="

logging:
  level: info
  sample: false

room:
  auto_create: true
  empty_timeout: 300
  max_participants: 100

turn:
  enabled: false

development: false
"@

# Save configuration to C:\LiveKit\livekit.yaml
Set-Content -Path "C:\LiveKit\livekit.yaml" -Value $livekitConfig -Force
Write-Host "✓ Configuration created at C:\LiveKit\livekit.yaml" -ForegroundColor Green

# Step 2: Configure Windows Firewall
Write-Host "`n[Step 2/5] Configuring Windows Firewall..." -ForegroundColor Yellow

try {
    New-NetFirewallRule -DisplayName "LiveKit HTTP" -Direction Inbound -LocalPort 7880 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue
    Write-Host "✓ Opened port 7880 (HTTP)" -ForegroundColor Green

    New-NetFirewallRule -DisplayName "LiveKit RTC TCP" -Direction Inbound -LocalPort 7881 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue
    Write-Host "✓ Opened port 7881 (RTC TCP)" -ForegroundColor Green

    New-NetFirewallRule -DisplayName "LiveKit RTC UDP" -Direction Inbound -LocalPort 7882 -Protocol UDP -Action Allow -ErrorAction SilentlyContinue
    Write-Host "✓ Opened port 7882 (RTC UDP)" -ForegroundColor Green

    New-NetFirewallRule -DisplayName "LiveKit WebRTC UDP" -Direction Inbound -LocalPort 50000-60000 -Protocol UDP -Action Allow -ErrorAction SilentlyContinue
    Write-Host "✓ Opened ports 50000-60000 (WebRTC UDP)" -ForegroundColor Green
}
catch {
    Write-Host "⚠ Firewall rules may already exist (this is OK)" -ForegroundColor Yellow
}

# Step 3: Test LiveKit manually
Write-Host "`n[Step 3/5] Testing LiveKit..." -ForegroundColor Yellow
Write-Host "Starting LiveKit server manually for testing..." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the test and continue to service installation" -ForegroundColor Cyan
Write-Host ""

try {
    Set-Location "C:\LiveKit"
    & "C:\LiveKit\livekit-server.exe" --config "C:\LiveKit\livekit.yaml"
}
catch {
    Write-Host "Test stopped. Continuing to service installation..." -ForegroundColor Yellow
}

# This section will run after you press Ctrl+C
Write-Host "`n[Step 4/5] Installing NSSM (Service Manager)..." -ForegroundColor Yellow

if (!(Test-Path "C:\nssm\nssm.exe")) {
    try {
        New-Item -Path "C:\nssm" -ItemType Directory -Force | Out-Null
        Set-Location "C:\nssm"

        Write-Host "Downloading NSSM..." -ForegroundColor Cyan
        Invoke-WebRequest -Uri "https://nssm.cc/release/nssm-2.24.zip" -OutFile "nssm.zip"

        Write-Host "Extracting NSSM..." -ForegroundColor Cyan
        Expand-Archive -Path "nssm.zip" -DestinationPath "C:\nssm" -Force

        Copy-Item "C:\nssm\nssm-2.24\win64\nssm.exe" "C:\nssm\nssm.exe" -Force
        Remove-Item "nssm.zip" -Force
        Remove-Item "C:\nssm\nssm-2.24" -Recurse -Force

        Write-Host "✓ NSSM installed successfully" -ForegroundColor Green
    }
    catch {
        Write-Host "✗ Failed to download NSSM. Please download manually from https://nssm.cc" -ForegroundColor Red
        exit
    }
}
else {
    Write-Host "✓ NSSM already installed" -ForegroundColor Green
}

# Step 5: Install LiveKit as Windows Service
Write-Host "`n[Step 5/5] Installing LiveKit as Windows Service..." -ForegroundColor Yellow

# Create logs directory
New-Item -Path "C:\LiveKit\logs" -ItemType Directory -Force | Out-Null

# Check if service already exists
$service = Get-Service -Name "LiveKit" -ErrorAction SilentlyContinue

if ($service) {
    Write-Host "Service already exists. Removing old service..." -ForegroundColor Yellow
    Stop-Service -Name "LiveKit" -Force -ErrorAction SilentlyContinue
    & C:\nssm\nssm.exe remove LiveKit confirm
    Start-Sleep -Seconds 2
}

# Install new service
& C:\nssm\nssm.exe install LiveKit "C:\LiveKit\livekit-server.exe" "--config" "C:\LiveKit\livekit.yaml"
& C:\nssm\nssm.exe set LiveKit AppDirectory "C:\LiveKit"
& C:\nssm\nssm.exe set LiveKit DisplayName "LiveKit WebRTC Server"
& C:\nssm\nssm.exe set LiveKit Description "LiveKit WebRTC media server for IM application"
& C:\nssm\nssm.exe set LiveKit Start SERVICE_AUTO_START
& C:\nssm\nssm.exe set LiveKit AppStdout "C:\LiveKit\logs\livekit-stdout.log"
& C:\nssm\nssm.exe set LiveKit AppStderr "C:\LiveKit\logs\livekit-stderr.log"

Write-Host "✓ Service installed successfully" -ForegroundColor Green

# Start the service
Write-Host "`nStarting LiveKit service..." -ForegroundColor Cyan
Start-Service LiveKit

# Wait a moment for service to start
Start-Sleep -Seconds 3

# Check service status
$serviceStatus = Get-Service -Name "LiveKit"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "INSTALLATION COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`nService Status: " -NoNewline
if ($serviceStatus.Status -eq "Running") {
    Write-Host "RUNNING ✓" -ForegroundColor Green
}
else {
    Write-Host "NOT RUNNING ✗" -ForegroundColor Red
}

Write-Host "`nLiveKit Server: http://68.168.211.251:7880" -ForegroundColor Cyan

Write-Host "`n--- Useful Commands ---" -ForegroundColor Yellow
Write-Host "View logs:       Get-Content 'C:\LiveKit\logs\livekit-stdout.log' -Tail 50" -ForegroundColor White
Write-Host "Follow logs:     Get-Content 'C:\LiveKit\logs\livekit-stdout.log' -Wait -Tail 10" -ForegroundColor White
Write-Host "Service status:  Get-Service LiveKit" -ForegroundColor White
Write-Host "Start service:   Start-Service LiveKit" -ForegroundColor White
Write-Host "Stop service:    Stop-Service LiveKit" -ForegroundColor White
Write-Host "Restart service: Restart-Service LiveKit" -ForegroundColor White

Write-Host "`n--- Test Connection ---" -ForegroundColor Yellow
Write-Host "From this server: Invoke-WebRequest -Uri 'http://localhost:7880' -UseBasicParsing" -ForegroundColor White
Write-Host "From your Mac:    curl http://68.168.211.251:7880" -ForegroundColor White

Write-Host "`n========================================`n" -ForegroundColor Cyan

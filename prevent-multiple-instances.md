# Preventing Multiple LiteLLM Instances

## ✅ **Solution Implemented**

### **Enhanced Process Manager**
We've created an enhanced process manager (`/root/process-manager.sh`) that prevents multiple instances through:

#### **1. PID File Tracking**
- **Location**: `/tmp/litellm-pids/`
- **Files**: `backend.pid`, `frontend.pid`, `litellm.pid`
- **Function**: Tracks running process IDs to prevent duplicates

#### **2. Lock File Protection**
- **Location**: `/tmp/litellm-process-manager.lock`
- **Function**: Prevents concurrent process manager executions
- **Auto-cleanup**: Removes stale locks automatically

#### **3. Process Detection & Cleanup**
- **Singleton Protection**: Checks if service is already running before starting
- **Comprehensive Cleanup**: Kills all instances by process name AND port
- **Orphan Detection**: Finds and removes untracked processes

#### **4. Health Verification**
- **Startup Verification**: Confirms services actually start and respond
- **Status Monitoring**: Shows detailed service health and process counts
- **Port Usage Tracking**: Monitors port conflicts

### **Key Features**

#### **Automatic Prevention**
```bash
# This will NOT start duplicate if already running
./process-manager.sh litellm
# Output: "LiteLLM is already running (PID: 46187)"
```

#### **Force Cleanup**
```bash
# Clean up all orphaned processes
./process-manager.sh cleanup
```

#### **Status Monitoring**
```bash
# Shows detailed status including process counts
./process-manager.sh status
```

#### **Safe Restart**
```bash
# Safely stops and restarts without conflicts
./process-manager.sh restart litellm
```

### **Usage Commands**

```bash
# Start all services (prevents duplicates)
./process-manager.sh start

# Restart specific service safely
./process-manager.sh restart litellm
./process-manager.sh restart backend
./process-manager.sh restart frontend

# Check for multiple instances
./process-manager.sh status

# Clean up orphaned processes
./process-manager.sh cleanup

# Stop everything safely
./process-manager.sh stop
```

### **Protection Mechanisms**

#### **1. Pre-Start Checks**
- Checks PID files for existing processes
- Verifies process is actually running (not just stale PID)
- Returns early if service already healthy

#### **2. Comprehensive Cleanup**
- Kills by process pattern: `pkill -f "litellm.*--config"`
- Kills by port: `lsof -ti:4000 | xargs kill -9`
- Removes Docker containers: `docker stop litellm-working`

#### **3. Lock File Prevention**
- Only one process manager can run at a time
- Prevents race conditions during startup/shutdown
- Automatic cleanup of stale locks

#### **4. Health Verification**
- Waits for service to respond after starting
- Returns error if service fails to start properly
- Monitors service health in status command

### **Benefits**

#### **Resource Management**
- ✅ **No duplicate processes** consuming memory
- ✅ **No port conflicts** between instances
- ✅ **Clean startup/shutdown** procedures
- ✅ **Memory leak prevention**

#### **Operational Safety**
- ✅ **Predictable behavior** - always single instance
- ✅ **Safe restarts** without orphaned processes
- ✅ **Status visibility** for troubleshooting
- ✅ **Automatic cleanup** of stale processes

#### **Development Workflow**
- ✅ **Simple commands** for service management
- ✅ **Error prevention** during development
- ✅ **Consistent environment** across sessions
- ✅ **Easy debugging** with status monitoring

### **Current Status**

```bash
# Example output showing single instance protection
=== Service Status ===
Backend (port 8001): ✗ Not running
Frontend (port 3005): ✗ Not running  
LiteLLM (port 4000): ✓ Running (PID: 46187, 7 models)

=== Process Count Check ===
LiteLLM processes: 1
Backend processes: 0
Frontend processes: 0

=== Port Usage ===
Port 4000: 1 processes
```

### **Future Considerations**

#### **Systemd Integration** (Optional)
For production deployments, consider systemd services:
```bash
# /etc/systemd/system/litellm.service
[Unit]
Description=LiteLLM Proxy
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root
ExecStart=/usr/local/bin/litellm --config /root/litellm-working.yaml --port 4000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

#### **Docker Compose** (Alternative)
```yaml
# docker-compose.yml with restart policies
version: '3.8'
services:
  litellm:
    image: ghcr.io/berriai/litellm:main-latest
    ports:
      - "4000:4000"
    volumes:
      - ./litellm-working.yaml:/app/config.yaml
    restart: unless-stopped
    deploy:
      replicas: 1  # Ensures single instance
```

### **Summary**

The enhanced process manager provides robust protection against multiple LiteLLM instances through:
- **PID tracking** for process management
- **Lock files** for concurrent execution prevention  
- **Comprehensive cleanup** for orphaned processes
- **Health verification** for startup confirmation
- **Status monitoring** for operational visibility

This solution ensures reliable, single-instance operation while providing operational tools for development and debugging.
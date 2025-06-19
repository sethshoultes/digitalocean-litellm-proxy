#!/bin/bash

# Enhanced Process Manager for LiteLLM Development Environment
# Prevents multiple instances and manages development services with PID tracking

set -e

# Configuration
BACKEND_PORT=8001
FRONTEND_PORT=3005
LITELLM_PORT=4000

# PID file locations for process tracking
PID_DIR="/tmp/litellm-pids"
BACKEND_PID_FILE="$PID_DIR/backend.pid"
FRONTEND_PID_FILE="$PID_DIR/frontend.pid"
LITELLM_PID_FILE="$PID_DIR/litellm.pid"
LOCK_FILE="/tmp/litellm-process-manager.lock"

# Create PID directory if it doesn't exist
mkdir -p "$PID_DIR"

# Function to acquire lock to prevent concurrent executions
acquire_lock() {
    if [ -f "$LOCK_FILE" ]; then
        local lock_pid=$(cat "$LOCK_FILE" 2>/dev/null || echo "")
        if [ -n "$lock_pid" ] && kill -0 "$lock_pid" 2>/dev/null; then
            echo "Another process manager instance is already running (PID: $lock_pid)"
            exit 1
        else
            echo "Removing stale lock file..."
            rm -f "$LOCK_FILE"
        fi
    fi
    echo $$ > "$LOCK_FILE"
    trap 'rm -f "$LOCK_FILE"' EXIT
}

# Function to check if process is running by PID
is_process_running() {
    local pid_file=$1
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file" 2>/dev/null || echo "")
        if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
            return 0  # Process is running
        else
            rm -f "$pid_file"  # Remove stale PID file
            return 1  # Process not running
        fi
    else
        return 1  # PID file doesn't exist
    fi
}

# Function to kill all instances of a service type
kill_all_instances() {
    local service_type=$1
    local port=$2
    
    echo "Killing all $service_type instances..."
    
    case "$service_type" in
        "litellm")
            # Kill all LiteLLM processes
            pkill -f "litellm.*--config" || true
            pkill -f "litellm.*--port.*$port" || true
            ;;
        "backend")
            # Kill all backend processes
            pkill -f "uvicorn.*src.main:app" || true
            pkill -f "uvicorn.*--port.*$port" || true
            ;;
        "frontend")
            # Kill all frontend processes
            pkill -f "npm.*run.*dev" || true
            pkill -f "vite.*--port.*$port" || true
            ;;
    esac
    
    # Also kill any processes on the specific port
    lsof -ti:$port | xargs kill -9 2>/dev/null || true
    sleep 2
}

# Function to start backend with singleton protection
start_backend() {
    echo "Starting backend API on port $BACKEND_PORT..."
    
    # Check if already running
    if is_process_running "$BACKEND_PID_FILE"; then
        echo "Backend is already running (PID: $(cat $BACKEND_PID_FILE))"
        return 0
    fi
    
    # Kill any existing instances
    kill_all_instances "backend" $BACKEND_PORT
    
    cd /root
    source /root/.env
    
    # Start backend and capture PID
    uvicorn src.main:app --host 0.0.0.0 --port $BACKEND_PORT > backend.log 2>&1 &
    local backend_pid=$!
    echo $backend_pid > "$BACKEND_PID_FILE"
    
    echo "Backend started with PID $backend_pid"
    sleep 2
    
    # Verify it's actually running
    if ! is_process_running "$BACKEND_PID_FILE"; then
        echo "ERROR: Backend failed to start properly"
        return 1
    fi
}

# Function to start frontend with singleton protection  
start_frontend() {
    echo "Starting frontend dev server on port $FRONTEND_PORT..."
    
    # Check if already running
    if is_process_running "$FRONTEND_PID_FILE"; then
        echo "Frontend is already running (PID: $(cat $FRONTEND_PID_FILE))"
        return 0
    fi
    
    # Kill any existing instances
    kill_all_instances "frontend" $FRONTEND_PORT
    
    cd /root/frontend
    
    # Start frontend and capture PID
    npm run dev -- --host 0.0.0.0 --port $FRONTEND_PORT > frontend.log 2>&1 &
    local frontend_pid=$!
    echo $frontend_pid > "$FRONTEND_PID_FILE"
    
    echo "Frontend started with PID $frontend_pid"
    sleep 3
    
    # Verify it's actually running
    if ! is_process_running "$FRONTEND_PID_FILE"; then
        echo "ERROR: Frontend failed to start properly"
        return 1
    fi
}

# Function to start LiteLLM with singleton protection
start_litellm() {
    echo "Starting LiteLLM proxy on port $LITELLM_PORT..."
    
    # Check if already running
    if is_process_running "$LITELLM_PID_FILE"; then
        echo "LiteLLM is already running (PID: $(cat $LITELLM_PID_FILE))"
        return 0
    fi
    
    # Kill any existing instances
    kill_all_instances "litellm" $LITELLM_PORT
    
    # Also stop any Docker containers
    docker stop litellm-working 2>/dev/null || true
    docker rm litellm-working 2>/dev/null || true
    
    cd /root
    source /root/.env
    
    # Start LiteLLM with environment variables and capture PID
    env OPENAI_API_KEY="$OPENAI_API_KEY" \
        ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" \
        LITELLM_MASTER_KEY="$LITELLM_MASTER_KEY" \
        litellm --config /root/litellm-working.yaml --port $LITELLM_PORT --host 0.0.0.0 > litellm.log 2>&1 &
    
    local litellm_pid=$!
    echo $litellm_pid > "$LITELLM_PID_FILE"
    
    echo "LiteLLM started with PID $litellm_pid"
    sleep 5
    
    # Verify it's actually running and responding
    local retries=0
    while [ $retries -lt 10 ]; do
        if curl -s -o /dev/null -w "%{http_code}" http://localhost:$LITELLM_PORT/health | grep -q "200"; then
            echo "LiteLLM is responding and healthy"
            return 0
        fi
        sleep 2
        retries=$((retries + 1))
    done
    
    echo "WARNING: LiteLLM started but may not be responding properly"
    return 1
}

# Function to stop specific service
stop_service() {
    local service=$1
    local pid_file=""
    local port=""
    
    case "$service" in
        "backend")
            pid_file="$BACKEND_PID_FILE"
            port="$BACKEND_PORT"
            ;;
        "frontend")
            pid_file="$FRONTEND_PID_FILE"
            port="$FRONTEND_PORT"
            ;;
        "litellm")
            pid_file="$LITELLM_PID_FILE"
            port="$LITELLM_PORT"
            ;;
        *)
            echo "Unknown service: $service"
            return 1
            ;;
    esac
    
    echo "Stopping $service..."
    
    # Kill tracked process
    if is_process_running "$pid_file"; then
        local pid=$(cat "$pid_file")
        kill "$pid" 2>/dev/null || true
        sleep 2
        # Force kill if still running
        kill -9 "$pid" 2>/dev/null || true
        rm -f "$pid_file"
    fi
    
    # Kill all instances of this service type
    kill_all_instances "$service" "$port"
    
    echo "$service stopped"
}

# Function to stop all services
stop_all() {
    echo "Stopping all development services..."
    stop_service "backend"
    stop_service "frontend" 
    stop_service "litellm"
    
    # Additional cleanup
    docker stop litellm-working 2>/dev/null || true
    docker rm litellm-working 2>/dev/null || true
    
    echo "All services stopped."
}

# Function to show detailed status
show_status() {
    echo "=== Service Status ==="
    
    # Backend status
    echo -n "Backend (port $BACKEND_PORT): "
    if is_process_running "$BACKEND_PID_FILE"; then
        local pid=$(cat "$BACKEND_PID_FILE")
        if curl -s -o /dev/null -w "%{http_code}" http://localhost:$BACKEND_PORT/health | grep -q "200"; then
            echo "✓ Running (PID: $pid, Healthy)"
        else
            echo "⚠ Running (PID: $pid, Not responding)"
        fi
    else
        echo "✗ Not running"
    fi
    
    # Frontend status
    echo -n "Frontend (port $FRONTEND_PORT): "
    if is_process_running "$FRONTEND_PID_FILE"; then
        local pid=$(cat "$FRONTEND_PID_FILE")
        if curl -s -o /dev/null -w "%{http_code}" http://localhost:$FRONTEND_PORT | grep -q "200"; then
            echo "✓ Running (PID: $pid, Healthy)"
        else
            echo "⚠ Running (PID: $pid, Not responding)"
        fi
    else
        echo "✗ Not running"
    fi
    
    # LiteLLM status
    echo -n "LiteLLM (port $LITELLM_PORT): "
    if is_process_running "$LITELLM_PID_FILE"; then
        local pid=$(cat "$LITELLM_PID_FILE")
        if curl -s -o /dev/null -w "%{http_code}" http://localhost:$LITELLM_PORT/health | grep -q "200"; then
            # Get model count
            local model_count=$(curl -s http://localhost:$LITELLM_PORT/v1/models | jq '.data | length' 2>/dev/null || echo "?")
            echo "✓ Running (PID: $pid, $model_count models)"
        else
            echo "⚠ Running (PID: $pid, Not responding)"
        fi
    else
        echo "✗ Not running"
    fi
    
    echo ""
    echo "=== Process Count Check ==="
    echo "LiteLLM processes: $(pgrep -f litellm | wc -l)"
    echo "Backend processes: $(pgrep -f 'uvicorn.*src.main' | wc -l)"
    echo "Frontend processes: $(pgrep -f 'npm.*dev\|vite' | wc -l)"
    
    echo ""
    echo "=== Memory Usage ==="
    free -h
    
    echo ""
    echo "=== Port Usage ==="
    echo "Port $BACKEND_PORT: $(lsof -ti:$BACKEND_PORT | wc -l) processes"
    echo "Port $FRONTEND_PORT: $(lsof -ti:$FRONTEND_PORT | wc -l) processes"  
    echo "Port $LITELLM_PORT: $(lsof -ti:$LITELLM_PORT | wc -l) processes"
}

# Function to cleanup orphaned processes
cleanup_orphans() {
    echo "Cleaning up orphaned processes..."
    
    # Remove stale PID files where process doesn't exist
    for pid_file in "$BACKEND_PID_FILE" "$FRONTEND_PID_FILE" "$LITELLM_PID_FILE"; do
        if [ -f "$pid_file" ]; then
            local pid=$(cat "$pid_file" 2>/dev/null || echo "")
            if [ -n "$pid" ] && ! kill -0 "$pid" 2>/dev/null; then
                echo "Removing stale PID file: $pid_file"
                rm -f "$pid_file"
            fi
        fi
    done
    
    # Kill any processes on our ports that aren't tracked
    for port in $BACKEND_PORT $FRONTEND_PORT $LITELLM_PORT; do
        local port_pids=$(lsof -ti:$port 2>/dev/null || echo "")
        if [ -n "$port_pids" ]; then
            echo "Found untracked processes on port $port, investigating..."
            for port_pid in $port_pids; do
                if ! grep -q "$port_pid" "$PID_DIR"/*.pid 2>/dev/null; then
                    echo "Killing untracked process $port_pid on port $port"
                    kill -9 "$port_pid" 2>/dev/null || true
                fi
            done
        fi
    done
    
    echo "Cleanup complete"
}

# Main command processing
acquire_lock

case "$1" in
    start)
        echo "Starting all development services..."
        start_backend
        start_frontend  
        start_litellm
        sleep 3
        show_status
        ;;
    stop)
        stop_all
        ;;
    restart)
        case "$2" in
            "litellm"|"backend"|"frontend")
                stop_service "$2"
                sleep 2
                case "$2" in
                    "litellm") start_litellm ;;
                    "backend") start_backend ;;
                    "frontend") start_frontend ;;
                esac
                ;;
            *)
                stop_all
                sleep 3
                start_backend
                start_frontend
                start_litellm
                sleep 3
                show_status
                ;;
        esac
        ;;
    status)
        show_status
        ;;
    cleanup)
        cleanup_orphans
        show_status
        ;;
    litellm)
        stop_service "litellm"
        sleep 2
        start_litellm
        ;;
    backend)
        stop_service "backend"
        sleep 2
        start_backend
        ;;
    frontend)
        stop_service "frontend"
        sleep 2
        start_frontend
        ;;
    *)
        echo "Usage: $0 {start|stop|restart [service]|status|cleanup|litellm|backend|frontend}"
        echo ""
        echo "Commands:"
        echo "  start              - Start all development services"
        echo "  stop               - Stop all development services"  
        echo "  restart [service]  - Restart all or specific service"
        echo "  status             - Show detailed service status"
        echo "  cleanup            - Clean up orphaned processes"
        echo "  litellm            - Restart only LiteLLM"
        echo "  backend            - Restart only backend API"
        echo "  frontend           - Restart only frontend"
        echo ""
        echo "Features:"
        echo "  • Prevents multiple instances of same service"
        echo "  • PID file tracking for process management"  
        echo "  • Lock file prevents concurrent manager executions"
        echo "  • Automatic cleanup of stale processes"
        echo "  • Health checking and status reporting"
        exit 1
        ;;
esac
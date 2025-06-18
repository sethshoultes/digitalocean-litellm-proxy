#!/bin/bash

# Process Manager Script for LiteLLM Development Environment
# Prevents resource leaks and manages development services

set -e

BACKEND_PORT=8001
FRONTEND_PORT=3005
LITELLM_PORT=4000

# Function to kill processes on specific ports
kill_port() {
    local port=$1
    echo "Cleaning up processes on port $port..."
    lsof -ti:$port | xargs kill -9 2>/dev/null || true
}

# Function to start backend
start_backend() {
    echo "Starting backend API on port $BACKEND_PORT..."
    kill_port $BACKEND_PORT
    sleep 2
    cd /root
    uvicorn src.main:app --host 0.0.0.0 --port $BACKEND_PORT > backend.log 2>&1 &
    echo "Backend started with PID $!"
}

# Function to start frontend
start_frontend() {
    echo "Starting frontend dev server on port $FRONTEND_PORT..."
    kill_port $FRONTEND_PORT
    sleep 2
    cd /root/frontend
    npm run dev -- --host 0.0.0.0 --port $FRONTEND_PORT > frontend.log 2>&1 &
    echo "Frontend started with PID $!"
}

# Function to start LiteLLM
start_litellm() {
    echo "Starting LiteLLM proxy on port $LITELLM_PORT..."
    kill_port $LITELLM_PORT
    pkill -f litellm || true
    sleep 2
    cd /root
    litellm --config litellm-minimal.yaml --port $LITELLM_PORT --host 0.0.0.0 > litellm.log 2>&1 &
    echo "LiteLLM started with PID $!"
}

# Function to stop all services
stop_all() {
    echo "Stopping all development services..."
    kill_port $BACKEND_PORT
    kill_port $FRONTEND_PORT
    kill_port $LITELLM_PORT
    pkill -f "vite" || true
    pkill -f "uvicorn.*reload" || true
    pkill -f litellm || true
    echo "All services stopped."
}

# Function to show status
show_status() {
    echo "=== Service Status ==="
    echo "Backend (port $BACKEND_PORT):"
    curl -s -o /dev/null -w "%{http_code}" http://localhost:$BACKEND_PORT/health && echo " ✓ Running" || echo " ✗ Not responding"
    
    echo "Frontend (port $FRONTEND_PORT):"
    curl -s -o /dev/null -w "%{http_code}" http://localhost:$FRONTEND_PORT && echo " ✓ Running" || echo " ✗ Not responding"
    
    echo "LiteLLM (port $LITELLM_PORT):"
    curl -s -o /dev/null -w "%{http_code}" http://localhost:$LITELLM_PORT/health && echo " ✓ Running" || echo " ✗ Not responding"
    
    echo ""
    echo "=== Memory Usage ==="
    free -h
    
    echo ""
    echo "=== Process Count ==="
    echo "Node processes: $(pgrep node | wc -l)"
    echo "Python processes: $(pgrep python | wc -l)"
}

# Main command processing
case "$1" in
    start)
        echo "Starting all development services..."
        start_backend
        start_frontend  
        start_litellm
        sleep 5
        show_status
        ;;
    stop)
        stop_all
        ;;
    restart)
        stop_all
        sleep 3
        start_backend
        start_frontend
        start_litellm
        sleep 5
        show_status
        ;;
    status)
        show_status
        ;;
    litellm)
        start_litellm
        ;;
    backend)
        start_backend
        ;;
    frontend)
        start_frontend
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|litellm|backend|frontend}"
        echo ""
        echo "Commands:"
        echo "  start    - Start all development services"
        echo "  stop     - Stop all development services"
        echo "  restart  - Restart all services"
        echo "  status   - Show service status and resource usage"
        echo "  litellm  - Restart only LiteLLM"
        echo "  backend  - Restart only backend API"
        echo "  frontend - Restart only frontend"
        exit 1
        ;;
esac
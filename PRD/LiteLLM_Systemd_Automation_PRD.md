# LiteLLM Systemd Automation PRD

## Executive Summary

This Product Requirements Document (PRD) outlines the implementation of reliable systemd service automation for the LiteLLM Full Compatibility system. The goal is to achieve zero-touch operations with automatic startup, restart, and 99.9% uptime through robust systemd service configuration.

**Current State:** Manual control via `/root/process-manager.sh` works perfectly with 94% implementation completion, but systemd service automation is not functioning properly.

**Objective:** Enable fully automated service management with systemd for production-ready operations, maintaining all existing functionality while adding enterprise-grade reliability.

**Business Value:** Reduces operational overhead, eliminates manual intervention requirements, and provides enterprise-grade reliability for production deployments.

---

## Current State Analysis

### ✅ What's Working Perfectly

**Manual Process Management:**
- `/root/process-manager.sh` provides complete service lifecycle management
- Singleton protection prevents multiple instances
- PID file tracking with lock file coordination
- Health checking and status reporting
- 7 LLM models operational (3 OpenAI + 4 Anthropic)
- All services start, stop, and restart reliably
- Memory management and resource optimization
- Port conflict resolution and cleanup

**Core Infrastructure:**
- PostgreSQL + Redis databases fully functional
- Backend API (20 endpoints) production-ready
- Frontend React application with real-time features
- SSL/HTTPS deployment with enterprise security
- Docker Compose configuration optimized
- Environment variable management working

**Service Architecture:**
- Backend: FastAPI on port 8001
- Frontend: React dev server on port 3005
- LiteLLM: Proxy server on port 4000
- Database: PostgreSQL on port 5432
- Cache: Redis on port 6379

### ❌ What Needs Fixing

**Systemd Service Issues:**
- Current service file `/etc/systemd/system/litellm.service` references non-existent `/root/startup-services.sh`
- Service starts but terminates unexpectedly (status shows "Terminated")
- No proper dependency management between services
- Service doesn't survive system reboots
- Restart policies not optimized for multi-service coordination

**Missing Components:**
- Dedicated systemd-compatible startup script
- Proper service dependencies and ordering
- Health check integration for systemd
- Log management and rotation
- Resource monitoring and alerting
- Graceful shutdown handling

**Configuration Gaps:**
- Environment variable loading inconsistent in systemd context
- Working directory and PATH configuration issues
- Service user permissions and security constraints
- Service interdependencies not properly defined

---

## Requirements Specification

### Functional Requirements

**FR-1: Automatic Service Startup**
- All services (backend, frontend, LiteLLM) start automatically on system boot
- Proper service ordering with dependency management
- Environment variables loaded correctly in systemd context
- Services reach healthy state within 120 seconds

**FR-2: Reliable Restart Management**
- Automatic restart on service failure with exponential backoff
- Coordinated restart of dependent services
- Graceful shutdown with proper cleanup
- Health check integration for restart decisions

**FR-3: Process Management Integration**
- Maintain compatibility with existing `/root/process-manager.sh`
- Singleton protection across manual and systemd management
- PID file coordination between systems
- Lock file respect for concurrent operation prevention

**FR-4: Service Health Monitoring**
- Real-time health checks for all services
- HTTP endpoint availability verification
- Database connectivity validation
- Memory usage monitoring with alerts

**FR-5: Log Management**
- Centralized logging via systemd journal
- Log rotation and retention policies
- Error aggregation and alerting
- Debug information preservation

### Non-Functional Requirements

**NFR-1: Reliability**
- 99.9% uptime target (8.77 hours downtime per year maximum)
- Mean Time To Recovery (MTTR) < 60 seconds
- Zero-touch operation for 95% of failure scenarios
- Automatic recovery from common failure modes

**NFR-2: Performance**
- Service startup time < 60 seconds
- Health check response time < 5 seconds
- Memory usage within 1.5GB limit
- CPU utilization < 80% under normal load

**NFR-3: Security**
- Service runs with minimal required privileges
- Environment variables properly secured
- Log files have appropriate permissions
- No credential exposure in process lists

**NFR-4: Maintainability**
- Clear separation between manual and automatic management
- Comprehensive documentation and comments
- Debugging capabilities and diagnostic tools
- Configuration management through environment files

---

## Technical Implementation Plan

### Phase 1: Systemd Service Architecture

**1.1 Create Systemd-Compatible Startup Script**
```bash
# Create /root/systemd-startup.sh
- Implement systemd-specific service management
- Integrate with existing process-manager.sh logic
- Add proper signal handling for systemd
- Include health check validation
```

**1.2 Redesign Service Dependencies**
```systemd
# Service dependency hierarchy:
- litellm-database.service (PostgreSQL + Redis)
- litellm-backend.service (depends on database)
- litellm-frontend.service (depends on backend)
- litellm-proxy.service (depends on backend)
- litellm-stack.service (coordinates all services)
```

**1.3 Environment Management**
- Secure environment file loading
- Validation of required environment variables
- Fallback configuration for missing variables
- Environment variable sanitization

### Phase 2: Service Configuration

**2.1 Individual Service Units**
```systemd
# litellm-backend.service
[Unit]
Description=LiteLLM Backend API
After=postgresql.service redis.service
Requires=postgresql.service redis.service

[Service]
Type=exec
User=root
WorkingDirectory=/root
EnvironmentFile=/root/.env
ExecStart=/usr/local/bin/uvicorn src.main:app --host 0.0.0.0 --port 8001
ExecReload=/bin/kill -HUP $MAINPID
Restart=on-failure
RestartSec=10
```

**2.2 Coordinated Service Management**
```systemd
# litellm-stack.service (main service)
[Unit]
Description=LiteLLM Complete Stack
Wants=litellm-backend.service litellm-frontend.service litellm-proxy.service
After=litellm-backend.service

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/root/systemd-startup.sh start
ExecStop=/root/systemd-startup.sh stop
```

**2.3 Health Check Integration**
- HTTP health endpoints for all services
- Service-specific health validation
- Dependency health propagation
- Health check timeout and retry logic

### Phase 3: Process Coordination

**3.1 Lock File Management**
- Systemd-aware lock file handling
- Coordination with manual process manager
- Cleanup of stale locks on service start
- Prevention of conflicting operations

**3.2 PID File Integration**
- Maintain existing PID file structure
- Systemd PID tracking compatibility
- Cleanup of orphaned PID files
- Process hierarchy management

**3.3 Signal Handling**
- Proper SIGTERM handling for graceful shutdown
- SIGHUP for configuration reload
- SIGKILL escalation after timeout
- Signal propagation to child processes

### Phase 4: Monitoring and Alerting

**4.1 Service Monitoring**
- Systemd status integration
- Custom health check scripts
- Performance metrics collection
- Resource usage monitoring

**4.2 Log Management**
- Journal integration for all services
- Structured logging with metadata
- Log rotation and retention
- Error pattern detection

**4.3 Alerting System**
- Service failure notifications
- Performance threshold alerts
- Health check failure detection
- Resource exhaustion warnings

---

## Testing & Validation

### Test Categories

**Unit Tests**
- Individual service startup/shutdown
- Environment variable loading
- Health check functionality
- Error handling and recovery

**Integration Tests**
- Service dependency coordination
- End-to-end workflow validation
- Database connectivity testing
- API endpoint availability

**System Tests**
- Full system boot testing
- Service restart scenarios
- Failure recovery testing
- Performance under load

**Chaos Engineering**
- Random service termination
- Resource exhaustion simulation
- Network partition testing
- Database connection failures

### Test Scenarios

**TS-1: Clean System Boot**
1. Start from powered-off state
2. Boot system and verify automatic service startup
3. Validate all 7 LLM models are operational
4. Confirm all HTTP endpoints respond correctly
5. Verify database connectivity and data integrity

**TS-2: Service Failure Recovery**
1. Artificially terminate individual services
2. Verify automatic restart within 60 seconds
3. Confirm dependent services restart as needed
4. Validate data consistency after recovery

**TS-3: Resource Exhaustion**
1. Consume available memory/CPU resources
2. Verify services restart when resources available
3. Confirm graceful degradation under load
4. Validate alert generation and resolution

**TS-4: Manual/Automatic Coordination**
1. Start services via systemd
2. Attempt manual management via process-manager.sh
3. Verify singleton protection works correctly
4. Confirm no conflicts or duplicate processes

### Validation Criteria

**Startup Validation**
- All services start within 120 seconds
- Health checks pass for all endpoints
- No error messages in systemd journal
- Memory usage within 1.5GB limit

**Reliability Validation**
- 99.9% uptime over 7-day test period
- Automatic recovery from 95% of induced failures
- No manual intervention required for common issues
- MTTR < 60 seconds for service restarts

**Performance Validation**
- API response times < 500ms
- LiteLLM model queries complete successfully
- Database queries perform within SLA
- Frontend loads and functions properly

---

## Success Criteria

### Primary Success Metrics

**Operational Excellence**
- ✅ 99.9% uptime measured over 30-day period
- ✅ Zero manual interventions for routine operations
- ✅ All services automatically start on system boot
- ✅ Service failures recover within 60 seconds

**Functional Completeness**
- ✅ All 7 LLM models remain operational
- ✅ 20 backend API endpoints continue to function
- ✅ Frontend application loads and operates normally
- ✅ Database and cache services maintain connectivity

**Integration Quality**
- ✅ Manual process-manager.sh remains fully functional
- ✅ No conflicts between manual and automatic management
- ✅ Environment variable loading works in all contexts
- ✅ Logging and monitoring provide actionable insights

### Secondary Success Metrics

**Performance Benchmarks**
- Service startup time < 60 seconds
- Memory usage remains under 1.5GB
- CPU utilization < 80% under normal load
- Health check response time < 5 seconds

**Maintainability Improvements**
- Clear documentation for all systemd services
- Diagnostic tools for troubleshooting issues
- Configuration management through environment files
- Comprehensive logging for debugging

**Security Enhancements**
- Services run with minimal required privileges
- No credential exposure in process listings
- Proper file permissions for all service components
- Secure environment variable handling

---

## Implementation Timeline

### Week 1: Foundation (Days 1-7)

**Day 1-2: Analysis and Design**
- Complete systemd service analysis
- Design service dependency architecture
- Create detailed implementation specifications
- Review security and performance requirements

**Day 3-4: Core Service Scripts**
- Create `/root/systemd-startup.sh` with systemd compatibility
- Implement health check integration
- Add environment variable validation
- Create signal handling for graceful shutdown

**Day 5-7: Service Unit Files**
- Design individual service unit files
- Implement coordinated service management
- Add dependency management and ordering
- Create service configuration templates

### Week 2: Implementation (Days 8-14)

**Day 8-10: Service Development**
- Implement individual service units
- Add health check endpoints
- Create process coordination logic
- Implement lock file management

**Day 11-12: Integration Testing**
- Test service startup and shutdown
- Validate dependency coordination
- Test manual/automatic coordination
- Verify health check functionality

**Day 13-14: System Testing**
- Full system boot testing
- Service failure recovery testing
- Performance validation
- Security verification

### Week 3: Validation and Optimization (Days 15-21)

**Day 15-17: Reliability Testing**
- Chaos engineering test scenarios
- 7-day uptime validation
- Failure recovery measurement
- Performance optimization

**Day 18-19: Documentation and Training**
- Create operational documentation
- Develop troubleshooting guides
- Document configuration management
- Create monitoring and alerting setup

**Day 20-21: Production Readiness**
- Final validation testing
- Security audit and verification
- Performance tuning and optimization
- Go-live preparation and checklist

### Success Checkpoints

**Checkpoint 1 (Day 7)**: Core architecture and scripts completed
**Checkpoint 2 (Day 14)**: All systemd services functional and tested
**Checkpoint 3 (Day 21)**: Production-ready with 99.9% uptime validation

---

## Risk Assessment and Mitigation

### High-Risk Items

**Risk 1: Service Interdependency Failures**
- *Probability*: Medium
- *Impact*: High
- *Mitigation*: Implement comprehensive health checks and graceful degradation

**Risk 2: Environment Variable Loading Issues**
- *Probability*: Medium
- *Impact*: Medium
- *Mitigation*: Create robust environment validation and fallback mechanisms

**Risk 3: Process Manager Conflicts**
- *Probability*: Low
- *Impact*: High
- *Mitigation*: Implement sophisticated lock file coordination and conflict detection

### Medium-Risk Items

**Risk 4: Performance Degradation**
- *Probability*: Low
- *Impact*: Medium
- *Mitigation*: Continuous monitoring and performance testing throughout implementation

**Risk 5: Security Privilege Escalation**
- *Probability*: Low
- *Impact*: High
- *Mitigation*: Implement principle of least privilege and comprehensive security review

### Contingency Plans

**Rollback Strategy**
- Maintain existing manual process-manager.sh as fallback
- Create systemd service disable procedures
- Document emergency manual operation procedures
- Implement configuration backup and restore

**Emergency Procedures**
- Manual service startup procedures
- Service debugging and diagnostic tools
- Log analysis and troubleshooting guides
- Emergency contact and escalation procedures

---

## Post-Implementation Monitoring

### Key Performance Indicators (KPIs)

**Reliability Metrics**
- Service uptime percentage
- Mean Time Between Failures (MTBF)
- Mean Time To Recovery (MTTR)
- Number of manual interventions required

**Performance Metrics**
- Service startup time
- Health check response time
- Memory and CPU utilization
- API response time and throughput

**Operational Metrics**
- Number of service restarts
- Error rate and error types
- Log volume and error patterns
- Resource consumption trends

### Monitoring Implementation

**Systemd Integration**
- Service status monitoring via `systemctl status`
- Journal log analysis with `journalctl`
- Service restart counting and tracking
- Resource usage monitoring through systemd

**Custom Monitoring**
- Health check endpoint monitoring
- Database connectivity validation
- API endpoint availability testing
- Performance metrics collection

**Alerting Configuration**
- Service failure notifications
- Performance threshold alerts
- Resource exhaustion warnings
- Health check failure detection

---

## Conclusion

This PRD provides a comprehensive roadmap for implementing reliable systemd automation for the LiteLLM Full Compatibility system. The implementation will maintain all existing functionality while adding enterprise-grade reliability and zero-touch operations.

The phased approach ensures minimal risk while delivering maximum value, with clear success criteria and contingency plans for risk mitigation. Upon completion, the system will achieve 99.9% uptime with automatic recovery from common failure scenarios.

**Key Deliverables:**
1. Production-ready systemd service configuration
2. Robust startup and shutdown scripts
3. Comprehensive health checking and monitoring
4. Integration with existing manual management tools
5. Complete documentation and operational procedures

**Expected Outcome:** A fully automated, enterprise-grade LiteLLM deployment with zero-touch operations and 99.9% uptime, while maintaining backward compatibility with existing manual management tools.
# gyeol-security Skill

## Overview
Content safety guardrails and security monitoring for GYEOL.

## Trigger
- On every incoming message (pre-processing)
- Every heartbeat (security-scan)

## Content Filtering
### Input Filter
- Blocklist regex patterns for harmful content
- Categories: weapons, violence, self-harm, suicide methods
- Blocked messages logged to security_log

### Output Filter
- clean_response() removes markdown formatting
- No sensitive data in responses

## Security Scan (Heartbeat)
- Count total conversations
- Count blocked content attempts
- Report blocked/total ratio
- Alert if unusual patterns detected

## Kill Switch
- Emergency shutdown via gyeol_system_state table
- Stops all autonomous activity when activated
- Accessible via /api/admin/kill-switch endpoint

## Audit Trail
- All blocked attempts logged with timestamp
- Security scan results in skills_log
- Accessible via /api/activity endpoint

## Sandboxing
- Skills run in isolated async tasks
- Individual skill failures don't crash server
- Resource limits via timeout parameters

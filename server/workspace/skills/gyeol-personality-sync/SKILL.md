# gyeol-personality-sync Skill

## Overview
Synchronizes GYEOL's personality between OpenClaw server memory and Supabase/web frontend.

## Trigger
- Every heartbeat (after self-reflect)
- After personality-evolve runs

## Sync Flow
1. Read current personality from memory_store
2. Compare with Supabase gyeol_agents record
3. If different, push memory_store values to Supabase
4. Frontend reads from Supabase on settings page load

## Personality Fields
- warmth (0-100)
- logic (0-100)
- creativity (0-100)
- energy (0-100)
- humor (0-100)

## Visual State Update
When personality changes significantly (any trait changes by 10+):
- Recalculate visual_state (color, glow, particle count)
- Update gen if conversation threshold crossed
- Trigger evolution ceremony on frontend

## Conflict Resolution
- Server memory_store is source of truth
- Supabase is persistence layer
- Frontend is read-only for personality display

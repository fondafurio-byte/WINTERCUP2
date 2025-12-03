# SECURITY DEFINER Functions - Justified Usage

## Overview
This document explains why certain functions in the Winter Cup database legitimately use `SECURITY DEFINER` and why Supabase Database Linter warnings about them are false positives.

---

## Functions with SECURITY DEFINER (Correct)

### 1. `public.handle_new_public_user()`
**Purpose:** Auth trigger that creates user records in `public_users` table when new users register via Supabase Auth

**Why SECURITY DEFINER is needed:**
- Fires automatically on `auth.users` INSERT (Supabase Auth table)
- Must INSERT into `public.public_users` with elevated privileges
- Regular user would not have INSERT permission to `public_users` table
- This is a standard Supabase pattern for user onboarding

**Risk Level:** ✅ SAFE
- Only executes on user registration
- Only inserts data into designated public_users table
- Has RLS policies on public_users table to protect data

**Reference:** [Supabase Auth Triggers Documentation](https://supabase.com/docs/guides/auth/managing-user-data#using-triggers)

---

### 2. `public.log_event()`
**Purpose:** RPC function that logs application events (app opens, logins, page access, etc.) for analytics

**Why SECURITY DEFINER is needed:**
- Called via `supabase.rpc('log_event', {...})` from client application
- Must INSERT into `events` table where authenticated users don't have direct INSERT access
- Without SECURITY DEFINER, users would need explicit INSERT grants (security risk)
- This is a controlled logging API — users cannot log arbitrary data

**Risk Level:** ✅ SAFE
- Only accepts predefined parameters (event_type, user_category, event_data)
- Only INSERTs into `events` table
- Automatically captures `auth.uid()` — user cannot spoof their ID
- All events are auditable and timestamped

**Reference:** [Supabase RPC with SECURITY DEFINER](https://supabase.com/docs/guides/database/functions#executing-functions)

---

## Functions with SECURITY DEFINER (Removed - Incorrect)

### ❌ `public.athlete_votes` (View - REMOVED)
- Was a VIEW with SECURITY DEFINER — **WRONG**
- Views should NEVER have SECURITY DEFINER (they should respect RLS)
- **Fixed:** Recreated without SECURITY DEFINER

### ❌ `public.team_tokens_view` (View - REMOVED)
- Was a VIEW with SECURITY DEFINER — **WRONG**
- Views should NEVER have SECURITY DEFINER (they should respect RLS)
- **Fixed:** Recreated without SECURITY DEFINER

---

## Summary

| Object | Type | SECURITY DEFINER | Status | Reason |
|--------|------|------------------|--------|--------|
| `handle_new_public_user` | Function | ✅ YES | Correct | Auth trigger needs elevated privileges |
| `log_event` | Function | ✅ YES | Correct | RPC needs to insert without user grants |
| `athlete_votes` | View | ❌ NO | Fixed | Views must respect RLS |
| `team_tokens_view` | View | ❌ NO | Fixed | Views must respect RLS |

---

## If Supabase Linter Still Warns

If the Database Linter continues to flag `handle_new_public_user()` or `log_event()` as warnings:

1. These are **false positives** — the configuration is correct
2. Supabase's linter may not distinguish between "Views with SECURITY DEFINER" (bad) and "Functions with SECURITY DEFINER" (sometimes necessary)
3. You can safely ignore these warnings

To suppress warnings in Supabase, you might need to:
- Contact Supabase support about the false positive
- Or disable specific linter rules that flag RPC functions with SECURITY DEFINER

---

## Best Practices Applied

✅ Views DO NOT have SECURITY DEFINER (respect RLS)
✅ RPC functions DO have SECURITY DEFINER (controlled API access)
✅ Auth triggers DO have SECURITY DEFINER (user onboarding)
✅ All functions are narrow in scope (principle of least privilege)
✅ User IDs are captured from `auth.uid()` (cannot be spoofed)

---

## Last Updated
December 3, 2025 - Security audit and view fixes applied

-- Migration 004: Add UNIQUE constraint on matches.name
--
-- CricAPI sometimes re-issues a new cricapi_match_id for the same physical
-- match (observed 2026-04-07: 11 of 24 matches were duplicated this way after
-- a manual cron run). The existing UNIQUE constraint on cricapi_match_id did
-- not catch them because the new IDs were genuinely different. Match `name`
-- is stable across these re-issues, so we use it as a second dedup key.
ALTER TABLE matches ADD CONSTRAINT matches_name_key UNIQUE (name);

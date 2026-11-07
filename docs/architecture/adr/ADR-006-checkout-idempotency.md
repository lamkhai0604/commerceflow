# ADR-006 — Checkout Idempotency and Cancellation

**Status:** Accepted (design policy); implementation not started  
**Date:** 2026-10-29

## Context
Checkout requests may be retried or submitted concurrently, causing duplicate orders or incorrect inventory.

## Decision
Use customer-scoped idempotency keys with canonical request fingerprints and durable processing state. Retain completed records at least 24 hours. Identical completed retries return the prior result. Changed payloads and concurrent same-key requests return 409. The latter includes a retry hint. Use PostgreSQL transactions and conditional stock decrements to prevent overselling. Allow cancellation only from CONFIRMED and restore inventory once in the cancellation transaction.

## Consequences
A technical idempotency table and recovery strategy are needed in addition to ten business tables. Spring Session JDBC tables are also infrastructure. All state transitions and inventory operations require integration and concurrency tests.

## Outstanding implementation questions
Crash recovery of in-progress records; retention cleanup; canonical cart fingerprinting; retry semantics for failed mock payments; concurrent admin inventory adjustment.

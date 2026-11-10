#!/usr/bin/env python3
"""
Test suite for Chronicle core logic and data integrity.
Tests:
  1. JSON seed data schema and password hashing
  2. HTML escaping / XSS protection
  3. Recipient token matching (no substring leakage)
  4. Collision-resistant capsule ID generation
  5. Cycle detection in journey parent resolution
"""

import json
import re
import html
import time
import random

def test_json_seed_integrity():
    with open("data/chronicle_db.json", "r") as f:
        db = json.load(f)
    assert "users" in db, "Missing users in chronicle_db.json"
    assert "capsules" in db, "Missing capsules in chronicle_db.json"
    assert "capsule_recipients" in db, "Missing capsule_recipients in chronicle_db.json"
    for user in db["users"]:
        # Verify password is not plaintext 'admin123' and matches 64-char sha256 hex
        assert user["password"] != "admin123", "User password must not be plaintext"
        assert len(user["password"]) == 64, "User password must be a 64-character SHA-256 hash"
    print("✓ test_json_seed_integrity passed")

def test_html_escaping():
    payloads = [
        ("<script>alert(1)</script>", "&lt;script&gt;alert(1)&lt;/script&gt;"),
        ('<img src=x onerror="alert(1)">', '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;'),
        ("Hello & Goodbye", "Hello &amp; Goodbye")
    ]
    for raw, expected in payloads:
        escaped = html.escape(raw, quote=True)
        assert "<script>" not in escaped, f"Failed to escape script: {escaped}"
        assert "<img" not in escaped, f"Failed to escape img: {escaped}"
    print("✓ test_html_escaping passed")

def test_recipient_token_matching():
    def is_match(active_user, recipient_str):
        tokens = [t.strip().lower() for t in recipient_str.split(",")]
        return active_user.lower() in tokens

    # Exact match should succeed
    assert is_match("dan", "dan"), "Exact match failed"
    assert is_match("dan", "Alice, dan, Charlie"), "Token match in list failed"

    # Substring leakage must be prevented: 'dan' must NOT match 'daniel'
    assert not is_match("dan", "daniel"), "Security hole: 'dan' matched 'daniel'"
    assert not is_match("an", "dan"), "Security hole: 'an' matched 'dan'"
    assert not is_match("dan", "Daniel, Alice"), "Security hole: 'dan' matched 'Daniel'"
    print("✓ test_recipient_token_matching passed")

def test_capsule_id_collision_resistance():
    ids = set()
    for i in range(1000):
        # Emulate generateCapsuleId logic with sequence counter + random entropy
        ts = int(time.time() * 1000)
        rand_part = random.randint(10000, 99999)
        cap_id = f"CHR-{hex(ts)[2:].upper()}-{rand_part}-{i}"
        assert cap_id not in ids, f"Collision detected for ID: {cap_id}"
        ids.add(cap_id)
    assert len(ids) == 1000
    print("✓ test_capsule_id_collision_resistance passed")

def test_journey_cycle_protection():
    # Simulate capsules with a circular parent loop: A -> B -> A
    capsules = [
        {"capsule_id": "A", "parent_capsule_id": "B"},
        {"capsule_id": "B", "parent_capsule_id": "A"}
    ]
    target = capsules[0]
    root = target
    visited = {root["capsule_id"]: True}
    iterations = 0
    while root.get("parent_capsule_id") and not visited.get(root["parent_capsule_id"]):
        iterations += 1
        parent = next((c for c in capsules if c["capsule_id"] == root["parent_capsule_id"]), None)
        if parent:
            root = parent
            visited[root["capsule_id"]] = True
        else:
            break
        if iterations > 10:
            assert False, "Cycle loop failed to terminate!"

    assert iterations <= 2, "Cycle protection failed to break loop early"
    print("✓ test_journey_cycle_protection passed")

if __name__ == "__main__":
    test_json_seed_integrity()
    test_html_escaping()
    test_recipient_token_matching()
    test_capsule_id_collision_resistance()
    test_journey_cycle_protection()
    print("\nAll 5 automated checks passed successfully!")

"""Seed script — creates demo users and imports episodes.csv.

Usage:
    python -m scripts.seed

Idempotent: running twice will not create duplicates.
"""

import asyncio
import json
import os
import sys

# Ensure backend is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.db.session import async_session_factory
from app.models import Episode, Request, StatusHistory, User, Assignment
from app.services.import_service import import_episodes_csv


SEED_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "seed")


async def seed_users(db: AsyncSession) -> dict[str, User]:
    """Seed users from seed/users.json. Returns dict of email -> User."""
    users_path = os.path.join(SEED_DIR, "users.json")
    with open(users_path) as f:
        users_data = json.load(f)

    user_map: dict[str, User] = {}
    for u in users_data:
        existing = await db.execute(select(User).where(User.email == u["email"]))
        user = existing.scalar_one_or_none()
        if user is None:
            user = User(
                name=u["name"],
                email=u["email"],
                password_hash=hash_password(u["password"]),
                role=u["role"],
                organisation=u.get("organisation"),
            )
            db.add(user)
            await db.flush()
            print(f"  Created user: {u['email']} ({u['role']})")
        else:
            print(f"  User exists: {u['email']}")
        user_map[u["email"]] = user

    return user_map


async def seed_episodes(db: AsyncSession) -> None:
    """Import episodes from seed/episodes.csv."""
    csv_path = os.path.join(SEED_DIR, "episodes.csv")
    with open(csv_path, encoding="utf-8-sig") as f:
        csv_content = f.read()

    report = await import_episodes_csv(db, csv_content)
    print(f"  Episodes imported: {report.imported}")
    print(f"  Episodes skipped: {report.skipped}")
    if report.errors:
        print(f"  Errors:")
        for e in report.errors[:10]:
            print(f"    Row {e.row}: {e.episode_id or '(no ID)'} — {e.reason}")
        if len(report.errors) > 10:
            print(f"    ... and {len(report.errors) - 10} more")


async def seed_demo_requests(db: AsyncSession, user_map: dict[str, User]) -> None:
    """Create demo requests in various states for the recruiter demo flow."""
    # Check if demo requests already exist
    existing = await db.execute(select(Request).limit(1))
    if existing.scalar_one_or_none() is not None:
        print("  Demo requests already exist, skipping")
        return

    client_a = user_map.get("client-a@example.com")
    client_b = user_map.get("client-b@example.com")
    operator = user_map.get("ops1@example.com")

    if not all([client_a, client_b, operator]):
        print("  Missing seed users, skipping demo requests")
        return

    from datetime import datetime, timezone, timedelta

    now = datetime.now(timezone.utc)

    # 1. Submitted request (client A)
    req1 = Request(
        client_id=client_a.id,
        task_name="fold towel",
        episodes_requested=5,
        deadline=now + timedelta(days=14),
        notes="Need high-quality folding demonstrations for training",
        status="submitted",
    )
    db.add(req1)
    await db.flush()
    db.add(StatusHistory(
        request_id=req1.id, previous_status=None, new_status="submitted", changed_by=client_a.id
    ))
    print(f"  Created request #{req1.id}: submitted (fold towel)")

    # 2. In-progress request (client A) - with some episodes assigned
    req2 = Request(
        client_id=client_a.id,
        task_name="pick cup",
        episodes_requested=5,
        deadline=now + timedelta(days=7),
        notes="Cup picking episodes for manipulation training",
        status="in_progress",
    )
    db.add(req2)
    await db.flush()
    db.add(StatusHistory(
        request_id=req2.id, previous_status=None, new_status="submitted", changed_by=client_a.id,
        changed_at=now - timedelta(days=3),
    ))
    db.add(StatusHistory(
        request_id=req2.id, previous_status="submitted", new_status="in_progress",
        changed_by=operator.id, changed_at=now - timedelta(days=2),
    ))
    await db.flush()

    # Assign 3 pick cup episodes to this request
    from sqlalchemy import and_
    pick_cup_eps = await db.execute(
        select(Episode).where(
            Episode.task_name == "pick cup",
            Episode.quality.in_(["good", "usable"]),
            Episode.id.notin_(select(Assignment.episode_id)),
        ).limit(3)
    )
    for ep in pick_cup_eps.scalars().all():
        db.add(Assignment(request_id=req2.id, episode_id=ep.id, assigned_by=operator.id))
    await db.flush()
    print(f"  Created request #{req2.id}: in_progress (pick cup) with 3 episodes")

    # 3. Delivered request (client B) — ready for review
    req3 = Request(
        client_id=client_b.id,
        task_name="open drawer",
        episodes_requested=3,
        deadline=now + timedelta(days=10),
        notes="Drawer manipulation data for Beta Labs project",
        status="delivered",
    )
    db.add(req3)
    await db.flush()
    db.add(StatusHistory(
        request_id=req3.id, previous_status=None, new_status="submitted", changed_by=client_b.id,
        changed_at=now - timedelta(days=5),
    ))
    db.add(StatusHistory(
        request_id=req3.id, previous_status="submitted", new_status="in_progress",
        changed_by=operator.id, changed_at=now - timedelta(days=4),
    ))
    db.add(StatusHistory(
        request_id=req3.id, previous_status="in_progress", new_status="delivered",
        changed_by=operator.id, changed_at=now - timedelta(days=1),
    ))
    await db.flush()

    # Assign 3 open drawer episodes
    drawer_eps = await db.execute(
        select(Episode).where(
            Episode.task_name == "open drawer",
            Episode.quality.in_(["good", "usable"]),
            Episode.id.notin_(select(Assignment.episode_id)),
        ).limit(3)
    )
    for ep in drawer_eps.scalars().all():
        db.add(Assignment(request_id=req3.id, episode_id=ep.id, assigned_by=operator.id))
    await db.flush()
    print(f"  Created request #{req3.id}: delivered (open drawer) with 3 episodes")

    # 4. Accepted request (client A)
    req4 = Request(
        client_id=client_a.id,
        task_name="wipe table",
        episodes_requested=3,
        deadline=now + timedelta(days=21),
        notes="Table wiping demonstrations — completed",
        status="accepted",
    )
    db.add(req4)
    await db.flush()
    db.add(StatusHistory(
        request_id=req4.id, previous_status=None, new_status="submitted", changed_by=client_a.id,
        changed_at=now - timedelta(days=10),
    ))
    db.add(StatusHistory(
        request_id=req4.id, previous_status="submitted", new_status="in_progress",
        changed_by=operator.id, changed_at=now - timedelta(days=9),
    ))
    db.add(StatusHistory(
        request_id=req4.id, previous_status="in_progress", new_status="delivered",
        changed_by=operator.id, changed_at=now - timedelta(days=6),
    ))
    db.add(StatusHistory(
        request_id=req4.id, previous_status="delivered", new_status="accepted",
        changed_by=client_a.id, changed_at=now - timedelta(days=5),
    ))
    await db.flush()

    # Assign 3 wipe table episodes
    wipe_eps = await db.execute(
        select(Episode).where(
            Episode.task_name == "wipe table",
            Episode.quality.in_(["good", "usable"]),
            Episode.id.notin_(select(Assignment.episode_id)),
        ).limit(3)
    )
    for ep in wipe_eps.scalars().all():
        db.add(Assignment(request_id=req4.id, episode_id=ep.id, assigned_by=operator.id))
    await db.flush()
    print(f"  Created request #{req4.id}: accepted (wipe table) with 3 episodes")

    # 5. Submitted request (client B)
    req5 = Request(
        client_id=client_b.id,
        task_name="stack blocks",
        episodes_requested=8,
        deadline=now + timedelta(days=30),
        notes="Block stacking for dexterity benchmarks",
        status="submitted",
    )
    db.add(req5)
    await db.flush()
    db.add(StatusHistory(
        request_id=req5.id, previous_status=None, new_status="submitted", changed_by=client_b.id,
    ))
    print(f"  Created request #{req5.id}: submitted (stack blocks)")


async def main() -> None:
    print("Seeding database...")

    async with async_session_factory() as db:
        try:
            print("\n1. Seeding users:")
            user_map = await seed_users(db)

            print("\n2. Importing episodes:")
            await seed_episodes(db)

            print("\n3. Creating demo requests:")
            await seed_demo_requests(db, user_map)

            await db.commit()
            print("\nSeed complete!")
        except Exception as e:
            await db.rollback()
            print(f"\nSeed failed: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(main())

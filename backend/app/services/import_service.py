"""CSV import service for episodes.

Handles validation, normalization, deduplication, and error reporting.
"""

import csv
import io
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Episode
from app.schemas import ImportErrorItem, ImportReport

KNOWN_ROBOTS = {"arm-01", "arm-02", "arm-03", "mobile-01", "humanoid-01"}
VALID_QUALITIES = {"good", "bad", "usable"}
REQUIRED_FIELDS = ["episode_id", "robot_id", "task_name", "recorded_at", "duration_seconds", "operator_name", "quality"]


def _normalize_quality(raw: str) -> str | None:
    """Normalize quality value. Returns None if invalid."""
    normalized = raw.strip().lower()
    if normalized in VALID_QUALITIES:
        return normalized
    return None


def _parse_date(raw: str) -> datetime | None:
    """Try to parse various date formats."""
    raw = raw.strip()
    formats = [
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%d %H:%M:%S",
        "%d/%m/%Y %H:%M",
        "%d/%m/%Y %H:%M:%S",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(raw, fmt)
        except ValueError:
            continue
    return None


def _parse_duration(raw: str) -> int | None:
    """Parse duration as positive integer."""
    raw = raw.strip()
    if not raw:
        return None
    try:
        val = float(raw)
        int_val = int(val)
        if int_val <= 0:
            return None
        if int_val > 86400:  # > 24 hours is suspicious but we'll allow up to a reasonable limit
            return None
        return int_val
    except (ValueError, OverflowError):
        return None


async def import_episodes_csv(db: AsyncSession, csv_content: str) -> ImportReport:
    """Import episodes from CSV content.

    Validates each row, skips invalid ones, and reports errors.
    Idempotent: existing episodes (by episode_id) are skipped, not duplicated.
    """
    errors: list[ImportErrorItem] = []
    imported = 0
    skipped = 0

    # Get all existing episode_ids for dedup
    existing_result = await db.execute(select(Episode.episode_id))
    existing_ids: set[str] = {r[0] for r in existing_result.all()}

    # Track IDs seen in this import batch for intra-file dedup
    seen_in_batch: set[str] = set()

    reader = csv.DictReader(io.StringIO(csv_content))

    for row_num, row in enumerate(reader, start=2):  # Row 1 is header
        # Strip whitespace from all values and keys
        row = {k.strip(): (v.strip() if v else "") for k, v in row.items() if k}

        episode_id = row.get("episode_id", "").strip()

        # Check required: episode_id
        if not episode_id:
            errors.append(ImportErrorItem(row=row_num, episode_id=None, reason="Missing episode_id"))
            skipped += 1
            continue

        # Normalize episode_id to uppercase
        episode_id = episode_id.upper()
        if not episode_id.startswith("EP-"):
            episode_id_display = episode_id
        else:
            episode_id_display = episode_id

        # Check for duplicate in existing DB
        if episode_id in existing_ids:
            errors.append(ImportErrorItem(row=row_num, episode_id=episode_id, reason="Duplicate episode ID (already in database)"))
            skipped += 1
            continue

        # Check for duplicate within this CSV file
        if episode_id in seen_in_batch:
            errors.append(ImportErrorItem(row=row_num, episode_id=episode_id, reason="Duplicate episode ID (within file)"))
            skipped += 1
            continue

        # robot_id
        robot_id = row.get("robot_id", "").strip()
        if not robot_id:
            errors.append(ImportErrorItem(row=row_num, episode_id=episode_id, reason="Missing robot_id"))
            skipped += 1
            continue
        if robot_id not in KNOWN_ROBOTS:
            errors.append(ImportErrorItem(row=row_num, episode_id=episode_id, reason=f"Unknown robot: {robot_id}"))
            skipped += 1
            continue

        # task_name
        task_name = row.get("task_name", "").strip().lower()
        if not task_name:
            errors.append(ImportErrorItem(row=row_num, episode_id=episode_id, reason="Missing task_name"))
            skipped += 1
            continue

        # recorded_at
        recorded_at_raw = row.get("recorded_at", "").strip()
        if not recorded_at_raw:
            errors.append(ImportErrorItem(row=row_num, episode_id=episode_id, reason="Missing recorded_at"))
            skipped += 1
            continue
        recorded_at = _parse_date(recorded_at_raw)
        if recorded_at is None:
            errors.append(ImportErrorItem(row=row_num, episode_id=episode_id, reason=f"Invalid date: {recorded_at_raw}"))
            skipped += 1
            continue

        # duration_seconds
        duration_raw = row.get("duration_seconds", "").strip()
        if not duration_raw:
            errors.append(ImportErrorItem(row=row_num, episode_id=episode_id, reason="Missing duration_seconds"))
            skipped += 1
            continue
        duration = _parse_duration(duration_raw)
        if duration is None:
            errors.append(ImportErrorItem(row=row_num, episode_id=episode_id, reason=f"Invalid duration: {duration_raw}"))
            skipped += 1
            continue

        # operator_name
        operator_name = row.get("operator_name", "").strip()
        if not operator_name:
            errors.append(ImportErrorItem(row=row_num, episode_id=episode_id, reason="Missing operator_name"))
            skipped += 1
            continue

        # quality
        quality_raw = row.get("quality", "").strip()
        if not quality_raw:
            errors.append(ImportErrorItem(row=row_num, episode_id=episode_id, reason="Missing quality"))
            skipped += 1
            continue
        quality = _normalize_quality(quality_raw)
        if quality is None:
            errors.append(ImportErrorItem(row=row_num, episode_id=episode_id, reason=f"Invalid quality: {quality_raw}"))
            skipped += 1
            continue

        # All validations passed — create episode
        episode = Episode(
            episode_id=episode_id,
            robot_id=robot_id,
            task_name=task_name,
            recorded_at=recorded_at,
            duration_seconds=duration,
            operator_name=operator_name,
            quality=quality,
        )
        db.add(episode)
        seen_in_batch.add(episode_id)
        existing_ids.add(episode_id)
        imported += 1

    await db.flush()

    return ImportReport(imported=imported, skipped=skipped, errors=errors)

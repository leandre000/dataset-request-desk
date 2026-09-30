"""Import tests — verify CSV import validation and idempotency."""

import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Episode
from app.services.import_service import import_episodes_csv


VALID_CSV = """episode_id,robot_id,task_name,recorded_at,duration_seconds,operator_name,quality
EP-I001,arm-01,pick cup,2026-08-01T10:00:00,60,Diane,good
EP-I002,arm-02,fold towel,2026-08-02T11:00:00,45,Eric,usable
"""

INVALID_ROBOT_CSV = """episode_id,robot_id,task_name,recorded_at,duration_seconds,operator_name,quality
EP-I010,arm-99,pick cup,2026-08-01T10:00:00,60,Diane,good
"""

INVALID_QUALITY_CSV = """episode_id,robot_id,task_name,recorded_at,duration_seconds,operator_name,quality
EP-I020,arm-01,pick cup,2026-08-01T10:00:00,60,Diane,excellent
"""

MISSING_FIELD_CSV = """episode_id,robot_id,task_name,recorded_at,duration_seconds,operator_name,quality
,arm-01,pick cup,2026-08-01T10:00:00,60,Diane,good
"""

QUALITY_NORMALIZATION_CSV = """episode_id,robot_id,task_name,recorded_at,duration_seconds,operator_name,quality
EP-I030,arm-01,pick cup,2026-08-01T10:00:00,60,Diane,Good
EP-I031,arm-02,fold towel,2026-08-02T11:00:00,45,Eric,USABLE
"""


@pytest.mark.asyncio
async def test_valid_rows_imported(db_session: AsyncSession):
    report = await import_episodes_csv(db_session, VALID_CSV)
    assert report.imported == 2
    assert report.skipped == 0
    assert len(report.errors) == 0


@pytest.mark.asyncio
async def test_invalid_robot_skipped(db_session: AsyncSession):
    report = await import_episodes_csv(db_session, INVALID_ROBOT_CSV)
    assert report.imported == 0
    assert report.skipped == 1
    assert "arm-99" in report.errors[0].reason


@pytest.mark.asyncio
async def test_invalid_quality_skipped(db_session: AsyncSession):
    report = await import_episodes_csv(db_session, INVALID_QUALITY_CSV)
    assert report.imported == 0
    assert report.skipped == 1
    assert "excellent" in report.errors[0].reason


@pytest.mark.asyncio
async def test_missing_required_field_skipped(db_session: AsyncSession):
    report = await import_episodes_csv(db_session, MISSING_FIELD_CSV)
    assert report.imported == 0
    assert report.skipped == 1


@pytest.mark.asyncio
async def test_duplicate_episode_skipped(db_session: AsyncSession):
    # Import once
    report1 = await import_episodes_csv(db_session, VALID_CSV)
    assert report1.imported == 2
    await db_session.flush()

    # Import again — same IDs should be skipped
    report2 = await import_episodes_csv(db_session, VALID_CSV)
    assert report2.imported == 0
    assert report2.skipped == 2


@pytest.mark.asyncio
async def test_repeated_import_no_duplicates(db_session: AsyncSession):
    await import_episodes_csv(db_session, VALID_CSV)
    await db_session.flush()
    await import_episodes_csv(db_session, VALID_CSV)
    await db_session.flush()

    result = await db_session.execute(select(Episode))
    all_eps = result.scalars().all()
    assert len(all_eps) == 2  # Still only 2, not 4


@pytest.mark.asyncio
async def test_quality_normalization(db_session: AsyncSession):
    report = await import_episodes_csv(db_session, QUALITY_NORMALIZATION_CSV)
    assert report.imported == 2
    assert report.skipped == 0

    result = await db_session.execute(select(Episode).order_by(Episode.episode_id))
    episodes = result.scalars().all()
    assert episodes[0].quality == "good"  # Was "Good"
    assert episodes[1].quality == "usable"  # Was "USABLE"

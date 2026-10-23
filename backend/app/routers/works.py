from fastapi import APIRouter, Query, UploadFile, File, HTTPException
from typing import Annotated
from uuid import uuid4
import struct
from sqlalchemy import select
from app.models.works import Work
from app.security import DB, Actor, require
from app.config import settings

router = APIRouter(prefix="/api/v1", tags=["Trabajos reales"])


def valid_mp4(data):
    """Check bounded ISO BMFF boxes and H.264 marker; not a full media decoder."""
    offset = 0
    found = set()
    h264 = False
    while offset + 8 <= len(data):
        size, kind = struct.unpack(">I4s", data[offset : offset + 8])
        header = 8
        if size == 1:
            if offset + 16 > len(data):
                return False
            size = struct.unpack(">Q", data[offset + 8 : offset + 16])[0]
            header = 16
        elif size == 0:
            size = len(data) - offset
        if size < header or offset + size > len(data):
            return False
        found.add(kind)
        if kind == b"moov":
            h264 = b"avc1" in data[offset : offset + size]
        offset += size
    return offset == len(data) and {b"ftyp", b"moov", b"mdat"}.issubset(found) and h264


@router.post("/work-videos/upload", status_code=201)
async def upload_work_video(db: DB, actor: Actor, file: Annotated[UploadFile, File()]):
    require(actor, db, "admin", "manager")
    data = await file.read(5 * 1024 * 1024 + 1)
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(413, "Optimiza primero el video: máximo 5 MB")
    if not valid_mp4(data):
        raise HTTPException(
            422, "Carga un video MP4 H.264 válido y optimizado para web"
        )
    filename = uuid4().hex + ".mp4"
    (settings.upload_dir / filename).write_bytes(data)
    return {"url": "/uploads/" + filename}


def public_work(row):
    return {
        key: getattr(row, key)
        for key in [
            "id",
            "title",
            "description",
            "occasion",
            "video_url",
            "poster_url",
            "gallery",
            "width",
            "height",
            "duration",
            "product_id",
        ]
    }


@router.get("/works")
def works(db: DB, limit: int = Query(50, ge=1, le=100), offset: int = Query(0, ge=0)):
    return [
        public_work(row)
        for row in db.scalars(
            select(Work)
            .where(Work.is_published.is_(True))
            .order_by(Work.id)
            .limit(limit)
            .offset(offset)
        )
    ]

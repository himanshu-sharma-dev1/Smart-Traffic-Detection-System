from pydantic import BaseModel
import datetime

class DetectionBase(BaseModel):
    label: str
    confidence: float
    box: str

class DetectionCreate(DetectionBase):
    pass

class Detection(DetectionBase):
    id: int
    timestamp: datetime.datetime

    class Config:
        orm_mode = True

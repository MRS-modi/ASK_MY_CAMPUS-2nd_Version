from pydantic import BaseModel


class SaveToggleResponse(BaseModel):
    success: bool
    message: str
    is_saved: bool
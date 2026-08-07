from pydantic import BaseModel, Field


class BrandProfile(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    industry: str = Field(min_length=1, max_length=120)
    audience: str = Field(min_length=1, max_length=500)
    goal: str = Field(min_length=1, max_length=500)
    channels: list[str] = Field(default_factory=list)


class MarketingPlan(BaseModel):
    brand: str
    objective: str
    positioning: str
    content_pillars: list[str]
    recommended_channels: list[str]
    next_actions: list[str]

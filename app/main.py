from fastapi import FastAPI

from app.schemas import BrandProfile, MarketingPlan
from app.services.strategy import build_marketing_plan

app = FastAPI(
    title="Marketing Mind AI",
    version="0.1.0",
    description="AI-ready marketing strategy and content orchestration API.",
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "marketing-mind-ai"}


@app.post("/api/v1/strategy", response_model=MarketingPlan)
def create_strategy(brand: BrandProfile) -> MarketingPlan:
    return build_marketing_plan(brand)

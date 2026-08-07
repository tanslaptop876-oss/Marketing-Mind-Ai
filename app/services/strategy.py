from app.schemas import BrandProfile, MarketingPlan


def build_marketing_plan(brand: BrandProfile) -> MarketingPlan:
    channels = brand.channels or ["website", "instagram", "facebook", "linkedin"]

    return MarketingPlan(
        brand=brand.name,
        objective=brand.goal,
        positioning=f"Position {brand.name} as a trusted solution in {brand.industry} for {brand.audience}.",
        content_pillars=[
            "education and problem solving",
            "trust and proof",
            "product or service value",
            "community and engagement",
        ],
        recommended_channels=channels,
        next_actions=[
            "define measurable 30-day goals",
            "build a keyword and audience topic map",
            "create a four-week content calendar",
            "publish consistently and track performance",
            "review analytics weekly and improve the plan",
        ],
    )

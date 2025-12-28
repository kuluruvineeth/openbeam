from pydantic import BaseModel, Field


class DocumentFeatures(BaseModel):
    doc_id: str

    bm25_title: float = Field(default=0.0)
    bm25_content: float = Field(default=0.0)
    dense_score: float = Field(default=0.0)
    sparse_score: float = Field(default=0.0)
    rerank_score: float = Field(default=0.0)

    recency_days: int = Field(default=0)
    doc_length: int = Field(default=0)
    title_length: int = Field(default=0)

    view_count: int = Field(default=0)
    reaction_count: int = Field(default=0)
    reply_count: int = Field(default=0)
    trending_score: float = Field(default=0.0)
    authority_score: float = Field(default=0.0)

    title_exact_match: bool = Field(default=False)
    title_partial_match: bool = Field(default=False)

    connector_type: str = Field(default="unknown")
    document_type: str = Field(default="unknown")

    department_match: bool = Field(default=False)
    author_interaction_count: int = Field(default=0)
    author_id: str | None = None


class UserContext(BaseModel):
    user_id: str
    team_id: str
    department: str | None = None
    search_count: int = Field(default=0)
    click_count: int = Field(default=0)
    avg_dwell_ms: float | None = None
    connector_weights: dict[str, float] = Field(default_factory=dict)
    author_interactions: dict[str, int] = Field(default_factory=dict)


class LTRRequest(BaseModel):
    query: str = Field(min_length=1, max_length=1000)
    documents: list[DocumentFeatures] = Field(min_length=1, max_length=200)
    user_context: UserContext | None = None
    top_k: int = Field(default=20, ge=1, le=100)
    model_version: str | None = None


class LTRResult(BaseModel):
    doc_id: str
    score: float
    features: dict[str, float]


class LTRResponse(BaseModel):
    results: list[LTRResult]
    elapsed_ms: float
    model_version: str
    feature_count: int


class LTRHealthResponse(BaseModel):
    ready: bool
    model_version: str
    feature_count: int


class ClickData(BaseModel):
    doc_id: str
    position: int
    dwell_time_ms: int | None = None
    feedback_type: str | None = None


class ImpressionData(BaseModel):
    id: str
    query: str
    result_doc_ids: list[str]
    clicks: list[ClickData]


class TrainingRequest(BaseModel):
    team_id: str
    version: str
    impressions: list[ImpressionData]
    features_by_doc: dict[str, dict[str, float]]


class TrainingResponse(BaseModel):
    success: bool
    version: str
    model_path: str
    metrics: dict[str, float]
    feature_importance: dict[str, float]
    training_time_seconds: float
    num_queries: int
    num_documents: int

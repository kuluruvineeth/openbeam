from __future__ import annotations

from fastapi import FastAPI
from fastapi.testclient import TestClient

from engine.common.metrics import (
    HTTP_REQUEST_DURATION,
    HTTP_REQUESTS_IN_FLIGHT,
    HTTP_REQUESTS_TOTAL,
)
from engine.common.metrics_middleware import MetricsMiddleware


def _get_metric_value(
    metric_name: str,
    labels: dict[str, str],
) -> float:
    metric_sources = (
        HTTP_REQUESTS_TOTAL,
        HTTP_REQUEST_DURATION,
        HTTP_REQUESTS_IN_FLIGHT,
    )

    for metric in metric_sources:
        for family in metric.collect():
            for sample in family.samples:
                if sample.name == metric_name and sample.labels == labels:
                    return float(sample.value)
    return 0.0


def _build_client() -> TestClient:
    app = FastAPI()
    app.add_middleware(MetricsMiddleware)

    @app.get("/items/{item_id}")
    async def get_item(item_id: str) -> dict[str, str]:
        return {"item_id": item_id}

    @app.get("/explode")
    async def explode() -> None:
        raise RuntimeError("boom")

    return TestClient(app, raise_server_exceptions=False)


class TestMetricsMiddleware:
    def test_records_route_template_labels(self) -> None:
        client = _build_client()

        label_set = {
            "method": "GET",
            "route": "/items/{item_id}",
            "status_code": "200",
        }
        raw_path_labels = {
            "method": "GET",
            "route": "/items/123",
            "status_code": "200",
        }
        duration_labels = {"method": "GET", "route": "/items/{item_id}"}

        before_total = _get_metric_value("engine_http_requests_total", label_set)
        before_raw_path = _get_metric_value(
            "engine_http_requests_total",
            raw_path_labels,
        )
        before_duration_count = _get_metric_value(
            "engine_http_request_duration_seconds_count",
            duration_labels,
        )
        before_in_flight = _get_metric_value("engine_http_requests_in_flight", {})

        response = client.get("/items/123")

        assert response.status_code == 200
        assert (
            _get_metric_value("engine_http_requests_total", label_set)
            == before_total + 1
        )
        assert (
            _get_metric_value(
                "engine_http_request_duration_seconds_count", duration_labels
            )
            == before_duration_count + 1
        )
        assert (
            _get_metric_value("engine_http_requests_total", raw_path_labels)
            == before_raw_path
        )
        assert (
            _get_metric_value("engine_http_requests_in_flight", {}) == before_in_flight
        )

    def test_records_500_and_clears_in_flight(self) -> None:
        client = _build_client()

        labels = {"method": "GET", "route": "/explode", "status_code": "500"}
        before_total = _get_metric_value("engine_http_requests_total", labels)
        before_in_flight = _get_metric_value("engine_http_requests_in_flight", {})

        response = client.get("/explode")

        assert response.status_code == 500
        assert (
            _get_metric_value("engine_http_requests_total", labels) == before_total + 1
        )
        assert (
            _get_metric_value("engine_http_requests_in_flight", {}) == before_in_flight
        )

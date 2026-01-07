from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING
from unittest.mock import MagicMock

import numpy as np
import pytest

if TYPE_CHECKING:
    from engine.ltr.service import LTRService


@pytest.fixture
def mock_lgb_booster() -> MagicMock:
    booster = MagicMock()
    booster.predict.return_value = np.array([0.9, 0.8, 0.7, 0.6, 0.5])
    return booster


@pytest.fixture
def ltr_service_with_model(tmp_path: Path, mock_lgb_booster: MagicMock) -> LTRService:
    from unittest.mock import patch

    from engine.ltr.service import LTRService

    model_dir = tmp_path / "latest"
    model_dir.mkdir(parents=True)
    model_file = model_dir / "model.txt"
    model_file.write_text("mock model content")

    with patch("engine.ltr.service.lgb.Booster", return_value=mock_lgb_booster):
        service = LTRService(model_path=tmp_path, model_version="latest")

    return service


@pytest.fixture
def ltr_service_no_model(tmp_path: Path) -> LTRService:
    from engine.ltr.service import LTRService

    return LTRService(model_path=tmp_path, model_version="nonexistent")

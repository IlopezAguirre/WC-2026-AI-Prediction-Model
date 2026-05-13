"""Make the project root available on sys.path for all pytest tests."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

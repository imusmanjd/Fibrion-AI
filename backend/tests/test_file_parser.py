"""
backend/tests/test_file_parser.py

Tests services/file_parser.py's parse_file() — reading uploaded
files into a DataFrame, and its error paths.
"""

import pandas as pd
import pytest

from services.file_parser import FileParseError, parse_file


def test_parses_valid_csv(tmp_path):
    path = tmp_path / "data.csv"
    pd.DataFrame({"order_id": ["A", "B"], "yards": [100, 200]}).to_csv(path, index=False)

    df = parse_file(str(path))

    assert list(df.columns) == ["order_id", "yards"]
    assert len(df) == 2


def test_parses_valid_xlsx(tmp_path):
    path = tmp_path / "data.xlsx"
    pd.DataFrame({"order_id": ["A", "B"], "yards": [100, 200]}).to_excel(path, index=False)

    df = parse_file(str(path))

    assert list(df.columns) == ["order_id", "yards"]
    assert len(df) == 2


def test_unsupported_extension_raises_file_parse_error(tmp_path):
    path = tmp_path / "data.txt"
    path.write_text("not a spreadsheet")

    with pytest.raises(FileParseError, match="Unsupported file type"):
        parse_file(str(path))


def test_empty_csv_raises_file_parse_error(tmp_path):
    path = tmp_path / "empty.csv"
    pd.DataFrame({"order_id": [], "yards": []}).to_csv(path, index=False)

    with pytest.raises(FileParseError, match="no data rows"):
        parse_file(str(path))


def test_malformed_csv_raises_file_parse_error_not_a_raw_exception(tmp_path):
    path = tmp_path / "bad.xlsx"
    # A .xlsx extension on content that isn't actually a valid
    # spreadsheet — should be wrapped in FileParseError, not leak a
    # raw pandas/openpyxl exception up to the caller.
    path.write_bytes(b"this is not a real excel file")

    with pytest.raises(FileParseError, match="Could not read"):
        parse_file(str(path))
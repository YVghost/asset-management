import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("circle_reports", Path(__file__).parents[1] / "check_circle_reports.py")
# Reuse loader which adds no third-party dependencies.
import sys
sys.path.insert(0, str(Path(__file__).parents[1]))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class CircleReportsTest(unittest.TestCase):
    def test_backend_requires_integration_report(self):
        with patch.object(module.Path, "glob", return_value=[Path("TEST-unit.xml")]), patch.object(module, "check") as check:
            module.validate("backend")
            self.assertEqual([], check.call_args_list[1].args[0])

    def test_frontend_does_not_require_backend(self):
        with patch.object(module, "check") as check:
            module.validate("frontend")
            self.assertEqual([Path("frontend/reports/vitest.xml")], check.call_args.args[0])
            self.assertEqual(1, check.call_count)

    def test_invalid_scope_rejected(self):
        with self.assertRaises(ValueError):
            module.validate("typo")

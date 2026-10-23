import contextlib
import importlib.util
import io
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from urllib.error import HTTPError

CI = Path(__file__).resolve().parents[1]


def load(name):
    spec = importlib.util.spec_from_file_location(name, CI / (name + ".py"))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


reports = load("check_reports")
telegram = load("notify_telegram")


class ReportsTest(unittest.TestCase):
    def check(self, xml):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "test.xml"
            path.write_text(xml)
            with contextlib.redirect_stdout(io.StringIO()):
                return reports.check([path], "Prueba")

    def test_passed(self):
        self.assertEqual(1, self.check('<testsuite><testcase name="ok"/></testsuite>'))

    def test_skipped_is_failure(self):
        with self.assertRaises(ValueError):
            self.check('<testsuite><testcase><skipped/></testcase></testsuite>')

    def test_failed_is_failure(self):
        with self.assertRaises(ValueError):
            self.check('<testsuites><testsuite><testcase><failure/></testcase></testsuite></testsuites>')

    def test_missing_is_failure(self):
        with self.assertRaises(ValueError):
            reports.check([], "Prueba")


class TelegramTest(unittest.TestCase):
    def test_success_and_failure_payloads(self):
        for result in ["SUCCESS", "FAILURE"]:
            text = telegram.message({"PIPELINE_RESULT": result, "BUILD_NUMBER": "7", "JOB_NAME": "ams", "BUILD_URL": "http://localhost:8080/job/ams/7/"})
            for expected in [result, "#7", "mateo_ortega", "asset-management", "http://localhost:8080/job/ams/7/"]:
                self.assertIn(expected, text)

    def test_confirms_api_ok(self):
        response = io.BytesIO(json.dumps({"ok": True}).encode())
        with patch.dict(os.environ, {"TELEGRAM_BOT_TOKEN": "fake-token", "TELEGRAM_CHAT_ID": "fake-chat"}), patch.object(telegram, "urlopen", return_value=response), contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(0, telegram.main())

    def test_http_error_does_not_leak_token(self):
        error = HTTPError("https://api.telegram.org/botFAKE-SECRET/sendMessage", 401, "Unauthorized", {}, None)
        output = io.StringIO()
        with patch.dict(os.environ, {"TELEGRAM_BOT_TOKEN": "FAKE-SECRET", "TELEGRAM_CHAT_ID": "fake-chat"}), patch.object(telegram, "urlopen", side_effect=error), contextlib.redirect_stderr(output):
            self.assertEqual(1, telegram.main())
        self.assertNotIn("FAKE-SECRET", output.getvalue())


if __name__ == "__main__":
    unittest.main()

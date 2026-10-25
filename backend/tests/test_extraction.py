import pytest
from app.services.extraction import validate_and_resolve_url, is_ip_blocked, SafeContentExtractor


def test_scheme_validation():
    valid, err, _ = validate_and_resolve_url("ftp://example.com")
    assert not valid
    assert "scheme" in err.lower()

    valid, err, _ = validate_and_resolve_url("file:///etc/passwd")
    assert not valid

    valid, err, _ = validate_and_resolve_url("javascript:alert(1)")
    assert not valid


def test_ip_blocking():
    # Loopback
    blocked, reason = is_ip_blocked("127.0.0.1")
    assert blocked
    assert "loopback" in reason.lower()

    # Private RFC 1918
    blocked, _ = is_ip_blocked("10.0.0.1")
    assert blocked
    blocked, _ = is_ip_blocked("192.168.1.50")
    assert blocked
    blocked, _ = is_ip_blocked("172.16.0.1")
    assert blocked

    # Link-local & Cloud metadata IP
    blocked, _ = is_ip_blocked("169.254.169.254")
    assert blocked

    # Public IP
    blocked, _ = is_ip_blocked("8.8.8.8")
    assert not blocked


def test_embedded_credentials_blocked():
    valid, err, _ = validate_and_resolve_url("http://admin:secret@example.com")
    assert not valid
    assert "credentials" in err.lower()


def test_parse_html_clean_extraction():
    html = """
    <!DOCTYPE html>
    <html>
      <head>
        <title>Demo Competitor Platform</title>
        <meta name="description" content="AI powered developer productivity suite." />
        <script>alert('malicious')</script>
      </head>
      <body>
        <h1>Automated Code Generation</h1>
        <p>Instantly generate full unit test suites for your backend endpoints.</p>
        <h2>Realtime Analytics</h2>
        <p>Stream metrics to dashboard via secure websocket channels.</p>
      </body>
    </html>
    """
    res = SafeContentExtractor.parse_html("https://competitor.test", html)
    assert res["success"] is True
    assert res["title"] == "Demo Competitor Platform"
    assert "AI powered" in res["meta_description"]
    assert len(res["features"]) == 2
    assert res["features"][0]["name"] == "Automated Code Generation"
    assert "malicious" not in res["text"]

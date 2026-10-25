import ipaddress
import socket
from urllib.parse import urlparse, urljoin
from typing import Tuple, Dict, Any, List, Optional
import requests
from bs4 import BeautifulSoup

# Maximum response size: 2MB
MAX_RESPONSE_BYTES = 2 * 1024 * 1024
DEFAULT_TIMEOUT_SECONDS = 8
MAX_REDIRECTS = 3

DISALLOWED_SCHEMES = {"file", "ftp", "gopher", "data", "blob", "javascript", "ws", "wss"}


def is_ip_blocked(ip_str: str) -> Tuple[bool, str]:
    """Checks whether an IP address is private, loopback, link-local, multicast,
    cloud metadata, or reserved to prevent SSRF."""
    try:
        ip = ipaddress.ip_address(ip_str)
    except ValueError:
        return True, f"Invalid IP address format: {ip_str}"

    if ip.is_loopback:
        return True, "Access to loopback/localhost IP is blocked."
    if ip.is_private:
        return True, "Access to private RFC1918/RFC4193 IP space is blocked."
    if ip.is_link_local:
        return True, "Access to link-local IP space is blocked."
    if ip.is_multicast:
        return True, "Access to multicast IP space is blocked."
    if ip.is_reserved:
        return True, "Access to reserved IP space is blocked."

    # Explicit check for AWS/GCP/Azure link-local metadata service (169.254.169.254)
    if str(ip) == "169.254.169.254":
        return True, "Access to cloud instance metadata service is blocked."

    return False, ""


def validate_and_resolve_url(target_url: str) -> Tuple[bool, str, Optional[str]]:
    """Validates URL scheme, credentials, and hostname resolution against SSRF.
    Returns (is_valid, error_message, resolved_ip).
    """
    if not target_url or not isinstance(target_url, str):
        return False, "Target URL must be a non-empty string.", None

    target_url = target_url.strip()
    try:
        parsed = urlparse(target_url)
    except Exception as e:
        return False, f"Failed to parse URL: {str(e)}", None

    scheme = (parsed.scheme or "").lower()
    if scheme not in ("http", "https"):
        return False, f"Invalid URL scheme '{scheme}'. Only http and https are permitted.", None

    if parsed.username or parsed.password:
        return False, "Embedded credentials in URLs are rejected.", None

    hostname = parsed.hostname
    if not hostname:
        return False, "Missing hostname in target URL.", None

    hostname_lower = hostname.lower()
    if hostname_lower in ("localhost", "127.0.0.1", "0.0.0.0", "::1", "local"):
        return False, f"Access to localhost/local domain '{hostname}' is blocked.", None

    # Resolve hostname to IPv4/IPv6 addresses
    try:
        addr_info = socket.getaddrinfo(hostname, parsed.port or (443 if scheme == "https" else 80), proto=socket.IPPROTO_TCP)
    except socket.gaierror as e:
        return False, f"Could not resolve hostname '{hostname}': {str(e)}", None
    except Exception as e:
        return False, f"DNS resolution error for '{hostname}': {str(e)}", None

    if not addr_info:
        return False, f"No DNS records returned for '{hostname}'.", None

    # Validate all resolved IPs
    for entry in addr_info:
        sockaddr = entry[4]
        ip_str = sockaddr[0]
        blocked, reason = is_ip_blocked(ip_str)
        if blocked:
            return False, f"Resolved IP {ip_str} is forbidden: {reason}", ip_str

    first_ip = addr_info[0][4][0]
    return True, "", first_ip


class SafeContentExtractor:
    """Safely extracts public HTML content with SSRF checks, redirect validation,
    response size limits, and source excerpt mapping."""

    @classmethod
    def fetch_url(cls, target_url: str) -> Dict[str, Any]:
        valid, err, _ = validate_and_resolve_url(target_url)
        if not valid:
            return {
                "success": False,
                "url": target_url,
                "error": err,
                "title": "",
                "text": "",
                "features": [],
                "feedback": [],
                "limitations": [err],
            }

        headers = {
            "User-Agent": "ShadowBuilderAI-Scout/1.0 (+https://github.com/shadowbuilder-ai/bot; bot@shadowbuilder.internal)",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        }

        current_url = target_url
        session = requests.Session()
        session.max_redirects = MAX_REDIRECTS

        try:
            # We handle redirects manually to re-validate each target against SSRF
            redirect_count = 0
            while redirect_count <= MAX_REDIRECTS:
                valid_step, step_err, _ = validate_and_resolve_url(current_url)
                if not valid_step:
                    return {
                        "success": False,
                        "url": current_url,
                        "error": f"Redirect blocked: {step_err}",
                        "title": "",
                        "text": "",
                        "features": [],
                        "feedback": [],
                        "limitations": [f"Redirect blocked: {step_err}"],
                    }

                resp = session.get(
                    current_url,
                    headers=headers,
                    timeout=DEFAULT_TIMEOUT_SECONDS,
                    allow_redirects=False,
                    stream=True,
                )

                if resp.is_redirect or resp.status_code in (301, 302, 303, 307, 308):
                    location = resp.headers.get("Location")
                    if not location:
                        break
                    current_url = urljoin(current_url, location)
                    redirect_count += 1
                    continue
                else:
                    break

            content_type = resp.headers.get("Content-Type", "")
            if "text/html" not in content_type and "application/xhtml+xml" not in content_type and "text/plain" not in content_type:
                return {
                    "success": False,
                    "url": current_url,
                    "error": f"Non-HTML content type returned: {content_type}",
                    "title": "",
                    "text": "",
                    "features": [],
                    "feedback": [],
                    "limitations": [f"Unsupported content type {content_type}"],
                }

            # Enforce max content length
            raw_bytes = bytearray()
            for chunk in resp.iter_content(chunk_size=16384):
                raw_bytes.extend(chunk)
                if len(raw_bytes) > MAX_RESPONSE_BYTES:
                    return {
                        "success": False,
                        "url": current_url,
                        "error": f"Response exceeded maximum limit of {MAX_RESPONSE_BYTES} bytes.",
                        "title": "",
                        "text": "",
                        "features": [],
                        "feedback": [],
                        "limitations": ["Response size exceeded safety budget."],
                    }

            html_text = raw_bytes.decode(resp.encoding or "utf-8", errors="replace")
            return cls.parse_html(current_url, html_text)

        except requests.exceptions.Timeout:
            return {
                "success": False,
                "url": target_url,
                "error": f"Connection timed out after {DEFAULT_TIMEOUT_SECONDS}s.",
                "title": "",
                "text": "",
                "features": [],
                "feedback": [],
                "limitations": ["Connection timed out."],
            }
        except requests.exceptions.RequestException as e:
            return {
                "success": False,
                "url": target_url,
                "error": f"HTTP request failed: {str(e)}",
                "title": "",
                "text": "",
                "features": [],
                "feedback": [],
                "limitations": [f"HTTP error: {str(e)}"],
            }
        except Exception as e:
            return {
                "success": False,
                "url": target_url,
                "error": f"Extraction error: {str(e)}",
                "title": "",
                "text": "",
                "features": [],
                "feedback": [],
                "limitations": [f"Unexpected error: {str(e)}"],
            }

    @classmethod
    def parse_html(cls, page_url: str, html: str) -> Dict[str, Any]:
        """Safely parses HTML using BeautifulSoup, stripping script/style tags and extracting features."""
        soup = BeautifulSoup(html, "html.parser")

        # Strip active elements
        for tag in soup(["script", "style", "noscript", "iframe", "svg", "header", "footer", "nav"]):
            tag.decompose()

        title = soup.title.string.strip() if soup.title and soup.title.string else ""
        meta_desc = ""
        meta_tag = soup.find("meta", attrs={"name": "description"}) or soup.find("meta", attrs={"property": "og:description"})
        if meta_tag and meta_tag.get("content"):
            meta_desc = meta_tag["content"].strip()

        # Extract textual headings and paragraphs
        features_found = []
        headings = soup.find_all(["h1", "h2", "h3"])
        for h in headings[:15]:
            h_text = h.get_text(separator=" ", strip=True)
            if not h_text or len(h_text) < 4:
                continue

            # Look for following sibling paragraph
            next_p = h.find_next_sibling("p")
            excerpt = next_p.get_text(separator=" ", strip=True) if next_p else h_text
            if excerpt:
                features_found.append({
                    "name": h_text[:80],
                    "description": excerpt[:300],
                    "source_url": page_url,
                    "evidence_excerpt": excerpt[:250],
                })

        # General text summary
        body_text = soup.get_text(separator="\n", strip=True)
        # Clean up excess whitespace
        clean_lines = [line.strip() for line in body_text.splitlines() if line.strip()]
        full_text = "\n".join(clean_lines[:150])  # Cap at 150 lines for LLM context

        limitations = []
        if len(features_found) == 0:
            limitations.append("No clear feature headings found on page structure.")
        limitations.append("Public static HTML only; dynamic client-side JS and reviews behind login are not accessible.")

        return {
            "success": True,
            "url": page_url,
            "title": title or "Competitor Product Page",
            "meta_description": meta_desc,
            "text": full_text[:4000],
            "features": features_found[:8],
            "feedback": [],  # Statically extracted feedback is typically empty on landing pages
            "limitations": limitations,
            "error": None,
        }

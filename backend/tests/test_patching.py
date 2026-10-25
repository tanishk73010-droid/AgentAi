import os
import tempfile
from app.services.patching import validate_file_path, PatchService
from app.schemas.engineer import PatchFile


def test_validate_file_path_safety():
    with tempfile.TemporaryDirectory() as tmpdir:
        # Valid path
        valid, _ = validate_file_path(tmpdir, "src/exporter.py")
        assert valid

        # Path traversal
        valid, err = validate_file_path(tmpdir, "../outside.py")
        assert not valid
        assert "traversal" in err.lower() or "escaped" in err.lower()

        # Absolute path escape
        valid, err = validate_file_path(tmpdir, "/etc/passwd")
        assert not valid

        # Disallowed extension (.sh, .exe, .bat)
        valid, err = validate_file_path(tmpdir, "run.sh")
        assert not valid
        assert "disallowed" in err.lower()

        valid, err = validate_file_path(tmpdir, "malware.exe")
        assert not valid


def test_apply_patches_and_diff():
    with tempfile.TemporaryDirectory() as tmpdir:
        patch_file = PatchFile(
            path="src/exporter.py",
            action="modify",
            diff="test diff",
            content="# New exporter content\ndef test(): pass\n",
        )
        success, err, diff = PatchService.apply_patches(tmpdir, [patch_file])
        assert success
        assert "New exporter content" in diff or "test():" in diff

        # Verify file written
        created = os.path.join(tmpdir, "src", "exporter.py")
        assert os.path.exists(created)
        with open(created, "r") as f:
            assert "New exporter content" in f.read()

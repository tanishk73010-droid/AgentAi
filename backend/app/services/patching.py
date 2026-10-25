import os
import difflib
from typing import List, Tuple, Optional
from app.schemas.engineer import PatchFile

ALLOWED_EXTENSIONS = {".py", ".json", ".md", ".txt", ".ini"}
MAX_PATCH_BYTES = 100 * 1024  # 100KB


def validate_file_path(base_dir: str, rel_path: str) -> Tuple[bool, str]:
    """Validates that rel_path is safe, strictly inside base_dir, and has an allowed extension."""
    if not rel_path or not isinstance(rel_path, str):
        return False, "Target file path must be a non-empty string."

    rel_path = rel_path.strip().replace("\\", "/")
    if rel_path.startswith("/") or rel_path.startswith("..") or "/../" in rel_path:
        return False, f"Path traversal rejected: '{rel_path}'"

    ext = os.path.splitext(rel_path)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        return False, f"Disallowed file extension '{ext}'. Allowed extensions: {', '.join(sorted(ALLOWED_EXTENSIONS))}"

    # Verify normalized path stays inside base_dir
    abs_base = os.path.abspath(base_dir)
    target_abs = os.path.abspath(os.path.join(base_dir, rel_path))

    if not target_abs.startswith(abs_base + os.sep) and target_abs != abs_base:
        return False, f"File path escaped workspace boundary: '{rel_path}'"

    return True, ""


class PatchService:
    """Safely applies patches to a target workspace with strict boundary and extension validation."""

    @classmethod
    def apply_patches(cls, workspace_dir: str, patch_files: List[PatchFile]) -> Tuple[bool, str, str]:
        """Applies a list of PatchFiles to workspace_dir.
        Returns (success, error_message, unified_diff_text).
        """
        all_diffs = []

        for p in patch_files:
            valid, err = validate_file_path(workspace_dir, p.path)
            if not valid:
                return False, err, ""

            target_abs = os.path.abspath(os.path.join(workspace_dir, p.path))
            os.makedirs(os.path.dirname(target_abs), exist_ok=True)

            original_content = ""
            if os.path.exists(target_abs):
                with open(target_abs, "r", encoding="utf-8", errors="replace") as f:
                    original_content = f.read()

            new_content = p.content if p.content is not None else ""

            # Check patch size
            if len(new_content.encode("utf-8")) > MAX_PATCH_BYTES:
                return False, f"Patch content for '{p.path}' exceeds safety limit of {MAX_PATCH_BYTES} bytes.", ""

            # Compute unified diff
            orig_lines = original_content.splitlines(keepends=True)
            new_lines = new_content.splitlines(keepends=True)
            file_diff = difflib.unified_diff(
                orig_lines,
                new_lines,
                fromfile=f"a/{p.path}",
                tofile=f"b/{p.path}",
            )
            diff_text = "".join(file_diff)
            all_diffs.append(diff_text if diff_text else f"# No diff (identical) for {p.path}\n")

            # Write updated file to workspace
            with open(target_abs, "w", encoding="utf-8") as f:
                f.write(new_content)

        combined_diff = "\n".join(all_diffs)
        return True, "", combined_diff

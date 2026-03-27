"""
Standalone PPTX text extraction script.

Usage:
    python pptx_extract.py <pptx_file_url>

Downloads the PPTX file from the given URL, extracts all text from all slides
(including shapes, tables, and grouped shapes), and prints the text to stdout.
"""

import sys
import os
import tempfile
import requests
from pptx import Presentation


def extract_text_from_shape(shape):
    """Recursively extract text from a shape, handling groups and tables."""
    texts = []

    if shape.has_text_frame:
        for paragraph in shape.text_frame.paragraphs:
            para_text = paragraph.text.strip()
            if para_text:
                texts.append(para_text)

    if shape.has_table:
        for row in shape.table.rows:
            for cell in row.cells:
                cell_text = cell.text.strip()
                if cell_text:
                    texts.append(cell_text)

    # Handle grouped shapes (ShapeGroup)
    if hasattr(shape, "shapes"):
        for child_shape in shape.shapes:
            texts.extend(extract_text_from_shape(child_shape))

    return texts


def main():
    if len(sys.argv) != 2:
        print("Usage: python pptx_extract.py <pptx_file_url>", file=sys.stderr)
        sys.exit(1)

    file_url = sys.argv[1]
    tmp_path = None

    try:
        # Download PPTX file to a temporary location
        response = requests.get(file_url, timeout=120)
        response.raise_for_status()

        # Write to temp file
        fd, tmp_path = tempfile.mkstemp(suffix=".pptx")
        with os.fdopen(fd, "wb") as f:
            f.write(response.content)

        prs = Presentation(tmp_path)
        all_text = []

        # Extract text from all slides
        for slide_num, slide in enumerate(prs.slides, start=1):
            slide_texts = []
            for shape in slide.shapes:
                slide_texts.extend(extract_text_from_shape(shape))

            if slide_texts:
                all_text.append(f"--- Slide {slide_num} ---")
                all_text.extend(slide_texts)

        # Extract speaker notes
        for slide_num, slide in enumerate(prs.slides, start=1):
            if slide.has_notes_slide and slide.notes_slide.notes_text_frame:
                notes_text = slide.notes_slide.notes_text_frame.text.strip()
                if notes_text:
                    all_text.append(f"--- Slide {slide_num} Notes ---")
                    all_text.append(notes_text)

        print("\n".join(all_text))

    except requests.RequestException as e:
        print(f"Failed to download PPTX file: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"PPTX extraction failed: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        # Clean up temp file
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)


if __name__ == "__main__":
    main()

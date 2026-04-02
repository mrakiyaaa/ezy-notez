"""
Pre-download FLAN-T5 model for flashcard generation.

Run this script once to download the AI model before using the flashcard feature.
This avoids timeout issues during the first flashcard generation.

Usage:
    python preload_model.py
"""

import sys

print("=" * 60)
print("FLAN-T5 Model Pre-download Script")
print("=" * 60)
print()
print("This will download ~950MB of model files.")
print("It may take 2-5 minutes depending on your internet speed.")
print()

try:
    print("[1/3] Importing transformers library...")
    from transformers import T5Tokenizer, T5ForConditionalGeneration
    print("✓ Transformers loaded")
    print()
except ImportError as e:
    print("✗ Failed to import transformers")
    print()
    print("Please install dependencies first:")
    print("    pip install -r requirements.txt")
    print()
    sys.exit(1)

MODEL_NAME = "google/flan-t5-base"

try:
    print(f"[2/3] Downloading tokenizer for {MODEL_NAME}...")
    tokenizer = T5Tokenizer.from_pretrained(MODEL_NAME)
    print("✓ Tokenizer downloaded")
    print()
    
    print(f"[3/3] Downloading model for {MODEL_NAME}...")
    print("(This is the large download - ~950MB)")
    model = T5ForConditionalGeneration.from_pretrained(MODEL_NAME)
    print("✓ Model downloaded")
    print()
    
    print("=" * 60)
    print("SUCCESS! Model is ready.")
    print("=" * 60)
    print()
    print("You can now use the flashcard generation feature.")
    print("Future generations will be much faster (30-60 seconds).")
    print()
    
except Exception as e:
    print(f"✗ Download failed: {e}")
    print()
    print("This is usually due to:")
    print("  - Slow internet connection")
    print("  - Network interruption")
    print("  - Disk space issues")
    print()
    print("You can:")
    print("  1. Try running this script again")
    print("  2. Or just use the flashcard feature - it will retry automatically")
    print()
    sys.exit(1)

# Flashcard Generation Setup Guide

## Prerequisites

The flashcard generation feature uses the FLAN-T5 AI model to generate question-answer pairs from your resource text.

### 1. Install Python Dependencies

```bash
pip install -r requirements.txt
```

This will install:
- `transformers` - HuggingFace library for AI models
- `torch` - PyTorch deep learning framework
- `sentencepiece` - Tokenization library
- Other dependencies (~2GB total download)

### 2. First Run - Model Download

**Option A: Pre-download (Recommended)**

Run this script once to download the model before using the feature:

```bash
cd backend/scripts
python preload_model.py
```

This downloads the FLAN-T5 model (~950MB) without timeout limits.

**Option B: Download on first use**

When you generate flashcards for the first time:
- The FLAN-T5-base model (~950MB) will download automatically
- This may take 2-5 minutes depending on your internet speed
- Backend timeout is 5 minutes - if exceeded, try again (partial downloads are cached)
- The backend will log: "Loading model google/flan-t5-base..."

**After first download**: Subsequent generations are fast (~30-60 seconds)

## Usage

1. Navigate to any workspace → Flashcards tab
2. Click "Generate" button
3. Select one or more resources that have extracted text
4. (Optional) Set a topic focus to filter relevant content
5. Choose number of cards (5-20, default 10)
6. Click "Generate Flashcards"
7. Wait for the "Flashcard set ready!" notification
8. Click "Study" to start reviewing

## Troubleshooting

### "Generation timed out"
- **Cause**: Model download exceeded 5-minute timeout (first run only)
- **Solution**: Try generating again. HuggingFace caches partial downloads, so each attempt gets you closer. On slower internet, may need 2-3 attempts.

### "Flashcard generation script exited with code 2"
- **Cause**: Python dependencies not installed or Python not in PATH
- **Solution**: Run `pip install -r requirements.txt` and ensure Python 3.8+ is installed

### "None of the selected resources have extracted text"
- **Cause**: Resources haven't been processed yet (PDF extraction, transcription, etc.)
- **Solution**: Wait for resources to finish processing (status should be "ready")

### Generation takes forever
- **Cause**: FLAN-T5 runs on CPU by default (no GPU acceleration configured)
- **Expected**: 30-60 seconds for 10 cards on typical hardware
- **To speed up**: Install CUDA-enabled PyTorch if you have an NVIDIA GPU

## Technical Details

### How It Works
1. Backend combines extracted text from selected resources
2. Spawns Python script: `backend/scripts/generate_flashcards.py`
3. Script loads FLAN-T5 model and splits text into chunks
4. For each chunk, generates a question and answer
5. Returns JSON array of {front, back} flashcard objects
6. Backend saves to database and marks set as "ready"
7. Frontend polls every 3 seconds until ready

### Models Used
- Primary: `google/flan-t5-base` (~950MB)
- Fallback: `google/flan-t5-small` (~300MB) if base model fails

### File Locations
```
backend/
  scripts/
    generate_flashcards.py    ← AI generation script
  src/
    services/flashcard.service.ts   ← CRUD + pipeline
    controllers/flashcard.controller.ts
    routes/flashcard.routes.ts

frontend/
  src/
    components/workspace/
      FlashcardsView.tsx      ← Main view with polling
      flashcards/
        FlashcardGenerationPanel.tsx  ← Generation UI
        StudyMode.tsx          ← Study interface
        FlashcardSetGrid.tsx   ← Set list display
```

## Performance Tips

1. **Smaller card counts**: 5-10 cards generate faster than 15-20
2. **Topic focus**: Narrows down text chunks, speeds up processing
3. **Shorter resources**: Less text = faster generation
4. **GPU acceleration**: Install CUDA PyTorch for 5-10x speedup

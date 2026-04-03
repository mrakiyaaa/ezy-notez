# Quiz Generator Feature Implementation

## Overview

The Quiz Generator is an AI-powered feature that creates interactive quizzes from workspace resources. It includes a teddy bear companion that provides emotional feedback throughout the quiz experience.

## Architecture

### File Structure

```
frontend/src/
├── types/
│   └── quiz.ts                    # Quiz-related TypeScript types
├── services/
│   └── quiz.service.ts            # API service functions
├── hooks/
│   ├── useQuizGeneration.ts       # Quiz generation state management
│   └── useQuizAttempt.ts          # Quiz attempt state management
├── components/workspace/
│   ├── QuizView.tsx               # Landing page with quiz list
│   ├── QuizAttemptView.tsx        # Question-by-question attempt flow
│   ├── QuizResultsView.tsx        # Results and breakdown display
│   └── quiz/
│       ├── constants.ts           # Quiz colors, utilities, types
│       ├── QuizCard.tsx           # Card for in-progress/completed quizzes
│       ├── QuizConfigForm.tsx     # Generation configuration form
│       ├── ResourceChipSelector.tsx # Multi-select resource chips
│       ├── QuestionTypeToggle.tsx # MCQ/Scenario/Mixed toggle
│       ├── QuizGeneratingState.tsx # Loading animation during generation
│       ├── TeddyCompanion.tsx     # Lottie bear with emotions
│       ├── AttemptTopBar.tsx      # Progress bar and navigation
│       ├── QuestionCard.tsx       # Question display card
│       ├── OptionButton.tsx       # Answer option buttons
│       ├── AnswerFeedback.tsx     # Correct/wrong feedback panel
│       ├── ScoreRing.tsx          # Circular score visualization
│       ├── QuestionBreakdownItem.tsx # Per-question result card
│       └── TopicBreakdownTags.tsx # Topic weakness indicators
```

## Design System

### Colors

- **Quiz Green** (#00E5A0): Primary accent for quiz features, correct answers, completed states
- **Quiz Amber** (#F59E0B): In-progress states, thinking state
- **Quiz Red** (#EF4444): Incorrect answers, failed states

### Glassmorphism

All quiz components follow the design system's glassmorphism patterns:
- `backdrop-blur` for transparency effects
- Semi-transparent backgrounds using `bg-bg-card`
- `border-fade-border` for subtle borders
- Neon glow effects using the quiz accent colors

## Features

### Quiz Landing Page (QuizView)

- Lists all quizzes in the workspace
- Separates in-progress and completed quizzes
- In-progress section shows amber-accented cards with progress bars
- Completed section shows green score badges with pass/fail indicators
- Empty state encourages users to generate their first quiz

### Quiz Generation (QuizConfigForm)

- Multi-select resource chips for source selection
- Question type toggle: MCQ | Scenario | Mixed
- Question count options: 5, 10, 15, 20
- Pulsing green aura animation during generation
- Cycling status messages: "Analysing resources…" → "Building questions…" → "Almost ready…"

### Quiz Attempt (QuizAttemptView)

- Top bar with quiz title, question counter, and progress bar
- Teddy bear companion centered above question card
- Question card with glassmorphism styling
- Four option buttons (A/B/C/D), single selection
- Submit button disabled until option selected
- Feedback panel slides in after submission with explanation
- Incremental answer persistence via PATCH

### Bear Emotions (TeddyCompanion)

The teddy bear displays different emotions based on quiz state:

| State | Emotion | Description |
|-------|---------|-------------|
| Waiting for selection | `idle` | Neutral, waiting |
| Option selected | `thinking` | Pondering the answer |
| Correct answer | `happy` | Celebrates the correct answer |
| Wrong answer | `sad` | Shows empathy for incorrect answer |
| Quiz passed (≥60%) | `celebrating` | Victory celebration |
| Quiz failed (<60%) | `disappointed` | Gentle disappointment |

### Quiz Results (QuizResultsView)

- Hero section with circular score ring and pass/fail indicator
- Teddy bear showing celebrating/disappointed emotion
- Topic breakdown tags highlighting weak areas
- Per-question breakdown cards showing:
  - User's answer vs correct answer
  - Explanation for each question
  - Topic tags for categorization
- Action buttons: Retake Quiz, Generate New Quiz, Back to Quizzes

## API Integration

### Service Functions

```typescript
// Generate a new quiz
generateQuiz(workspaceId, resourceIds, questionType, questionCount)

// Get all quizzes with attempt data
getQuizzes(workspaceId)

// Get quiz with questions
getQuizQuestions(quizId)

// Get or create an attempt
getOrCreateAttempt(quizId)

// Submit individual answer (incremental)
submitAnswer(attemptId, { question_id, selected_option_id })

// Complete the attempt
completeAttempt(attemptId)

// Get full results with topic breakdown
getAttemptResults(quizId, attemptId)
```

### Polling

- Quiz generation status is polled every 3 seconds
- Handles pending → processing → ready/failed transitions
- Auto-redirects to attempt page on successful generation

## State Management

### useQuizGeneration Hook

Manages the quiz generation lifecycle:
- Tracks generating state and pending quiz ID
- Polls for status updates
- Handles success/error callbacks
- Supports cancellation

### useQuizAttempt Hook

Manages the attempt lifecycle:
- Loads quiz questions and creates/resumes attempt
- Calculates starting question based on existing answers
- Manages option selection and submission
- Tracks bear emotion based on answer correctness
- Handles attempt completion

## Resume Logic

When a user returns to an in-progress quiz:
1. The attempt is fetched with existing answers
2. The first unanswered question index is calculated
3. The quiz starts from that question
4. Progress bar reflects already-answered questions

## Pass/Fail Threshold

- **Pass**: Score ≥ 60%
- Pass/fail determines:
  - Bear emotion (celebrating vs disappointed)
  - Score ring color (green vs red)
  - Results hero message

## Topic Analysis

The results page includes topic breakdown:
- Groups questions by `topic_tag`
- Calculates accuracy per topic
- Highlights weak areas (<60% accuracy) for focused study
- Color-coded tags: green (≥80%), amber (60-79%), red (<60%)

## Integration Points

### Workspace Page

The quiz feature integrates with the workspace page through:
- Navigation state management (`quizState`)
- Route-like state transitions: list → attempt → results
- Callback handlers for navigation between views

### Resources

Quiz generation uses workspace resources:
- Only "ready" resources with extracted text are selectable
- ResourceChipSelector fetches and filters resources
- Multiple resources can be selected for a single quiz

## Dependencies

- `lottie-react`: For animated teddy bear companion
- Lucide icons for UI elements
- Existing design system utilities (hexToRgb, getContrastColor)

## Future Enhancements

Potential improvements for future iterations:
1. Custom bear animation JSON files for more expressive emotions
2. Difficulty levels for questions
3. Timed quiz mode
4. Spaced repetition for failed questions
5. Quiz sharing between workspace members
6. Analytics dashboard for learning progress

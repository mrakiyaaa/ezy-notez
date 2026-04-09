# Quiz Feature — Aura Theme Integration

## Overview

Applied the workspace aura color theme to the Quiz generation feature frontend, replacing hardcoded `QUIZ_GREEN` (#00E5A0) with dynamic `auraHex`/`auraRgb`/`auraContrast` props for all UI chrome elements. This makes the quiz feature visually consistent with the flashcard feature and other workspace views.

## Design Decisions

### What uses aura (workspace accent color)
- Page headers, icons, and section indicator dots
- Generate Quiz button, Submit Answer button, Next Question button
- Config form panel (border, shadow, question count selector, question type toggle)
- Quiz generating state (pulse glow, spinner, progress dots, status text)
- Quiz cards (hover glow, status badges for new quizzes, action buttons)
- Progress bars (attempt top bar, quiz cards)
- Loading spinners
- Notification banners (success state)
- Empty state (dot grid, glow, icon, CTA button)
- Option button selection state (pre-submission)
- Results view (header border, hero background, section dots, retake button)

### What keeps semantic colors (not aura)
- **QUIZ_GREEN (#00E5A0)**: Correct answer highlighting, pass indicator, trophy icon
- **QUIZ_RED (#EF4444)**: Wrong answer highlighting, fail indicator
- **QUIZ_AMBER (#F59E0B)**: In-progress quiz state, continue button
- **ScoreRing**: Pass/fail ring (green/red)
- **QuestionBreakdownItem**: Correct/wrong per-question indicators
- **TopicBreakdownTags**: Accuracy-based color coding (green/amber/red)
- **TeddyCompanion**: Emotion-based glow colors

## Files Modified

### Leaf Components (added `AuraProps` interface)
- `quiz/QuizGeneratingState.tsx` — Aura for pulse glow, spinner, dots, status text
- `quiz/QuestionTypeToggle.tsx` — Aura for selected toggle state
- `quiz/QuestionCard.tsx` — Aura for border, shadow, question number badge
- `quiz/OptionButton.tsx` — Aura for selected state (pre-submission); keeps green/red post-submission
- `quiz/AnswerFeedback.tsx` — Aura for Next button; keeps green/red for correct/incorrect feedback
- `quiz/AttemptTopBar.tsx` — Aura for progress bar and border
- `quiz/QuizCard.tsx` — Aura for new/completed card accents and buttons; keeps amber for in-progress
- `quiz/QuizConfigForm.tsx` — Aura for panel chrome, count buttons, generate button, question type toggle

### Parent Views (updated to pass aura props down)
- `QuizView.tsx` — Aura for header, buttons, notifications, empty state, section dots
- `QuizAttemptView.tsx` — Aura for loading, submit button; passes aura to all sub-components
- `QuizResultsView.tsx` — Aura for header, hero section, section dots, retake button

### Unchanged Components (semantic colors only)
- `quiz/ScoreRing.tsx`
- `quiz/QuestionBreakdownItem.tsx`
- `quiz/TopicBreakdownTags.tsx`
- `quiz/TeddyCompanion.tsx`
- `quiz/ResourceChipSelector.tsx` (already used aura)

# EZY Notez — System Test Cases

Formal end-to-end system test specification for the EZY Notez AI-powered
academic learning platform. Each section maps directly to a Playwright spec
file under `tests/e2e/specs/`.

**Status legend:** `[ ] Not Run` · `[P] Pass` · `[F] Fail` · `[S] Skipped`

---

## 1. Authentication

| Test ID | Test Case Name | Preconditions | Test Steps | Expected Result | Status |
| --- | --- | --- | --- | --- | --- |
| TC-AUTH-01 | Valid registration creates account and redirects to workspace hub | App is running. Email used has never been registered. | 1. Navigate to `/auth/signup`<br>2. Enter full name, unique email, and a password ≥ 8 chars<br>3. Confirm the same password<br>4. Click **Create Account** | User is redirected to `/workspaces` and the Workspace Hub heading is visible. | [ ] Not Run |
| TC-AUTH-02 | Duplicate email registration shows error message | The seeded `e2e-test@ezy.test` user already exists. | 1. Navigate to `/auth/signup`<br>2. Enter any name, the seeded email, and a valid password twice<br>3. Click **Create Account** | An inline error stating the account already exists is displayed; no redirect occurs. | [ ] Not Run |
| TC-AUTH-03 | Login with valid credentials redirects to workspace hub | Seeded test user exists and is confirmed. | 1. Navigate to `/auth/login`<br>2. Enter the seeded email and password<br>3. Click **Sign In** | User is redirected to `/workspaces` and the Workspace Hub heading is visible. | [ ] Not Run |
| TC-AUTH-04 | Login with invalid password shows error message | Seeded test user exists. | 1. Navigate to `/auth/login`<br>2. Enter the seeded email and a wrong password<br>3. Click **Sign In** | An "Incorrect email or password" error is shown and the URL stays on `/auth/login`. | [ ] Not Run |
| TC-AUTH-05 | Login with unregistered email shows error message | Email used does not exist in Supabase. | 1. Navigate to `/auth/login`<br>2. Enter a random non-existent email and any password<br>3. Click **Sign In** | An "Incorrect email or password" error is shown and the URL stays on `/auth/login`. | [ ] Not Run |
| TC-AUTH-06 | Accessing protected route while unauthenticated redirects to login | Browser session has no Supabase auth cookies. | 1. Clear cookies / start incognito context<br>2. Navigate directly to `/workspaces` | The middleware redirects the request to `/auth/login`. | [ ] Not Run |
| TC-AUTH-07 | Logout clears session and redirects to login | User is already signed in. | 1. Sign in as the test user<br>2. Trigger logout (clear Supabase session)<br>3. Navigate to `/workspaces` | Session is cleared and the user is redirected to `/auth/login`. | [ ] Not Run |

---

## 2. Workspace Management

| Test ID | Test Case Name | Preconditions | Test Steps | Expected Result | Status |
| --- | --- | --- | --- | --- | --- |
| TC-WS-01 | Creating a workspace with a name navigates into the workspace dashboard | User is signed in and on `/workspaces`. | 1. Click **Create Workspace**<br>2. Enter a unique name in the modal<br>3. Optionally fill description<br>4. Click **Create** | Modal closes, the URL changes to `/workspaces/<slug>`, and the dashboard sidebar is visible. | [ ] Not Run |
| TC-WS-02 | Creating a workspace without a name shows validation error | User is signed in and the create modal is open. | 1. Open the create-workspace modal<br>2. Leave **Workspace Name** empty<br>3. Click **Create** | The Create button is disabled or a "name is required" inline error is shown; the modal stays open. | [ ] Not Run |
| TC-WS-03 | Workspace hub lists all created workspaces | User has at least one workspace (the seeded `E2E Test Workspace`). | 1. Navigate to `/workspaces`<br>2. Wait for the workspace grid to load | The seeded workspace card is visible in the "Your Workspaces" section. | [ ] Not Run |
| TC-WS-04 | Clicking a workspace navigates to its dashboard | User is on `/workspaces` with at least one workspace. | 1. Locate a workspace card by name<br>2. Click the card | Browser navigates to `/workspaces/<slug>` and the workspace dashboard renders. | [ ] Not Run |
| TC-WS-05 | Dashboard sidebar shows all navigation items | User is inside a workspace dashboard. | 1. Open a workspace<br>2. Inspect the left sidebar | Sidebar shows Resources, Chattie, Summarization, Flashcards, Study Room, and Quiz buttons. | [ ] Not Run |
| TC-WS-06 | Duplicate workspace name shows error | User already has a workspace with name `X`. | 1. Open the create modal<br>2. Enter the same name `X` as the existing workspace<br>3. Click **Create** | The backend rejects the duplicate and the modal surfaces a "name already exists" error. | [ ] Not Run |

---

## 3. Resource Management

| Test ID | Test Case Name | Preconditions | Test Steps | Expected Result | Status |
| --- | --- | --- | --- | --- | --- |
| TC-RES-01 | Uploading a valid PDF shows it in the resource list | User is on the Resources tab of a workspace. | 1. Click **Select Files**<br>2. Choose a `.pdf` file<br>3. Wait for the upload to complete | A new row with the file name appears at the top of the resource list with a status indicator. | [ ] Not Run |
| TC-RES-02 | Uploading a PPTX file shows it in the resource list | User is on the Resources tab. | 1. Click **Select Files**<br>2. Choose a `.pptx` file<br>3. Wait for the upload to complete | The PPTX file appears in the resource list with a processing/indexing status. | [ ] Not Run |
| TC-RES-03 | Uploading an audio file shows it in the resource list | User is on the Resources tab. | 1. Click **Select Files**<br>2. Choose an `.mp3` / `.wav` / `.m4a` file<br>3. Wait for the upload to complete | The audio file appears in the resource list with a processing/indexing status. | [ ] Not Run |
| TC-RES-04 | Adding a valid YouTube URL adds it to the resource list | User is on the Resources tab. | 1. Paste `https://www.youtube.com/watch?v=...` into the YouTube input<br>2. Click **Add** | A new YouTube resource is created and appears in the resource list. | [ ] Not Run |
| TC-RES-05 | Adding an invalid YouTube URL shows validation error | User is on the Resources tab. | 1. Enter a non-YouTube URL such as `https://example.com/video`<br>2. Click **Add** | A "Please enter a valid YouTube URL" error appears below the input; no resource is created. | [ ] Not Run |
| TC-RES-06 | Uploading an unsupported file type shows rejection message | User is on the Resources tab. | 1. Click **Select Files**<br>2. Choose a file with an unsupported extension (e.g. `.exe`)<br>3. Submit | The file is rejected by the upload pipeline and does not appear in the list. | [ ] Not Run |
| TC-RES-07 | Resource search filters the list by name | Workspace has at least two resources of different types. | 1. Navigate to the Resources tab<br>2. Click a filter tab (e.g. **PDFs** or **Youtube**) | The visible list updates to show only resources matching the selected type. | [ ] Not Run |
| TC-RES-08 | Resource shows Ready status after processing completes | A resource has been uploaded recently. | 1. Upload a PDF<br>2. Wait while the status polls every few seconds (timeout 60 s) | The resource transitions from `uploading` → `indexing` → `ready` within the timeout. | [ ] Not Run |
| TC-RES-09 | Deleting a resource removes it from the list | At least one resource exists in the list. | 1. Hover over a resource row<br>2. Click the delete button<br>3. Confirm if a dialog appears | The resource is removed from the list and from the database. | [ ] Not Run |

---

## 4. AI Summarization

| Test ID | Test Case Name | Preconditions | Test Steps | Expected Result | Status |
| --- | --- | --- | --- | --- | --- |
| TC-SUM-01 | Summarization page is inaccessible (locked state) when no resources are uploaded | Workspace has zero ready resources. | 1. Navigate to a fresh workspace<br>2. Click **Summarization** in the sidebar | The page renders an empty/locked state telling the user to upload resources first. | [ ] Not Run |
| TC-SUM-02 | General summary is generated after selecting a resource | Workspace has at least one ready resource. | 1. Open the Summarization tab<br>2. Choose **General** mode<br>3. Click **Generate** | The processing phase appears, then a summary is rendered within 60 s. | [ ] Not Run |
| TC-SUM-03 | Customize mode generates summary for a selected individual resource | Workspace has at least one ready resource. | 1. Open the Summarization tab<br>2. Choose **Customize** mode<br>3. Select a resource via its checkbox<br>4. Click **Generate** | A summary specific to the chosen resource is generated and rendered. | [ ] Not Run |
| TC-SUM-04 | Summary output renders as Markdown | A summary has been generated. | 1. View an existing summary<br>2. Inspect the result panel | The output uses formatted Markdown (headings, lists, bold, code) — not plain text. | [ ] Not Run |
| TC-SUM-05 | Switching between General and Customize modes works without errors | User is on the Summarization tab. | 1. Click **General**<br>2. Click **Customize**<br>3. Click **General** again | Mode toggles cleanly each time without console errors and the relevant UI is visible. | [ ] Not Run |

---

## 5. Quiz Generator

| Test ID | Test Case Name | Preconditions | Test Steps | Expected Result | Status |
| --- | --- | --- | --- | --- | --- |
| TC-QUIZ-01 | Quiz generator is inaccessible when no resources are ready | Workspace has zero ready resources. | 1. Open the Quiz tab<br>2. Click **Generate Quiz** | The config form opens but the resource selector is empty and **Generate Quiz** is disabled. | [ ] Not Run |
| TC-QUIZ-02 | Configuring question count and type and starting quiz renders first question | Workspace has at least one ready resource. | 1. Open Quiz<br>2. Click **Generate Quiz**<br>3. Select a resource, type **Mixed**, count **5**<br>4. Click **Generate Quiz** | After the AI service completes, the attempt view loads with question 1 visible. | [ ] Not Run |
| TC-QUIZ-03 | Quiz displays one question at a time | Quiz attempt is active. | 1. Start a quiz<br>2. Inspect the page | Exactly one QuestionCard is rendered at any time. | [ ] Not Run |
| TC-QUIZ-04 | Selecting an answer and clicking Next loads the next question | Quiz attempt is active and on question 1. | 1. Click an answer option<br>2. Click **Next** | The card advances to the next question and the answer state resets. | [ ] Not Run |
| TC-QUIZ-05 | Completing the quiz shows a results summary screen | Quiz attempt is active. | 1. Walk through every question selecting any answer<br>2. Submit the final question | The results view replaces the attempt view and shows score/breakdown. | [ ] Not Run |
| TC-QUIZ-06 | Bear character animation container is present on the quiz page | User is on the Quiz tab. | 1. Open Quiz | A Lottie/Teddy animation element is mounted in the page header. | [ ] Not Run |
| TC-QUIZ-07 | Quiz with no resources selected shows validation error | User is in the Quiz config form. | 1. Open the config form<br>2. Leave resources empty<br>3. Click **Generate Quiz** | The button is disabled or a "Select at least one resource" hint is shown. | [ ] Not Run |

---

## 6. Flashcards

| Test ID | Test Case Name | Preconditions | Test Steps | Expected Result | Status |
| --- | --- | --- | --- | --- | --- |
| TC-FLASH-01 | Flashcards page is locked when no resources are ready | Workspace has zero ready resources. | 1. Open the Flashcards tab<br>2. Click **Generate Flashcards** | The generation panel opens but signals "no ready resources" / submit is disabled. | [ ] Not Run |
| TC-FLASH-02 | Generating flashcards returns a set of cards | Workspace has at least one ready resource. | 1. Open Flashcards<br>2. Open the generation panel<br>3. Select a resource<br>4. Click **Generate** | Within 60 s a flashcard set is created and at least one card is visible. | [ ] Not Run |
| TC-FLASH-03 | Clicking a card triggers the 3D flip animation | A flashcard set is open in study mode. | 1. Click the front face of a card | The card flips to the back face (CSS class or aria state changes). | [ ] Not Run |
| TC-FLASH-04 | Marking a card as Known moves it to the known pile | Study mode is open with at least one card. | 1. Flip the card<br>2. Click **Known** | Progress text updates and the card advances to the next card. | [ ] Not Run |
| TC-FLASH-05 | Marking a card as Revise Later keeps it in the deck | Study mode is open with at least one card. | 1. Flip the card<br>2. Click **Review Again** / **Study Later** | The card stays in the active deck and is not removed from rotation. | [ ] Not Run |
| TC-FLASH-06 | All cards can be navigated with Next / Previous controls | A flashcard set with ≥ 2 cards is open. | 1. Click **Next**<br>2. Click **Previous** | The progress indicator advances and then returns to the previous card. | [ ] Not Run |

---

## 7. Chattie (RAG Chatbot)

| Test ID | Test Case Name | Preconditions | Test Steps | Expected Result | Status |
| --- | --- | --- | --- | --- | --- |
| TC-CHAT-01 | Chattie is inaccessible when no resources are ready | Workspace has zero ready resources. | 1. Open the Chattie tab | The page renders an empty/locked state instructing the user to upload resources. | [ ] Not Run |
| TC-CHAT-02 | Sending a question returns a response referencing workspace resources | Workspace has at least one ready resource. | 1. Type a question into the chat input<br>2. Click **Send** | An assistant message is rendered within 60 s and may include source citations. | [ ] Not Run |
| TC-CHAT-03 | Chat history persists after page reload | A chat session has at least one message. | 1. Send a message<br>2. Reload the page<br>3. Re-open Chattie | The previous chat history is restored from the backend. | [ ] Not Run |
| TC-CHAT-04 | Empty message submission does not send | Chattie tab is open. | 1. Leave the textarea empty<br>2. Inspect the Send button | The Send button is disabled and no network request is made. | [ ] Not Run |
| TC-CHAT-05 | Source references appear in the response | Chat has produced an assistant reply backed by resources. | 1. View the latest assistant message<br>2. Inspect the sources area | Source chips or a "Sources:" section is rendered with the cited resource names. | [ ] Not Run |
| TC-CHAT-06 | Waving avatar empty state renders when no chat history exists | Workspace has no chat sessions yet. | 1. Open Chattie for the first time | The empty state with the waving Lottie avatar is visible. | [ ] Not Run |

---

## 8. Study Rooms

| Test ID | Test Case Name | Preconditions | Test Steps | Expected Result | Status |
| --- | --- | --- | --- | --- | --- |
| TC-SR-01 | Study room landing page shows Recent, Hosted, and Invitations panels | User is signed in and inside a workspace. | 1. Click **Study Room** in the sidebar | The landing view renders Recent Rooms, My Hosted Rooms, and Invitations sections. | [ ] Not Run |
| TC-SR-02 | Creating a room without a title shows validation error | Create Room modal is open. | 1. Open **Create Room**<br>2. Leave the title empty<br>3. Click **Create Room** | An inline "Room title is required" error is displayed; the room is not created. | [ ] Not Run |
| TC-SR-03 | Host creates a room and receives an OTP | Workspace has at least one ready resource. | 1. Open **Create Room**<br>2. Fill title and select a resource<br>3. Set question count ≥ 20<br>4. Click **Create Room** | The confirmation step displays a 6-digit OTP code. | [ ] Not Run |
| TC-SR-04 | Second browser context joins the room using the OTP | A host has just created a room and obtained an OTP. | 1. Host clicks **Go to Lobby**<br>2. In a second browser context, open the same workspace<br>3. Click **Join by Code** and enter the OTP<br>4. Submit | The second context enters the same lobby (or, if backend rejects self-join, displays a validation error). | [ ] Not Run |
| TC-SR-05 | Room becomes active only after minimum 2 participants join | Host is in a lobby with only themselves. | 1. View the lobby's start button | The **Start Room** button is disabled while the participant count is below 2. | [ ] Not Run |
| TC-SR-06 | All participants see the same question simultaneously | Two contexts have started the same study-room quiz. | 1. Read the current question text in context 1<br>2. Read the current question text in context 2 | Both contexts display identical question text. | [ ] Not Run |
| TC-SR-07 | Submitting an answer updates the leaderboard | A study-room quiz is active. | 1. Choose an answer option<br>2. Click **Submit** | The leaderboard updates the participant's score after the answer is recorded. | [ ] Not Run |
| TC-SR-08 | Final results screen shows individual performance summary | All quiz questions have been answered. | 1. Submit the final question<br>2. Wait for the results phase | The results view shows the participant's individual score and ranking. | [ ] Not Run |
| TC-SR-09 | OTP that is more than 10 minutes old is rejected | A previously-issued OTP has expired (or an unused 6-digit code is submitted). | 1. Open **Join by Code**<br>2. Enter the expired/non-existent OTP<br>3. Submit | The dialog shows an "invalid or expired code" error and does not enter the lobby. | [ ] Not Run |
| TC-SR-10 | Participant cannot join a room that does not exist | No room exists for the entered OTP. | 1. Open **Join by Code**<br>2. Enter a random valid-format 6-digit code<br>3. Submit | An error message is shown and the user remains on the landing page. | [ ] Not Run |

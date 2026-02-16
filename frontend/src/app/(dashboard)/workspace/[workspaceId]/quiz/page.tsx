export default function QuizPage() {
  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Quiz</h2>
        <button
          type="button"
          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:border-white/30"
        >
          Create quiz
        </button>
      </header>
      <p className="text-sm text-white/60">
        Adaptive quizzes and results analytics will appear here.
      </p>
    </div>
  );
}

export default function FlashcardsPage({
  params,
}: {
  params: { workspaceId: string };
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Flashcards</h2>
        <button className="rounded-lg bg-indigo-600 px-4 py-2 text-white">
          Generate Flashcards
        </button>
      </div>
      {/* Flashcard deck will go here */}
    </div>
  );
}

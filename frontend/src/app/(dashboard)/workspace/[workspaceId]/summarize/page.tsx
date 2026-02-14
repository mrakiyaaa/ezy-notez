export default function SummarizePage({
  params,
}: {
  params: { workspaceId: string };
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Summarize Content</h2>
      <div className="rounded-lg border bg-white p-6">
        {/* Summarization interface will go here */}
      </div>
    </div>
  );
}

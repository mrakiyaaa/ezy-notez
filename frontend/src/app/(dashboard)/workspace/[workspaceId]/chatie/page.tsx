export default function ChatiePage({
  params,
}: {
  params: { workspaceId: string };
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Chatie - AI Assistant</h2>
      <div className="flex h-[600px] flex-col rounded-lg border bg-white">
        {/* Chat interface will go here */}
      </div>
    </div>
  );
}

export default function WorkspacePage({
  params,
}: {
  params: { workspaceId: string };
}) {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Workspace Dashboard</h1>
      <p className="text-gray-600">Workspace ID: {params.workspaceId}</p>
      {/* Workspace overview will go here */}
    </div>
  );
}

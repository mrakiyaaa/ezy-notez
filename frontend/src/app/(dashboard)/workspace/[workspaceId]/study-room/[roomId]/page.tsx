export default function LiveStudyRoomPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Live Study Room</h2>
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 rounded-lg border bg-white p-6">
          {/* Quiz interface */}
        </div>
        <div className="rounded-lg border bg-white p-6">
          {/* Participants & leaderboard */}
        </div>
      </div>
    </div>
  );
}

import { supabaseAdmin } from "../config/supabase";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum characters of combined resource text fed to the AI model. */
const MAX_CONTENT_CHARS = 12_000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ResourceTextRow {
  id: string;
  extracted_text: string | null;
}

// ---------------------------------------------------------------------------
// fetchResourceContent
// ---------------------------------------------------------------------------

/**
 * Fetches extracted text from a list of resource IDs, concatenates it, and
 * trims to MAX_CONTENT_CHARS to stay within model token limits.
 *
 * Only resources with status "ready" and non-null extracted_text are included.
 * Throws if none of the provided resources have usable content.
 */
export const fetchResourceContent = async (
  resourceIds: string[],
): Promise<string> => {
  if (resourceIds.length === 0) {
    throw new Error("No resource IDs provided.");
  }

  const { data, error } = await supabaseAdmin
    .from("resources")
    .select("id, extracted_text")
    .in("id", resourceIds)
    .eq("status", "ready")
    .not("extracted_text", "is", null);

  if (error) {
    throw new Error(`Failed to fetch resources: ${error.message}`);
  }

  const usable = ((data ?? []) as ResourceTextRow[]).filter(
    (r) => r.extracted_text && r.extracted_text.trim().length > 0,
  );

  if (usable.length === 0) {
    throw new Error(
      "None of the selected resources have extracted text. " +
        "Make sure resources have finished processing before starting a room.",
    );
  }

  const combined = usable
    .map((r) => r.extracted_text!.trim().replace(/\0/g, ""))
    .join("\n\n");

  if (combined.length > MAX_CONTENT_CHARS) {
    console.warn(
      `[studyRoomResources] Combined content (${combined.length} chars) exceeds ` +
        `limit — trimming to ${MAX_CONTENT_CHARS} chars.`,
    );
  }

  return combined.slice(0, MAX_CONTENT_CHARS);
};

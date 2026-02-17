/**
 * Generate a URL-friendly slug from a string
 * - Convert to lowercase
 * - Replace spaces with hyphens
 * - Remove special characters
 * - Remove consecutive hyphens
 * - Trim hyphens from start/end
 */
export const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/[^\w\-]/g, "") // Remove special characters (keep word chars and hyphens)
    .replace(/\-+/g, "-") // Replace consecutive hyphens with single hyphen
    .replace(/^\-+|\-+$/g, ""); // Trim hyphens from start and end
};

/**
 * Generate a unique slug by appending counter suffix if duplicate exists
 * Example: "my-workspace" → "my-workspace-2", "my-workspace-3", etc.
 */
export const generateUniqueSlug = async (
  baseSlug: string,
  checkSlugExists: (slug: string) => Promise<boolean>
): Promise<string> => {
  let slug = baseSlug;
  let counter = 2;

  while (await checkSlugExists(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
};

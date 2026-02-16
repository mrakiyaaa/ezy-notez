export const generateNameFromEmail = (email: string) => {
  const handle = email.split("@")[0] || "User";
  const words = handle.split(/[._-]+/).filter(Boolean);
  const base = words.length > 0 ? words : [handle];

  return base
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
    .trim();
};

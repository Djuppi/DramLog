// Must stay in sync with the slug logic in the edge function.
export function generateSlug(name: string, distillery: string, age?: number): string {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9\s]/g, "")
      .trim()
      .replace(/\s+/g, "-");
  const agePart = age ? `__${age}yr` : "__nas";
  return `${norm(distillery)}__${norm(name)}${agePart}`;
}

import site from "../data/site.json";
import members from "../data/members.json";
import publications from "../data/publications.json";
import yearbookData from "../data/yearbook.json";

export { site, members, publications };

/* the yearbook: entries (retreats, conferences…) grouped by year, newest year first;
   within a year they keep the order of the file */
export const yearbook = [...new Set(yearbookData.map((e) => e.year))]
  .sort((a, b) => b - a)
  .map((year) => ({ year, entries: yearbookData.filter((e) => e.year === year) }));

export const memberIdByName: Record<string, string> = Object.fromEntries(members.map((m: any) => [m.name, m.id]));

/* faculty and current members get the stage; alumni and external collaborators are listed quietly */
export const isActive = (m: any) => m.group === "faculty" || m.group === "current";
export const team = [...members.filter((m: any) => m.group === "faculty"), ...members.filter((m: any) => m.group === "current")];
/* close collaborators sit between the two: small portrait cards right under the team */
export const closeCollaborators = members.filter((m: any) => m.group === "close");

export const featured = () => publications.filter((p: any) => p.featured).sort((a: any, b: any) => a.featured - b.featured);
export const pubsByAuthor = (name: string) => publications.filter((p: any) => p.authors.includes(name));

/* first and last name: "Clemens Nylandsted Klokmose" → CK, "Sriram K. Badam" → SB */
export const initials = (n: string) => {
  const w = n.split(/\s+/).filter((x) => /^[A-Za-zÀ-ÿ]/.test(x));
  return (w.length > 1 ? [w[0], w[w.length - 1]] : w).map((x) => x[0]).join("").toUpperCase();
};

export const counts = <T>(arr: T[], f: (x: T) => any) => {
  const m: Record<string, number> = {};
  arr.forEach((x) => { const k = f(x); if (k != null) m[k] = (m[k] || 0) + 1; });
  return Object.keys(m).sort().map((k) => ({ k, n: m[k] }));
};

import site from "../data/site.json";
import members from "../data/members.json";
import publications from "../data/publications.json";
import retreatData from "../data/retreats.json";

export { site, members, publications };

/* the yearbook: one entry per yearly retreat, newest first */
export const retreats = [...retreatData].sort((a, b) => b.year - a.year);

export const memberIdByName: Record<string, string> = Object.fromEntries(members.map((m: any) => [m.name, m.id]));

/* faculty and current members get the stage; alumni and external collaborators are listed quietly */
export const isActive = (m: any) => m.group === "faculty" || m.group === "current";
export const team = [...members.filter((m: any) => m.group === "faculty"), ...members.filter((m: any) => m.group === "current")];

export const featured = () => publications.filter((p: any) => p.featured).sort((a: any, b: any) => a.featured - b.featured);
export const pubsByAuthor = (name: string) => publications.filter((p: any) => p.authors.includes(name));

export const initials = (n: string) =>
  n.split(/\s+/).filter((w) => /^[A-Za-zÀ-ÿ]/.test(w)).slice(0, 2).map((w) => w[0]).join("");

export const counts = <T>(arr: T[], f: (x: T) => any) => {
  const m: Record<string, number> = {};
  arr.forEach((x) => { const k = f(x); if (k != null) m[k] = (m[k] || 0) + 1; });
  return Object.keys(m).sort().map((k) => ({ k, n: m[k] }));
};

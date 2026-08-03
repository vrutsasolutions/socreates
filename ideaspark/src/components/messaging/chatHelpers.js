export const handleFor = (name = "") =>
  "@" + name.replace(/\./g, "").trim().replace(/\s+/g, ".").toLowerCase();
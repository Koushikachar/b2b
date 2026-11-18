/** PostgREST/Postgres error for a write that names the not-yet-migrated `mrp` column. */
export function isMissingMrpColumn(
  error: { code?: string; message?: string } | null,
): boolean {
  return (
    !!error &&
    (error.code === "PGRST204" || error.code === "42703") &&
    /\bmrp\b/.test(error.message ?? "")
  );
}

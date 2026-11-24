/** Word the owner types in the last confirmation step before deleting the account. */
export const DELETE_PHRASE = "DELETE"

/**
 * Server-side check for the delete-account confirmations: the exact business
 * name (step 2) and the DELETE phrase (step 3). Returns the message to show, or
 * null when deletion may proceed.
 */
export function deleteConfirmationError(
  businessName: string,
  typedName: string,
  typedPhrase: string,
): string | null {
  const expected = businessName.trim()
  if (!expected || String(typedName ?? "").trim() !== expected) {
    return "Type your company name exactly to confirm."
  }
  if (String(typedPhrase ?? "").trim() !== DELETE_PHRASE) {
    return `Type ${DELETE_PHRASE} in capitals to confirm.`
  }
  return null
}

import { describe, expect, it } from "vitest"
import { DELETE_PHRASE, deleteConfirmationError } from "@/lib/supplier/delete-account"

describe("deleteConfirmationError (supplier account deletion needs every confirmation)", () => {
  it("allows deletion only with the exact business name and the DELETE phrase", () => {
    expect(deleteConfirmationError("OXM Traders", "OXM Traders", DELETE_PHRASE)).toBeNull()
  })

  it("ignores surrounding spaces in what was typed", () => {
    expect(deleteConfirmationError("OXM Traders", "  OXM Traders ", ` ${DELETE_PHRASE} `)).toBeNull()
  })

  it("refuses a wrong or partial business name", () => {
    expect(deleteConfirmationError("OXM Traders", "OXM", DELETE_PHRASE)).toMatch(/company name/i)
  })

  it("refuses when the DELETE phrase was skipped or mistyped", () => {
    expect(deleteConfirmationError("OXM Traders", "OXM Traders", "")).toMatch(/DELETE/)
    expect(deleteConfirmationError("OXM Traders", "OXM Traders", "delete")).toMatch(/DELETE/)
  })

  it("refuses when the company has no name to check against", () => {
    expect(deleteConfirmationError("", "", DELETE_PHRASE)).not.toBeNull()
  })
})

import { redirect } from "next/navigation"

// One Contact page for everyone: the account menu opens the public /contact.
export default function AccountContactPage() {
  redirect("/contact")
}

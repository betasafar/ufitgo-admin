import { redirect } from "next/navigation"

export default function FcmbWebhooksRedirectPage() {
  redirect("/dashboard/treasury/float")
}
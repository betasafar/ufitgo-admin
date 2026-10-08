import { PartnerForm } from "../../_components/partner-form"

export default async function EditPartnerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <PartnerForm operatorId={id} />
}
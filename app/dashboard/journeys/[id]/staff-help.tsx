"use client"

import { useEffect, useState, type ReactNode } from "react"
import { Info, X } from "lucide-react"

type HelpSection = { heading: string; body?: string; items?: { term: string; meaning: string }[] }

// Plain-language guides for staff, opened from the ⓘ button next to a section title
export const travelersHelp: { title: string; intro: string; sections: HelpSection[] } = {
  title: "How the Travelers tab works",
  intro:
    "Use this tab to record everyone travelling on this booking. Fill it in after you have spoken to the customer and received a photo of each passport data page.",
  sections: [
    {
      heading: "Who is who",
      items: [
        {
          term: "Main applicant",
          meaning:
            "The person who owns the UfitGo account. Documents you upload for them go into their personal Travel Docs vault and are reused on their future trips.",
        },
        {
          term: "Co-traveller",
          meaning:
            "Anyone else on the booking (spouse, children, parents). They don't need an account or email. Their details and documents stay on this booking only and never appear in the main applicant's vault.",
        },
        {
          term: "Account holder is travelling",
          meaning:
            "Untick this if the customer booked for someone else, e.g. a son booking for his parents. We then stop asking for the account holder's passport and visa.",
        },
      ],
    },
    {
      heading: "Passport details form",
      items: [
        {
          term: "First, middle and last name",
          meaning:
            "Copy them exactly as printed on the passport data page, letter for letter. Visa applications are rejected when names don't match. Names are saved in capitals automatically.",
        },
        { term: "Gender", meaning: "As shown on the passport (M or F)." },
        { term: "Date of birth", meaning: "From the passport. Needed for the visa application." },
        { term: "Nationality", meaning: "Country on the passport. Defaults to Nigerian; change it for foreign passports." },
        { term: "Relationship", meaning: "How they are related to the main applicant, e.g. Wife, Son, Mother. Used for proof-of-relationship checks." },
        { term: "NIN", meaning: "Optional. Only if the operator asks for it." },
      ],
    },
    {
      heading: "Documents",
      items: [
        {
          term: "Passport",
          meaning:
            "Upload the data page. You'll be asked for the passport number and expiry date. The traveller is reminded 6 months and 1 month before it expires.",
        },
        { term: "Passport photos", meaning: "Recent colour photo with a white background." },
        { term: "Other documents", meaning: "Proof of relationship, Shahadah certificate, visa and health card. Upload them only when the operator needs them." },
        {
          term: "Statuses",
          meaning:
            "Verified: checked and fine. Needs review: the traveller uploaded it themselves and it needs checking. New copy requested: you asked for a better copy. Expired: the expiry date has passed.",
        },
      ],
    },
    {
      heading: "Number of travellers",
      body: "If fewer people are added than were booked, you'll see a yellow warning. It's only a reminder and never blocks the booking.",
    },
  ],
}

export const visaHelp: { title: string; intro: string; sections: HelpSection[] } = {
  title: "How visa updates work",
  intro:
    "Each traveller has their own visa status, because approvals usually come back in batches rather than all at once.",
  sections: [
    {
      heading: "Updating visas",
      items: [
        { term: "1. Tick travellers", meaning: "Select everyone in this batch, or use Select all." },
        { term: "2. Choose the new status", meaning: "Pick the status the operator confirmed." },
        { term: "3. Add a note (optional)", meaning: "The customer sees this note, so write it for them, e.g. \"Approved, printed copies will be shared before departure.\"" },
        { term: "4. Save", meaning: "The account holder gets one notification naming everyone you updated." },
        { term: "Application number", meaning: "Unique per traveller, so it can only be entered when one traveller is selected." },
      ],
    },
    {
      heading: "What each status means",
      items: [
        { term: "Not started", meaning: "Nothing has happened yet." },
        { term: "Documents requested", meaning: "We've asked the traveller for what the visa needs." },
        { term: "Documents received", meaning: "We have everything from the traveller." },
        { term: "Submitted to operator", meaning: "Handed to the tour operator to apply." },
        { term: "Submitted to authority", meaning: "The operator has lodged the application with the Saudi authorities." },
        { term: "Under processing", meaning: "Waiting for a decision." },
        { term: "Additional information required", meaning: "The authority or operator needs something more. Tell the customer what in the note." },
        { term: "Approved", meaning: "Visa granted." },
        { term: "Rejected or delayed", meaning: "Refused or held up. Explain the next step in the note." },
      ],
    },
    {
      heading: "What the customer sees",
      body: "Each traveller's name with their own status in the trip checklist. The booking only shows Approved when everyone is approved. If anyone needs attention, that shows first.",
    },
  ],
}

export const operatorReleaseHelp: { title: string; intro: string; sections: HelpSection[] } = {
  title: "Sharing documents with the operator",
  intro:
    "When you're satisfied with what you've collected, release the travellers' documents so the operator can start the visa. Nothing reaches the operator until you press Release.",
  sections: [
    {
      heading: "Step by step",
      items: [
        { term: "1. Check the list", meaning: "Each traveller shows what is still missing or not yet verified. You can release anyway. It's a warning, not a block." },
        { term: "2. Tick travellers", meaning: "Everyone travelling is ticked by default. Untick anyone whose documents shouldn't go yet." },
        { term: "3. Release documents", meaning: "The operator's document contacts get an email and a portal notification. They open the booking in their portal to view the files." },
        { term: "Send update", meaning: "Use this after a document changes (e.g. a renewed passport or a better photo) or to add travellers. The operator is told to use the latest versions." },
        { term: "Withdraw access", meaning: "Stops the operator seeing the documents immediately, e.g. if the booking moves to another operator. They are told by email." },
      ],
    },
    {
      heading: "What the operator gets",
      items: [
        { term: "Traveller details", meaning: "Names as on the passport, gender, date of birth, nationality, relationship and visa status." },
        { term: "Files", meaning: "Passport, passport photo and any other documents on file for the travellers you ticked." },
        { term: "No email attachments", meaning: "The email never contains documents or links to them. Files open only after the operator logs in, through links that expire after 5 minutes." },
        { term: "View or download", meaning: "In their portal the operator can open each file or download it (named after the traveller, e.g. YUSUF-AMINA-passport.jpg) to upload to the visa portal. They're reminded to store downloads securely and delete them once the visa is issued." },
      ],
    },
    {
      heading: "How long access lasts",
      body: "Until 60 days after departure (30 days after the trip is marked completed). Access ends straight away if you withdraw it or the booking is cancelled or refunded.",
    },
    {
      heading: "Who viewed or downloaded what",
      body: "Every file the operator opens or downloads is recorded below with the person's email, the time, and whether it was viewed or downloaded. Use it to confirm the operator has started work, or to answer a traveller's privacy question.",
    },
    {
      heading: "Who gets the email",
      body: "The operator's document notification emails, set on the operator's page in Operators. If none are set, their account email is used.",
    },
  ],
}

export function HelpButton({ guide, label = "How this works" }: { guide: { title: string; intro: string; sections: HelpSection[] }; label?: string }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false)
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label}
        title={label}
        className="inline-flex size-7 items-center justify-center rounded-full text-[#68716d] hover:bg-[#eef3f1] hover:text-[#0d7d5f]"
      >
        <Info className="size-4" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#17201c]/35 p-5" role="dialog" aria-modal="true" aria-label={guide.title} onClick={() => setOpen(false)}>
          <div className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-[#dbe2de] bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-[#edf1ef] p-5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#07845f]">Staff guide</p>
                <h2 className="mt-1 font-brand text-xl font-bold text-[#17201c]">{guide.title}</h2>
                <p className="mt-1 text-sm text-[#68716d]">{guide.intro}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-[#68716d] hover:text-[#17201c]"><X className="size-5" /></button>
            </div>
            <div className="max-h-[62vh] space-y-5 overflow-y-auto p-5">
              {guide.sections.map((section) => (
                <section key={section.heading}>
                  <h3 className="text-sm font-bold text-[#17201c]">{section.heading}</h3>
                  {section.body && <p className="mt-1 text-sm leading-6 text-[#4b5551]">{section.body}</p>}
                  {section.items && (
                    <dl className="mt-2 divide-y divide-[#edf1ef] rounded-xl border border-[#edf1ef]">
                      {section.items.map((item) => (
                        <div key={item.term} className="grid gap-1 px-4 py-2.5 sm:grid-cols-[180px_1fr] sm:gap-4">
                          <dt className="text-sm font-semibold text-[#17201c]">{item.term}</dt>
                          <dd className="text-sm leading-6 text-[#4b5551]">{item.meaning}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </section>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export function TitleWithHelp({ children, guide }: { children: ReactNode; guide: { title: string; intro: string; sections: HelpSection[] } }) {
  return (
    <div className="flex items-center gap-1.5">
      <h2 className="font-brand text-lg font-bold text-[#17201c]">{children}</h2>
      <HelpButton guide={guide} />
    </div>
  )
}

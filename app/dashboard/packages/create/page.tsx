"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Building2, Loader2, PackagePlus } from "lucide-react";
import { AppSelect } from "@/components/ui/app-select";
import { PackageTemplates } from "./package-templates";
import { Accommodation, AccommodationFields } from "./accommodation-fields";
import { calculatePaymentSplit, findPaymentSplit } from "./payment-split";

const paymentPlans = [
  { value: "FULL_PAYMENT", label: "Full payment only" },
  {
    value: "REGISTRATION_AND_FULL_PAYMENT",
    label: "Registration fee + full payment",
  },
  { value: "INSTALLMENTS", label: "Initial payment + final balance" },
  {
    value: "REGISTRATION_AND_INSTALLMENTS",
    label: "Registration + initial + final",
  },
];

const splitOptions = [
  { label: "50 / 50", value: 50 },
  { label: "30 / 70", value: 30 },
  { label: "60 / 40", value: 60 },
  { label: "70 / 30", value: 70 },
];

type AgeRuleForm = { adultAge: string; infantAge: string; childDiscountPercent: string | null; infantDiscountPercent: string | null };

export default function CreatePackagePage() {
  const params = useParams();
  const editId = String(params?.id ?? "");
  const isEdit = Boolean(editId);
  const [operators, setOperators] = useState<any[]>([]);
  const [operatorPolicies, setOperatorPolicies] = useState<any[]>([]);
  const [operatorId, setOperatorId] = useState("");
  const [accommodationDetails, setAccommodationDetails] = useState<Accommodation[]>([]);
  const [selectedSplit, setSelectedSplit] = useState<number | null>(null);
  const [splitEdited, setSplitEdited] = useState(false);
  const [existingSplit, setExistingSplit] = useState<number | null>(null);
  const [ageRule, setAgeRule] = useState<AgeRuleForm | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    itinerary: "",
    accommodation: "",
    servicesDisclosure: "",
    priceBasis: "",
    exclusions: "",
    requiredDocuments: "",
    childPolicy: "",
    bookingCloseDate: "",
    departingFrom: "",
    goingTo: "",
    type: "umrah",
    season: "",
    seasonYear: "",
    serviceLevel: "standard",
    price: "",
    priceOnRequest: "false",
    duration: "",
    capacity: "",
    status: "draft",
    salesStatus: "open",
    departureDate: "",
    expectedDepartureStart: "",
    expectedDepartureEnd: "",
    returnDate: "",
    inclusions: "",
    paymentPlan: "FULL_PAYMENT",
    registrationFee: "",
    registrationFeeBasis: "per_traveller",
    registrationCloseDate: "",
    depositRequiredWithinDays: "20",
    operatorPolicyVersionId: "",
    initialPayment: "",
    finalBalance: "",
    finalPaymentDueDate: "",
    paymentNote: "",
    groupDiscountEnabled: "false",
    groupDiscountThreshold: "",
    groupDiscountPercentage: "",
  });
  const [bookedSlots, setBookedSlots] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/operator-auth/operators?limit=100", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        let list = [];
        if (Array.isArray(payload?.data)) {
          list = payload.data;
        } else if (Array.isArray(payload)) {
          list = payload;
        }
        setOperators(
          list.filter((operator: any) => operator.isActive !== false),
        );
      })
      .catch(() => setError("Unable to load operators"))
      .finally(() => setLoading(false));
    if (editId) {
      fetch(`/api/admin/operator-auth/packages/${editId}`, {
        cache: "no-store",
      })
        .then(async (response) => {
          const payload = await response.json();
          const pkg = payload?.data || payload;
          const hasRegistration = Boolean(
            pkg?.registrationFeeEnabled &&
            Number(pkg?.registrationFeeAmount || 0) > 0,
          );
          const hasInstallments = Boolean(pkg?.installmentEligible);
          let paymentPlan = "FULL_PAYMENT";
          if (hasRegistration && hasInstallments) {
            paymentPlan = "REGISTRATION_AND_INSTALLMENTS";
          } else if (hasRegistration) {
            paymentPlan = "REGISTRATION_AND_FULL_PAYMENT";
          } else if (hasInstallments) {
            paymentPlan = "INSTALLMENTS";
          }
          setExistingSplit(pkg?.installmentSplitPercent ?? null);
          if (pkg?.agePricingRule) setAgeRule({
            adultAge: String(pkg.agePricingRule.adultAge), infantAge: String(pkg.agePricingRule.infantAge),
            childDiscountPercent: pkg.agePricingRule.childDiscountPercent == null ? null : String(pkg.agePricingRule.childDiscountPercent),
            infantDiscountPercent: pkg.agePricingRule.infantDiscountPercent == null ? null : String(pkg.agePricingRule.infantDiscountPercent),
          });
          setSelectedSplit(hasInstallments
            ? pkg.installmentSplitPercent ?? findPaymentSplit(Number(pkg.price), Number(pkg.initialDeposit), Number(pkg.finalBalance))
            : null);
          setOperatorId(String(pkg?.operator?.id || pkg?.operatorId || ""));
          setBookedSlots(Number(pkg?.booked || 0));
          setAccommodationDetails(Array.isArray(pkg?.accommodationDetails) ? pkg.accommodationDetails.map((item: Accommodation & { nights?: string | number }) => ({
            ...item, nights: item.nights == null ? "" : String(item.nights),
          })) : []);
          setForm({
            title: pkg?.title || "",
            description: pkg?.description || "",
            itinerary: pkg?.itinerary || "",
            accommodation: pkg?.accommodation || "",
            servicesDisclosure: pkg?.servicesDisclosure || "",
            priceBasis: pkg?.priceBasis || "",
            exclusions: pkg?.exclusions || "",
            requiredDocuments: pkg?.requiredDocuments || "",
            childPolicy: pkg?.childPolicy || "",
            bookingCloseDate: pkg?.bookingCloseDate?.slice?.(0, 10) || "",
            departingFrom: pkg?.departingFrom || "",
            goingTo: pkg?.goingTo || "",
            type: pkg?.type || "umrah",
            season: pkg?.season || "",
            seasonYear: pkg?.seasonYear == null ? "" : String(pkg.seasonYear),
            serviceLevel: pkg?.serviceLevel || "standard",
            price: String(pkg?.price || ""),
            priceOnRequest: String(Boolean(pkg?.priceOnRequest)),
            duration: String(pkg?.duration || ""),
            capacity: String(pkg?.capacity || ""),
            status: pkg?.status || "draft",
            salesStatus: pkg?.salesStatus || "open",
            departureDate: pkg?.departureDate?.slice?.(0, 10) || "",
            expectedDepartureStart: pkg?.expectedDepartureStart?.slice?.(0, 10) || "",
            expectedDepartureEnd: pkg?.expectedDepartureEnd?.slice?.(0, 10) || "",
            returnDate: pkg?.returnDate?.slice?.(0, 10) || "",
            inclusions: Array.isArray(pkg?.inclusions) ? pkg.inclusions.join("\n") : "",
            paymentPlan,
            registrationFee: hasRegistration
              ? String(pkg.registrationFeeAmount)
              : "",
            registrationFeeBasis: pkg?.registrationFeeBasis || "per_traveller",
            registrationCloseDate:
              pkg?.registrationCloseDate?.slice?.(0, 10) || "",
            depositRequiredWithinDays: String(
              pkg?.depositRequiredWithinDays ?? 20,
            ),
            operatorPolicyVersionId: pkg?.operatorPolicyVersionId || "",
            initialPayment: hasInstallments
              ? String(pkg.initialDeposit || "")
              : "",
            finalBalance: hasInstallments ? String(pkg.finalBalance || "") : "",
            finalPaymentDueDate: hasInstallments
              ? pkg.finalPaymentDueDate?.slice?.(0, 10) || ""
              : "",
            paymentNote: pkg?.paymentNote || "",
            groupDiscountEnabled: String(Boolean(pkg?.groupDiscountEnabled)),
            groupDiscountThreshold: pkg?.groupDiscountThreshold ? String(pkg.groupDiscountThreshold) : "",
            groupDiscountPercentage: pkg?.groupDiscountPercentage ? String(pkg.groupDiscountPercentage) : "",
          });
        })
        .catch(() => setError("Unable to load package for editing"));
    }
  }, [editId]);

  useEffect(() => {
    if (!operatorId) {
      setOperatorPolicies([]);
      return;
    }
    fetch(`/api/admin/operator-policies?operatorId=${encodeURIComponent(operatorId)}`, {
      cache: "no-store",
    })
      .then(async (response) => {
        const payload = await response.json();
        const policies = Array.isArray(payload?.data) ? payload.data : [];
        setOperatorPolicies(policies.filter((policy: any) => policy.status === "published"));
      })
      .catch(() => setOperatorPolicies([]));
  }, [operatorId]);

  const usesRegistration = form.paymentPlan.startsWith("REGISTRATION");
  const usesInstallments = form.paymentPlan.endsWith("INSTALLMENTS");
  const packagePrice = Number(form.price || 0);
  const priceOnRequest = form.priceOnRequest === "true";
  const groupDiscountEnabled = form.groupDiscountEnabled === "true";
  const availableSlots = Math.max(0, Number(form.capacity || 0) - bookedSlots);
  const installmentTotal =
    Number(form.initialPayment || 0) + Number(form.finalBalance || 0);
  const installmentValid =
    !usesInstallments || (packagePrice > 0 && Number(form.initialPayment) > 0 && Number(form.finalBalance) > 0 &&
      Math.round(installmentTotal * 100) === Math.round(packagePrice * 100));
  const selectedOperator = useMemo(
    () => operators.find((operator) => String(operator.id) === operatorId),
    [operators, operatorId],
  );

  const update = (key: string, value: string) => {
    if (key === "initialPayment" || key === "finalBalance") setSelectedSplit(null);
    if (key === "price" && selectedSplit !== null) setSplitEdited(true);
    setForm((current) => {
      if (key === "price" && selectedSplit !== null) {
        const price = Number(value);
        if (value && Number.isFinite(price) && price > 0) {
          const split = calculatePaymentSplit(price, selectedSplit);
          return { ...current, price: value, initialPayment: String(split.initialPayment), finalBalance: String(split.finalBalance) };
        }
        return { ...current, price: value, initialPayment: "", finalBalance: "" };
      }
      return { ...current, [key]: value };
    });
  };
  const applySplit = (initialPercent: number) => {
    const split = calculatePaymentSplit(packagePrice, initialPercent);
    setSelectedSplit(initialPercent);
    setSplitEdited(true);
    setForm((current) => ({
      ...current,
      initialPayment: String(split.initialPayment),
      finalBalance: String(split.finalBalance),
    }));
  };

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (
      !operatorId ||
      !form.title ||
      !installmentValid
    )
      return;
    if (Boolean(form.expectedDepartureStart) !== Boolean(form.expectedDepartureEnd) ||
      (form.expectedDepartureStart && form.expectedDepartureStart > form.expectedDepartureEnd)) {
      setError("Provide both expected departure dates in chronological order.");
      return;
    }
    if (accommodationDetails.some((item) => !item.city.trim() ||
      (item.status === "confirmed" && !item.hotelName?.trim()) ||
      (item.nights && (!Number.isInteger(Number(item.nights)) || Number(item.nights) < 1 || Number(item.nights) > 365)))) {
      setError("Each hotel needs a city, a name if confirmed, and a valid number of nights.");
      return;
    }
    if (ageRule && (!form.departureDate || !Number.isInteger(Number(ageRule.infantAge)) ||
      !Number.isInteger(Number(ageRule.adultAge)) || Number(ageRule.infantAge) < 1 ||
      Number(ageRule.adultAge) <= Number(ageRule.infantAge) || Number(ageRule.adultAge) > 18 ||
      [ageRule.childDiscountPercent, ageRule.infantDiscountPercent].some((value) => value !== null &&
        (value === "" || !Number.isInteger(Number(value)) || Number(value) < 0 || Number(value) > 100)) ||
      (ageRule.childDiscountPercent === null && ageRule.infantDiscountPercent === null) ||
      (usesInstallments && (!selectedSplit || (isEdit && !splitEdited && !existingSplit))))) {
      setError("Age discounts require a confirmed departure, valid age bands and percentages, and an explicitly selected installment split.");
      return;
    }
    setSaving(true);
    setError("");
    const body = new FormData();
    body.append("title", form.title);
    body.append("description", form.description);
    body.append("itinerary", form.itinerary);
    body.append("accommodation", form.accommodation);
    const hotels = accommodationDetails.map((item) => ({
      city: item.city.trim(), status: item.status,
      ...(item.hotelName?.trim() ? { hotelName: item.hotelName.trim() } : {}),
      ...(item.expectedStandard?.trim() ? { expectedStandard: item.expectedStandard.trim() } : {}),
      ...(item.nights ? { nights: Number(item.nights) } : {}),
      ...(item.roomSharing?.trim() ? { roomSharing: item.roomSharing.trim() } : {}),
      ...(item.substitution?.trim() ? { substitution: item.substitution.trim() } : {}),
    }));
    body.append("accommodationDetails", JSON.stringify(hotels));
    body.append("servicesDisclosure", form.servicesDisclosure);
    body.append("priceBasis", form.priceBasis);
    body.append("exclusions", form.exclusions);
    body.append("requiredDocuments", form.requiredDocuments);
    body.append("childPolicy", form.childPolicy);
    if (form.bookingCloseDate) body.append("bookingCloseDate", form.bookingCloseDate);
    body.append("departingFrom", form.departingFrom);
    body.append("goingTo", form.goingTo);
    body.append("type", form.type);
    if (form.season) body.append("season", form.season);
    if (form.seasonYear) body.append("seasonYear", form.seasonYear);
    body.append("serviceLevel", form.serviceLevel);
    if (priceOnRequest || form.price) body.append("price", String(priceOnRequest ? 0 : packagePrice));
    body.append("priceOnRequest", String(priceOnRequest));
    if (form.duration) body.append("duration", form.duration);
    if (form.capacity) body.append("capacity", form.capacity);
    body.append("status", form.status);
    body.append("salesStatus", form.salesStatus);
    if (form.departureDate) body.append("departureDate", form.departureDate);
    if (form.expectedDepartureStart) body.append("expectedDepartureStart", form.expectedDepartureStart);
    if (form.expectedDepartureEnd) body.append("expectedDepartureEnd", form.expectedDepartureEnd);
    if (form.returnDate) body.append("returnDate", form.returnDate);
    body.append("inclusions", JSON.stringify(form.inclusions.split("\n").map((item) => item.trim()).filter(Boolean)));
    body.append("registrationFeeEnabled", String(usesRegistration));
    body.append("registrationFeeBasis", form.registrationFeeBasis);
    body.append(
      "registrationFeeAmount",
      usesRegistration ? String(Number(form.registrationFee || 0)) : "0",
    );
    if (form.registrationCloseDate) body.append("registrationCloseDate", form.registrationCloseDate);
    if (form.operatorPolicyVersionId) {
      body.append("operatorPolicyVersionId", form.operatorPolicyVersionId);
    }
    body.append(
      "depositRequiredWithinDays",
      String(Number(form.depositRequiredWithinDays || 20)),
    );
    body.append("installmentEligible", String(usesInstallments));
    if (usesInstallments && selectedSplit !== null && (!isEdit || splitEdited)) {
      body.append("installmentSplitPercent", String(selectedSplit));
    }
    body.append(
      "initialDeposit",
      usesInstallments ? String(Number(form.initialPayment || 0)) : "0",
    );
    body.append(
      "finalBalance",
      usesInstallments ? String(Number(form.finalBalance || 0)) : "0",
    );
    if (usesInstallments && form.finalPaymentDueDate) body.append("finalPaymentDueDate", form.finalPaymentDueDate);
    body.append("paymentNote", form.paymentNote);
    body.append("groupDiscountEnabled", String(groupDiscountEnabled));
    if (process.env.NEXT_PUBLIC_ENABLE_AGE_PRICING === "true") {
      body.append("agePricingRule", JSON.stringify(ageRule ? {
        adultAge: Number(ageRule.adultAge), infantAge: Number(ageRule.infantAge),
        childDiscountPercent: ageRule.childDiscountPercent === null ? null : Number(ageRule.childDiscountPercent),
        infantDiscountPercent: ageRule.infantDiscountPercent === null ? null : Number(ageRule.infantDiscountPercent),
      } : null));
    }
    if (groupDiscountEnabled) {
      body.append("groupDiscountThreshold", form.groupDiscountThreshold);
      body.append("groupDiscountPercentage", form.groupDiscountPercentage);
    }
    let editPrice: number | null = null;
    if (priceOnRequest) {
      editPrice = 0;
    } else if (form.price) {
      editPrice = packagePrice;
    }
    try {
      const response = isEdit
        ? await fetch(`/api/admin/operator-auth/packages/${editId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...Object.fromEntries(body.entries()),
              accommodationDetails: hotels,
              price: editPrice,
              duration: form.duration ? Number(form.duration) : null,
              capacity: form.capacity ? Number(form.capacity) : null,
              departureDate: form.departureDate || null,
              expectedDepartureStart: form.expectedDepartureStart || null,
              expectedDepartureEnd: form.expectedDepartureEnd || null,
              returnDate: form.returnDate || null,
              registrationCloseDate: form.registrationCloseDate || null,
              finalPaymentDueDate: usesInstallments && form.finalPaymentDueDate ? form.finalPaymentDueDate : null,
              bookingCloseDate: form.bookingCloseDate || null,
              operatorPolicyVersionId: form.operatorPolicyVersionId || null,
              season: form.season || null,
              seasonYear: form.seasonYear ? Number(form.seasonYear) : null,
            }),
          })
        : await fetch(
            `/api/admin/operator-auth/packages/for-operator/${operatorId}`,
            { method: "POST", body },
          );
      const payload = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(payload?.details?.message || payload?.message || "Unable to create package");
      window.location.assign("/dashboard/packages");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to create package",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return (
      <main className="grid min-h-[60vh] place-items-center p-8">
        <Loader2 className="size-8 animate-spin text-[#0d7d5f]" />
      </main>
    );

  return (
    <main className="space-y-6 p-5 sm:p-8">
      <Link
        href="/dashboard/packages"
        className="inline-flex items-center gap-2 text-sm font-bold text-[#0d7d5f]"
      >
        <ArrowLeft className="size-4" /> Back to packages
      </Link>
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#07845f]">
          Packages / {isEdit ? "Edit" : "Create"}
        </p>
        <h1 className="mt-2 flex items-center gap-3 font-brand text-3xl font-bold text-[#17201c]">
          <PackagePlus className="size-7 text-[#0d7d5f]" />{" "}
          {isEdit ? "Edit package" : "Create package"}
        </h1>
        <p className="mt-2 text-sm text-[#68716d]">
          {isEdit
            ? "Update package details and payment configuration."
            : "Create package inventory for an approved operator and define exactly how customers can pay."}
        </p>
      </header>
      <PackageTemplates onApply={(template, level) => {
        if ((form.description || form.itinerary || template.registrationFeeBasis || template.installmentSplit || template.agePricingRule !== undefined) &&
          !window.confirm("Apply this template? It replaces the description and itinerary and any payment defaults configured in the template. Review the package before saving.")) return;
        if (template.installmentSplit) {
          setSelectedSplit(template.installmentSplit);
          setSplitEdited(true);
        }
        if (process.env.NEXT_PUBLIC_ENABLE_AGE_PRICING === "true" && template.agePricingRule !== undefined) {
          setAgeRule(template.agePricingRule ? {
            adultAge: String(template.agePricingRule.adultAge), infantAge: String(template.agePricingRule.infantAge),
            childDiscountPercent: template.agePricingRule.childDiscountPercent === null ? null : String(template.agePricingRule.childDiscountPercent),
            infantDiscountPercent: template.agePricingRule.infantDiscountPercent === null ? null : String(template.agePricingRule.infantDiscountPercent),
          } : null);
        }
        setForm((current) => {
          const price = Number(current.price);
          const split = template.installmentSplit && price > 0 ? calculatePaymentSplit(price, template.installmentSplit) : null;
          return {
            ...current, description: template.description, itinerary: template.itinerary, serviceLevel: level,
            ...(template.registrationFeeBasis ? { registrationFeeBasis: template.registrationFeeBasis } : {}),
            ...(template.installmentSplit ? {
              paymentPlan: current.paymentPlan.startsWith("REGISTRATION") ? "REGISTRATION_AND_INSTALLMENTS" : "INSTALLMENTS",
              initialPayment: split ? String(split.initialPayment) : "",
              finalBalance: split ? String(split.finalBalance) : "",
            } : {}),
          };
        });
      }} />
      <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-[#dbe2de] bg-white p-6 shadow-sm">
            <h2 className="font-brand text-lg font-bold text-[#17201c]">
              Package details
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field
                label="Package title"
                value={form.title}
                onChange={(value) => update("title", value)}
                required
              />
              <label className="text-sm font-semibold text-[#52605a]">
                Operator
                <AppSelect
                  value={operatorId}
                  onValueChange={setOperatorId}
                  options={[
                    { value: "", label: "Select operator" },
                    ...operators.map((operator) => ({
                      value: String(operator.id),
                      label:
                        operator.companyName ||
                        operator.tradingName ||
                        operator.email,
                    })),
                  ]}
                  className="mt-1.5 w-full"
                />
              </label>
              <Field
                label="Price per package (NGN)"
                type="number"
                step="0.01"
                value={form.price}
                onChange={(value) => update("price", value)}
                disabled={priceOnRequest}
              />
              <label className="flex items-center gap-2 self-end pb-2 text-sm font-semibold text-[#52605a]">
                <input type="checkbox" checked={priceOnRequest} onChange={(event) => update("priceOnRequest", String(event.target.checked))} className="size-4 accent-[#0d7d5f]" />
                Price on request
              </label>
              <Field
                label="Duration (days)"
                type="number"
                value={form.duration}
                onChange={(value) => update("duration", value)}
                min={1}
              />
              <Field
                label="Total capacity"
                type="number"
                value={form.capacity}
                onChange={(value) => update("capacity", value)}
                min={bookedSlots || 1}
              />
              {isEdit && <div className="rounded-lg border border-[#dbe2de] bg-[#f8faf9] p-3 text-sm text-[#52605a] sm:col-span-2"><span className="font-bold text-[#17201c]">Availability:</span> {bookedSlots} booked · {availableSlots} available. Available slots are calculated automatically; confirmed bookings cannot be changed here.</div>}
              <label className="text-sm font-semibold text-[#52605a]">
                Package type
                <select
                  value={form.type}
                  onChange={(event) => setForm((current) => ({
                    ...current,
                    type: event.target.value,
                    season: event.target.value === "umrah" ? current.season : "",
                  }))}
                  className="mt-1.5 h-11 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 text-sm font-normal"
                >
                  <option value="umrah">Umrah</option>
                  <option value="hajj">Hajj</option>
                  <option value="tour">Tour</option>
                </select>
              </label>
              <label className="text-sm font-semibold text-[#52605a]">
                Season classification
                <select
                  value={form.season}
                  disabled={form.type !== "umrah"}
                  onChange={(event) => update("season", event.target.value)}
                  className="mt-1.5 h-11 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 text-sm font-normal"
                >
                  <option value="">No seasonal classification</option>
                  <option value="ramadan">Ramadan Umrah</option>
                </select>
                <span className="mt-1 block text-xs font-normal">Ramadan is a season of Umrah, not a separate package type.</span>
              </label>
              <Field
                label="Selling season year (optional)"
                type="number"
                value={form.seasonYear}
                onChange={(value) => update("seasonYear", value)}
                min={2000}
              />
              <Field
                label="Service level"
                value={form.serviceLevel}
                onChange={(value) => update("serviceLevel", value)}
              />
              <Field
                label="Departure city"
                value={form.departingFrom}
                onChange={(value) => update("departingFrom", value)}
              />
              <Field
                label="Destination"
                value={form.goingTo}
                onChange={(value) => update("goingTo", value)}
              />
              <Field
                label="Departure date"
                type="date"
                value={form.departureDate}
                onChange={(value) => update("departureDate", value)}
              />
              <Field
                label="Return date"
                type="date"
                value={form.returnDate}
                onChange={(value) => update("returnDate", value)}
              />
            </div>
            <p className="mt-4 text-sm text-[#68716d]">If departure is not confirmed, optionally provide an expected range. It is not a confirmed travel date.</p>
            <div className="mt-2 grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Expected departure from" type="date" value={form.expectedDepartureStart} onChange={(value) => update("expectedDepartureStart", value)} />
              <Field label="Expected departure to" type="date" value={form.expectedDepartureEnd} onChange={(value) => update("expectedDepartureEnd", value)} />
            </div>
            <label className="mt-4 block text-sm font-semibold text-[#52605a]">
              Description
              <textarea
                value={form.description}
                onChange={(event) => update("description", event.target.value)}
                rows={5}
                className="mt-1.5 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 py-2 text-sm font-normal outline-none focus:border-[#0d7d5f]"
              />
            </label>
            <label className="mt-4 block text-sm font-semibold text-[#52605a]">
              Itinerary highlights
              <textarea
                value={form.itinerary}
                onChange={(event) => update("itinerary", event.target.value)}
                rows={5}
                className="mt-1.5 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 py-2 text-sm font-normal outline-none focus:border-[#0d7d5f]"
              />
            </label>
            <label className="mt-4 block text-sm font-semibold text-[#52605a]">
              Package inclusions
              <textarea value={form.inclusions} onChange={(event) => update("inclusions", event.target.value)} rows={5} placeholder="One inclusion per line" className="mt-1.5 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 py-2 text-sm font-normal outline-none focus:border-[#0d7d5f]" />
            </label>
            <h3 className="mt-6 font-bold text-[#17201c]">Details for travellers</h3>
            <AccommodationFields value={accommodationDetails} onChange={setAccommodationDetails} />
            <p className="mt-1 text-sm text-[#68716d]">State confirmed details or explicitly mark them not yet confirmed, for example an expected 4–5-star hotel. Child-specific checkout pricing is not currently supported.</p>
            {([
              ["accommodation", "Accommodation and room sharing"],
              ["servicesDisclosure", "Service details: visa, flights, meals, transport and guide"],
              ["priceBasis", "Price basis and mandatory fees"],
              ["exclusions", "Exclusions"],
              ["requiredDocuments", "Required documents"],
              ["childPolicy", "Child and infant policy"],
            ] as const).map(([field, label]) => (
              <label key={field} className="mt-4 block text-sm font-semibold text-[#52605a]">
                {label}
                <textarea value={form[field]} onChange={(event) => update(field, event.target.value)} rows={3}
                  className="mt-1.5 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 py-2 text-sm font-normal" />
              </label>
            ))}
            <div className="mt-4">
              <Field label="Booking close date (optional)" type="date" value={form.bookingCloseDate} onChange={(value) => update("bookingCloseDate", value)} />
            </div>
          </section>
          <section className="rounded-2xl border border-[#cfeee0] bg-white p-6 shadow-sm">
            <h2 className="font-brand text-lg font-bold text-[#17201c]">
              Payment plan
            </h2>
            <p className="mt-1 text-sm text-[#68716d]">
              Registration fees are separate from package cost.
            </p>
            <label className="mt-5 block text-sm font-semibold text-[#52605a]">
              Allowed customer payment flow
              <AppSelect
                value={form.paymentPlan}
                onValueChange={(value) => update("paymentPlan", value)}
                options={paymentPlans}
                className="mt-1.5 w-full"
              />
            </label>
            {usesRegistration && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field
                  label="Registration fee (NGN)"
                  type="number"
                  step="0.01"
                  value={form.registrationFee}
                  onChange={(value) => update("registrationFee", value)}
                  required
                />
                <label className="text-sm font-semibold text-[#52605a]">
                  Registration fee charged
                  <select value={form.registrationFeeBasis} onChange={(event) => update("registrationFeeBasis", event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 text-sm font-normal">
                    <option value="per_traveller">Per traveller</option>
                    <option value="per_booking">Once per booking</option>
                  </select>
                  <span className="mt-1 block text-xs font-normal">Per traveller includes infants. The fee is paid in full.</span>
                </label>
                <Field
                  label="Registration closes"
                  type="date"
                  value={form.registrationCloseDate}
                  onChange={(value) => update("registrationCloseDate", value)}
                />
                <div className="sm:col-span-2">
                  <Field
                    label="Require deposit within days of close"
                    type="number"
                    value={form.depositRequiredWithinDays}
                    onChange={(value) =>
                      update("depositRequiredWithinDays", value)
                    }
                  />
                  <p className="mt-1 text-xs font-normal text-[#68716d]">
                    Within this window, the registration fee and initial deposit
                    must be paid together.
                  </p>
                </div>
              </div>
            )}
            <div className="mt-4">
              <label className="text-sm font-semibold text-[#52605a]">
                Operator cancellation and refund policy
                <AppSelect
                  value={form.operatorPolicyVersionId}
                  onValueChange={(value) => update("operatorPolicyVersionId", value)}
                  options={[
                    { value: "", label: "No policy assigned yet" },
                    ...operatorPolicies.map((policy) => ({
                      value: policy.id,
                      label: `${policy.title} (v${policy.version})`,
                    })),
                  ]}
                  className="mt-1.5 w-full"
                />
              </label>
              <p className="mt-1 text-xs text-[#68716d]">
                Create and publish operator-specific policies in Administration → Operator policies. Assigned policies must be accepted before booking.
              </p>
            </div>
            {usesInstallments && (
              <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#17201c]">
                      Choose a split
                    </p>
                    <p className="mt-1 text-xs text-[#68716d]">
                      Package cost: ₦{packagePrice.toLocaleString()}. The selected percentage also applies to tier prices.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {splitOptions.map((split) => (
                      <button
                        key={split.value}
                        type="button"
                        disabled={packagePrice <= 0}
                        onClick={() => applySplit(split.value)}
                        aria-pressed={selectedSplit === split.value}
                        className={`rounded-lg border border-primary/25 px-3 py-2 text-xs font-bold text-primary hover:bg-primary/10 disabled:opacity-50 ${selectedSplit === split.value ? "bg-primary/15 ring-2 ring-primary" : "bg-white"}`}
                      >
                        {split.label}
                      </button>
                    ))}
                  </div>
                </div>
                {selectedSplit === null && Number(form.initialPayment) > 0 && Number(form.finalBalance) > 0 && (
                  <p className="mt-2 text-xs text-[#68716d]">Existing custom split. Choose a preset before changing the package price.</p>
                )}
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Initial payment (NGN)"
                    type="number"
                    step="0.01"
                    value={form.initialPayment}
                    onChange={(value) => update("initialPayment", value)}
                    readOnly
                    required
                  />
                  <Field
                    label="Final balance (NGN)"
                    type="number"
                    step="0.01"
                    value={form.finalBalance}
                    onChange={(value) => update("finalBalance", value)}
                    readOnly
                    required
                  />
                </div>
                {!installmentValid && (
                  <p className="mt-2 text-sm font-semibold text-[#a43229]">
                    Choose a split with two positive payments that add up to the package cost.
                  </p>
                )}
              </div>
            )}
          </section>
          <section className="rounded-2xl border border-[#dbe2de] bg-white p-6 shadow-sm">
            <h2 className="font-brand text-lg font-bold text-[#17201c]">Sales and offers</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold text-[#52605a]">Package status<select disabled={!isEdit} value={form.status} onChange={(event) => update("status", event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 text-sm font-normal"><option value="draft">Draft</option><option value="active">Active</option><option value="inactive">Inactive</option></select><span className="mt-1 block text-xs font-normal">New packages are saved as drafts and can be activated after review.</span></label>
              <label className="text-sm font-semibold text-[#52605a]">Sales status<select value={form.salesStatus} onChange={(event) => update("salesStatus", event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 text-sm font-normal"><option value="open">Open</option><option value="paused">Paused</option><option value="closed">Closed</option></select></label>
              {process.env.NEXT_PUBLIC_ENABLE_AGE_PRICING === "true" && <div className="space-y-3 sm:col-span-2">
                <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={Boolean(ageRule)} onChange={(event) => setAgeRule(event.target.checked ? { adultAge: "12", infantAge: "2", childDiscountPercent: null, infantDiscountPercent: null } : null)} /> Enable child or infant discounts</label>
                <p className="text-sm text-[#52605a]">Requires a confirmed departure. Ages will be verified against passports; registration fees are not discounted.</p>
                {ageRule && <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Adult age starts at" type="number" value={ageRule.adultAge} onChange={(value) => setAgeRule({ ...ageRule, adultAge: value })} min={2} />
                  <Field label="Infant age ends before" type="number" value={ageRule.infantAge} onChange={(value) => setAgeRule({ ...ageRule, infantAge: value })} min={1} />
                  {(["childDiscountPercent", "infantDiscountPercent"] as const).map((key) => <div key={key}>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={ageRule[key] !== null} onChange={(event) => setAgeRule({ ...ageRule, [key]: event.target.checked ? "" : null })} /> Offer {key === "childDiscountPercent" ? "child" : "infant"} discount</label>
                    {ageRule[key] !== null && <Field label="Discount percentage" type="number" value={ageRule[key] ?? ""} onChange={(value) => setAgeRule({ ...ageRule, [key]: value })} min={0} />}
                  </div>)}
                </div>}
              </div>}
              <label className="flex items-center gap-2 self-end pb-2 text-sm font-semibold text-[#52605a] sm:col-span-2"><input type="checkbox" checked={groupDiscountEnabled} onChange={(event) => update("groupDiscountEnabled", String(event.target.checked))} className="size-4 accent-[#0d7d5f]" /> Enable group discount</label>
              {groupDiscountEnabled && <><Field label="Minimum pilgrims" type="number" value={form.groupDiscountThreshold} onChange={(value) => update("groupDiscountThreshold", value)} required min={1} /><Field label="Discount percentage" type="number" value={form.groupDiscountPercentage} onChange={(value) => update("groupDiscountPercentage", value)} required min={0} /></>}
              <label className="text-sm font-semibold text-[#52605a] sm:col-span-2">Payment instructions<textarea value={form.paymentNote} onChange={(event) => update("paymentNote", event.target.value)} rows={3} className="mt-1.5 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 py-2 text-sm font-normal outline-none focus:border-[#0d7d5f]" /></label>
            </div>
          </section>
        </div>
        <aside className="h-fit rounded-2xl border border-[#dbe2de] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Building2 className="size-5 text-[#0d7d5f]" />
            <h2 className="font-brand text-lg font-bold text-[#17201c]">
              Publish package
            </h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-[#68716d]">
            {selectedOperator
              ? `${selectedOperator.companyName || selectedOperator.tradingName} will own this package.`
              : "Select an operator before publishing."}
          </p>
          {error && (
            <p className="mt-4 rounded-lg bg-[#fff0ee] p-3 text-sm font-semibold text-[#a43229]">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={saving || !operatorId || !installmentValid}
            className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#0d7d5f] px-4 text-sm font-bold text-white hover:bg-[#0b6b51] disabled:opacity-50"
          >
            {saving && <Loader2 className="size-4 animate-spin" />}{" "}
            {saving ? (isEdit ? "Saving..." : "Creating...") : (isEdit ? "Save package" : "Create package")}
          </button>
        </aside>
      </form>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  disabled = false,
  readOnly = false,
  min,
  step,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  min?: number;
  step?: string;
}) {
  return (
    <label className="text-sm font-semibold text-[#52605a]">
      {label}
      <input
        required={required}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        readOnly={readOnly}
        min={min}
        step={step}
        className="mt-1.5 h-11 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 text-sm font-normal text-[#17201c] outline-none focus:border-[#0d7d5f]"
      />
    </label>
  );
}

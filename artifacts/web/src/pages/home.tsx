import { useState, useEffect } from "react";
import { useTranslation } from "@/hooks/use-translation";
import { Calendar } from "@/components/calendar";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { useGetAvailableSlots } from "@workspace/api-client-react";
import { useCreateAppointment } from "@/hooks/use-appointments";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  Clock,
  CalendarDays,
  User,
  Mail,
  Phone,
  Loader2,
  ArrowLeft,
  ArrowRight,
  ClipboardCheck,
  Check,
  MessageSquare,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CONSULTATION_TYPES,
  getLabel,
  type ConsultationType,
} from "@/lib/consultation-types";
import { useConsultationStore } from "@/hooks/use-consultation-store";

type Step = 1 | 2 | 3 | 4 | 5;

const bookingSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(6, "Telefone obrigatório"),
  notes: z.string().optional(),
  address: z.string().optional(),
});

type BookingForm = z.infer<typeof bookingSchema>;

const DOMICILIO_ID = "domicilio";

/* ── Compact step indicator ───────────────────────────────── */
function StepIndicator({
  current,
  labels,
}: {
  current: number;
  labels: string[];
}) {
  return (
    <nav aria-label="Booking progress" className="mb-5">
      {/* Desktop: full labels */}
      <ol className="hidden sm:flex items-center gap-1">
        {labels.map((label, i) => {
          const stepNum = i + 1;
          const isActive = stepNum === current;
          const isCompleted = stepNum < current;
          return (
            <li key={stepNum} className="flex items-center gap-1 min-w-0">
              {i > 0 && (
                <div
                  className={cn(
                    "h-px w-4 shrink-0 transition-colors",
                    isCompleted ? "bg-primary" : "bg-border",
                  )}
                />
              )}
              <div
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap",
                  isActive && "bg-primary text-primary-foreground",
                  isCompleted && "text-primary",
                  !isActive && !isCompleted && "text-muted-foreground",
                )}
              >
                {isCompleted ? (
                  <Check className="w-3 h-3 shrink-0" />
                ) : (
                  <span className="w-4 text-center shrink-0">{stepNum}</span>
                )}
                <span className="truncate">{label}</span>
              </div>
            </li>
          );
        })}
      </ol>

      {/* Mobile: number dots + current label */}
      <div className="flex sm:hidden items-center gap-3">
        <div className="flex items-center gap-1.5">
          {labels.map((_, i) => {
            const stepNum = i + 1;
            const isActive = stepNum === current;
            const isCompleted = stepNum < current;
            return (
              <div
                key={stepNum}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  isActive && "w-6 bg-primary",
                  isCompleted && "bg-primary/40",
                  !isActive && !isCompleted && "bg-border",
                )}
              />
            );
          })}
        </div>
        <span className="text-xs font-medium text-muted-foreground">
          {current}/{labels.length} — {labels[current - 1]}
        </span>
      </div>
    </nav>
  );
}

/* ── Main component ───────────────────────────────────────── */
export default function Home() {
  const { t, language } = useTranslation();
  const setStoreType = useConsultationStore((s) => s.setSelectedType);

  const [step, setStep] = useState<Step>(1);
  const [selectedType, setSelectedType] = useState<ConsultationType | null>(
    null,
  );
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const selectType = (ct: ConsultationType | null) => {
    setSelectedType(ct);
    setStoreType(ct);
  };

  /* Dynamic accent colour ------------------------------------------------ */
  useEffect(() => {
    const el = document.documentElement;
    if (selectedType) {
      el.style.setProperty("--primary", selectedType.accentHsl);
    }
    return () => {
      el.style.removeProperty("--primary");
    };
  }, [selectedType]);

  /* Slots query ---------------------------------------------------------- */
  const dateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";
  const durationParam = selectedType
    ? String(selectedType.durationMinutes)
    : "30";
  const startHourParam = selectedType
    ? String(selectedType.startHour)
    : "8";
  const endHourParam = selectedType
    ? String(selectedType.endHour)
    : "20";
  const { data: slots = [], isLoading: isLoadingSlots } =
    useGetAvailableSlots(
      { date: dateStr, duration: durationParam, startHour: startHourParam, endHour: endHourParam },
      { query: { enabled: !!selectedDate } },
    );

  /* Mutation -------------------------------------------------------------- */
  const createMutation = useCreateAppointment();

  /* Form ------------------------------------------------------------------ */
  const form = useForm<BookingForm>({
    resolver: zodResolver(bookingSchema),
    defaultValues: { name: "", email: "", phone: "", notes: "", address: "" },
    mode: "onChange",
  });

  const watchedValues = form.watch();
  const needsAddress = selectedType?.id === DOMICILIO_ID;

  const isFormFilled =
    watchedValues.name.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(watchedValues.email) &&
    watchedValues.phone.trim().length >= 6 &&
    (!needsAddress || (watchedValues.address ?? "").trim().length >= 5);

  const canSubmit =
    !!selectedType && !!selectedDate && !!selectedTime && isFormFilled;

  const doSubmit = () => {
    const values = form.getValues();
    if (!selectedDate || !selectedTime || !selectedType) return;
    createMutation.mutate(
      {
        data: {
          ...values,
          date: format(selectedDate, "yyyy-MM-dd"),
          time: selectedTime,
          consultationType: selectedType.id,
          durationMinutes: selectedType.durationMinutes,
          ...(values.notes ? { notes: values.notes } : {}),
          ...(needsAddress && values.address ? { address: values.address } : {}),
        },
      },
      {
        onSuccess: () => setIsSuccess(true),
        onError: (err: any) => {
          const msg = err?.data?.message ?? err?.message ?? t("error");
          form.setError("root", { message: msg });
          setStep(4);
        },
      },
    );
  };

  const resetBooking = () => {
    setIsSuccess(false);
    setStep(1);
    selectType(null);
    setSelectedDate(null);
    setSelectedTime(null);
    form.reset();
    createMutation.reset();
  };

  const stepLabels = [
    t("step_short_type"),
    t("step_short_date"),
    t("step_short_time"),
    t("step_short_details"),
    t("step_short_confirm"),
  ];

  /* ── Success screen ──────────────────────────────────────── */
  if (isSuccess) {
    return (
      <div className="max-w-sm mx-auto pt-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card border border-border rounded-xl p-8 flex flex-col items-center text-center shadow-sm"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", bounce: 0.5, delay: 0.1 }}
            className="w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center text-white mb-5 shadow-md shadow-emerald-500/20"
          >
            <CheckCircle2 className="w-7 h-7" />
          </motion.div>
          <h2 className="text-xl font-bold text-foreground mb-1">
            {t("booking_success")}
          </h2>
          <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
            {t("booking_success_desc")}
          </p>
          {selectedType && selectedDate && selectedTime && (
            <div className="w-full rounded-lg border border-border divide-y divide-border mb-5 text-sm">
              <div className="flex justify-between px-3 py-2">
                <span className="text-muted-foreground">{t("consultation_type")}</span>
                <span className="font-medium text-foreground text-right max-w-[55%] truncate">
                  {getLabel(selectedType, language)}
                </span>
              </div>
              <div className="flex justify-between px-3 py-2">
                <span className="text-muted-foreground">{t("date")}</span>
                <span className="font-medium">{format(selectedDate, "dd/MM/yyyy")}</span>
              </div>
              <div className="flex justify-between px-3 py-2">
                <span className="text-muted-foreground">{t("time")}</span>
                <span className="font-medium">{selectedTime}</span>
              </div>
              <div className="flex justify-between px-3 py-2">
                <span className="text-muted-foreground">{t("duration")}</span>
                <span className="font-medium">{selectedType.durationMinutes} {t("minutes")}</span>
              </div>
              {form.getValues("notes") && (
                <div className="flex justify-between px-3 py-2">
                  <span className="text-muted-foreground">{t("notes")}</span>
                  <span className="font-medium text-foreground text-right max-w-[55%] truncate">
                    {form.getValues("notes")}
                  </span>
                </div>
              )}
              {needsAddress && form.getValues("address") && (
                <div className="flex justify-between px-3 py-2">
                  <span className="text-muted-foreground">{t("address")}</span>
                  <span className="font-medium text-foreground text-right max-w-[55%] truncate">
                    {form.getValues("address")}
                  </span>
                </div>
              )}
            </div>
          )}
          <Button onClick={resetBooking} variant="outline" className="w-full">
            {t("make_another")}
          </Button>
        </motion.div>
      </div>
    );
  }

  /* ── Booking flow ────────────────────────────────────────── */
  return (
    <div className="max-w-2xl mx-auto">
      <StepIndicator current={step} labels={stepLabels} />

      {/* Consultation summary bar (visible after step 1) */}
      <AnimatePresence>
        {selectedType && step > 1 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4"
          >
            <div
              className={cn(
                "flex items-center gap-2.5 rounded-lg border px-3 py-2",
                selectedType.accentBg,
                selectedType.accentBorder,
              )}
            >
              <selectedType.icon
                className={cn("w-4 h-4 shrink-0", selectedType.accentText)}
              />
              <div className="flex-1 min-w-0">
                <p className={cn("font-medium text-sm leading-tight", selectedType.accentText)}>
                  {getLabel(selectedType, language)}
                </p>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  {selectedType.durationMinutes} {t("minutes")}
                </p>
              </div>
              <button
                onClick={() => {
                  setStep(1);
                  setSelectedDate(null);
                  setSelectedTime(null);
                }}
                className={cn(
                  "text-[11px] font-medium underline underline-offset-2 shrink-0",
                  selectedType.accentText,
                )}
              >
                {t("change_type")}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {/* ── Step 1: Consultation type cards ── */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            <div className="text-center mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">
                {t("select_consultation")}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t("select_consultation_subtitle")}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CONSULTATION_TYPES.map((ct) => {
                const Icon = ct.icon;
                return (
                  <button
                    key={ct.id}
                    onClick={() => {
                      selectType(ct);
                      setStep(2);
                    }}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl border p-4 text-left transition-all hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      "bg-card border-border hover:border-current",
                      ct.accentText,
                    )}
                  >
                    <div
                      className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                        ct.accentBg,
                      )}
                    >
                      <Icon className={cn("w-5 h-5", ct.accentText)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm text-foreground group-hover:text-current leading-tight">
                        {getLabel(ct, language)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {ct.durationMinutes} {t("minutes")}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-current transition-colors shrink-0" />
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ── Step 2: Calendar ── */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <CalendarDays className="w-4 h-4 text-primary" />
                <h2 className="font-semibold text-sm">{t("select_date")}</h2>
              </div>
              <Calendar
                selectedDate={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date);
                  setSelectedTime(null);
                  setStep(3);
                }}
              />
            </div>
            <BackButton onClick={() => setStep(1)} label={t("step_back")} />
          </motion.div>
        )}

        {/* ── Step 3: Time slots ── */}
        {step === 3 && selectedDate && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-primary" />
                <h2 className="font-semibold text-sm">{t("select_time")}</h2>
                <span className="text-xs text-muted-foreground ml-auto">
                  {format(selectedDate, "dd/MM/yyyy")}
                </span>
              </div>

              {isLoadingSlots ? (
                <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">{t("loading")}</span>
                </div>
              ) : slots.length === 0 ? (
                <div className="text-center py-6 bg-muted/40 rounded-lg border border-dashed border-border">
                  <p className="text-sm text-muted-foreground">{t("no_slots")}</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                  {slots.map((slot) => (
                    <button
                      key={slot.time}
                      disabled={!slot.available}
                      onClick={() => {
                        setSelectedTime(slot.time);
                        setStep(4);
                      }}
                      className={cn(
                        "py-2 rounded-lg border text-xs font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        !slot.available
                          ? "opacity-25 cursor-not-allowed bg-muted border-transparent line-through text-muted-foreground"
                          : "bg-background border-border hover:border-primary hover:bg-primary/5 hover:text-primary",
                      )}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <BackButton
              onClick={() => {
                setStep(2);
                setSelectedDate(null);
                setSelectedTime(null);
              }}
              label={t("step_back")}
            />
          </motion.div>
        )}

        {/* ── Step 4: Personal details form ── */}
        {step === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-4 h-4 text-primary" />
                <h2 className="font-semibold text-sm">{t("personal_details")}</h2>
              </div>

              <div className="space-y-3">
                {/* Name */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground flex items-center gap-1">
                    <User className="w-3 h-3 text-muted-foreground" />
                    {t("name")} <span className="text-destructive">*</span>
                  </label>
                  <Input
                    {...form.register("name")}
                    placeholder="João Silva"
                    className={cn(
                      "bg-muted/40 focus:bg-background",
                      form.formState.errors.name &&
                        "border-destructive focus-visible:ring-destructive/15",
                    )}
                  />
                  {form.formState.errors.name && (
                    <p className="text-[11px] text-destructive mt-0.5">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground flex items-center gap-1">
                    <Mail className="w-3 h-3 text-muted-foreground" />
                    {t("email")} <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="email"
                    {...form.register("email")}
                    placeholder="joao@example.com"
                    className={cn(
                      "bg-muted/40 focus:bg-background",
                      form.formState.errors.email &&
                        "border-destructive focus-visible:ring-destructive/15",
                    )}
                  />
                  {form.formState.errors.email && (
                    <p className="text-[11px] text-destructive mt-0.5">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>

                {/* Phone */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground flex items-center gap-1">
                    <Phone className="w-3 h-3 text-muted-foreground" />
                    {t("phone")} <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="tel"
                    {...form.register("phone")}
                    placeholder="+351 912 345 678"
                    className={cn(
                      "bg-muted/40 focus:bg-background",
                      form.formState.errors.phone &&
                        "border-destructive focus-visible:ring-destructive/15",
                    )}
                  />
                  {form.formState.errors.phone && (
                    <p className="text-[11px] text-destructive mt-0.5">
                      {form.formState.errors.phone.message}
                    </p>
                  )}
                </div>

                {/* Notes (optional) */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground flex items-center gap-1">
                    <MessageSquare className="w-3 h-3 text-muted-foreground" />
                    {t("notes")}
                  </label>
                  <Textarea
                    {...form.register("notes")}
                    placeholder={t("notes_placeholder")}
                    rows={3}
                    className="bg-muted/40 focus:bg-background"
                  />
                </div>

                {/* Address (required for domicilio only) */}
                {needsAddress && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-muted-foreground" />
                      {t("address")} <span className="text-destructive">*</span>
                    </label>
                    <Input
                      {...form.register("address")}
                      placeholder={t("address_placeholder")}
                      className={cn(
                        "bg-muted/40 focus:bg-background",
                        needsAddress && (watchedValues.address ?? "").trim().length < 5 && form.formState.isSubmitted &&
                          "border-destructive focus-visible:ring-destructive/15",
                      )}
                    />
                    {needsAddress && (watchedValues.address ?? "").trim().length < 5 && form.formState.isSubmitted && (
                      <p className="text-[11px] text-destructive mt-0.5">
                        {t("address_required")}
                      </p>
                    )}
                  </div>
                )}

                {form.formState.errors.root && (
                  <p className="text-[11px] text-destructive text-center py-1">
                    {form.formState.errors.root.message}
                  </p>
                )}

                {/* Next button */}
                <Button
                  type="button"
                  onClick={async () => {
                    const valid = await form.trigger();
                    if (valid && isFormFilled) setStep(5);
                  }}
                  className="w-full"
                  disabled={!isFormFilled}
                >
                  {t("step_next")} <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </div>
            </div>
            <BackButton
              onClick={() => {
                setStep(3);
                setSelectedTime(null);
              }}
              label={t("step_back")}
            />
          </motion.div>
        )}

        {/* ── Step 5: Confirmation ── */}
        {step === 5 && selectedType && selectedDate && selectedTime && (
          <motion.div
            key="step5"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <ClipboardCheck className="w-4 h-4 text-primary" />
                <h2 className="font-semibold text-sm">{t("step_confirm")}</h2>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                {t("confirm_summary")}
              </p>

              {/* Summary rows */}
              <div className="rounded-lg border border-border divide-y divide-border mb-4 text-sm">
                <SummaryRow label={t("consultation_type")} value={getLabel(selectedType, language)} />
                <SummaryRow label={t("duration")} value={`${selectedType.durationMinutes} ${t("minutes")}`} />
                <SummaryRow label={t("date")} value={format(selectedDate, "dd/MM/yyyy")} />
                <SummaryRow label={t("time")} value={selectedTime} />
                <SummaryRow label={t("name")} value={form.getValues("name")} />
                <SummaryRow label={t("email")} value={form.getValues("email")} />
                <SummaryRow label={t("phone")} value={form.getValues("phone")} />
                {form.getValues("notes") && (
                  <SummaryRow label={t("notes")} value={form.getValues("notes")!} />
                )}
                {needsAddress && form.getValues("address") && (
                  <SummaryRow label={t("address")} value={form.getValues("address")!} />
                )}
              </div>

              {createMutation.isError && (
                <p className="text-[11px] text-destructive text-center mb-3">
                  {(createMutation.error as any)?.data?.message ??
                    (createMutation.error as any)?.message ??
                    t("error")}
                </p>
              )}

              <Button
                type="button"
                onClick={doSubmit}
                className="w-full"
                disabled={!canSubmit || createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    {t("confirming")}
                  </span>
                ) : (
                  t("confirm_booking")
                )}
              </Button>
            </div>
            <BackButton onClick={() => setStep(4)} label={t("step_back")} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Small helper components ──────────────────────────────── */

function BackButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <div className="mt-3">
      <Button variant="ghost" size="sm" onClick={onClick} className="gap-1 text-muted-foreground">
        <ArrowLeft className="w-3.5 h-3.5" /> {label}
      </Button>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground text-right max-w-[55%] truncate">
        {value}
      </span>
    </div>
  );
}

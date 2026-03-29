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
});

type BookingForm = z.infer<typeof bookingSchema>;

/* ── Step indicator pills ─────────────────────────────────── */
function StepIndicator({
  current,
  labels,
}: {
  current: number;
  labels: string[];
}) {
  return (
    <div className="flex items-center gap-2 mb-6 overflow-x-auto">
      {labels.map((label, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === current;
        const isCompleted = stepNum < current;
        return (
          <div key={stepNum} className="flex items-center gap-2 shrink-0">
            {i > 0 && (
              <div
                className={cn(
                  "h-px w-6 transition-colors",
                  isCompleted || isActive ? "bg-primary" : "bg-border",
                )}
              />
            )}
            <div
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                isActive && "bg-primary text-primary-foreground shadow-sm",
                isCompleted && "bg-primary/10 text-primary",
                !isActive && !isCompleted && "bg-muted text-muted-foreground",
              )}
            >
              <span>{stepNum}</span>
              <span className="hidden sm:inline">{label}</span>
            </div>
          </div>
        );
      })}
    </div>
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

  /* Sync selected type to zustand store for layout header icon */
  const selectType = (ct: ConsultationType | null) => {
    setSelectedType(ct);
    setStoreType(ct);
  };

  /* Dynamic accent colour ------------------------------------------------ */
  useEffect(() => {
    if (selectedType) {
      document.documentElement.style.setProperty(
        "--primary",
        selectedType.accentHsl,
      );
    }
    return () => {
      document.documentElement.style.removeProperty("--primary");
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
    defaultValues: { name: "", email: "", phone: "" },
    mode: "onChange",
  });

  const watchedValues = form.watch();
  const isFormFilled =
    watchedValues.name.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(watchedValues.email) &&
    watchedValues.phone.trim().length >= 6;

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
        },
      },
      {
        onSuccess: () => setIsSuccess(true),
        onError: (err: any) => {
          const msg = err?.data?.message ?? err?.message ?? t("error");
          form.setError("root", { message: msg });
          // Go back to form step so user sees the error
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
    t("step_consultation"),
    t("select_date"),
    t("select_time"),
    t("personal_details"),
    t("step_confirm"),
  ];

  /* ── Success screen ──────────────────────────────────────── */
  if (isSuccess) {
    return (
      <div className="max-w-md mx-auto pt-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card border border-border rounded-2xl p-10 flex flex-col items-center text-center shadow-sm"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", bounce: 0.5, delay: 0.1 }}
            className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center text-white mb-6 shadow-lg shadow-emerald-500/25"
          >
            <CheckCircle2 className="w-10 h-10" />
          </motion.div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {t("booking_success")}
          </h2>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            {t("booking_success_desc")}
          </p>
          {selectedType && selectedDate && selectedTime && (
            <div className="w-full bg-muted/50 rounded-xl p-4 mb-6 text-left space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("consultation_type")}
                </span>
                <span className="font-medium">
                  {getLabel(selectedType, language)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("date")}</span>
                <span className="font-medium">
                  {format(selectedDate, "dd/MM/yyyy")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("time")}</span>
                <span className="font-medium">{selectedTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("duration")}</span>
                <span className="font-medium">
                  {selectedType.durationMinutes} {t("minutes")}
                </span>
              </div>
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
    <div className="max-w-3xl mx-auto">
      <StepIndicator current={step} labels={stepLabels} />

      {/* Consultation summary bar (visible after step 1) */}
      <AnimatePresence>
        {selectedType && step > 1 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6"
          >
            <div
              className={cn(
                "flex items-center gap-3 rounded-xl border px-4 py-3",
                selectedType.accentBg,
                selectedType.accentBorder,
              )}
            >
              <selectedType.icon
                className={cn("w-5 h-5", selectedType.accentText)}
              />
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "font-semibold text-sm",
                    selectedType.accentText,
                  )}
                >
                  {getLabel(selectedType, language)}
                </p>
                <p className="text-xs text-muted-foreground">
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
                  "text-xs font-medium underline underline-offset-2",
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
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="text-center mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
                {t("select_consultation")}
              </h1>
              <p className="text-muted-foreground">
                {t("select_consultation_subtitle")}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      "group relative flex flex-col items-start gap-3 rounded-2xl border-2 p-6 text-left transition-all hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      "bg-card border-border hover:border-current",
                      ct.accentText,
                    )}
                  >
                    <div
                      className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center",
                        ct.accentBg,
                      )}
                    >
                      <Icon className={cn("w-6 h-6", ct.accentText)} />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground group-hover:text-current">
                        {getLabel(ct, language)}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        <Clock className="w-3.5 h-3.5 inline -mt-0.5 mr-1" />
                        {ct.durationMinutes} {t("minutes")}
                      </p>
                    </div>
                    <ArrowRight className="absolute top-6 right-5 w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
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
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <CalendarDays className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-lg">{t("select_date")}</h2>
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
            <div className="mt-4">
              <Button
                variant="ghost"
                onClick={() => setStep(1)}
                className="gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> {t("step_back")}
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── Step 3: Time slots ── */}
        {step === 3 && selectedDate && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <Clock className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-lg">{t("select_time")}</h2>
                <span className="text-sm text-muted-foreground ml-1">
                  — {format(selectedDate, "dd/MM/yyyy")}
                </span>
              </div>

              {isLoadingSlots ? (
                <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">{t("loading")}</span>
                </div>
              ) : slots.length === 0 ? (
                <div className="text-center py-8 bg-muted/40 rounded-xl border border-dashed border-border">
                  <p className="text-sm text-muted-foreground">
                    {t("no_slots")}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {slots.map((slot) => (
                    <button
                      key={slot.time}
                      disabled={!slot.available}
                      onClick={() => {
                        setSelectedTime(slot.time);
                        setStep(4);
                      }}
                      className={cn(
                        "py-3 rounded-xl border-2 text-sm font-semibold transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        !slot.available
                          ? "opacity-30 cursor-not-allowed bg-muted border-transparent line-through text-muted-foreground"
                          : "bg-background border-border hover:border-primary hover:bg-primary/5 hover:text-primary",
                      )}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-4">
              <Button
                variant="ghost"
                onClick={() => {
                  setStep(2);
                  setSelectedDate(null);
                  setSelectedTime(null);
                }}
                className="gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> {t("step_back")}
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── Step 4: Personal details form ── */}
        {step === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <User className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-lg">
                  {t("personal_details")}
                </h2>
              </div>

              <div className="space-y-4">
                {/* Name */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    {t("name")} <span className="text-destructive">*</span>
                  </label>
                  <Input
                    {...form.register("name")}
                    placeholder="João Silva"
                    className={cn(
                      "bg-muted/40 focus:bg-background",
                      form.formState.errors.name &&
                        "border-destructive focus-visible:ring-destructive",
                    )}
                  />
                  {form.formState.errors.name && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                    {t("email")} <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="email"
                    {...form.register("email")}
                    placeholder="joao@example.com"
                    className={cn(
                      "bg-muted/40 focus:bg-background",
                      form.formState.errors.email &&
                        "border-destructive focus-visible:ring-destructive",
                    )}
                  />
                  {form.formState.errors.email && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                    {t("phone")} <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="tel"
                    {...form.register("phone")}
                    placeholder="+351 912 345 678"
                    className={cn(
                      "bg-muted/40 focus:bg-background",
                      form.formState.errors.phone &&
                        "border-destructive focus-visible:ring-destructive",
                    )}
                  />
                  {form.formState.errors.phone && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.phone.message}
                    </p>
                  )}
                </div>

                {form.formState.errors.root && (
                  <p className="text-xs text-destructive text-center">
                    {form.formState.errors.root.message}
                  </p>
                )}

                {/* Next button */}
                <div className="pt-1">
                  <Button
                    type="button"
                    onClick={async () => {
                      const valid = await form.trigger();
                      if (valid && isFormFilled) setStep(5);
                    }}
                    className={cn(
                      "w-full h-13 text-base font-semibold transition-all",
                      isFormFilled
                        ? "shadow-lg shadow-primary/20"
                        : "opacity-50 cursor-not-allowed",
                    )}
                    disabled={!isFormFilled}
                  >
                    {t("step_next")} <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <Button
                variant="ghost"
                onClick={() => {
                  setStep(3);
                  setSelectedTime(null);
                }}
                className="gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> {t("step_back")}
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── Step 5: Confirmation ── */}
        {step === 5 && selectedType && selectedDate && selectedTime && (
          <motion.div
            key="step5"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <ClipboardCheck className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-lg">
                  {t("step_confirm")}
                </h2>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                {t("confirm_summary")}
              </p>

              {/* Summary card */}
              <div className="rounded-xl border border-border bg-muted/30 divide-y divide-border mb-6">
                <div className="flex justify-between px-4 py-3 text-sm">
                  <span className="text-muted-foreground">
                    {t("consultation_type")}
                  </span>
                  <span className="font-medium text-foreground">
                    {getLabel(selectedType, language)}
                  </span>
                </div>
                <div className="flex justify-between px-4 py-3 text-sm">
                  <span className="text-muted-foreground">{t("duration")}</span>
                  <span className="font-medium text-foreground">
                    {selectedType.durationMinutes} {t("minutes")}
                  </span>
                </div>
                <div className="flex justify-between px-4 py-3 text-sm">
                  <span className="text-muted-foreground">{t("date")}</span>
                  <span className="font-medium text-foreground">
                    {format(selectedDate, "dd/MM/yyyy")}
                  </span>
                </div>
                <div className="flex justify-between px-4 py-3 text-sm">
                  <span className="text-muted-foreground">{t("time")}</span>
                  <span className="font-medium text-foreground">
                    {selectedTime}
                  </span>
                </div>
                <div className="flex justify-between px-4 py-3 text-sm">
                  <span className="text-muted-foreground">{t("name")}</span>
                  <span className="font-medium text-foreground">
                    {form.getValues("name")}
                  </span>
                </div>
                <div className="flex justify-between px-4 py-3 text-sm">
                  <span className="text-muted-foreground">{t("email")}</span>
                  <span className="font-medium text-foreground">
                    {form.getValues("email")}
                  </span>
                </div>
                <div className="flex justify-between px-4 py-3 text-sm">
                  <span className="text-muted-foreground">{t("phone")}</span>
                  <span className="font-medium text-foreground">
                    {form.getValues("phone")}
                  </span>
                </div>
              </div>

              {createMutation.isError && (
                <p className="text-xs text-destructive text-center mb-4">
                  {(createMutation.error as any)?.data?.message ??
                    (createMutation.error as any)?.message ??
                    t("error")}
                </p>
              )}

              {/* Confirm button */}
              <Button
                type="button"
                onClick={doSubmit}
                className={cn(
                  "w-full h-13 text-base font-semibold transition-all shadow-lg shadow-primary/20",
                )}
                disabled={!canSubmit || createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t("confirming")}
                  </span>
                ) : (
                  t("confirm_booking")
                )}
              </Button>
            </div>
            <div className="mt-4">
              <Button
                variant="ghost"
                onClick={() => setStep(4)}
                className="gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> {t("step_back")}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

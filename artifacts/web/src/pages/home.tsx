import { useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

const bookingSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(6, "Telefone obrigatório"),
});

type BookingForm = z.infer<typeof bookingSchema>;

export default function Home() {
  const { t } = useTranslation();

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const dateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";
  const { data: slots = [], isLoading: isLoadingSlots } = useGetAvailableSlots(
    { date: dateStr },
    { query: { enabled: !!selectedDate } }
  );

  const createMutation = useCreateAppointment();

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

  const canSubmit = !!selectedDate && !!selectedTime && isFormFilled;

  const onSubmit = (values: BookingForm) => {
    if (!selectedDate || !selectedTime) return;
    createMutation.mutate(
      {
        data: {
          ...values,
          date: format(selectedDate, "yyyy-MM-dd"),
          time: selectedTime,
        },
      },
      {
        onSuccess: () => setIsSuccess(true),
        onError: () =>
          form.setError("root", { message: t("error") }),
      }
    );
  };

  const resetBooking = () => {
    setIsSuccess(false);
    setSelectedDate(null);
    setSelectedTime(null);
    form.reset();
  };

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
          <p className="text-muted-foreground mb-8 leading-relaxed">
            {t("booking_success_desc")}
          </p>
          <Button onClick={resetBooking} variant="outline" className="w-full">
            {t("make_another")}
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Page header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
          {t("book_appointment")}
        </h1>
        <p className="text-muted-foreground">{t("hero_subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        {/* ── Left column: calendar + time slots ── */}
        <div className="lg:col-span-3 space-y-5">

          {/* Calendar card */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <CalendarDays className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-base">{t("select_date")}</h2>
            </div>
            <Calendar
              selectedDate={selectedDate}
              onSelect={(date) => {
                setSelectedDate(date);
                setSelectedTime(null);
              }}
            />
          </div>

          {/* Time slots — appear after a date is chosen */}
          <AnimatePresence>
            {selectedDate && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.22 }}
                className="bg-card border-2 border-primary/20 rounded-2xl p-6 shadow-sm"
              >
                <div className="flex items-center gap-2 mb-5">
                  <Clock className="w-5 h-5 text-primary" />
                  <h2 className="font-semibold text-base">{t("select_time")}</h2>
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
                    <p className="text-sm text-muted-foreground">{t("no_slots")}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {slots.map((slot) => (
                      <button
                        key={slot.time}
                        disabled={!slot.available}
                        onClick={() => setSelectedTime(slot.time)}
                        className={cn(
                          "py-3 rounded-xl border-2 text-sm font-semibold transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                          !slot.available
                            ? "opacity-30 cursor-not-allowed bg-muted border-transparent line-through text-muted-foreground"
                            : selectedTime === slot.time
                            ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/25 scale-105"
                            : "bg-background border-border hover:border-primary hover:bg-primary/5 hover:text-primary"
                        )}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Right column: summary + form ── */}
        <div className="lg:col-span-2">
          <div className="sticky top-24 space-y-4">

            {/* Summary banner — prominent once date + time selected */}
            <AnimatePresence>
              {selectedDate && selectedTime && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="bg-primary text-primary-foreground rounded-2xl px-5 py-4 flex items-center gap-3 shadow-lg shadow-primary/20"
                >
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                    <CalendarDays className="w-5 h-5" />
                  </div>
                  <div className="leading-tight">
                    <p className="text-xs font-medium opacity-80 uppercase tracking-wide">Consulta</p>
                    <p className="text-base font-bold">
                      {format(selectedDate, "dd/MM/yyyy")} às {selectedTime}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form card */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <User className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-base">{t("personal_details")}</h2>
              </div>

              {/* Hints when steps not completed */}
              {!selectedDate && (
                <div className="mb-5 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-sm text-amber-800">
                  <CalendarDays className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{t("please_select_date")}</span>
                </div>
              )}
              {selectedDate && !selectedTime && (
                <div className="mb-5 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-sm text-amber-800">
                  <Clock className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{t("please_select_time")}</span>
                </div>
              )}

              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                      form.formState.errors.name && "border-destructive focus-visible:ring-destructive"
                    )}
                  />
                  {form.formState.errors.name && (
                    <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
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
                      form.formState.errors.email && "border-destructive focus-visible:ring-destructive"
                    )}
                  />
                  {form.formState.errors.email && (
                    <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
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
                      form.formState.errors.phone && "border-destructive focus-visible:ring-destructive"
                    )}
                  />
                  {form.formState.errors.phone && (
                    <p className="text-xs text-destructive">{form.formState.errors.phone.message}</p>
                  )}
                </div>

                {form.formState.errors.root && (
                  <p className="text-xs text-destructive text-center">
                    {form.formState.errors.root.message}
                  </p>
                )}

                {/* Submit */}
                <div className="pt-1">
                  <Button
                    type="submit"
                    className={cn(
                      "w-full h-13 text-base font-semibold transition-all",
                      canSubmit
                        ? "shadow-lg shadow-primary/20"
                        : "opacity-50 cursor-not-allowed"
                    )}
                    disabled={!canSubmit || createMutation.isPending}
                  >
                    {createMutation.isPending ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t("confirming")}
                      </span>
                    ) : (
                      t("book_now")
                    )}
                  </Button>

                  {/* Explain why button is disabled */}
                  {!canSubmit && !createMutation.isPending && (
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      {!selectedDate
                        ? t("please_select_date")
                        : !selectedTime
                        ? t("please_select_time")
                        : "Preencha todos os campos para continuar"}
                    </p>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

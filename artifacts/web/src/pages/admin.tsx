import { useState } from "react";
import { useTranslation } from "@/hooks/use-translation";
import { useListAppointments, useListClinics } from "@workspace/api-client-react";
import { format, parseISO } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Calendar as CalendarIcon, MapPin, User, Mail, Phone, LayoutDashboard } from "lucide-react";

export default function Admin() {
  const { t } = useTranslation();
  const [clinicIdFilter, setClinicIdFilter] = useState<number | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();

  const { data: clinics = [] } = useListClinics();
  const { data: appointments = [], isLoading } = useListAppointments({ 
    clinicId: clinicIdFilter, 
    status: statusFilter === 'all' ? undefined : statusFilter 
  });

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'confirmed': return <Badge variant="success">{t('status_confirmed')}</Badge>;
      case 'cancelled': return <Badge variant="destructive">{t('status_cancelled')}</Badge>;
      case 'synced': return <Badge variant="info">{t('status_synced')}</Badge>;
      default: return <Badge variant="warning">{t('status_pending')}</Badge>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <LayoutDashboard className="w-6 h-6" />
            </div>
            {t('appointments')}
          </h1>
          <p className="text-muted-foreground mt-2">
            Gira todas as marcações do sistema e integrações.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select 
            className="h-10 px-3 rounded-xl border-2 border-input bg-background text-sm font-medium focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none"
            value={clinicIdFilter || ''}
            onChange={(e) => setClinicIdFilter(e.target.value ? Number(e.target.value) : undefined)}
          >
            <option value="">{t('all_clinics')}</option>
            {clinics.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select 
            className="h-10 px-3 rounded-xl border-2 border-input bg-background text-sm font-medium focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none"
            value={statusFilter || ''}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">{t('all_statuses')}</option>
            <option value="pending">{t('status_pending')}</option>
            <option value="confirmed">{t('status_confirmed')}</option>
            <option value="cancelled">{t('status_cancelled')}</option>
            <option value="synced">{t('status_synced')}</option>
          </select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 border-b">
                <tr>
                  <th className="px-6 py-4 font-semibold">{t('patient')}</th>
                  <th className="px-6 py-4 font-semibold">{t('contact')}</th>
                  <th className="px-6 py-4 font-semibold">{t('date')} & {t('time')}</th>
                  <th className="px-6 py-4 font-semibold">{t('clinic')}</th>
                  <th className="px-6 py-4 font-semibold">{t('status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground animate-pulse">
                      {t('loading')}
                    </td>
                  </tr>
                )}
                {!isLoading && appointments.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                      Nenhuma consulta encontrada.
                    </td>
                  </tr>
                )}
                {appointments.map((apt) => (
                  <tr key={apt.id} className="hover:bg-accent/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold font-display">
                          {apt.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">{apt.name}</div>
                          <div className="text-xs text-muted-foreground">ID: #{apt.id} {apt.externalId && `• Ext: ${apt.externalId}`}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
                          <Mail className="w-3.5 h-3.5" /> <span>{apt.email}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
                          <Phone className="w-3.5 h-3.5" /> <span>{apt.phone}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-secondary group-hover:bg-white transition-colors">
                          <CalendarIcon className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{format(parseISO(apt.date), 'dd MMM yyyy')}</div>
                          <div className="text-muted-foreground">{apt.time}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{apt.clinicName || '-'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(apt.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

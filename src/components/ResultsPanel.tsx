import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CareGuideResult, DoctorProfile } from '@/types/care-guide';
import { SummaryView } from './SummaryView';
import { SymptomTable } from './SymptomTable';
import { DoctorCard } from './DoctorCard';
import { BookingModal } from './BookingModal';
import { FileText, Table2, Stethoscope } from 'lucide-react';

interface ResultsPanelProps {
  result: CareGuideResult | null;
}

export function ResultsPanel({ result }: ResultsPanelProps) {
  const [bookingDoctor, setBookingDoctor] = useState<DoctorProfile | null>(null);

  return (
    <div className="flex flex-col h-full px-4 py-6 overflow-y-auto">
      <Tabs defaultValue="summary" className="flex flex-col flex-1">
        <TabsList className="w-full grid grid-cols-3 mb-4 bg-secondary/50">
          <TabsTrigger value="summary" className="gap-1.5 text-xs">
            <FileText className="w-3.5 h-3.5" />
            Summary
          </TabsTrigger>
          <TabsTrigger value="table" className="gap-1.5 text-xs">
            <Table2 className="w-3.5 h-3.5" />
            Table
          </TabsTrigger>
          <TabsTrigger value="doctors" className="gap-1.5 text-xs">
            <Stethoscope className="w-3.5 h-3.5" />
            Doctors
          </TabsTrigger>
        </TabsList>

        <AnimatePresence mode="wait">
          <TabsContent value="summary" className="flex-1 mt-0">
            {result ? (
              <SummaryView data={result.summary} isEmergency={result.isEmergency} />
            ) : (
              <EmptyState text="Speak a health concern to see a summary" />
            )}
          </TabsContent>

          <TabsContent value="table" className="flex-1 mt-0">
            {result && result.symptoms.length > 0 ? (
              <SymptomTable symptoms={result.symptoms} />
            ) : (
              <EmptyState text="Symptom analysis will appear here" />
            )}
          </TabsContent>

          <TabsContent value="doctors" className="flex-1 mt-0">
            {result && result.doctors.length > 0 ? (
              <div className="space-y-3">
                {result.doctors.map((doc, i) => (
                  <DoctorCard
                    key={doc.id}
                    doctor={doc}
                    index={i}
                    onBook={setBookingDoctor}
                  />
                ))}
              </div>
            ) : (
              <EmptyState text="Doctor suggestions will appear here" />
            )}
          </TabsContent>
        </AnimatePresence>
      </Tabs>

      <BookingModal
        doctor={bookingDoctor}
        open={!!bookingDoctor}
        onClose={() => setBookingDoctor(null)}
      />
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <motion.div
      className="flex items-center justify-center h-full min-h-[200px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <p className="text-sm text-muted-foreground text-center">{text}</p>
    </motion.div>
  );
}

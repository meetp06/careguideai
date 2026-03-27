import { useState } from 'react';
import { DoctorProfile } from '@/types/care-guide';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BookingModalProps {
  doctor: DoctorProfile | null;
  open: boolean;
  onClose: () => void;
}

export function BookingModal({ doctor, open, onClose }: BookingModalProps) {
  const [step, setStep] = useState<'form' | 'confirmed'>('form');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = () => {
    setStep('confirmed');
  };

  const handleClose = () => {
    setStep('form');
    setName('');
    setPhone('');
    onClose();
  };

  if (!doctor) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <AnimatePresence mode="wait">
          {step === 'form' ? (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <DialogHeader>
                <DialogTitle className="text-lg">Request Appointment</DialogTitle>
                <DialogDescription>
                  Request a callback from {doctor.name} ({doctor.specialty})
                </DialogDescription>
              </DialogHeader>

              <div className="flex items-center gap-2 my-4 p-3 rounded-lg bg-secondary">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="text-sm">Next available: {doctor.availability}</span>
              </div>

              <div className="space-y-3">
                <Input
                  placeholder="Your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <Input
                  placeholder="Phone number"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={!name || !phone}>
                  Request Callback
                </Button>
              </DialogFooter>
            </motion.div>
          ) : (
            <motion.div
              key="confirmed"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center py-6 gap-4"
            >
              <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Request Submitted</h3>
              <p className="text-sm text-muted-foreground text-center max-w-xs">
                {doctor.name}'s office will call you at {phone} to confirm your appointment.
              </p>
              <p className="text-xs text-muted-foreground italic">
                (Demo mode — no real booking was made)
              </p>
              <Button onClick={handleClose} className="mt-2">
                Done
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

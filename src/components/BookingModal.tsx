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
import { CheckCircle2, Calendar, Phone, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BookingModalProps {
  doctor: DoctorProfile | null;
  open: boolean;
  onClose: () => void;
}

export function BookingModal({ doctor, open, onClose }: BookingModalProps) {
  const [step, setStep] = useState<'form' | 'calling' | 'confirmed' | 'error'>('form');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async () => {
    if (!doctor || !name || !phone) return;
    setStep('calling');

    try {
      const response = await fetch('http://localhost:8001/api/book-appointment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: phone,
          patientName: name,
          doctorName: doctor.name,
          specialty: doctor.specialty,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Booking failed');

      setStep('confirmed');
    } catch (err: any) {
      console.error('Booking error:', err);
      setErrorMsg(err.message || 'Could not complete booking');
      setStep('error');
    }
  };

  const handleClose = () => {
    setStep('form');
    setName('');
    setPhone('');
    setErrorMsg('');
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
                  placeholder="Phone number (e.g. +12025551234)"
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
                  <Phone className="w-3.5 h-3.5 mr-1.5" />
                  Request Callback
                </Button>
              </DialogFooter>
            </motion.div>
          ) : step === 'calling' ? (
            <motion.div
              key="calling"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center py-8 gap-4"
            >
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <h3 className="text-lg font-semibold text-foreground">Dispatching Call...</h3>
              <p className="text-sm text-muted-foreground text-center max-w-xs">
                Connecting you with {doctor.name} via AI-powered call
              </p>
            </motion.div>
          ) : step === 'confirmed' ? (
            <motion.div
              key="confirmed"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center py-6 gap-4"
            >
              <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Call Dispatched!</h3>
              <p className="text-sm text-muted-foreground text-center max-w-xs">
                {doctor.name}'s office is calling you at {phone} right now to confirm your appointment.
              </p>
              <p className="text-xs text-primary font-medium">
                📞 Pick up your phone!
              </p>
              <Button onClick={handleClose} className="mt-2">
                Done
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center py-6 gap-4"
            >
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <Phone className="w-8 h-8 text-destructive" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Call Failed</h3>
              <p className="text-sm text-muted-foreground text-center max-w-xs">{errorMsg}</p>
              <Button onClick={() => setStep('form')} className="mt-2">
                Try Again
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}


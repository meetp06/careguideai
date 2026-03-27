import { motion } from 'framer-motion';
import { DoctorProfile } from '@/types/care-guide';
import { MapPin, Star, Phone, Calendar, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DoctorCardProps {
  doctor: DoctorProfile;
  index: number;
  onBook: (doctor: DoctorProfile) => void;
}

export function DoctorCard({ doctor, index, onBook }: DoctorCardProps) {
  return (
    <motion.div
      className="rounded-xl bg-card border border-border p-4 hover:shadow-md transition-shadow"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.3 }}
    >
      <div className="flex items-start gap-3">
        {/* Avatar placeholder */}
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <UserCheck className="w-5 h-5 text-primary" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-foreground truncate">{doctor.name}</h4>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Star className="w-3 h-3 text-warning fill-warning" />
              <span className="text-xs font-medium">{doctor.rating}</span>
              <span className="text-[10px] text-muted-foreground">({doctor.reviewCount})</span>
            </div>
          </div>

          <p className="text-xs font-medium text-primary mt-0.5">{doctor.specialty}</p>

          <div className="flex items-center gap-1 mt-1.5 text-muted-foreground">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="text-[11px] truncate">{doctor.location}</span>
            <span className="text-[11px] flex-shrink-0">· {doctor.distance}</span>
          </div>

          <div className="flex items-center gap-1 mt-1 text-muted-foreground">
            <Calendar className="w-3 h-3 flex-shrink-0" />
            <span className="text-[11px]">{doctor.availability}</span>
          </div>

          <div className="flex items-center justify-between mt-3 gap-2">
            <a
              href={`tel:${doctor.phone}`}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <Phone className="w-3 h-3" />
              {doctor.phone}
            </a>
            <Button
              size="sm"
              className="h-7 text-xs px-3 rounded-full"
              onClick={() => onBook(doctor)}
            >
              Book
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

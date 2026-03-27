import { motion } from 'framer-motion';
import { SymptomRow } from '@/types/care-guide';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface SymptomTableProps {
  symptoms: SymptomRow[];
}

const urgencyColor: Record<string, string> = {
  Low: 'bg-accent/10 text-accent border-accent/20',
  Medium: 'bg-primary/10 text-primary border-primary/20',
  High: 'bg-warning/10 text-warning border-warning/20',
  Emergency: 'bg-destructive/10 text-destructive border-destructive/20',
};

export function SymptomTable({ symptoms }: SymptomTableProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Symptom</TableHead>
            <TableHead className="text-xs">Duration</TableHead>
            <TableHead className="text-xs">Severity</TableHead>
            <TableHead className="text-xs">Urgency</TableHead>
            <TableHead className="text-xs">Possible Concern</TableHead>
            <TableHead className="text-xs">Specialist</TableHead>
            <TableHead className="text-xs">Next Step</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {symptoms.map((row, i) => (
            <TableRow key={i}>
              <TableCell className="text-xs font-medium">{row.symptom}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{row.duration}</TableCell>
              <TableCell className="text-xs">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {row.severity}
                </Badge>
              </TableCell>
              <TableCell className="text-xs">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border ${urgencyColor[row.urgency] || ''}`}>
                  {row.urgency}
                </span>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">{row.possibleConcern}</TableCell>
              <TableCell className="text-xs">{row.recommendedSpecialist}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{row.nextStep}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </motion.div>
  );
}

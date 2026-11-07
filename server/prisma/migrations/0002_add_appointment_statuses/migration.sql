-- New appointment lifecycle values are committed in their own migration so a
-- later migration can safely use them as a column default.
ALTER TYPE "AppointmentStatus" ADD VALUE 'PENDING_PAYMENT';
ALTER TYPE "AppointmentStatus" ADD VALUE 'EXPIRED';

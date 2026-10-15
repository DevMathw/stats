/** Cómo se escriben en pantalla los niveles y estados: siempre con mayúscula inicial. */
import type { BetStatus, CorrelationLevel, DataQuality, RiskComponents, RiskLevel } from '../../types/betting';

export const RISK_LABEL: Record<RiskLevel, string> = { bajo: 'Bajo', medio: 'Medio', alto: 'Alto' };

export const QUALITY_LABEL: Record<DataQuality, string> = {
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
  insuficiente: 'Insuficiente',
};

export const STATUS_LABEL: Record<BetStatus, string> = {
  pendiente: 'Pendiente',
  ganado: 'Ganado',
  perdido: 'Perdido',
  anulado: 'Anulado',
};

export const CORRELATION_LABEL: Record<CorrelationLevel, string> = {
  ninguna: 'Ninguna',
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  excluyente: 'Excluyente',
  identica: 'Idéntica',
};

export const COMPONENT_LABEL: Record<keyof RiskComponents, string> = {
  datos: 'Datos',
  modelo: 'Modelo',
  mercado: 'Mercado',
  varianza: 'Varianza',
  correlacion: 'Correlación',
};

export const formatStatsCurrency = (value = 0) => {
  const amount = Number(value) || 0;

  return `$${amount.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const formatStatsDate = (value) => {
  if (!value) {
    return 'Sin definir';
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Sin definir';
  }

  return date.toLocaleDateString('es-AR');
};

export const formatStatsPercentage = (value = 0) => {
  const percentage = Number(value) || 0;
  return `${percentage.toLocaleString('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}%`;
};

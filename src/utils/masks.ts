
export const maskCPF = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

export const maskCNPJ = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

export const maskPhone = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');
};

export const maskCurrency = (value: string) => {
  let v = value.replace(/\D/g, '');
  v = (Number(v) / 100).toFixed(2).toString();
  v = v.replace(".", ",");
  v = v.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return v;
};

export const parseCurrency = (value: string): number => {
  if (!value) return 0;
  const cleanValue = value.replace(/\./g, '').replace(',', '.');
  return Number(cleanValue) || 0;
};

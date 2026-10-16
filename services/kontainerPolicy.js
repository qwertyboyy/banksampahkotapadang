export const kondisiKontainer = ['kosong', 'sebagian', 'penuh', 'berserakan', 'rusak', 'bersih'];

export function moduleActive(settings, now = new Date()) {
  return !!settings && Number(settings.enabled) === 1 &&
    (!settings.starts_at || new Date(settings.starts_at) <= now) &&
    (!settings.ends_at || now < new Date(settings.ends_at));
}

export function positiveId(value) {
  if (!/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(Number(value))) {
    throw Object.assign(new Error('ID tidak valid'), { status: 400 });
  }
  return Number(value);
}

export function text(value, name, max = 200) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) {
    throw Object.assign(new Error(`${name} wajib diisi, maksimal ${max} karakter`), { status: 400 });
  }
  return value.trim();
}

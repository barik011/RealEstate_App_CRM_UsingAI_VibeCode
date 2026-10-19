import { useEffect, useState } from 'react';
import { storage } from '../utils/storage';
export function usePropertyTools(key) {
  const [items, setItems] = useState(() => storage.get(key, []));
  useEffect(() => {
    const sync = () => setItems(storage.get(key, []));
    window.addEventListener('property-tools', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('property-tools', sync);
      window.removeEventListener('storage', sync);
    };
  }, [key]);
  const save = (next) => {
    if (!storage.set(key, next)) throw new Error('Browser storage is unavailable.');
    setItems(next);
    window.dispatchEvent(new Event('property-tools'));
  };
  return [Array.isArray(items) ? items : [], save];
}

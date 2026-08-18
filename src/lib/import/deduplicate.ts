export function removeDuplicates(customers: any[]) {
    const map = new Map();
  
    customers.forEach((c) => {
      const key = `${c.name}_${c.phone}`;
  
      if (!map.has(key)) {
        map.set(key, c);
      }
    });
  
    return [...map.values()];
  }
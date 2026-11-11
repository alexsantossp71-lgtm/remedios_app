
// Máscaras de entrada compartilhadas pelos formulários.
// Funções puras, cobertas por testes unitários (masks.test.ts).

/** Máscara de telefone brasileiro: (11) 98888-7777 / (11) 3333-3333. */
export const maskPhone = (value: string): string => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

export const phoneDigits = (value: string): string => value.replace(/\D/g, '');

/** Número de carteirinha: somente dígitos, agrupados de 4 em 4 (máx. 20). */
export const maskCardNumber = (value: string): string =>
    value
        .replace(/\D/g, '')
        .slice(0, 20)
        .replace(/(\d{4})(?=\d)/g, '$1 ')
        .trim();

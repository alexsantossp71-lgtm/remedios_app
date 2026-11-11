
// Lista offline de medicamentos comuns no Brasil.
// Usada como fallback imediato quando a API Gemini não está configurada
// (IA sem chave) ou falha (offline, erro de rede), para que o
// autocomplete do formulário continue funcionando sem depender de rede.

import { Medication } from '../types';

export const FALLBACK_MEDICATIONS: Medication[] = [
    { name: 'Dipirona' },
    { name: 'Paracetamol' },
    { name: 'Ibuprofeno' },
    { name: 'Amoxicilina' },
    { name: 'Azitromicina' },
    { name: 'Losartana' },
    { name: 'Omeprazol' },
    { name: 'Metformina' },
    { name: 'Amlodipino' },
    { name: 'Hidroclorotiazida' },
    { name: 'Enalapril' },
    { name: 'Atenolol' },
    { name: 'Sinvastatina' },
    { name: 'Atorvastatina' },
    { name: 'Prednisona' },
    { name: 'Dexametasona' },
    { name: 'Salbutamol' },
    { name: 'Loratadina' },
    { name: 'Cetirizina' },
    { name: 'Furosemida' },
    { name: 'Captopril' },
    { name: 'Ciprofloxacino' },
    { name: 'Levotiroxina' },
    { name: 'Clonazepam' },
    { name: 'Sertralina' },
    { name: 'Fluoxetina' },
    { name: 'Gabapentina' },
    { name: 'Tramadol' },
    { name: 'Nimesulida' },
    { name: 'Celecoxibe' },
];

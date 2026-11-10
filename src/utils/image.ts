
// Redimensionamento/compressão de fotos no cliente antes do envio à API.
// Fotos de câmera chegam a 5-10 MB; comprimir para JPEG mantém a leitura
// precisa e evita estourar limites de payload.

const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.85;

/** Converte um data URL em Image; rejeita se o navegador não decodificar. */
const loadImage = (dataUrl: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Imagem inválida.'));
        image.src = dataUrl;
    });

/** Lê um arquivo de imagem e devolve um data URL JPEG (máx. 1280px). */
export async function fileToCompressedDataUrl(file: File): Promise<string> {
    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Não foi possível abrir a imagem.'));
        reader.readAsDataURL(file);
    });

    const image = await loadImage(dataUrl);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(image.width, image.height));
    if (scale === 1 && dataUrl.startsWith('data:image/jpeg')) {
        return dataUrl; // já é JPEG pequeno o suficiente
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return dataUrl;
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}

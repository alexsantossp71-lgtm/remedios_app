import { defineConfig } from 'vite';

// Base para GitHub Pages: nome do repositório.
// Em desenvolvimento e em outros hosts o Vite serve o app normalmente.
export default defineConfig({
  base: '/remedios_app/',
  server: {
    host: '0.0.0.0',
    // Permite hosts de preview/proxy (útil em ambientes de sandbox/ide).
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    allowedHosts: true,
  },
});

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        configure: (proxy, options) => {
          // Increase timeout for large file uploads and long-running requests
          proxy.on('proxyReq', function(proxyReq, req, res) {
            proxyReq.setHeader('Connection', 'keep-alive');
          });
          proxy.on('error', function(err, req, res) {
            console.error('Proxy error:', err);
            if (!res.headersSent) {
              res.writeHead(500, {
                'Content-Type': 'application/json'
              });
            }
            res.end(JSON.stringify({ error: 'Proxy error: ' + err.message }));
          });
        }
      }
    }
  }
})

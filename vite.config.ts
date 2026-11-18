import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

// Second-site mode (VITE_HIDE_PRICING=true): after the build, every emitted page tells search engines not to
// index it (the canonical already points at ibiareview.com) and the static guide pages drop their pricing links.
function hidePricingSite(enabled: boolean): Plugin {
  const walk = (dir: string, out: string[] = []) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name)
      if (statSync(full).isDirectory()) walk(full, out)
      else if (name.endsWith('.html')) out.push(full)
    }
    return out
  }
  return {
    name: 'hide-pricing-site',
    apply: 'build',
    closeBundle() {
      if (!enabled) return
      for (const file of walk('dist')) {
        let html = readFileSync(file, 'utf8')
        html = html.replace(/(<meta\s+name="robots"\s+content=")[^"]*(")/g, '$1noindex,nofollow$2')
        html = html.replace(/<li><a href="\/#pricing">[^<]*<\/a><\/li>/g, '')
        html = html.replace(/<a class="hide-m" href="\/#pricing">Pricing<\/a>/g, '')
        writeFileSync(file, html)
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const hidePricing = (process.env.VITE_HIDE_PRICING ?? env.VITE_HIDE_PRICING) === 'true'
  return {
    plugins: [react(), tailwindcss(), hidePricingSite(hidePricing)],
    server: { proxy: { '/api/local-lab': { target: 'http://127.0.0.1:4179', changeOrigin: true } } },
  }
})

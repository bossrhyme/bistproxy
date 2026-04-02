# DeepFin — Claude Code Kuralları

## Branch & Deploy Akışı

- Vercel **`main` branch'ten** deploy eder → production site
- Geliştirme branch'i: `claude/bistproxy-work-yFoDS` → Vercel preview URL
- **Her session sonunda:** çalışma branch'ini `main`'e merge et ve her iki branch'i push et

```bash
git checkout main
git merge claude/bistproxy-work-yFoDS --no-edit
git push origin main
git checkout claude/bistproxy-work-yFoDS
git merge main --no-edit
git push origin claude/bistproxy-work-yFoDS
```

Push için PAT gerekiyorsa remote URL'yi geçici olarak token ile ayarla, push sonrası geri al.

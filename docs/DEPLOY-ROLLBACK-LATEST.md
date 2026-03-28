# Rollback Plan (auto) — Summa Social

Generat: 2026-03-28 11:45
Risc: ALT
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 60e0bfbd
SHA branca a publicar (codex/premium-landing-videos-prod-20260328): 95e32ed6

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout codex/premium-landing-videos-prod-20260328
git revert 95e32ed6 --no-edit
git push origin codex/premium-landing-videos-prod-20260328
bash scripts/deploy.sh codex/premium-landing-videos-prod-20260328
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 60e0bfbd
git push origin prod --force-with-lease
```

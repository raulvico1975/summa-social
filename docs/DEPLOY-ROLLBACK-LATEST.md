# Rollback Plan (auto) — Summa Social

Generat: 2026-03-07 18:15
Risc: ALT
Backup curt: SKIPPED_NO_BUCKET
SHA prod abans de publicar: d64d913
SHA main a publicar: 012315e

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 012315e --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard d64d913
git push origin prod --force-with-lease
```

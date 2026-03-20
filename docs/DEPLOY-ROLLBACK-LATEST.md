# Rollback Plan (auto) — Summa Social

Generat: 2026-03-20 07:00
Risc: ALT
Backup curt: SKIPPED_NO_BUCKET
SHA prod abans de publicar: 137918d
SHA main a publicar: b580cdb

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert b580cdb --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 137918d
git push origin prod --force-with-lease
```

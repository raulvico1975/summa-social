# Rollback Plan (auto) — Summa Social

Generat: 2026-03-01 19:46
Risc: ALT
Backup curt: SKIPPED_NO_BUCKET
SHA prod abans de publicar: 05f1b2c
SHA main a publicar: 491714d

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 491714d --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 05f1b2c
git push origin prod --force-with-lease
```

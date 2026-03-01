# Rollback Plan (auto) — Summa Social

Generat: 2026-03-01 21:52
Risc: BAIX
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 9a57470
SHA main a publicar: cdf332e

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert cdf332e --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 9a57470
git push origin prod --force-with-lease
```

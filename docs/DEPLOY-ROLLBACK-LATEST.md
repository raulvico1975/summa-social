# Rollback Plan (auto) — Summa Social

Generat: 2026-02-16 13:42
Risc: ALT
Backup curt: SKIPPED_NO_BUCKET
SHA prod abans de publicar: 87e6dd6
SHA main a publicar: 556a3c9

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 556a3c9 --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 87e6dd6
git push origin prod --force-with-lease
```

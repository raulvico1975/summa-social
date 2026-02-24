# Rollback Plan (auto) — Summa Social

Generat: 2026-02-24 14:50
Risc: ALT
Backup curt: SKIPPED_NO_BUCKET
SHA prod abans de publicar: 0d83b87
SHA main a publicar: 23ce9d7

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 23ce9d7 --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 0d83b87
git push origin prod --force-with-lease
```

# Rollback Plan (auto) — Summa Social

Generat: 2026-04-22 17:47
Risc: ALT
Backup curt: SKIPPED_NO_BUCKET
SHA prod abans de publicar: 1606eee1f
SHA branca a publicar (main): c7ddef504

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert c7ddef504 --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 1606eee1f
git push origin prod --force-with-lease
```

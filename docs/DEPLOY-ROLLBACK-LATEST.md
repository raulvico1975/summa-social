# Rollback Plan (auto) — Summa Social

Generat: 2026-04-09 20:10
Risc: ALT
Backup curt: SKIPPED_NO_BUCKET
SHA prod abans de publicar: fb66d762d
SHA branca a publicar (main): febefca3d

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert febefca3d --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard fb66d762d
git push origin prod --force-with-lease
```

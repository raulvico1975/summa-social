# Rollback Plan (auto) — Summa Social

Generat: 2026-04-05 19:52
Risc: ALT
Backup curt: SKIPPED_NO_BUCKET
SHA prod abans de publicar: 69742d53
SHA branca a publicar (main): e507437f

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert e507437f --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 69742d53
git push origin prod --force-with-lease
```

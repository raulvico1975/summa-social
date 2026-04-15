# Rollback Plan (auto) — Summa Social

Generat: 2026-04-15 11:26
Risc: ALT
Backup curt: SKIPPED_NO_BUCKET
SHA prod abans de publicar: e8dea9b57
SHA branca a publicar (main): e266263e6

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert e266263e6 --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard e8dea9b57
git push origin prod --force-with-lease
```

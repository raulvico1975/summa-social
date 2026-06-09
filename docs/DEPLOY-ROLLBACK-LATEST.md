# Rollback Plan (auto) — Summa Social

Generat: 2026-06-09 17:15
Risc: ALT
Backup curt: SKIPPED_NO_BUCKET
SHA prod abans de publicar: 910544e48
SHA branca a publicar (main): c7635aced

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert c7635aced --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 910544e48
git push origin prod --force-with-lease
```

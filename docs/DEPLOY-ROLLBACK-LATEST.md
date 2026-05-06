# Rollback Plan (auto) — Summa Social

Generat: 2026-05-06 09:56
Risc: ALT
Backup curt: SKIPPED_NO_BUCKET
SHA prod abans de publicar: 9480d89ac
SHA branca a publicar (main): 6fc368c97

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 6fc368c97 --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 9480d89ac
git push origin prod --force-with-lease
```

# Rollback Plan (auto) — Summa Social

Generat: 2026-04-20 12:47
Risc: ALT
Backup curt: SKIPPED_NO_BUCKET
SHA prod abans de publicar: 005e170ac
SHA branca a publicar (main): 91042072b

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 91042072b --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 005e170ac
git push origin prod --force-with-lease
```

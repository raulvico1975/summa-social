# Rollback Plan (auto) — Summa Social

Generat: 2026-04-20 12:57
Risc: ALT
Backup curt: SKIPPED_NO_BUCKET
SHA prod abans de publicar: 005e170ac
SHA branca a publicar (main): bcda904e4

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert bcda904e4 --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 005e170ac
git push origin prod --force-with-lease
```

# Rollback Plan (auto) — Summa Social

Generat: 2026-07-21 16:18
Risc: ALT
Backup curt: NO_REQUIRED
SHA prod abans de publicar: db5d6576f
SHA branca a publicar (main): 429c8c62b

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 429c8c62b --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard db5d6576f
git push origin prod --force-with-lease
```

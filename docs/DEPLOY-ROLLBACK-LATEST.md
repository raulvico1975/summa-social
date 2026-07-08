# Rollback Plan (auto) — Summa Social

Generat: 2026-07-08 23:47
Risc: ALT
Backup curt: NO_REQUIRED
SHA prod abans de publicar: fb7fdbf79
SHA branca a publicar (main): 33c6b3587

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 33c6b3587 --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard fb7fdbf79
git push origin prod --force-with-lease
```

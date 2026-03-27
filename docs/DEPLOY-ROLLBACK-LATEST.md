# Rollback Plan (auto) — Summa Social

Generat: 2026-03-27 17:01
Risc: ALT
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 0f49eda1
SHA branca a publicar (main): efb38677

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert efb38677 --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 0f49eda1
git push origin prod --force-with-lease
```

# Rollback Plan (auto) — Summa Social

Generat: 2026-05-09 19:09
Risc: ALT
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 37ae4d29c
SHA branca a publicar (main): 0c49f2187

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 0c49f2187 --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 37ae4d29c
git push origin prod --force-with-lease
```

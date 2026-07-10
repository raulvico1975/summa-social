# Rollback Plan (auto) — Summa Social

Generat: 2026-07-10 22:39
Risc: ALT
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 702b3babe
SHA branca a publicar (main): 88db554dc

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 88db554dc --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 702b3babe
git push origin prod --force-with-lease
```

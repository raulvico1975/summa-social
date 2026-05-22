# Rollback Plan (auto) — Summa Social

Generat: 2026-05-22 15:22
Risc: ALT
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 30fe1ac87
SHA branca a publicar (main): 13aee95cc

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 13aee95cc --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 30fe1ac87
git push origin prod --force-with-lease
```

# Rollback Plan (auto) — Summa Social

Generat: 2026-06-10 08:48
Risc: ALT
Backup curt: NO_REQUIRED
SHA prod abans de publicar: afa30e56e
SHA branca a publicar (main): 45eda2d19

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 45eda2d19 --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard afa30e56e
git push origin prod --force-with-lease
```

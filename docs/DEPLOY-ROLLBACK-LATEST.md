# Rollback Plan (auto) — Summa Social

Generat: 2026-07-11 02:14
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 330089ad8
SHA branca a publicar (main): 37907471a

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 37907471a --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 330089ad8
git push origin prod --force-with-lease
```

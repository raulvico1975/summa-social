# Rollback Plan (auto) — Summa Social

Generat: 2026-03-29 10:55
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 9ebae549
SHA branca a publicar (main): 5eb40f9a

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 5eb40f9a --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 9ebae549
git push origin prod --force-with-lease
```

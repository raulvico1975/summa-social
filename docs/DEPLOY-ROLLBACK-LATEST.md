# Rollback Plan (auto) — Summa Social

Generat: 2026-07-15 16:50
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 71b7f0208
SHA branca a publicar (main): 374660a65

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 374660a65 --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 71b7f0208
git push origin prod --force-with-lease
```

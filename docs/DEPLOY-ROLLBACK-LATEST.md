# Rollback Plan (auto) — Summa Social

Generat: 2026-06-08 18:03
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 78d956f77
SHA branca a publicar (main): 66d287a83

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 66d287a83 --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 78d956f77
git push origin prod --force-with-lease
```
